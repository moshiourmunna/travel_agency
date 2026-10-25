<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

/** Local/sandbox simulator: a signed page with Pay / Fail / Cancel buttons. Never available when PAYMENT_MODE=live. */
final class MockGateway implements Gateway
{
    public function __construct(private string $as = 'mock', private string $display = 'Test gateway') {}

    public function code(): string
    {
        return $this->as;
    }

    public function label(): string
    {
        return $this->display;
    }

    public function configured(): bool
    {
        return ! GatewayManager::live();
    }

    public function initiate(Payment $payment, Booking $booking): array
    {
        $payment->update(['raw' => array_merge((array) $payment->raw, ['simulated' => true])]);

        return ['redirect' => URL::temporarySignedRoute('pay.mock', now()->addMinutes(30), ['payment' => $payment->ulid])];
    }

    public function verifyReturn(Request $request, Payment $payment): array
    {
        // The simulator posts back to a signed URL (checked by the route), so the result can be trusted.
        $r = (string) $request->input('result');

        return ['status' => in_array($r, ['success', 'failed', 'cancelled'], true) ? $r : 'failed', 'txn' => 'SIM'.strtoupper(substr($payment->ulid, -10)), 'amount' => (float) $payment->amount, 'raw' => ['simulated' => true, 'result' => $r]];
    }

    public function verifyIpn(Request $request): ?array
    {
        return null;
    }
}
