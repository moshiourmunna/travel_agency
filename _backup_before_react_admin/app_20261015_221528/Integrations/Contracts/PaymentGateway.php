<?php

namespace App\Integrations\Contracts;

use App\Models\Payment;

/** bKash / Nagad / SSLCommerz / bank. */
interface PaymentGateway
{
    /** Start a payment; returns the URL the customer must be sent to. */
    public function createIntent(Payment $payment): string;

    /** Verify the gateway callback/webhook; returns ['ok'=>bool,'txn_id'=>?string,'payload'=>array]. */
    public function verify(Payment $payment, array $callback): array;
}
