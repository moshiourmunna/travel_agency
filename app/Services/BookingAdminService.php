<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Customer;
use App\Models\Document;
use App\Models\LedgerEntry;
use App\Models\Package;
use App\Models\Payment;
use App\Models\PreRegistration;
use App\Models\Refund;
use App\Models\User;
use App\Models\VisaApplication;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Back-office operations on bookings: everything the admin panel can do beyond the public booking flow. */
class BookingAdminService
{
    public function __construct(private BookingService $bookings, private PaymentService $payments) {}

    /** Find or create the customer chosen on the admin form. */
    public function resolveCustomer(array $d): Customer
    {
        if (! empty($d['customer_id'])) {
            return Customer::findOrFail($d['customer_id']);
        }
        $user = User::create([
            'name' => $d['new_name'], 'email' => $d['new_email'] ?: null, 'phone' => $d['new_phone'], 'role' => 'customer',
            'password' => $d['new_password'] ?? Str::random(16), 'locale' => app()->getLocale(),
        ]);
        AuditLog::record('customer.create', $user);

        return $user->customer()->create(['address' => $d['new_address'] ?? null, 'district' => $d['new_district'] ?? null]);
    }

    /** Admin-created booking (walk-in / phone / converted pre-registration). */
    public function create(array $d): Booking
    {
        return DB::transaction(function () use ($d) {
            $customer = $this->resolveCustomer($d);
            $package = Package::findOrFail($d['package_id']);
            $d['adults'] = count($d['travellers']) - (int) ($d['children'] ?? 0);
            if ($d['adults'] < 1) throw ValidationException::withMessages(['travellers' => 'At least one adult pilgrim is required.']);
            $d['payment_method'] ??= 'cash';
            [$booking] = $this->bookings->create($customer, $package, $d, $d['agent_id'] ?? null, 'admin');
            $this->saveTravellerExtras($booking, $d['travellers']);
            $booking->refresh();
            $manual = (int) ($d['discount'] ?? 0);
            if ($manual > 0) {
                $this->applyManualDiscount($booking, $manual);
            }
            $booking->log('created', 'Booking created from admin panel', ['source' => 'admin'], null, $booking->status);
            if (! empty($d['prereg_id']) && ($pr = PreRegistration::find($d['prereg_id']))) {
                $pr->update(['status' => 'converted', 'booking_id' => $booking->id, 'converted_at' => now(), 'user_id' => $pr->user_id ?? $customer->user_id]);
                $booking->log('system', "Converted from pre-registration {$pr->ref}");
            }
            if (($amt = (int) ($d['initial_payment'] ?? 0)) > 0) {
                $this->recordPayment($booking, ['amount' => $amt, 'method' => $d['payment_method'] === 'pay_later' ? 'cash' : $d['payment_method'], 'txn' => $d['initial_txn'] ?? null, 'note' => 'Initial payment at booking']);
            }
            AuditLog::record('booking.create', $booking, null, $booking->only('ref', 'total', 'status', 'payment_mode'));

            return $booking->fresh();
        });
    }

    private function saveTravellerExtras(Booking $booking, array $rows): void
    {
        foreach ($booking->travellers()->with('traveller.passport')->orderBy('id')->get()->values() as $i => $bt) {
            $t = $rows[$i] ?? [];
            $bt->traveller->update(array_filter([
                'relation' => $t['relation'] ?? null, 'blood_group' => $t['blood_group'] ?? null, 'medical_notes' => $t['medical_notes'] ?? null,
                'needs_wheelchair' => ! empty($t['needs_wheelchair']), 'nid_enc' => $t['nid'] ?? null,
            ], fn ($v) => $v !== null));
            if ($bt->traveller->passport && (! empty($t['passport_issue']) || ! empty($t['passport_place']))) {
                $bt->traveller->passport->update(['issue_date' => $t['passport_issue'] ?? null, 'issue_place' => $t['passport_place'] ?? null]);
            }
        }
    }

    /** Manual discount is stored in meta and added to any automatic (early-bird) discount. */
    public function applyManualDiscount(Booking $b, int $manual): void
    {
        $meta = $b->meta ?? [];
        $auto = (int) $b->discount - (int) ($meta['manual_discount'] ?? 0);
        if ($auto + $manual > $b->subtotal) throw ValidationException::withMessages(['discount' => 'Discount cannot exceed the subtotal.']);
        $meta['manual_discount'] = $manual;
        $b->update(['discount' => $auto + $manual, 'total' => $b->subtotal - $auto - $manual, 'meta' => $meta]);
        if ($b->payment_mode === 'installment' && $b->installments()->exists()) {
            $this->rebalanceSchedule($b);
        }
        $this->syncCommission($b);
    }

    /** Re-price after pilgrim/room changes, keeping the manual discount. */
    public function reprice(Booking $b): void
    {
        $adults = max(1, $b->travellers()->count() - (int) $b->children);
        $q = $this->bookings->quote($b->package, $b->room_type, $adults, (int) $b->children, $b->meta['addons'] ?? []);
        $manual = (int) ($b->meta['manual_discount'] ?? 0);
        $b->update(['adults' => $adults, 'subtotal' => $q['subtotal'], 'discount' => $q['discount'] + $manual, 'total' => max(0, $q['subtotal'] - $q['discount'] - $manual)]);
        $b->travellers()->update(['room_type' => $b->room_type, 'price' => $q['price']->price]);
        $b->items()->whereIn('kind', ['qurbani', 'insurance'])->delete();
        foreach ($q['lines'] as $l) if (isset($l['kind'])) $b->items()->create(['kind' => $l['kind'], 'label' => $l['label'], 'price' => $l['amount']]);
        if ($b->payment_mode === 'installment' && $b->installments()->exists()) $this->rebalanceSchedule($b);
        $this->syncCommission($b);
    }

    /** Keep unpaid installments summing to the remaining balance. */
    public function rebalanceSchedule(Booking $b): void
    {
        $paidSum = (int) $b->installments()->where('status', 'paid')->sum('amount');
        $open = $b->installments()->whereNot('status', 'paid')->orderBy('seq')->get();
        if ($open->isEmpty()) return;
        $left = max(0, $b->total - $paidSum); $n = $open->count(); $each = intdiv($left, $n);
        foreach ($open as $k => $i) $i->update(['amount' => $k === $n - 1 ? $left - $each * ($n - 1) : $each]);
    }

    /** Build a fresh schedule: deposit now (or already paid) + N equal installments between two dates. Paid rows are kept. */
    public function generateSchedule(Booking $b, int $count, string $first, string $last, ?int $deposit = null): void
    {
        DB::transaction(function () use ($b, $count, $first, $last, $deposit) {
            $paid = $b->installments()->where('status', 'paid')->get();
            $b->installments()->whereNot('status', 'paid')->delete();
            $seq = (int) ($paid->max('seq') ?? -1) + 1;
            $covered = (int) $paid->sum('amount');
            $left = max(0, $b->total - max($covered, (int) $b->paid));
            $rows = [];
            if ($deposit && $deposit > 0 && $deposit < $left && $paid->isEmpty() && $b->paid == 0) {
                $rows[] = ['label' => 'Booking deposit', 'due_date' => today()->toDateString(), 'amount' => $deposit]; $left -= $deposit;
            }
            $f = Carbon::parse($first); $l = Carbon::parse($last); $count = max(1, $count);
            $step = $count > 1 ? $f->diffInDays($l) / ($count - 1) : 0; $each = intdiv($left, $count);
            for ($k = 0; $k < $count; $k++) {
                $rows[] = ['label' => $k === $count - 1 ? 'Final payment' : 'Installment '.($k + 1), 'due_date' => $f->copy()->addDays((int) round($step * $k))->toDateString(), 'amount' => $k === $count - 1 ? $left - $each * ($count - 1) : $each];
            }
            foreach ($rows as $r) $b->installments()->create($r + ['seq' => $seq++, 'status' => 'upcoming']);
            $b->installments()->whereNot('status', 'paid')->orderBy('seq')->first()?->update(['status' => 'due']);
            if ($b->payment_mode !== 'installment') $b->update(['payment_mode' => 'installment', 'hold_expires_at' => null]);
            $b->log('schedule', "Installment schedule generated ({$count} installments)", ['rows' => $rows]);
            AuditLog::record('booking.schedule', $b, null, ['rows' => count($rows)]);
        });
    }

    public function changeStatus(Booking $b, string $to, ?string $note = null): void
    {
        $from = $b->status;
        if ($from === $to) return;
        DB::transaction(function () use ($b, $from, $to, $note) {
            if ($to === 'cancelled') {
                $this->releaseSeats($b);
                $b->commissions()->whereIn('status', ['pending', 'approved'])->update(['status' => 'void']);
            } elseif ($from === 'cancelled') {
                $b->package?->increment('seats_sold', $b->adults + $b->children);
                $b->commissions()->where('status', 'void')->update(['status' => 'pending']);
            }
            $b->update(['status' => $to] + ($to === 'confirmed' ? ['hold_expires_at' => null] : []));
            $b->log('status', $note, [], $from, $to);
            AuditLog::record('booking.status', $b, ['status' => $from], ['status' => $to, 'note' => $note]);
        });
    }

    private function releaseSeats(Booking $b): void
    {
        if ($b->package && $b->package->seats_sold > 0) $b->package->decrement('seats_sold', min($b->package->seats_sold, $b->adults + $b->children));
    }

    public function delete(Booking $b, ?string $reason = null): void
    {
        DB::transaction(function () use ($b, $reason) {
            if ($b->status !== 'cancelled') $this->releaseSeats($b);
            $b->log('deleted', $reason ?: 'Booking moved to trash');
            $b->delete();
            AuditLog::record('booking.delete', $b, $b->only('ref', 'status', 'total', 'paid'), ['reason' => $reason]);
        });
    }

    public function restore(Booking $b): void
    {
        DB::transaction(function () use ($b) {
            $b->restore();
            if ($b->status !== 'cancelled') $b->package?->increment('seats_sold', $b->adults + $b->children);
            $b->log('restored', 'Booking restored from trash');
            AuditLog::record('booking.restore', $b);
        });
    }

    /** Record an offline payment (cash / bank / bKash ref) and apply it immediately. */
    public function recordPayment(Booking $b, array $d): Payment
    {
        if ((int) $d['amount'] > max(0, $b->total - $b->paid)) {
            throw ValidationException::withMessages(['amount' => 'Amount is more than the balance due ('.money($b->due()).').']);
        }
        $p = $b->payments()->create([
            'installment_id' => $d['installment_id'] ?? null, 'method' => $d['method'], 'amount' => (int) $d['amount'], 'status' => 'pending',
            'gateway_txn_id' => ($d['txn'] ?? null) ?: null, 'note' => $d['note'] ?? null, 'recorded_by' => auth()->id(), 'slip_path' => $d['slip_path'] ?? null,
        ]);
        $this->payments->markPaid($p, $p->gateway_txn_id ?? 'MAN-'.$p->id, ['recorded' => true], auth()->id());
        if (! empty($d['paid_at'])) $p->update(['paid_at' => Carbon::parse($d['paid_at'])]);
        AuditLog::record('payment.record', $p, null, $p->only('amount', 'method', 'gateway_txn_id'));

        return $p->fresh();
    }

    public function refund(Payment $p, int $amount, ?string $reason, ?string $method = null): Refund
    {
        if ($amount < 1 || $amount > $p->refundable()) {
            throw ValidationException::withMessages(['amount' => 'Refund must be between ৳1 and '.money($p->refundable()).'.']);
        }

        return DB::transaction(function () use ($p, $amount, $reason, $method) {
            $r = $p->refunds()->create(['amount' => $amount, 'reason' => $reason, 'method' => $method ?? $p->method, 'status' => 'processed', 'processed_at' => now(), 'processed_by' => auth()->id()]);
            $p->refunded += $amount;
            $p->status = $p->refunded >= $p->amount ? 'refunded' : 'partially_refunded';
            $p->save();
            $b = $p->booking; $b->paid = max(0, $b->paid - $amount); $b->save();
            if ($p->installment_id && $p->status === 'refunded') $p->installment?->update(['status' => 'due', 'paid_at' => null]);
            LedgerEntry::create(['account_type' => 'booking', 'account_id' => $b->id, 'debit' => $amount, 'balance_after' => $b->total - $b->paid, 'ref_type' => 'refund', 'ref_id' => $r->id, 'note' => $reason]);
            $b->log('refund', 'Refund '.money($amount).' on payment #'.$p->id.($reason ? " – {$reason}" : ''), ['refund_id' => $r->id]);
            AuditLog::record('payment.refund', $p, null, ['amount' => $amount, 'reason' => $reason]);

            return $r;
        });
    }

    public function syncCommission(Booking $b): void
    {
        $b->load('agent');
        $c = $b->commissions()->whereIn('status', ['pending', 'approved'])->first();
        if (! $b->agent) { $c?->update(['status' => 'void']); return; }
        $amt = (int) round($b->total * $b->agent->commission_percent / 100);
        if ($c && $c->agent_id === $b->agent_id) $c->update(['amount' => $amt]);
        else { $c?->update(['status' => 'void']); if ($amt > 0) Commission::create(['agent_id' => $b->agent_id, 'booking_id' => $b->id, 'amount' => $amt]); }
    }

    public function uploadDocument(Document $doc, UploadedFile $f): void
    {
        $doc->update(['path' => $f->store('documents'), 'mime' => $f->getMimeType(), 'size' => $f->getSize(), 'status' => 'pending', 'note' => null]);
        $doc->bookingTraveller->booking->log('document', ucfirst($doc->type).' uploaded for '.$doc->bookingTraveller->traveller->full_name);
        AuditLog::record('document.upload', $doc);
    }

    public function reviewDocument(Document $doc, string $status, ?string $note): void
    {
        $doc->update(['status' => $status, 'note' => $note, 'reviewer_id' => auth()->id()]);
        $bt = $doc->bookingTraveller;
        if ($doc->type === 'passport' && $status === 'verified') $bt->traveller->passport?->update(['verified_at' => now()]);
        $bt->booking->log('document', ucfirst($doc->type)." {$status} – {$bt->traveller->full_name}".($note ? " ({$note})" : ''));
        AuditLog::record('document.'.$status, $doc, null, ['note' => $note]);
    }

    public function updateVisa(\App\Models\BookingTraveller $bt, array $d): VisaApplication
    {
        $visa = $bt->visa ?? $bt->visa()->create([
            'ref' => 'VS-'.now()->format('y').'-'.str_pad((string) (VisaApplication::count() + 1), 5, '0', STR_PAD_LEFT),
            'applicant_name' => $bt->traveller->full_name, 'phone' => $bt->traveller->phone, 'visa_type' => ucfirst($bt->booking->type).' visa',
            'provider' => 'nusuk', 'status' => 'draft', 'status_history' => [],
        ]);
        $hist = $visa->status_history ?? []; $hist[] = ['status' => $d['status'], 'at' => now()->toDateTimeString(), 'by' => auth()->user()?->name];
        $visa->update(['status' => $d['status'], 'visa_no' => $d['visa_no'] ?? $visa->visa_no, 'provider_ref' => $d['provider_ref'] ?? $visa->provider_ref, 'status_history' => $hist, 'issued_at' => $d['status'] === 'issued' ? now() : $visa->issued_at]);
        $bt->booking->log('visa', "Visa {$visa->ref}: {$d['status']} – {$bt->traveller->full_name}");
        AuditLog::record('visa.status', $visa, null, $d);

        return $visa;
    }
}
