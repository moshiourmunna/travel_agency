<?php

namespace App\Http\Controllers\Admin;

use App\Admin\Resources\BookingResource as BR;
use App\Admin\Resources\PaymentResource as PR;
use App\Admin\Resources\RefundResource;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\Payment;
use App\Models\User;
use App\Services\Checkout\BookingService;
use App\Services\RefundService;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Booking desk: one booking with its money, travellers, timeline and every operation staff can run on it. */
class BookingController extends Controller
{
    /** status => statuses staff may move it to by hand */
    public const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'partial' => ['confirmed', 'cancelled'],
        'confirmed' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
        'refunded' => [],
    ];

    public const NOTIFY = ['booking_confirmed' => ['Booking confirmation', 'বুকিং নিশ্চিতকরণ'], 'payment_received' => ['Payment receipt (last payment)', 'পেমেন্ট রসিদ (শেষ পেমেন্ট)'],
        'instalment_due' => ['Balance / instalment reminder', 'বাকি / কিস্তি রিমাইন্ডার'], 'booking_cancelled' => ['Cancellation notice', 'বাতিলের নোটিশ']];

    private static function label(array $map, ?string $k): string
    {
        return $k && isset($map[$k]) ? tr_pick(['en' => $map[$k][0], 'bn' => $map[$k][1]]) : (string) $k;
    }

    public function show(Request $r, Booking $booking): Response
    {
        abort_unless($r->user()->can('bookings.view'), 403);
        $u = $r->user();
        $b = $booking->load(['items', 'travellers', 'payments', 'refunds', 'instalments', 'documents', 'user', 'owner', 'agent', 'coupon', 'activities.user']);
        $productEdit = null;
        $publicUrl = null;
        $map = ['tour' => ['tours', \App\Models\Tour::class, '/tours/'], 'cruise' => ['cruises', \App\Models\Cruise::class, '/cruises/'], 'activity' => ['activities', \App\Models\Activity::class, '/activities/'],
            'hotel' => ['hotels', \App\Models\Hotel::class, '/hotels/'], 'visa' => ['visa-products', \App\Models\VisaProduct::class, '/visa/']];
        if (isset($map[$b->kind]) && $b->product_id) {
            [$slug, $class, $prefix] = $map[$b->kind];
            $p = $class::withoutGlobalScopes()->find($b->product_id);
            if ($p) {
                $productEdit = $u->can('catalog.view') ? route('admin.resource.edit', [$slug, $p->id], false) : null;
                $publicUrl = \App\Admin\Resources\Concerns\Common::site($prefix.$p->slug);
            }
        }
        $refundable = $b->payments->where('status', 'success')->map(function ($p) use ($b) {
            $taken = (float) $b->refunds->where('payment_id', $p->id)->whereIn('status', ['requested', 'approved', 'processed'])->sum('amount');

            return ['id' => $p->id, 'label' => (PR::GATEWAYS[$p->gateway] ?? $p->gateway).' · ৳'.number_format((float) $p->amount).' · '.$p->paid_at?->format('d M Y'), 'max' => max(0, (float) $p->amount - $taken)];
        })->filter(fn ($x) => $x['max'] > 0)->values();
        $fee = (float) Settings::get('commerce.cancellation_fee', 0);
        $lang = $b->contact['locale'] ?? 'en';

        return Inertia::render('Bookings/Show', [
            'booking' => [
                'id' => $b->id, 'ref' => $b->ref, 'kind' => $b->kind, 'kind_label' => tr_pick(BR::KINDS[$b->kind] ?? ['en' => $b->kind, 'bn' => $b->kind]), 'title' => $b->tr('title'), 'subtitle' => $b->tr('subtitle'),
                'status' => $b->status, 'status_label' => self::label(BR::STATUS, $b->status), 'status_color' => BR::STATUS[$b->status][2] ?? 'gray',
                'payment_status' => $b->payment_status, 'payment_label' => self::label(BR::PAY, $b->payment_status), 'payment_color' => BR::PAY[$b->payment_status][2] ?? 'gray',
                'channel' => $b->channel, 'contact' => $b->contact, 'notes' => $b->notes, 'travel_start' => $b->travel_start?->toDateString(), 'travel_end' => $b->travel_end?->toDateString(),
                'pax' => $b->pax, 'pax_count' => $b->pax_count, 'subtotal' => (float) $b->subtotal, 'discount' => (float) $b->discount, 'tax' => (float) $b->tax, 'total' => (float) $b->total,
                'paid' => (float) $b->paid, 'balance' => $b->balance(), 'cost' => $u->can('dashboard.finance') ? (float) $b->cost : null, 'currency' => $b->currency, 'payment_plan' => $b->payment_plan,
                'miles_earned' => $b->miles_earned, 'cancelled_at' => $b->cancelled_at?->toIso8601String(), 'cancel_reason' => $b->cancel_reason, 'hold_expires_at' => $b->hold_expires_at?->toIso8601String(),
                'created_at' => $b->created_at?->toIso8601String(), 'coupon' => $b->coupon?->code,
                'customer' => $b->user ? ['id' => $b->user->id, 'name' => $b->user->name, 'email' => $b->user->email, 'phone' => $b->user->phone, 'code' => $b->user->code, 'href' => $u->can('customers.view') ? route('admin.resource.show', ['customers', $b->user->id], false) : null] : null,
                'owner' => $b->owner ? ['id' => $b->owner->id, 'name' => $b->owner->name] : null,
                'agent' => $b->agent ? ['id' => $b->agent->id, 'name' => $b->agent->tr('company'), 'code' => $b->agent->code] : null,
                'product_edit' => $productEdit, 'public_url' => $publicUrl,
                'receipt_url' => rtrim(config('musafir.frontend_url'), '/')."/{$lang}/booking-confirmed?ref={$b->ref}&key={$b->ulid}",
            ],
            'items' => $b->items->map(fn ($i) => ['id' => $i->id, 'label' => $i->tr('label'), 'qty' => (float) $i->qty, 'unit' => (float) $i->unit_price, 'total' => (float) $i->line_total]),
            'travellers' => $b->travellers->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'type' => $t->type, 'ticket_no' => $t->ticket_no, 'seat' => $t->seat]),
            'payments' => $b->payments->sortByDesc('id')->values()->map(fn ($p) => [
                'id' => $p->id, 'gateway' => PR::GATEWAYS[$p->gateway] ?? $p->gateway, 'method' => $p->method, 'amount' => (float) $p->amount, 'status' => $p->status,
                'status_label' => self::label(PR::STATUS, $p->status), 'status_color' => PR::STATUS[$p->status][2] ?? 'gray', 'txn' => $p->gateway_txn, 'paid_at' => $p->paid_at?->toIso8601String(),
                'created_at' => $p->created_at?->toIso8601String(), 'href' => $u->can('payments.view') ? route('admin.resource.show', ['payments', $p->id], false) : null,
                'verifiable' => $p->gateway === 'bank_transfer' && $p->status === 'pending',
            ]),
            'refunds' => $b->refunds->sortByDesc('id')->values()->map(fn ($x) => ['id' => $x->id, 'amount' => (float) $x->amount, 'reason' => $x->reason, 'status' => $x->status,
                'status_label' => self::label(RefundResource::STATUS, $x->status), 'status_color' => RefundResource::STATUS[$x->status][2] ?? 'gray', 'created_at' => $x->created_at?->toIso8601String(), 'processed_at' => $x->processed_at?->toIso8601String()]),
            'instalments' => $b->instalments->map(fn ($i) => ['seq' => $i->seq, 'due_date' => $i->due_date?->toDateString(), 'amount' => (float) $i->amount, 'status' => $i->status]),
            'timeline' => $b->activities->map(fn ($a) => ['id' => $a->id, 'type' => $a->type, 'body' => $a->tr('body'), 'internal' => (bool) $a->internal, 'by' => $a->user?->name, 'at' => $a->created_at?->toIso8601String()]),
            'options' => [
                'transitions' => collect(self::TRANSITIONS[$b->status] ?? [])->map(fn ($s) => ['value' => $s, 'label' => self::label(BR::STATUS, $s)])->values(),
                'staff' => User::where('type', 'staff')->where('status', 'active')->orderBy('name')->get(['id', 'name'])->map(fn ($s) => ['value' => $s->id, 'label' => $s->name]),
                'refundable' => $refundable,
                'refund_suggestion' => max(0, (float) $b->paid - $fee),
                'cancellation_fee' => $fee,
                'notify' => collect(self::NOTIFY)->map(fn ($l, $k) => ['value' => $k, 'label' => tr_pick(['en' => $l[0], 'bn' => $l[1]])])->values(),
                'methods' => collect(['cash' => 'Cash at office', 'bank_transfer' => 'Bank deposit / transfer', 'bkash' => 'bKash (manual)', 'nagad' => 'Nagad (manual)', 'cheque' => 'Cheque', 'card_pos' => 'Card (POS machine)'])
                    ->map(fn ($l, $k) => ['value' => $k, 'label' => $l])->values(),
            ],
            'can' => [
                'update' => $u->can('bookings.update'), 'cancel' => $u->can('bookings.cancel'), 'record' => $u->can('payments.record'),
                'refund' => $u->can('payments.refund'), 'reconcile' => $u->can('payments.reconcile'),
            ],
        ]);
    }

    private function addNote(Booking $b, User $u, string $en, ?string $bn = null, string $type = 'status', bool $internal = false): void
    {
        BookingActivity::create(['booking_id' => $b->id, 'user_id' => $u->id, 'type' => $type, 'body' => ['en' => $en, 'bn' => $bn ?? $en], 'internal' => $internal]);
    }

    private function done(string $msg): RedirectResponse
    {
        Cache::forget('admin.badges');

        return back()->with('success', $msg);
    }

    private static function bn(): bool
    {
        return app()->getLocale() === 'bn';
    }

    public function status(Request $r, Booking $booking): RedirectResponse
    {
        $d = $r->validate([
            'status' => ['required', Rule::in(self::TRANSITIONS[$booking->status] ?? [])],
            'reason' => ['nullable', 'string', 'max:250', Rule::requiredIf(fn () => $r->input('status') === 'cancelled')],
            'notify' => ['nullable', 'boolean'],
        ], ['status.in' => self::bn() ? 'এই অবস্থায় বদলানো যাবে না।' : 'The booking cannot move to that status from here.']);
        abort_unless($r->user()->can($d['status'] === 'cancelled' ? 'bookings.cancel' : 'bookings.update'), 403);
        $from = $booking->status;
        DB::transaction(function () use ($booking, $d, $r, $from) {
            $b = Booking::whereKey($booking->id)->lockForUpdate()->first();
            if ($d['status'] === 'cancelled') {
                $b->update(['status' => 'cancelled', 'cancelled_at' => now(), 'cancel_reason' => $d['reason'], 'hold_expires_at' => null]);
                app(BookingService::class)->releaseHold($b);
            } else {
                $b->update(['status' => $d['status']]);
            }
            $this->addNote($b, $r->user(), 'Status changed: '.self::label(BR::STATUS, $from).' → '.BR::STATUS[$d['status']][0].($d['reason'] ?? null ? ' — '.$d['reason'] : ''),
                'অবস্থা পরিবর্তন: '.(BR::STATUS[$from][1] ?? $from).' → '.BR::STATUS[$d['status']][1].($d['reason'] ?? null ? ' — '.$d['reason'] : ''));
            ResourceController::log('updated', $b, null, ['status' => $from], ['status' => $d['status']], ['resource' => 'bookings', 'title' => $b->ref]);
        });
        if (! empty($d['notify']) && in_array($d['status'], ['cancelled', 'confirmed'], true)) {
            app(BookingService::class)->notify($booking->fresh(), $d['status'] === 'cancelled' ? 'booking_cancelled' : 'booking_confirmed', ['refund' => '0']);
        }

        return $this->done(self::bn() ? 'বুকিংয়ের অবস্থা হালনাগাদ হয়েছে।' : 'Booking status updated.');
    }

    public function assign(Request $r, Booking $booking): RedirectResponse
    {
        abort_unless($r->user()->can('bookings.update'), 403);
        $d = $r->validate(['owner_staff_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('type', 'staff')]]);
        $old = $booking->owner_staff_id;
        $booking->update(['owner_staff_id' => $d['owner_staff_id'] ?? null]);
        $name = $booking->owner_staff_id ? User::find($booking->owner_staff_id)->name : '—';
        $this->addNote($booking, $r->user(), 'Assigned to '.$name, $name.'-কে দায়িত্ব দেওয়া হয়েছে', 'note', true);
        ResourceController::log('updated', $booking, null, ['owner_staff_id' => $old], ['owner_staff_id' => $booking->owner_staff_id], ['resource' => 'bookings', 'title' => $booking->ref]);

        return $this->done(self::bn() ? 'দায়িত্ব হালনাগাদ হয়েছে।' : 'Booking owner updated.');
    }

    public function note(Request $r, Booking $booking): RedirectResponse
    {
        abort_unless($r->user()->can('bookings.update'), 403);
        $d = $r->validate(['body' => ['required', 'string', 'max:2000'], 'internal' => ['nullable', 'boolean']]);
        $this->addNote($booking, $r->user(), strip_tags($d['body']), null, 'note', (bool) ($d['internal'] ?? true));

        return $this->done(self::bn() ? 'নোট যোগ হয়েছে।' : 'Note added.');
    }

    /** Record money received outside the online gateways (cash, deposit, manual bKash, POS…). */
    public function payment(Request $r, Booking $booking): RedirectResponse
    {
        abort_unless($r->user()->can('payments.record'), 403);
        $d = $r->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:'.max(1, $booking->balance())],
            'method' => ['required', Rule::in(['cash', 'bank_transfer', 'bkash', 'nagad', 'cheque', 'card_pos'])],
            'reference' => ['nullable', 'string', 'max:64'],
            'note' => ['nullable', 'string', 'max:250'],
        ], ['amount.max' => self::bn() ? 'বাকি পরিমাণের বেশি হতে পারবে না।' : 'Cannot be more than the balance due (৳:max).']);
        if (in_array($booking->status, ['cancelled', 'refunded'], true)) {
            throw ValidationException::withMessages(['amount' => self::bn() ? 'বাতিল বুকিংয়ে পেমেন্ট নেওয়া যাবে না।' : 'This booking is cancelled.']);
        }
        $labels = ['cash' => 'Cash at office', 'bank_transfer' => 'Bank deposit', 'bkash' => 'bKash (manual)', 'nagad' => 'Nagad (manual)', 'cheque' => 'Cheque', 'card_pos' => 'Card (POS)'];
        $gateway = in_array($d['method'], ['bank_transfer', 'bkash', 'nagad'], true) ? $d['method'] : 'cash';
        $p = Payment::create(['booking_id' => $booking->id, 'user_id' => $booking->user_id, 'purpose' => 'booking', 'gateway' => $gateway, 'method' => $labels[$d['method']], 'amount' => $d['amount'],
            'status' => 'pending', 'gateway_txn' => $d['reference'] ?? null, 'raw' => ['recorded_by' => $r->user()->id, 'note' => $d['note'] ?? null, 'manual' => true]]);
        app(BookingService::class)->settle($p, ['recorded_at' => now()->toIso8601String()]);
        ResourceController::log('created', $p, null, [], ['amount' => (float) $d['amount'], 'method' => $labels[$d['method']]], ['resource' => 'payments', 'title' => $booking->ref]);

        return $this->done(self::bn() ? 'পেমেন্ট রেকর্ড হয়েছে।' : 'Payment recorded and the traveller notified.');
    }

    public function refund(Request $r, Booking $booking): RedirectResponse
    {
        abort_unless($r->user()->can('payments.refund'), 403);
        $d = $r->validate([
            'payment_id' => ['required', 'integer', Rule::exists('payments', 'id')->where('booking_id', $booking->id)],
            'amount' => ['required', 'numeric', 'min:1'],
            'reason' => ['required', 'string', 'max:200'],
            'to' => ['required', Rule::in(['original', 'wallet'])],
            'process_now' => ['nullable', 'boolean'],
        ]);
        if ($d['to'] === 'wallet' && ! $booking->user_id) {
            throw ValidationException::withMessages(['to' => self::bn() ? 'অতিথি বুকিংয়ে ওয়ালেট নেই।' : 'Guest bookings have no wallet — refund to the original method.']);
        }
        $svc = app(RefundService::class);
        $refund = $svc->request($booking, Payment::findOrFail($d['payment_id']), (float) $d['amount'], $d['reason'], $r->user(), $d['to']);
        if (! empty($d['process_now'])) {
            $svc->approve($refund, $r->user());
            $svc->process($refund->fresh(), $r->user());
        }
        ResourceController::log('created', $refund, null, [], ['amount' => (float) $d['amount'], 'to' => $d['to']], ['resource' => 'refunds', 'title' => $booking->ref]);

        return $this->done(! empty($d['process_now']) ? (self::bn() ? 'রিফান্ড সম্পন্ন হয়েছে।' : 'Refund processed.') : (self::bn() ? 'রিফান্ড অনুরোধ তৈরি হয়েছে — অনুমোদনের অপেক্ষায়।' : 'Refund requested — waiting for approval in Refunds.'));
    }

    public function notify(Request $r, Booking $booking): RedirectResponse
    {
        abort_unless($r->user()->can('bookings.update'), 403);
        $d = $r->validate(['key' => ['required', Rule::in(array_keys(self::NOTIFY))]]);
        $extra = match ($d['key']) {
            'payment_received' => ($p = $booking->payments()->where('status', 'success')->latest('paid_at')->first()) ? ['amount' => number_format((float) $p->amount), 'method' => $p->method] : null,
            'instalment_due' => ['amount' => number_format($booking->balance()), 'due' => $booking->instalments()->where('status', '!=', 'paid')->first()?->due_date?->format('d M Y') ?? ''],
            'booking_cancelled' => ['refund' => number_format((float) $booking->refunds()->where('status', 'processed')->sum('amount'))],
            default => [],
        };
        if ($extra === null) {
            throw ValidationException::withMessages(['key' => self::bn() ? 'কোনো সফল পেমেন্ট নেই।' : 'There is no successful payment to send a receipt for.']);
        }
        app(BookingService::class)->notify($booking, $d['key'], $extra);
        $this->addNote($booking, $r->user(), 'Message sent: '.self::NOTIFY[$d['key']][0], 'বার্তা পাঠানো হয়েছে: '.self::NOTIFY[$d['key']][1], 'note', true);

        return $this->done(self::bn() ? 'বার্তা পাঠানো হয়েছে।' : 'Message sent to the traveller.');
    }
}
