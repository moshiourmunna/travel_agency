<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentGatewayLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * SSLCommerz (cards, mobile banking, net banking). Init API v4 → GatewayPageURL; the result is
 * always confirmed through the Order Validation API (val_id) and the amount/currency are compared.
 */
final class SslCommerzGateway implements Gateway
{
    private function base(): string
    {
        return config('services.sslcommerz.sandbox', true) ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
    }

    public function code(): string
    {
        return 'sslcommerz';
    }

    public function label(): string
    {
        return 'Card · SSLCommerz';
    }

    public function configured(): bool
    {
        return filled(config('services.sslcommerz.store_id')) && filled(config('services.sslcommerz.store_password'));
    }

    public function initiate(Payment $payment, Booking $booking): array
    {
        $c = $booking->contact ?? [];
        $ret = route('pay.return', ['gateway' => 'sslcommerz', 'payment' => $payment->ulid]);
        $body = [
            'store_id' => config('services.sslcommerz.store_id'), 'store_passwd' => config('services.sslcommerz.store_password'),
            'total_amount' => number_format((float) $payment->amount, 2, '.', ''), 'currency' => 'BDT', 'tran_id' => $payment->ulid,
            'success_url' => $ret, 'fail_url' => $ret, 'cancel_url' => $ret, 'ipn_url' => route('api.v1.payments.ipn', ['gateway' => 'sslcommerz']),
            'cus_name' => trim(($c['first_name'] ?? '').' '.($c['last_name'] ?? '')) ?: 'Traveller', 'cus_email' => $c['email'] ?? 'noreply@example.com',
            'cus_phone' => $c['phone'] ?? '01700000000', 'cus_add1' => $c['city'] ?? 'Dhaka', 'cus_city' => $c['city'] ?? 'Dhaka', 'cus_country' => 'Bangladesh',
            'shipping_method' => 'NO', 'product_name' => mb_substr($booking->getTranslation('title', 'en'), 0, 100), 'product_category' => 'travel', 'product_profile' => 'travel-vertical',
            'value_a' => $booking->ref,
        ];
        $res = Http::asForm()->timeout(30)->post($this->base().'/gwprocess/v4/api.php', $body);
        $this->log($payment, 'out', 'init', ['tran_id' => $payment->ulid, 'amount' => $body['total_amount']] + ['response' => $res->json()], $res->status());
        if ($res->json('status') !== 'SUCCESS' || ! $res->json('GatewayPageURL')) {
            throw new PaymentException($res->json('failedreason') ?: 'SSLCommerz could not start the payment.');
        }
        $payment->update(['gateway_txn' => null, 'raw' => ['sessionkey' => $res->json('sessionkey')]]);

        return ['redirect' => $res->json('GatewayPageURL')];
    }

    private function validate(string $valId): array
    {
        $res = Http::timeout(30)->get($this->base().'/validator/api/validationserverAPI.php', [
            'val_id' => $valId, 'store_id' => config('services.sslcommerz.store_id'), 'store_passwd' => config('services.sslcommerz.store_password'), 'format' => 'json',
        ]);

        return (array) $res->json();
    }

    private function result(array $v, Payment $payment): array
    {
        $ok = in_array($v['status'] ?? '', ['VALID', 'VALIDATED'], true) && ($v['tran_id'] ?? null) === $payment->ulid
            && abs((float) ($v['amount'] ?? 0) - (float) $payment->amount) < 0.01 && ($v['currency_type'] ?? $v['currency'] ?? 'BDT') === 'BDT';

        return ['status' => $ok ? 'success' : 'failed', 'txn' => $v['bank_tran_id'] ?? null, 'val_id' => $v['val_id'] ?? null, 'amount' => (float) ($v['amount'] ?? 0), 'raw' => ['card_type' => $v['card_type'] ?? null, 'card_issuer' => $v['card_issuer'] ?? null, 'risk_level' => $v['risk_level'] ?? null]];
    }

    public function verifyReturn(Request $request, Payment $payment): array
    {
        $status = strtoupper((string) $request->input('status'));
        if ($status === 'CANCELLED') {
            return ['status' => 'cancelled', 'txn' => null, 'amount' => null, 'raw' => []];
        }
        if (! $request->filled('val_id')) {
            return ['status' => 'failed', 'txn' => null, 'amount' => null, 'raw' => ['status' => $status]];
        }
        $v = $this->validate((string) $request->input('val_id'));
        $this->log($payment, 'in', 'validate', $v, 200);

        return $this->result($v, $payment);
    }

    public function verifyIpn(Request $request): ?array
    {
        if (! $request->filled('val_id') || ! $request->filled('tran_id')) {
            return null;
        }
        $payment = Payment::where('ulid', (string) $request->input('tran_id'))->first();
        if (! $payment) {
            return null;
        }
        $v = $this->validate((string) $request->input('val_id'));
        $this->log($payment, 'ipn', 'validate', $v, 200);

        return ['payment' => $payment->ulid] + $this->result($v, $payment);
    }

    private function log(Payment $p, string $dir, string $endpoint, array $payload, ?int $status): void
    {
        PaymentGatewayLog::create(['payment_id' => $p->id, 'gateway' => 'sslcommerz', 'direction' => $dir, 'endpoint' => $endpoint, 'payload' => $payload, 'http_status' => $status]);
    }
}
