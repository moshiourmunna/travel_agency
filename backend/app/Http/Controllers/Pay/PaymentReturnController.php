<?php

namespace App\Http\Controllers\Pay;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Checkout\BookingService;
use App\Services\Payments\GatewayManager;
use App\Services\Payments\MockGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;

/** Browser returns from gateways, server-to-server IPNs, and the local payment simulator. */
class PaymentReturnController extends Controller
{
    public function __construct(private GatewayManager $gateways, private BookingService $bookings) {}

    private function finish(Payment $p, array $res): RedirectResponse
    {
        $b = $p->booking;
        $lang = $p->raw['lang'] ?? ($b?->contact['locale'] ?? 'en');
        $fe = config('musafir.frontend_url')."/{$lang}";
        if (! $b) { // wallet top-up → back to the wallet page with the outcome
            if ($res['status'] === 'success') {
                if (! empty($res['txn']) && ! Payment::where('gateway', $p->gateway)->where('gateway_txn', $res['txn'])->whereKeyNot($p->id)->exists()) {
                    $p->update(['gateway_txn' => $res['txn']]);
                }
                $this->bookings->settle($p, $res['raw'] ?? []);
            } elseif ($p->status !== 'success') {
                $p->update(['status' => $res['status'] === 'cancelled' ? 'cancelled' : 'failed']);
            }

            return redirect()->away("{$fe}/account/wallet?topup=".($res['status'] === 'success' ? 'success' : $res['status']));
        }
        if ($res['status'] === 'success') {
            if (! empty($res['txn']) && ! Payment::where('gateway', $p->gateway)->where('gateway_txn', $res['txn'])->whereKeyNot($p->id)->exists()) {
                $p->update(['gateway_txn' => $res['txn'], 'val_id' => $res['val_id'] ?? null]);
            }
            $this->bookings->settle($p, $res['raw'] ?? []);

            return redirect()->away("{$fe}/booking-confirmed?ref={$b->ref}&key={$b->ulid}");
        }
        if ($p->status !== 'success') {
            $p->update(['status' => $res['status'] === 'cancelled' ? 'cancelled' : 'failed', 'raw' => array_merge((array) $p->raw, $res['raw'] ?? [])]);
        }

        return redirect()->away("{$fe}/booking?ref={$b->ref}&key={$b->ulid}&payment={$res['status']}");
    }

    /** GET or POST (SSLCommerz posts; bKash/Nagad redirect with a query string). */
    public function return(Request $r, string $gateway, string $payment): RedirectResponse
    {
        $p = Payment::with('booking')->where('ulid', $payment)->where('gateway', $gateway)->firstOrFail();
        if ($p->status === 'success') {
            return $this->finish($p, ['status' => 'success']);
        }
        $gw = $this->gateways->resolve($gateway);
        abort_unless($gw && ! ($p->raw['simulated'] ?? false), 404);
        try {
            $res = $gw->verifyReturn($r, $p);
        } catch (\Throwable $e) {
            Log::error('payment.verify_failed', ['payment' => $p->ulid, 'error' => $e->getMessage()]);
            $res = ['status' => 'failed', 'raw' => ['error' => 'verification_error']];
        }

        return $this->finish($p, $res);
    }

    public function ipn(Request $r, string $gateway): JsonResponse
    {
        $gw = $this->gateways->resolve($gateway);
        $res = $gw?->verifyIpn($r);
        if (! $res) {
            return response()->json(['message' => 'ignored'], 200);
        }
        $p = Payment::where('ulid', $res['payment'])->firstOrFail();
        if ($res['status'] === 'success') {
            if (! empty($res['txn'])) {
                $p->update(['gateway_txn' => $p->gateway_txn ?? $res['txn'], 'val_id' => $res['val_id'] ?? null]);
            }
            $this->bookings->settle($p, $res['raw'] ?? []);
        }

        return response()->json(['message' => 'ok']);
    }

    /** Local simulator page (signed URL, never in live mode). */
    public function mock(Request $r, string $payment): View
    {
        abort_if(GatewayManager::live(), 404);
        $p = Payment::with('booking')->where('ulid', $payment)->firstOrFail();

        return view('pay.mock', ['p' => $p, 'b' => $p->booking, 'action' => $r->fullUrl()]);
    }

    public function mockSubmit(Request $r, string $payment): RedirectResponse
    {
        abort_if(GatewayManager::live(), 404);
        $p = Payment::with('booking')->where('ulid', $payment)->firstOrFail();
        if ($p->status === 'success') {
            return $this->finish($p, ['status' => 'success']);
        }
        $gw = new MockGateway($p->gateway, $p->method ?? 'Test');

        return $this->finish($p, $gw->verifyReturn($r, $p));
    }
}
