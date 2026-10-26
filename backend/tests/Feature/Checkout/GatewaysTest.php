<?php

use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentGatewayLog;
use App\Models\Tour;
use App\Models\TourDeparture;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/* Real gateway drivers against faked HTTP: SSLCommerz (init + validation + IPN), bKash tokenized, Nagad RPG. */

function gwBooking(): Booking
{
    $t = Tour::where('slug', 'maldives-honeymoon')->firstOrFail();
    $d = TourDeparture::where('tour_id', $t->id)->where('date', '>', today()->addDays(60))->orderBy('date')->firstOrFail();
    $ref = test()->postJson('/api/v1/bookings?lang=en', ['kind' => 'tour', 'slug' => $t->slug, 'date' => $d->date->toDateString(), 'adults' => 1, 'plan' => 'full', 'agree' => true, 'website' => '',
        'contact' => ['first_name' => 'Gw', 'last_name' => 'Test', 'email' => 'gw.'.uniqid().'@example.com', 'phone' => '01811234567', 'passport' => 'A01234567']])->assertCreated()->json('data.ref');

    return Booking::where('ref', $ref)->firstOrFail();
}

it('SSLCommerz: redirects to the hosted page and confirms only through the validation API', function () {
    config(['services.sslcommerz.store_id' => 'test', 'services.sslcommerz.store_password' => 'pw', 'services.sslcommerz.sandbox' => true]);
    $b = gwBooking();
    Http::fake([
        'sandbox.sslcommerz.com/gwprocess/*' => Http::response(['status' => 'SUCCESS', 'GatewayPageURL' => 'https://sandbox.sslcommerz.com/EasyCheckOut/abc', 'sessionkey' => 'S1']),
        'sandbox.sslcommerz.com/validator/*' => function ($req) {
            $p = Payment::latest('id')->first();
            $tampered = $req['val_id'] === 'TAMPER';

            return Http::response(['status' => 'VALID', 'tran_id' => $p->ulid, 'val_id' => $req['val_id'], 'amount' => $tampered ? '10.00' : number_format((float) $p->amount, 2, '.', ''), 'currency_type' => 'BDT', 'bank_tran_id' => 'BT'.uniqid(), 'card_type' => 'VISA-Dutch Bangla']);
        },
    ]);
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'sslcommerz'])->assertOk()->json('data');
    expect($pay['redirect'])->toBe('https://sandbox.sslcommerz.com/EasyCheckOut/abc');
    Http::assertSent(fn ($r) => str_contains($r->url(), 'gwprocess') && $r['currency'] === 'BDT' && $r['tran_id'] === $pay['payment'] && ! isset($r['card_no']));
    $p = Payment::where('ulid', $pay['payment'])->first();

    // a POSTed "success" without a valid val_id cannot confirm; an amount mismatch cannot confirm
    $this->post("/pay/sslcommerz/return/{$p->ulid}", ['status' => 'VALID'])->assertRedirectContains('payment=failed');
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'sslcommerz'])->json('data');
    $this->post("/pay/sslcommerz/return/{$pay['payment']}", ['status' => 'VALID', 'val_id' => 'TAMPER'])->assertRedirectContains('payment=failed');
    expect($b->fresh()->payment_status)->toBe('unpaid');

    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'sslcommerz'])->json('data');
    $this->post("/pay/sslcommerz/return/{$pay['payment']}", ['status' => 'VALID', 'val_id' => 'V123'])->assertRedirectContains('booking-confirmed');
    // the IPN for the same payment is idempotent
    $this->postJson('/api/v1/payments/sslcommerz/ipn', ['tran_id' => $pay['payment'], 'val_id' => 'V123', 'status' => 'VALID'])->assertOk();
    $b->refresh();
    expect($b->payment_status)->toBe('paid')->and(Payment::where('booking_id', $b->id)->where('status', 'success')->count())->toBe(1)
        ->and(PaymentGatewayLog::where('gateway', 'sslcommerz')->where('endpoint', 'validate')->count())->toBeGreaterThanOrEqual(2);
});

it('SSLCommerz: IPN alone can settle when the browser never returns', function () {
    config(['services.sslcommerz.store_id' => 'test', 'services.sslcommerz.store_password' => 'pw']);
    $b = gwBooking();
    Http::fake([
        '*/gwprocess/*' => Http::response(['status' => 'SUCCESS', 'GatewayPageURL' => 'https://x/y', 'sessionkey' => 'S']),
        '*/validator/*' => fn () => Http::response(['status' => 'VALID', 'tran_id' => Payment::latest('id')->value('ulid'), 'amount' => number_format((float) Payment::latest('id')->value('amount'), 2, '.', ''), 'currency_type' => 'BDT', 'bank_tran_id' => 'BTIPN']),
    ]);
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'sslcommerz'])->json('data');
    $this->postJson('/api/v1/payments/sslcommerz/ipn', ['tran_id' => $pay['payment'], 'val_id' => 'VIPN'])->assertOk()->assertJson(['message' => 'ok']);
    expect($b->fresh()->payment_status)->toBe('paid');
    $this->postJson('/api/v1/payments/sslcommerz/ipn', ['tran_id' => 'unknown'])->assertOk()->assertJson(['message' => 'ignored']);
});

it('SSLCommerz: a gateway outage returns 502 and marks the attempt failed', function () {
    config(['services.sslcommerz.store_id' => 'test', 'services.sslcommerz.store_password' => 'pw']);
    $b = gwBooking();
    Http::fake(['*' => Http::response(['status' => 'FAILED', 'failedreason' => 'Store is inactive'])]);
    $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'sslcommerz'])->assertStatus(502);
    expect(Payment::where('booking_id', $b->id)->value('status'))->toBe('failed');
});

it('bKash: grant → create → execute, with the status query as fallback and paymentID checks', function () {
    config(['services.bkash' => ['base_url' => 'https://bk.test/v1.2.0-beta', 'app_key' => 'k', 'app_secret' => 's', 'username' => 'u', 'password' => 'p']]);
    Cache::forget('bkash.id_token');
    $b = gwBooking();
    $executeTimesOut = true;
    Http::fake(function ($req) use (&$executeTimesOut) {
        $u = $req->url();
        $p = Payment::latest('id')->first();

        return match (true) {
            str_ends_with($u, '/token/grant') => Http::response(['id_token' => 'TOKEN1', 'expires_in' => 3600]),
            str_ends_with($u, '/checkout/create') => Http::response(['paymentID' => 'PID'.$p->id, 'bkashURL' => 'https://sandbox.bka.sh/pay?id=PID'.$p->id, 'statusCode' => '0000']),
            str_ends_with($u, '/checkout/execute') => $executeTimesOut ? Http::response(['statusCode' => '9999', 'statusMessage' => 'timeout'], 200) : Http::response(['transactionStatus' => 'Completed', 'amount' => (string) $p->amount, 'trxID' => 'TRX'.$p->id]),
            str_ends_with($u, '/payment/status') => Http::response(['transactionStatus' => 'Completed', 'amount' => number_format((float) $p->amount, 2, '.', ''), 'trxID' => 'TRX'.$p->id, 'customerMsisdn' => '01770618575']),
            default => Http::response([], 404),
        };
    });
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->assertOk()->json('data');
    $p = Payment::where('ulid', $pay['payment'])->first();
    expect($pay['redirect'])->toContain('sandbox.bka.sh');
    Http::assertSent(fn ($r) => str_ends_with($r->url(), '/checkout/create') && $r->header('Authorization')[0] === 'TOKEN1' && $r['intent'] === 'sale');

    $this->get("/pay/bkash/return/{$p->ulid}?paymentID=WRONG&status=success")->assertRedirectContains('payment=failed');
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $p = Payment::where('ulid', $pay['payment'])->first();
    $this->get("/pay/bkash/return/{$p->ulid}?paymentID=PID{$p->id}&status=cancel")->assertRedirectContains('payment=cancelled');
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $p = Payment::where('ulid', $pay['payment'])->first();
    $this->get("/pay/bkash/return/{$p->ulid}?paymentID=PID{$p->id}&status=success")->assertRedirectContains('booking-confirmed');
    expect($p->fresh()->status)->toBe('success')->and($p->fresh()->gateway_txn)->toBe('TRX'.$p->id)->and($b->fresh()->payment_status)->toBe('paid');
    Http::assertSent(fn ($r) => str_ends_with($r->url(), '/payment/status'));
    Http::assertSentCount(1 + 3 + 1 + 1); // one cached token grant, three creates, execute + status
});

it('Nagad: RSA-signed initialise/complete, then verify compares order and amount', function () {
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $priv);
    $pub = openssl_pkey_get_details($key)['key'];
    config(['services.nagad' => ['base_url' => 'https://nagad.test/api/dfs', 'merchant_id' => '683002007104225', 'merchant_number' => '01711428036', 'public_key' => $pub, 'private_key' => $priv]]);
    $b = gwBooking();
    Http::fake(function ($req) use ($pub, $priv) {
        $u = $req->url();
        $p = Payment::latest('id')->first();
        if (str_contains($u, '/check-out/initialize/')) {
            $sent = json_decode((string) (function () use ($req, $priv) {
                openssl_private_decrypt(base64_decode($req['sensitiveData']), $o, $priv);

                return $o;
            })(), true);
            $ok = openssl_verify(json_encode($sent), base64_decode($req['signature']), $pub, OPENSSL_ALGO_SHA256) === 1;
            openssl_public_encrypt(json_encode(['paymentReferenceId' => 'NREF'.$p->id, 'challenge' => 'CH']), $enc, $pub);

            return $ok ? Http::response(['sensitiveData' => base64_encode($enc), 'signature' => 'x']) : Http::response(['message' => 'bad signature'], 400);
        }
        if (str_contains($u, '/check-out/complete/')) {
            return Http::response(['status' => 'Success', 'callBackUrl' => 'https://sandbox.mynagad.com/pay/NREF'.$p->id]);
        }
        if (str_contains($u, '/verify/payment/')) {
            return Http::response(['status' => 'Success', 'orderId' => $p->raw['orderId'] ?? '', 'amount' => number_format((float) $p->amount, 2, '.', ''), 'issuerPaymentRefNo' => 'NG'.$p->id]);
        }

        return Http::response([], 404);
    });
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'nagad'])->assertOk()->json('data');
    expect($pay['redirect'])->toContain('mynagad.com');
    $p = Payment::where('ulid', $pay['payment'])->first();
    $this->get("/pay/nagad/return/{$p->ulid}?payment_ref_id=OTHER&status=Success")->assertRedirectContains('payment=failed');
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'nagad'])->json('data');
    $p = Payment::where('ulid', $pay['payment'])->first();
    $this->get("/pay/nagad/return/{$p->ulid}?payment_ref_id=NREF{$p->id}&status=Success")->assertRedirectContains('booking-confirmed');
    expect($b->fresh()->payment_status)->toBe('paid')->and($p->fresh()->gateway_txn)->toBe('NG'.$p->id);
});

it('does not accept a return for a gateway the payment was not made with', function () {
    $b = gwBooking();
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $this->get("/pay/nagad/return/{$pay['payment']}?status=Success")->assertNotFound();
    // simulated payments can only finish through the signed simulator
    $this->get("/pay/bkash/return/{$pay['payment']}?status=success&paymentID=x")->assertNotFound();
});
