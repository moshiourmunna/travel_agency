<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * A payment gateway driver. Amounts always come from the Payment row (computed server-side),
 * never from the browser. Results are normalised to:
 *   ['status' => 'success'|'failed'|'cancelled'|'pending', 'txn' => ?string, 'amount' => ?float, 'raw' => array]
 */
interface Gateway
{
    public function code(): string;

    /** Display label for receipts ("bKash", "Card · SSLCommerz"). */
    public function label(): string;

    /** Credentials present and the gateway is switched on in settings. */
    public function configured(): bool;

    /** Start a payment: returns ['redirect' => url] (or ['pending' => true, 'instructions' => [...]] for manual methods). */
    public function initiate(Payment $payment, Booking $booking): array;

    /** Verify the browser return/callback for this payment (must call the gateway's own verification API). */
    public function verifyReturn(Request $request, Payment $payment): array;

    /** Verify a server-to-server notification; returns the payment ULID it belongs to plus the normalised result, or null. */
    public function verifyIpn(Request $request): ?array;
}
