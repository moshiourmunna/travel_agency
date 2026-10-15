<?php

namespace App\Services;

use App\Models\LedgerEntry;

use App\Models\Booking;
use App\Models\Installment;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function gateway(string $method): ?\App\Integrations\Contracts\PaymentGateway
    {
        $cls = config("integrations.payments.$method");
        return $cls ? app($cls) : null;
    }

    /** Create a pending payment; returns the redirect URL for online methods or null for manual ones. */
    public function start(Booking $booking, string $method, int $amount, ?Installment $inst = null, ?string $slip = null): array
    {
        $payment = $booking->payments()->create([
            'installment_id' => $inst?->id, 'method' => $method, 'amount' => $amount, 'status' => 'pending', 'slip_path' => $slip,
        ]);
        $gw = $this->gateway($method);

        return [$payment, $gw?->createIntent($payment)];
    }

    /** Mark paid and update booking + installments (gateway callback or admin verification). */
    public function markPaid(Payment $payment, ?string $txn = null, array $payload = [], ?int $verifiedBy = null): void
    {
        if ($payment->status === 'paid') {
            return;
        }
        DB::transaction(function () use ($payment, $txn, $payload, $verifiedBy) {
            $payment->update(['status' => 'paid', 'gateway_txn_id' => $txn ?? $payment->gateway_txn_id, 'payload' => $payload ?: $payment->payload, 'paid_at' => now(), 'verified_by' => $verifiedBy]);
            $b = $payment->booking()->lockForUpdate()->first();
            $b->paid += $payment->amount;
            if ($payment->installment_id) {
                $payment->installment->update(['status' => 'paid', 'paid_at' => now()]);
            } elseif ($b->payment_mode === 'installment') {
                // allocate to the earliest unpaid installments
                $left = $payment->amount;
                foreach ($b->installments()->whereNot('status', 'paid')->get() as $i) {
                    if ($left < $i->amount) break;
                    $i->update(['status' => 'paid', 'paid_at' => now()]); $left -= $i->amount;
                }
            }
            $next = $b->installments()->whereNot('status', 'paid')->orderBy('seq')->first();
            $next?->update(['status' => 'due']);
            if (in_array($b->status, ['pending', 'hold'], true)) {
                $b->status = 'confirmed'; $b->hold_expires_at = null;
            }
            $b->save();
            LedgerEntry::create(['account_type' => 'booking', 'account_id' => $b->id, 'credit' => $payment->amount, 'balance_after' => $b->total - $b->paid, 'ref_type' => 'payment', 'ref_id' => $payment->id, 'note' => (Payment::METHODS[$payment->method] ?? $payment->method).' '.($payment->gateway_txn_id ?? '')]);
            $b->log('payment', 'Payment received: '.money($payment->amount).' via '.(Payment::METHODS[$payment->method] ?? $payment->method), ['payment_id' => $payment->id]);
        });
    }

    public function markFailed(Payment $payment, array $payload = []): void
    {
        if ($payment->status === 'pending') {
            $payment->update(['status' => 'failed', 'payload' => $payload]);
        }
    }
}
