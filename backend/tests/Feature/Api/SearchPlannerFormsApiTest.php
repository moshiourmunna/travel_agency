<?php

use App\Models\Activity;
use App\Models\Inquiry;
use App\Models\Lead;
use App\Models\NewsletterSubscriber;

beforeEach(fn () => $this->withHeader('X-Musafir-Ssr', config('musafir.revalidate_secret')));

it('searches across types in both languages', function () {
    $en = $this->getJson('/api/v1/search?q=maldives')->assertOk();
    expect($en->json('meta.total'))->toBeGreaterThan(0)->and($en->json('data'))->toHaveKey('tours');
    $bn = $this->getJson('/api/v1/search?q='.urlencode('মালদ্বীপ').'&lang=bn')->assertOk();
    expect($bn->json('meta.total'))->toBeGreaterThan(0);
    expect($this->getJson('/api/v1/search?q=a')->json('meta.total'))->toBe(0);
    $this->getJson('/api/v1/search?q='.str_repeat('x', 101))->assertUnprocessable();
});

it('treats search input safely (no SQL injection / wildcard abuse)', function () {
    $this->getJson('/api/v1/search?q='.urlencode("' OR 1=1 --"))->assertOk();
    $this->getJson('/api/v1/search?q='.urlencode('%_%'))->assertOk();
    $this->getJson('/api/v1/tours?q='.urlencode('") AGAINST(1'))->assertOk();
});

it('lists airports and searches flights with pax and cabin pricing', function () {
    expect($this->getJson('/api/v1/airports')->assertOk()->json('data'))->not->toBeEmpty();
    $r = $this->getJson('/api/v1/flights/search?from=DAC&to=DXB&adults=2&children=1&infants=1')->assertOk();
    $f = $r->json('data');
    expect($f)->toHaveCount(6)->and($r->json('meta.airlines'))->not->toBeEmpty();
    $fares = array_column($f, 'fare');
    $sorted = $fares;
    sort($sorted);
    expect($fares)->toBe($sorted)->and($f[0]['total'])->toBe((int) round($f[0]['fare'] * 2.8));
    $biz = $this->getJson('/api/v1/flights/search?from=DAC&to=DXB&cabin=business')->json('data.0.fare');
    expect($biz)->toBeGreaterThan($f[0]['fare']);
    $fast = array_column($this->getJson('/api/v1/flights/search?from=DAC&to=DXB&sort=fastest')->json('data'), 'duration_min');
    expect($fast[0])->toBe(min($fast));
    $this->getJson('/api/v1/flights/search?from=DAC&to=DAC')->assertUnprocessable();
    $this->getJson('/api/v1/flights/search?from=DAC')->assertUnprocessable()->assertJsonValidationErrors('to');
    expect($this->getJson('/api/v1/flights/search?from=DAC&to=JFK')->assertOk()->json('data'))->toBeEmpty();
});

it('exposes the planner config and estimates exactly like the mockup calculator', function () {
    $cfg = $this->getJson('/api/v1/planner/config')->assertOk()->json('data');
    expect($cfg['destinations'])->toHaveCount(12)->and($cfg['tiers'])->toHaveCount(3);
    // Maldives 4d + Bali 3d, 2 adults + 1 child, luxury (×1.7), one Bali activity
    $est = $this->postJson('/api/v1/planner/estimate', [
        'stops' => [['slug' => 'maldives', 'days' => 4], ['slug' => 'bali', 'days' => 3]],
        'adults' => 2, 'children' => 1, 'tier' => 'luxury', 'activities' => ['bali-ubud-swing-waterfalls', 'dubai-desert-safari'],
    ])->assertOk()->json('data');
    $pax = 2 + 0.7;
    $land = round((28000 * 4 + 14000 * 3) * 1.7 * $pax / 100) * 100;
    $air = round((max(38000, 52000) + 6000) * $pax / 100) * 100;
    $act = (int) Activity::where('slug', 'bali-ubud-swing-waterfalls')->value('price') * 3; // Dubai activity ignored: Dubai not in plan
    expect($est['land'])->toBe((int) $land)->and($est['air'])->toBe((int) $air)->and($est['activities'])->toBe($act)
        ->and($est['total'])->toBe((int) ($land + $air + $act))->and($est['days'])->toBe(7)->and($est['places'])->toBe(2);
});

it('validates planner input', function () {
    $this->postJson('/api/v1/planner/estimate', ['stops' => [], 'adults' => 1])->assertUnprocessable()->assertJsonValidationErrors('stops');
    $this->postJson('/api/v1/planner/estimate', ['stops' => [['slug' => 'atlantis', 'days' => 3]], 'adults' => 1])->assertJsonValidationErrors('stops.0.slug');
    $this->postJson('/api/v1/planner/estimate', ['stops' => [['slug' => 'bali', 'days' => 30]], 'adults' => 1])->assertJsonValidationErrors('stops.0.days');
    $five = collect(['bali', 'maldives', 'nepal', 'dubai', 'turkey'])->map(fn ($s) => ['slug' => $s, 'days' => 2])->all();
    $this->postJson('/api/v1/planner/estimate', ['stops' => $five, 'adults' => 1])->assertJsonValidationErrors('stops');
});

it('turns a planner quote into an inquiry and a CRM lead', function () {
    $leads = Lead::count();
    $r = $this->postJson('/api/v1/planner/quote', ['stops' => [['slug' => 'nepal', 'days' => 5]], 'adults' => 2, 'name' => 'Test Traveller', 'phone' => '+8801711000000'])->assertCreated();
    expect($r->json('data.reference'))->toStartWith('MSF-INQ-')->and(Lead::count())->toBe($leads + 1);
    $inq = Inquiry::latest('id')->first();
    expect($inq->type)->toBe('planner')->and($inq->payload['estimate']['total'])->toBe($r->json('data.estimate.total'))
        ->and($inq->lead->source_key)->toBe('trip-planner')->and($inq->lead->code)->toMatch('/^LD-\d+$/');
    expect(Lead::where('code', $inq->lead->code)->count())->toBe(1);
});

it('stores contact / custom tour / group enquiries with a lead', function (string $type) {
    $this->postJson('/api/v1/inquiries', ['type' => $type, 'name' => 'Rafi', 'email' => 'rafi@example.com', 'message' => 'Hello', 'adults' => 2, 'consent' => true])
        ->assertCreated()->assertJsonStructure(['data' => ['reference']]);
    $i = Inquiry::latest('id')->first();
    expect($i->type)->toBe($type)->and($i->lead_id)->not->toBeNull()->and($i->payload)->not->toHaveKey('consent');
})->with(['contact', 'custom-tour', 'group-tour', 'callback']);

it('validates enquiries and silently drops honeypot spam', function () {
    $this->postJson('/api/v1/inquiries', ['type' => 'contact', 'name' => 'R'])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'phone', 'consent']);
    $this->postJson('/api/v1/inquiries', ['type' => 'hack', 'name' => 'Rafi', 'email' => 'x@y.com', 'consent' => true])->assertJsonValidationErrors('type');
    $this->postJson('/api/v1/inquiries', ['type' => 'contact', 'name' => 'Rafi', 'phone' => 'abc', 'consent' => true])->assertJsonValidationErrors('phone');
    $n = Inquiry::count();
    $this->postJson('/api/v1/inquiries', ['type' => 'contact', 'name' => 'Bot', 'email' => 'bot@x.com', 'consent' => true, 'website' => 'http://spam'])->assertCreated();
    expect(Inquiry::count())->toBe($n);
});

it('stores message text as data, not markup', function () {
    $this->postJson('/api/v1/inquiries', ['type' => 'contact', 'name' => '<script>alert(1)</script>', 'email' => 'x@y.com', 'message' => '<img src=x onerror=alert(1)>', 'consent' => true])->assertCreated();
    expect(Inquiry::latest('id')->first()->payload['message'])->toBe('<img src=x onerror=alert(1)>');
});

it('subscribes to the newsletter idempotently', function () {
    $this->postJson('/api/v1/newsletter', ['email' => 'New@Example.com'])->assertCreated()->assertJsonPath('data.status', 'subscribed');
    $this->postJson('/api/v1/newsletter', ['email' => 'new@example.com'])->assertOk()->assertJsonPath('data.status', 'already_subscribed');
    expect(NewsletterSubscriber::where('email', 'new@example.com')->count())->toBe(1);
    $this->postJson('/api/v1/newsletter', ['email' => 'not-an-email'])->assertUnprocessable();
});

it('rate-limits public forms per IP', function () {
    $this->withoutHeader('X-Musafir-Ssr');
    for ($i = 0; $i < 6; $i++) {
        $this->postJson('/api/v1/newsletter', ['email' => "u{$i}@example.com"])->assertSuccessful();
    }
    $this->postJson('/api/v1/newsletter', ['email' => 'u7@example.com'])->assertStatus(429);
});
