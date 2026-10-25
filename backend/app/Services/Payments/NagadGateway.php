<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentGatewayLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Nagad Remote Payment Gateway: initialize (RSA-encrypted sensitive data + merchant signature) → complete
 * → traveller pays on Nagad → callback → verify/payment/{payment_ref_id}. Amount is compared on verify.
 */
final class NagadGateway implements Gateway
{
    private function base(): string
    {
        return rtrim((string) config('services.nagad.base_url', 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'), '/');
    }

    public function code(): string
    {
        return 'nagad';
    }

    public function label(): string
    {
        return 'Nagad';
    }

    public function configured(): bool
    {
        return filled(config('services.nagad.merchant_id')) && filled(config('services.nagad.public_key')) && filled(config('services.nagad.private_key'));
    }

    private static function pem(string $key, string $type): string
    {
        $key = trim($key);
        if (str_contains($key, '-----BEGIN')) {
            return $key;
        }

        return "-----BEGIN {$type}-----\n".chunk_split($key, 64, "\n")."-----END {$type}-----";
    }

    private function encrypt(array $data): string
    {
        openssl_public_encrypt(json_encode($data), $out, self::pem((string) config('services.nagad.public_key'), 'PUBLIC KEY'));

        return base64_encode($out);
    }

    private function sign(array $data): string
    {
        openssl_sign(json_encode($data), $sig, self::pem((string) config('services.nagad.private_key'), 'PRIVATE KEY'), OPENSSL_ALGO_SHA256);

        return base64_encode($sig);
    }

    private function decrypt(string $data): array
    {
        openssl_private_decrypt(base64_decode($data), $out, self::pem((string) config('services.nagad.private_key'), 'PRIVATE KEY'));

        return (array) json_decode((string) $out, true);
    }

    private function headers(): array
    {
        return ['X-KM-Api-Version' => 'v-0.2.0', 'X-KM-IP-V4' => request()->ip() ?? '127.0.0.1', 'X-KM-Client-Type' => 'PC_WEB'];
    }

    public function initiate(Payment $payment, Booking $booking): array
    {
        $mid = (string) config('services.nagad.merchant_id');
        $order = substr(preg_replace('/[^A-Za-z0-9]/', '', $payment->ulid), 0, 20);
        $sensitive = ['merchantId' => $mid, 'datetime' => now('Asia/Dhaka')->format('YmdHis'), 'orderId' => $order, 'challenge' => Str::random(40)];
        $res = Http::timeout(30)->acceptJson()->withHeaders($this->headers())->post($this->base()."/check-out/initialize/{$mid}/{$order}", [
            'accountNumber' => config('services.nagad.merchant_number'), 'dateTime' => $sensitive['datetime'],
            'sensitiveData' => $this->encrypt($sensitive), 'signature' => $this->sign($sensitive),
        ]);
        $this->log($payment, 'out', 'initialize', ['status' => $res->status(), 'reason' => $res->json('reason')], $res->status());
        if (! $res->json('sensitiveData')) {
            throw new PaymentException($res->json('message') ?? 'Nagad could not start the payment.');
        }
        $init = $this->decrypt((string) $res->json('sensitiveData'));
        $ref = $init['paymentReferenceId'] ?? null;
        if (! $ref) {
            throw new PaymentException('Nagad initialise returned no reference.');
        }
        $complete = ['merchantId' => $mid, 'orderId' => $order, 'currencyCode' => '050', 'amount' => number_format((float) $payment->amount, 2, '.', ''), 'challenge' => $init['challenge'] ?? ''];
        $res2 = Http::timeout(30)->acceptJson()->withHeaders($this->headers())->post($this->base()."/check-out/complete/{$ref}", [
            'sensitiveData' => $this->encrypt($complete), 'signature' => $this->sign($complete),
            'merchantCallbackURL' => route('pay.return', ['gateway' => 'nagad', 'payment' => $payment->ulid]),
            'additionalMerchantInfo' => ['booking' => $booking->ref],
        ]);
        $this->log($payment, 'out', 'complete', (array) $res2->json(), $res2->status());
        if (($res2->json('status') ?? '') !== 'Success' || ! $res2->json('callBackUrl')) {
            throw new PaymentException($res2->json('message') ?? 'Nagad could not start the payment.');
        }
        $payment->update(['raw' => ['orderId' => $order, 'paymentReferenceId' => $ref]]);

        return ['redirect' => $res2->json('callBackUrl')];
    }

    public function verifyReturn(Request $request, Payment $payment): array
    {
        $ref = (string) $request->query('payment_ref_id');
        if ($ref === '' || $ref !== ($payment->raw['paymentReferenceId'] ?? null)) {
            return ['status' => 'failed', 'txn' => null, 'amount' => null, 'raw' => ['reason' => 'reference mismatch']];
        }
        if (strtolower((string) $request->query('status')) === 'aborted') {
            return ['status' => 'cancelled', 'txn' => null, 'amount' => null, 'raw' => []];
        }
        $res = Http::timeout(30)->acceptJson()->withHeaders($this->headers())->get($this->base()."/verify/payment/{$ref}");
        $j = (array) $res->json();
        $this->log($payment, 'in', 'verify', $j, $res->status());
        $ok = ($j['status'] ?? null) === 'Success' && ($j['orderId'] ?? null) === ($payment->raw['orderId'] ?? '') && abs((float) ($j['amount'] ?? 0) - (float) $payment->amount) < 0.01;

        return ['status' => $ok ? 'success' : 'failed', 'txn' => $j['issuerPaymentRefNo'] ?? $j['paymentRefId'] ?? null, 'amount' => (float) ($j['amount'] ?? 0), 'raw' => ['clientMobileNo' => $j['clientMobileNo'] ?? null]];
    }

    public function verifyIpn(Request $request): ?array
    {
        return null;
    }

    private function log(Payment $p, string $dir, string $endpoint, array $payload, ?int $status): void
    {
        PaymentGatewayLog::create(['payment_id' => $p->id, 'gateway' => 'nagad', 'direction' => $dir, 'endpoint' => $endpoint, 'payload' => $payload, 'http_status' => $status]);
    }
}
