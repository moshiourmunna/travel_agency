<?php

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentGatewayLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * bKash Tokenized Checkout (v1.2.0-beta): grant token → create payment → traveller approves on bKash →
 * callback → execute (and query as a fallback). The amount executed is compared with the Payment row.
 */
final class BkashGateway implements Gateway
{
    private function base(): string
    {
        return rtrim((string) config('services.bkash.base_url', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'), '/');
    }

    public function code(): string
    {
        return 'bkash';
    }

    public function label(): string
    {
        return 'bKash';
    }

    public function configured(): bool
    {
        foreach (['app_key', 'app_secret', 'username', 'password'] as $k) {
            if (blank(config("services.bkash.$k"))) {
                return false;
            }
        }

        return true;
    }

    private function token(): string
    {
        return Cache::remember('bkash.id_token', 50 * 60, function () {
            $res = Http::timeout(30)->withHeaders(['username' => config('services.bkash.username'), 'password' => config('services.bkash.password')])
                ->acceptJson()->post($this->base().'/tokenized/checkout/token/grant', ['app_key' => config('services.bkash.app_key'), 'app_secret' => config('services.bkash.app_secret')]);
            if (! $res->json('id_token')) {
                throw new PaymentException('bKash token grant failed: '.($res->json('statusMessage') ?? $res->status()));
            }

            return (string) $res->json('id_token');
        });
    }

    private function call(string $path, array $body): array
    {
        $res = Http::timeout(30)->acceptJson()->withHeaders(['Authorization' => $this->token(), 'X-APP-Key' => config('services.bkash.app_key')])->post($this->base().$path, $body);

        return ['status' => $res->status(), 'json' => (array) $res->json()];
    }

    public function initiate(Payment $payment, Booking $booking): array
    {
        $r = $this->call('/tokenized/checkout/create', [
            'mode' => '0011', 'payerReference' => substr((string) ($booking->contact['phone'] ?? $booking->ref), 0, 32),
            'callbackURL' => route('pay.return', ['gateway' => 'bkash', 'payment' => $payment->ulid]),
            'amount' => number_format((float) $payment->amount, 2, '.', ''), 'currency' => 'BDT', 'intent' => 'sale', 'merchantInvoiceNumber' => $payment->ulid,
        ]);
        $this->log($payment, 'out', 'create', $r['json'], $r['status']);
        if (empty($r['json']['paymentID']) || empty($r['json']['bkashURL'])) {
            throw new PaymentException($r['json']['statusMessage'] ?? 'bKash could not start the payment.');
        }
        $payment->update(['raw' => ['paymentID' => $r['json']['paymentID']]]);

        return ['redirect' => $r['json']['bkashURL']];
    }

    public function verifyReturn(Request $request, Payment $payment): array
    {
        $status = strtolower((string) $request->query('status'));
        $pid = (string) $request->query('paymentID');
        if ($pid === '' || $pid !== ($payment->raw['paymentID'] ?? null)) {
            return ['status' => 'failed', 'txn' => null, 'amount' => null, 'raw' => ['reason' => 'paymentID mismatch']];
        }
        if ($status !== 'success') {
            return ['status' => $status === 'cancel' ? 'cancelled' : 'failed', 'txn' => null, 'amount' => null, 'raw' => ['status' => $status]];
        }
        $r = $this->call('/tokenized/checkout/execute', ['paymentID' => $pid]);
        $this->log($payment, 'in', 'execute', $r['json'], $r['status']);
        if (($r['json']['transactionStatus'] ?? null) !== 'Completed') {
            // Execute can time out after the money moved; query is the source of truth.
            $r = $this->call('/tokenized/checkout/payment/status', ['paymentID' => $pid]);
            $this->log($payment, 'in', 'status', $r['json'], $r['status']);
        }
        $j = $r['json'];
        $ok = ($j['transactionStatus'] ?? null) === 'Completed' && abs((float) ($j['amount'] ?? 0) - (float) $payment->amount) < 0.01;

        return ['status' => $ok ? 'success' : 'failed', 'txn' => $j['trxID'] ?? null, 'amount' => (float) ($j['amount'] ?? 0), 'raw' => ['paymentID' => $pid, 'customerMsisdn' => $j['customerMsisdn'] ?? null]];
    }

    public function verifyIpn(Request $request): ?array
    {
        return null; // bKash tokenized checkout confirms via callback + execute/query (webhooks are optional and need AWS SNS).
    }

    public function refund(Payment $payment, float $amount, string $reason): array
    {
        $r = $this->call('/tokenized/checkout/payment/refund', ['paymentID' => $payment->raw['paymentID'] ?? '', 'trxID' => $payment->gateway_txn, 'amount' => number_format($amount, 2, '.', ''), 'reason' => mb_substr($reason, 0, 255), 'sku' => 'travel']);
        $this->log($payment, 'out', 'refund', $r['json'], $r['status']);

        return $r['json'];
    }

    private function log(Payment $p, string $dir, string $endpoint, array $payload, ?int $status): void
    {
        PaymentGatewayLog::create(['payment_id' => $p->id, 'gateway' => 'bkash', 'direction' => $dir, 'endpoint' => $endpoint, 'payload' => $payload, 'http_status' => $status]);
    }
}
