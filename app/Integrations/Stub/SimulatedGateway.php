<?php

namespace App\Integrations\Stub;

use App\Integrations\Contracts\PaymentGateway;
use App\Integrations\LogsCalls;
use App\Models\Payment;

/**
 * Demo gateway for bKash / Nagad / SSLCommerz until merchant keys are added.
 * Sends the customer to a local "gateway" page where they can approve or fail the payment.
 * Replace with real drivers in config/integrations.php (PAYMENT_DRIVER_BKASH=… etc.).
 */
class SimulatedGateway implements PaymentGateway
{
    use LogsCalls;

    public function createIntent(Payment $payment): string
    {
        $this->logged('pay_'.$payment->method, 'create_intent', ['payment' => $payment->id, 'amount' => $payment->amount], fn () => ['ok' => true]);
        return route('payment.simulate', $payment);
    }

    public function verify(Payment $payment, array $callback): array
    {
        $ok = ($callback['status'] ?? '') === 'success';
        return $this->logged('pay_'.$payment->method, 'verify', ['payment' => $payment->id, 'status' => $callback['status'] ?? null], fn () => [
            'ok' => $ok, 'txn_id' => $ok ? strtoupper(substr($payment->method, 0, 2)).strtoupper(substr(md5($payment->id.microtime()), 0, 8)) : null, 'payload' => ['simulated' => true],
        ]);
    }
}
