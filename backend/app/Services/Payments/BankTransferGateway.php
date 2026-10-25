<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use App\Support\Settings;
use Illuminate\Http\Request;

/** Manual bank transfer: the traveller gives a slip/transaction reference; accounts verifies it in the admin. */
final class BankTransferGateway implements Gateway
{
    public function code(): string
    {
        return 'bank_transfer';
    }

    public function label(): string
    {
        return 'Bank transfer';
    }

    public function configured(): bool
    {
        return ! empty(Settings::get('payments.bank_details'));
    }

    public function initiate(Payment $payment, Booking $booking): array
    {
        $payment->update(['status' => 'pending']);
        // Keep the seats a while longer so accounts can match the transfer.
        if ($booking->hold_expires_at) {
            $booking->update(['hold_expires_at' => now()->addHours((int) Settings::get('commerce.bank_hold_hours', 24))]);
        }

        return ['pending' => true, 'instructions' => Settings::get('payments.bank_details')];
    }

    public function verifyReturn(Request $request, Payment $payment): array
    {
        return ['status' => 'pending', 'txn' => $payment->gateway_txn, 'amount' => null, 'raw' => []];
    }

    public function verifyIpn(Request $request): ?array
    {
        return null;
    }
}
