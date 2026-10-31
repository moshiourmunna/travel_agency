<?php

namespace App\Services;

use App\Http\Controllers\Api\V1\MeController;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Services\Checkout\BookingService;
use App\Services\Payments\BkashGateway;
use App\Services\Payments\GatewayManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Refund life cycle used by the admin: requested → approved → processed (money sent back) or rejected.
 * Processing either refunds through the gateway (bKash live API; other gateways and sandbox are marked
 * as refunded manually by accounts) or credits the traveller's Musafir wallet, then updates the booking.
 */
final class RefundService
{
    public function request(Booking $b, Payment $p, float $amount, string $reason, User $staff, string $to = 'original'): Refund
    {
        $refundable = (float) $p->amount - (float) $p->refunds()->whereIn('status', ['requested', 'approved', 'processed'])->sum('amount');
        if ($p->booking_id !== $b->id || $p->status !== 'success') {
            throw ValidationException::withMessages(['payment_id' => 'Only a successful payment of this booking can be refunded.']);
        }
        if ($amount <= 0 || $amount > $refundable + 0.01) {
            throw ValidationException::withMessages(['amount' => 'Refund must be between 1 and '.number_format($refundable).' (not yet refunded from this payment).']);
        }

        return Refund::create(['payment_id' => $p->id, 'booking_id' => $b->id, 'amount' => $amount, 'reason' => mb_substr(($to === 'wallet' ? '[wallet] ' : '').$reason, 0, 250), 'status' => 'requested', 'requested_by' => $staff->id]);
    }

    public function approve(Refund $r, User $staff): Refund
    {
        if (! ($r->status === 'requested')) {
                        \App\Admin\Action::fail('Only a requested refund can be approved.');
                    }
        $r->update(['status' => 'approved', 'approved_by' => $staff->id]);
        $this->log($r, 'Refund approved: ৳ '.number_format((float) $r->amount), 'রিফান্ড অনুমোদিত: ৳ '.number_format((float) $r->amount), $staff);

        return $r;
    }

    public function reject(Refund $r, User $staff, string $note = ''): Refund
    {
        if (! (in_array($r->status, ['requested', 'approved'], true))) {
            \App\Admin\Action::fail('This refund cannot be changed now.');
        }
        $r->update(['status' => 'rejected', 'approved_by' => $staff->id]);
        $this->log($r, 'Refund rejected'.($note ? ': '.$note : ''), 'রিফান্ড প্রত্যাখ্যাত'.($note ? ': '.$note : ''), $staff);

        return $r;
    }

    public function process(Refund $r, User $staff): Refund
    {
        if (! ($r->status === 'approved')) {
                        \App\Admin\Action::fail('Approve the refund first.');
                    }

        return DB::transaction(function () use ($r, $staff) {
            $r = Refund::whereKey($r->id)->lockForUpdate()->first();
            $p = Payment::find($r->payment_id);
            $b = Booking::whereKey($r->booking_id)->lockForUpdate()->first();
            $amount = (float) $r->amount;
            $viaWallet = str_starts_with((string) $r->reason, '[wallet]');
            $how = 'manual';
            if ($viaWallet && $b?->user_id) {
                MeController::credit(User::find($b->user_id), $amount, ['en' => 'Refund for '.$b->ref, 'bn' => $b->ref.' এর রিফান্ড'], 'rotate-ccw', $r);
                $how = 'wallet';
            } elseif ($p && $p->gateway === 'bkash' && GatewayManager::live() && (new BkashGateway)->configured()) {
                $res = (new BkashGateway)->refund($p, $amount, (string) $r->reason);
                if (($res['transactionStatus'] ?? '') !== 'Completed') {
                    throw ValidationException::withMessages(['refund' => 'bKash refused the refund: '.($res['statusMessage'] ?? $res['errorMessage'] ?? 'unknown error')]);
                }
                $how = 'bkash';
            }
            $r->update(['status' => 'processed', 'processed_at' => now(), 'approved_by' => $r->approved_by ?? $staff->id]);
            if ($p) {
                $refunded = (float) $p->refunds()->where('status', 'processed')->sum('amount');
                if ($refunded >= (float) $p->amount - 0.5) {
                    $p->update(['status' => 'refunded']);
                }
            }
            if ($b) {
                $paid = max(0, (float) $b->paid - $amount);
                $b->update(['paid' => $paid, 'payment_status' => $paid <= 0.5 ? 'refunded' : 'partial', 'status' => $paid <= 0.5 && in_array($b->status, ['cancelled', 'refunded'], true) ? 'refunded' : $b->status]);
                if ($paid <= 0.5 && $b->status === 'cancelled') {
                    $b->update(['status' => 'refunded']);
                }
                app(BookingService::class)->notify($b->fresh(), 'booking_cancelled', ['refund' => number_format($amount)]);
            }
            $this->log($r, 'Refund paid ('.$how.'): ৳ '.number_format($amount), 'রিফান্ড প্রদান ('.$how.'): ৳ '.number_format($amount), $staff);

            return $r->fresh();
        });
    }

    private function log(Refund $r, string $en, string $bn, User $staff): void
    {
        if ($r->booking_id) {
            BookingActivity::create(['booking_id' => $r->booking_id, 'user_id' => $staff->id, 'type' => 'payment', 'body' => ['en' => $en, 'bn' => $bn], 'internal' => false]);
        }
    }
}
