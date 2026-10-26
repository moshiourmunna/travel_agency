<?php

use App\Models\Activity;
use App\Models\ActivitySlot;
use App\Models\Booking;
use App\Models\Coupon;
use App\Models\Cruise;
use App\Models\GiftCard;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\VisaProduct;
use Illuminate\Support\Facades\URL;

/* Checkout: pricing for every product kind, coupons, payment plans, seat holds, booking + payment lifecycle. */

function quote(array $sel)
{
    return test()->postJson('/api/v1/checkout/quote?lang=en', $sel);
}

function contact(array $over = []): array
{
    return array_merge(['first_name' => 'Rafiq', 'last_name' => 'Islam', 'email' => 'pest.'.uniqid().'@example.com', 'phone' => '01711234567', 'passport' => 'A01234567'], $over);
}

function laterDeparture(string $slug = 'maldives-honeymoon'): TourDeparture
{
    $t = Tour::where('slug', $slug)->firstOrFail();

    return TourDeparture::where('tour_id', $t->id)->where('date', '>', today()->addDays(60))->whereColumn('seats_held', '<', 'seats_total')->orderBy('date')->firstOrFail();
}

function book(array $sel, array $extra = [])
{
    return test()->postJson('/api/v1/bookings?lang=en', array_merge($sel, ['contact' => contact(), 'agree' => true, 'website' => '', 'plan' => 'full'], $extra));
}

it('prices a tour from the departure and room tier, with add-ons', function () {
    $d = laterDeparture();
    $q = quote(['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2, 'addons' => ['insurance']])->assertOk()->json('data');
    $adult = collect($q['lines'])->firstWhere('code', 'adult');
    expect($adult['qty'])->toBe(2)->and($adult['unit'])->toBeGreaterThan(0)
        ->and(collect($q['lines'])->pluck('code'))->toContain('addon:insurance')
        ->and($q['total'])->toBe(array_sum(array_column($q['lines'], 'total')))
        ->and(array_column($q['plans'], 'code'))->toBe(['full', 'deposit', 'instalments']);
    $full = collect($q['plans'])->firstWhere('code', 'full');
    expect($full['now'])->toBe((int) round($q['total'] * 0.98));
    $dep = collect($q['plans'])->firstWhere('code', 'deposit');
    expect($dep['now'])->toBeLessThan($q['total']);
});

it('defaults to the first open departure and rejects unknown or sold-out dates', function () {
    expect(quote(['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'adults' => 2])->assertOk()->json('data.options.date'))->not->toBeNull();
    quote(['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => '2020-01-01', 'adults' => 2])->assertStatus(422);
    quote(['kind' => 'tour', 'slug' => 'does-not-exist', 'adults' => 2])->assertStatus(422);
    $d = laterDeparture();
    $d->update(['seats_held' => $d->seats_total]);
    quote(['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2])->assertStatus(422);
});

it('prices cruises, activities, hotels, visas and gift cards server-side', function () {
    $c = Cruise::first();
    $cq = quote(['kind' => 'cruise', 'slug' => $c->slug, 'adults' => 2])->assertOk()->json('data');
    expect($cq['total'])->toBeGreaterThan(0)->and($cq['choices']['cabins'])->not->toBeEmpty();

    $a = Activity::whereHas('slots', fn ($q) => $q->where('starts_at', '>', now()->addDay()))->first();
    $s = ActivitySlot::where('activity_id', $a->id)->where('starts_at', '>', now()->addDay())->whereColumn('booked', '<', 'capacity')->orderBy('starts_at')->first();
    $aq = quote(['kind' => 'activity', 'slug' => $a->slug, 'date' => $s->starts_at->toDateString(), 'time' => $s->starts_at->format('H:i'), 'adults' => 2, 'children' => 1])->assertOk()->json('data');
    expect(collect($aq['lines'])->pluck('code')->all())->toContain('adult', 'child');

    $h = Hotel::first();
    $in = today()->addDays(30)->toDateString();
    $out = today()->addDays(33)->toDateString();
    $t2r3n = quote(['kind' => 'hotel', 'slug' => $h->slug, 'in' => $in, 'out' => $out, 'rooms' => 2])->assertOk()->json('data.subtotal');
    $t1r3n = quote(['kind' => 'hotel', 'slug' => $h->slug, 'in' => $in, 'out' => $out, 'rooms' => 1])->json('data.subtotal');
    $t1r1n = quote(['kind' => 'hotel', 'slug' => $h->slug, 'in' => $in, 'out' => today()->addDays(31)->toDateString(), 'rooms' => 1])->json('data.subtotal');
    expect($t2r3n)->toBe(2 * $t1r3n)->and($t1r3n)->toBe(3 * $t1r1n);
    quote(['kind' => 'hotel', 'slug' => $h->slug, 'in' => $out, 'out' => $in])->assertStatus(422);

    $v = VisaProduct::first();
    expect(quote(['kind' => 'visa', 'slug' => $v->slug, 'adults' => 3])->assertOk()->json('data.lines.0.qty'))->toBe(3);

    quote(['kind' => 'gift_card', 'gift' => 'classic', 'amount' => 5000])->assertOk();
    quote(['kind' => 'gift_card', 'gift' => 'classic', 'amount' => 50])->assertStatus(422);
});

it('ignores client-supplied prices', function () {
    $d = laterDeparture();
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2];
    $honest = quote($sel)->json('data.total');
    expect(quote($sel + ['total' => 1, 'price' => 1, 'lines' => [['total' => 1]]])->json('data.total'))->toBe($honest);
});

it('applies coupons with scope, minimum spend, validity and limits', function () {
    $d = laterDeparture();
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2];
    Coupon::create(['code' => 'PEST15', 'name' => ['en' => 'Pest', 'bn' => 'Pest'], 'type' => 'percent', 'value' => 15, 'max_discount' => 10000, 'min_spend' => 1000, 'status' => 'active', 'valid_from' => now()->subDay(), 'valid_to' => now()->addMonth()]);
    $q = quote($sel + ['coupon' => 'pest15'])->assertOk()->json('data');
    expect($q['discount'])->toBe(10000)->and($q['coupon']['code'])->toBe('PEST15'); // capped by max_discount, code case-insensitive

    Coupon::create(['code' => 'CRUISEONLY', 'name' => ['en' => 'x', 'bn' => 'x'], 'type' => 'fixed', 'value' => 500, 'scope' => ['kinds' => ['cruise']], 'status' => 'active', 'valid_from' => now()->subDay(), 'valid_to' => now()->addMonth()]);
    quote($sel + ['coupon' => 'CRUISEONLY'])->assertStatus(422)->assertJsonValidationErrors('coupon');
    Coupon::create(['code' => 'OLD', 'name' => ['en' => 'x', 'bn' => 'x'], 'type' => 'fixed', 'value' => 500, 'status' => 'active', 'valid_from' => now()->subMonth(), 'valid_to' => now()->subDay()]);
    quote($sel + ['coupon' => 'OLD'])->assertStatus(422);
    Coupon::create(['code' => 'USEDUP', 'name' => ['en' => 'x', 'bn' => 'x'], 'type' => 'fixed', 'value' => 500, 'max_uses' => 5, 'used' => 5, 'status' => 'active', 'valid_from' => now()->subDay(), 'valid_to' => now()->addMonth()]);
    quote($sel + ['coupon' => 'USEDUP'])->assertStatus(422);
    Coupon::create(['code' => 'BIGSPEND', 'name' => ['en' => 'x', 'bn' => 'x'], 'type' => 'fixed', 'value' => 500, 'min_spend' => 99999999, 'status' => 'active', 'valid_from' => now()->subDay(), 'valid_to' => now()->addMonth()]);
    quote($sel + ['coupon' => 'BIGSPEND'])->assertStatus(422);
    quote($sel + ['coupon' => 'NOPE'])->assertStatus(422);
    expect($this->postJson('/api/v1/coupons/validate', $sel + ['coupon' => 'PEST15'])->assertOk()->json('data.discount'))->toBe(10000);
});

it('offers only the full plan for trips that are too close', function () {
    $t = Tour::where('slug', 'maldives-honeymoon')->first();
    $near = TourDeparture::create(['tour_id' => $t->id, 'date' => today()->addDays(10), 'seats_total' => 20, 'price' => 150000, 'status' => 'open']);
    $q = quote(['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $near->date->toDateString(), 'adults' => 2])->assertOk()->json('data');
    expect(array_column($q['plans'], 'code'))->toBe(['full']);
});

it('validates the booking form, including the honeypot and terms', function () {
    $d = laterDeparture();
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 1];
    $this->postJson('/api/v1/bookings', $sel + ['contact' => contact(['email' => 'bad'])])->assertStatus(422)->assertJsonValidationErrors(['contact.email']);
    $this->postJson('/api/v1/bookings', $sel + ['contact' => contact(['phone' => '123', 'passport' => '!!'])])->assertStatus(422)->assertJsonValidationErrors(['contact.phone', 'agree']);
    $before = Booking::count();
    $this->postJson('/api/v1/bookings', $sel + ['contact' => contact(), 'agree' => true, 'website' => 'http://spam'])->assertStatus(422);
    expect(Booking::count())->toBe($before);
});

it('holds seats on booking, releases them on expiry, and refuses to oversell', function () {
    $d = laterDeparture();
    $d->update(['seats_total' => $d->seats_held + 3]);
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2];
    $r = book($sel)->assertCreated()->json('data');
    expect($r['ref'])->toMatch('/^MSF-\d{2}-\d{5}$/')->and($d->fresh()->seats_held)->toBe($d->seats_total - 1);
    book($sel)->assertStatus(422); // only 1 seat left
    $b = Booking::where('ref', $r['ref'])->first();
    $b->update(['hold_expires_at' => now()->subMinute()]);
    $this->artisan('bookings:expire-holds')->assertSuccessful();
    expect($b->fresh()->status)->toBe('cancelled')->and($d->fresh()->seats_held)->toBe($d->seats_total - 3);
    $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->assertStatus(409);
});

it('runs the full deposit → balance lifecycle through the simulated gateway', function () {
    $d = laterDeparture();
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 2];
    $r = book($sel, ['plan' => 'deposit', 'travellers' => [['name' => 'Nusrat Islam', 'relation' => 'Spouse']]])->assertCreated()->json('data');
    $b = Booking::where('ref', $r['ref'])->first();
    expect($b->instalments()->count())->toBe(2)->and($r['due_now'])->toBeLessThan($r['total']);

    // wrong key → 404, never leaks
    $this->getJson("/api/v1/bookings/{$b->ref}?key=01ZZZZZZZZZZZZZZZZZZZZZZZZ")->assertNotFound();
    $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => 'nope', 'gateway' => 'bkash'])->assertNotFound();
    $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'paypal'])->assertStatus(422);

    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->assertOk()->json('data');
    expect($pay['amount'])->toBe($r['due_now'])->and($pay['redirect'])->toContain('/pay/mock/');
    $p = Payment::where('ulid', $pay['payment'])->first();

    // unsigned / tampered simulator URL is rejected
    $this->post("/pay/mock/{$p->ulid}", ['result' => 'success'])->assertForbidden();
    $this->post($pay['redirect'].'x', ['result' => 'success'])->assertForbidden();

    $this->post($pay['redirect'], ['result' => 'success'])->assertRedirect()->assertRedirectContains('/booking-confirmed?ref='.$b->ref);
    $b->refresh();
    expect($b->status)->toBe('partial')->and($b->payment_status)->toBe('partial')->and((int) $b->paid)->toBe($pay['amount'])
        ->and($b->documents()->pluck('kind')->sort()->values()->all())->toBe(['invoice', 'voucher'])
        ->and($b->instalments()->orderBy('seq')->pluck('status')->all())->toBe(['paid', 'due'])
        ->and($b->hold_expires_at)->toBeNull();

    // replaying the success is idempotent
    $this->post($pay['redirect'], ['result' => 'success'])->assertRedirect();
    expect((int) $b->fresh()->paid)->toBe($pay['amount'])->and(Payment::where('booking_id', $b->id)->where('status', 'success')->count())->toBe(1);

    // balance
    $pay2 = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'nagad'])->assertOk()->json('data');
    expect($pay2['amount'])->toBe((int) round($b->total - $b->paid));
    $this->post($pay2['redirect'], ['result' => 'success'])->assertRedirect();
    expect($b->fresh()->status)->toBe('confirmed')->and($b->fresh()->payment_status)->toBe('paid');
    $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->assertStatus(409); // nothing due

    // receipt + PDFs
    $show = $this->getJson("/api/v1/bookings/{$b->ref}?key={$b->ulid}")->assertOk()->assertHeader('Cache-Control', 'no-store, private')->json('data');
    expect($show['balance'])->toBe(0)->and($show['travellers'])->toHaveCount(2);
    $pdf = $this->get("/api/v1/bookings/{$b->ref}/invoice.pdf?key={$b->ulid}")->assertOk();
    expect($pdf->headers->get('content-type'))->toContain('pdf')->and(substr($pdf->getContent(), 0, 4))->toBe('%PDF');
    $this->get("/api/v1/bookings/{$b->ref}/voucher.pdf?key=WRONG")->assertNotFound();
});

it('records failed and cancelled payments and lets the traveller retry', function () {
    $d = laterDeparture();
    $r = book(['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 1])->assertCreated()->json('data');
    $b = Booking::where('ref', $r['ref'])->first();
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'sslcommerz'])->json('data');
    $this->post($pay['redirect'], ['result' => 'failed'])->assertRedirectContains('payment=failed');
    expect(Payment::where('ulid', $pay['payment'])->value('status'))->toBe('failed')->and($b->fresh()->payment_status)->toBe('unpaid');
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $this->post($pay['redirect'], ['result' => 'cancelled'])->assertRedirectContains('payment=cancelled');
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $this->post($pay['redirect'], ['result' => 'success'])->assertRedirectContains('booking-confirmed');
    expect($b->fresh()->payment_status)->toBe('paid');
});

it('redeems a coupon only once payment succeeds', function () {
    $d = laterDeparture();
    $c = Coupon::create(['code' => 'ONCE', 'name' => ['en' => 'x', 'bn' => 'x'], 'type' => 'fixed', 'value' => 1000, 'max_uses' => 1, 'status' => 'active', 'valid_from' => now()->subDay(), 'valid_to' => now()->addMonth()]);
    $sel = ['kind' => 'tour', 'slug' => 'maldives-honeymoon', 'date' => $d->date->toDateString(), 'adults' => 1, 'coupon' => 'ONCE'];
    $r = book($sel)->assertCreated()->json('data');
    expect($c->fresh()->used)->toBe(0);
    $b = Booking::where('ref', $r['ref'])->first();
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $this->post($pay['redirect'], ['result' => 'success']);
    expect($c->fresh()->used)->toBe(1);
    quote($sel)->assertStatus(422); // limit reached
});

it('accepts a bank transfer slip once and keeps the booking pending', function () {
    $h = Hotel::first();
    $sel = ['kind' => 'hotel', 'slug' => $h->slug, 'in' => today()->addDays(40)->toDateString(), 'out' => today()->addDays(42)->toDateString(), 'rooms' => 1];
    $b = Booking::where('ref', book($sel)->assertCreated()->json('data.ref'))->first();
    $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bank_transfer'])->assertStatus(422)->assertJsonValidationErrors('slip_ref');
    $res = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bank_transfer', 'slip_ref' => 'TT-PEST-1'])->assertOk()->json('data');
    expect($res['pending'])->toBeTrue()->and($res['instructions'])->toHaveKey('account_no')->and($b->fresh()->status)->toBe('pending');
    $b2 = Booking::where('ref', book($sel)->json('data.ref'))->first();
    $this->postJson("/api/v1/bookings/{$b2->ref}/pay", ['key' => $b2->ulid, 'gateway' => 'bank_transfer', 'slip_ref' => 'TT-PEST-1'])->assertStatus(422);
});

it('issues a PNR and e-tickets for flights and a code for gift cards', function () {
    $fid = $this->getJson('/api/v1/flights/search?from=DAC&to=CXB&date='.today()->addDays(20)->toDateString().'&pax=2')->json('data.0.id');
    expect($fid)->not->toBeNull();
    $r = book(['kind' => 'flight', 'flight' => $fid, 'date' => today()->addDays(20)->toDateString(), 'pax' => '2', 'cabin' => 'economy'], ['travellers' => [['name' => 'Second Flyer']]])->assertCreated()->json('data');
    $b = Booking::where('ref', $r['ref'])->first();
    $pay = $this->postJson("/api/v1/bookings/{$b->ref}/pay", ['key' => $b->ulid, 'gateway' => 'bkash'])->json('data');
    $this->post($pay['redirect'], ['result' => 'success']);
    $show = $this->getJson("/api/v1/bookings/{$b->ref}?key={$b->ulid}")->json('data');
    expect($show['contact']['pnr'])->toMatch('/^[A-Z0-9]{6}$/')->and(collect($show['travellers'])->pluck('ticket_no')->filter())->toHaveCount(2);

    $g = book(['kind' => 'gift_card', 'gift' => 'classic', 'amount' => 5000, 'to' => 'Friend', 'email' => 'friend@example.com'])->assertCreated()->json('data');
    $gb = Booking::where('ref', $g['ref'])->first();
    $pay = $this->postJson("/api/v1/bookings/{$gb->ref}/pay", ['key' => $gb->ulid, 'gateway' => 'bkash'])->json('data');
    $this->post($pay['redirect'], ['result' => 'success']);
    $code = $this->getJson("/api/v1/bookings/{$gb->ref}?key={$gb->ulid}")->json('data.contact.gift_code');
    expect($code)->toMatch('/^MSF-[A-Z0-9]{4}-[A-Z0-9]{4}$/')->and((int) GiftCard::where('code', $code)->value('balance'))->toBe(5000);
});

it('never offers the simulator in live mode', function () {
    config(['musafir.payment_mode' => 'live']);
    $gws = quote(['kind' => 'visa', 'slug' => VisaProduct::first()->slug, 'adults' => 1])->assertOk()->json('data.gateways');
    expect($gws)->not->toContain('mock')->and($gws)->toContain('bank_transfer');
    if (blank(config('services.bkash.app_key'))) {
        expect($gws)->not->toContain('bkash'); // unconfigured gateways are hidden in live mode
    }
});
