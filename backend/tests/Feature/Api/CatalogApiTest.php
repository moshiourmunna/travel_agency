<?php

use App\Models\ActivitySlot;
use App\Models\Offer;
use App\Models\Tour;

beforeEach(fn () => $this->withHeader('X-Musafir-Ssr', config('musafir.revalidate_secret')));

it('lists published tours with card shape and facets', function () {
    $r = $this->getJson('/api/v1/tours')->assertOk();
    expect($r->json('data'))->toHaveCount(16)
        ->and($r->json('meta.facets.region'))->toMatchArray(['bd' => 5, 'intl' => 11])
        ->and($r->json('data.0'))->toHaveKeys(['slug', 'title', 'price', 'days', 'rating', 'image', 'cancellation', 'categories']);
    expect($r->json('data.0.image.srcset'))->toHaveCount(3);
});

it('filters and sorts tours', function () {
    $intl = $this->getJson('/api/v1/tours?region=intl&sort=price-asc')->json('data');
    $prices = array_column($intl, 'price');
    $sorted = $prices;
    sort($sorted);
    expect($intl)->toHaveCount(11)->and($prices)->toBe($sorted);

    $desc = array_column($this->getJson('/api/v1/tours?sort=price-desc')->json('data'), 'price');
    expect($desc[0])->toBeGreaterThanOrEqual(end($desc));

    foreach ($this->getJson('/api/v1/tours?category=honeymoon')->json('data') as $t) {
        expect($t['categories'])->toContain('honeymoon');
    }
    foreach ($this->getJson('/api/v1/tours?price_max=50000&days_min=4')->json('data') as $t) {
        expect($t['price'])->toBeLessThanOrEqual(50000)->and($t['days'])->toBeGreaterThanOrEqual(4);
    }
    foreach ($this->getJson('/api/v1/tours?free_cancel=1')->json('data') as $t) {
        expect($t['cancellation']['kind'])->toBe('free');
    }
    expect($this->getJson('/api/v1/tours?q=maldives')->json('data.0.slug'))->toBe('maldives-honeymoon');
});

it('hides draft, scheduled and deleted tours everywhere', function () {
    Tour::where('slug', 'maldives-honeymoon')->update(['status' => 'draft']);
    $this->getJson('/api/v1/tours/maldives-honeymoon')->assertNotFound();
    expect(collect($this->getJson('/api/v1/tours')->json('data'))->pluck('slug'))->not->toContain('maldives-honeymoon');
    Tour::where('slug', 'bali-highlights')->update(['published_at' => now()->addWeek()]);
    $this->getJson('/api/v1/tours/bali-highlights')->assertNotFound();
    Tour::where('slug', 'nepal-pokhara')->first()->delete();
    $this->getJson('/api/v1/tours/nepal-pokhara')->assertNotFound();
});

it('returns a full tour with itinerary, future departures, tiers, gallery, addons, similar and reviews', function () {
    $d = $this->getJson('/api/v1/tours/maldives-honeymoon')->assertOk()->json('data');
    expect($d['itinerary'])->toHaveCount(5)->and($d['departures'])->not->toBeEmpty()->and($d['gallery'])->not->toBeEmpty()
        ->and($d['similar'])->toHaveCount(4)->and(collect($d['similar'])->pluck('slug'))->not->toContain('maldives-honeymoon')
        ->and($d['reviews']['items'])->not->toBeEmpty()->and(collect($d['addons'])->pluck('code'))->toContain('insurance');
    foreach ($d['departures'] as $dep) {
        expect($dep['date'] >= today()->toDateString())->toBeTrue();
    }
    $this->getJson('/api/v1/tours/maldives-honeymoon/departures')->assertOk()->assertJsonStructure(['data' => [['id', 'date', 'price', 'seats_left', 'status']]]);
});

it('serves destinations with tour counts and destination detail with tours and planner hint', function () {
    $list = $this->getJson('/api/v1/destinations')->assertOk()->json('data');
    expect($list)->toHaveCount(12);
    $d = $this->getJson('/api/v1/destinations/maldives')->assertOk()->json('data');
    expect($d['tours'])->not->toBeEmpty()->and($d['planner']['per_day'])->toBeGreaterThan(0);
    expect($this->getJson('/api/v1/destinations?region=bd')->json('data'))->each(fn ($x) => $x->region->toBe('bd'));
});

it('serves themes with tour counts matching the catalogue', function () {
    $themes = $this->getJson('/api/v1/themes')->assertOk()->json('data');
    expect($themes)->not->toBeEmpty();
    $t = $themes[0];
    $detail = $this->getJson('/api/v1/themes/'.$t['slug'])->assertOk()->json('data');
    expect(count($detail['tours']))->toBe($t['tours_count']);
});

it('serves cruises with cabins, ports and sailings', function () {
    $list = $this->getJson('/api/v1/cruises')->assertOk();
    expect($list->json('data'))->toHaveCount(6)->and($list->json('meta.regions'))->not->toBeEmpty();
    $c = $this->getJson('/api/v1/cruises/'.$list->json('data.0.slug'))->assertOk()->json('data');
    expect($c['cabins'])->not->toBeEmpty()->and($c)->toHaveKeys(['ports_of_call', 'sailings', 'similar', 'reviews']);
});

it('serves activities with categories, detail options/slots and per-date slots', function () {
    $list = $this->getJson('/api/v1/activities')->assertOk();
    expect($list->json('data'))->toHaveCount(12)->and($list->json('meta.categories'))->not->toBeEmpty();
    $slug = $list->json('data.0.slug');
    $this->getJson("/api/v1/activities/{$slug}")->assertOk()->assertJsonStructure(['data' => ['options', 'times', 'similar', 'reviews']]);
    $date = ActivitySlot::whereHas('activity', fn ($q) => $q->where('slug', $slug))->where('starts_at', '>=', now())->value('starts_at');
    $slots = $this->getJson("/api/v1/activities/{$slug}/slots?date=".$date->toDateString())->assertOk()->json('data');
    expect($slots)->not->toBeEmpty()->and($slots[0])->toHaveKeys(['time', 'available', 'price']);
});

it('filters hotels and returns rooms', function () {
    $all = $this->getJson('/api/v1/hotels')->assertOk()->json('data');
    expect($all)->toHaveCount(8);
    foreach ($this->getJson('/api/v1/hotels?stars=5')->json('data') as $h) {
        expect($h['stars'])->toBe(5);
    }
    expect($this->getJson('/api/v1/hotels/'.$all[0]['slug'])->assertOk()->json('data.rooms'))->not->toBeEmpty();
});

it('serves visas with document sets and visa FAQs', function () {
    $all = $this->getJson('/api/v1/visas')->assertOk()->json('data');
    expect($all)->toHaveCount(10);
    $v = $this->getJson('/api/v1/visas/'.$all[0]['slug'])->assertOk()->json('data');
    expect($v['faqs'])->not->toBeEmpty()->and($v)->toHaveKey('document_sets');
});

it('serves only live offers, insurance plans and gift card designs', function () {
    $offers = $this->getJson('/api/v1/offers')->assertOk()->json('data');
    expect($offers)->not->toBeEmpty();
    Offer::query()->update(['ends_at' => now()->subDay()]);
    expect($this->getJson('/api/v1/offers')->json('data'))->toBeEmpty();
    expect($this->getJson('/api/v1/insurance-plans')->assertOk()->json('data.0'))->toHaveKeys(['code', 'name', 'price', 'coverage'])
        ->and($this->getJson('/api/v1/gift-card-designs')->assertOk()->json('data.0.amounts'))->toBeArray();
});

it('returns 404 JSON for unknown slugs on every detail endpoint', function (string $path) {
    $this->getJson("/api/v1/{$path}/no-such-thing")->assertNotFound()->assertJsonStructure(['message']);
})->with(['tours', 'destinations', 'themes', 'cruises', 'activities', 'hotels', 'visas', 'posts', 'careers', 'pages']);
