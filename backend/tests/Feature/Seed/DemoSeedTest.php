<?php

use App\Models\Activity;
use App\Models\Booking;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\Hotel;
use App\Models\MediaAsset;
use App\Models\Page;
use App\Models\Payment;
use App\Models\SeoMeta;
use App\Models\Tour;
use App\Models\User;
use App\Models\VisaProduct;

it('seeds every catalogue collection from the mockup', function () {
    expect(Tour::count())->toBe(16)
        ->and(Destination::count())->toBe(12)
        ->and(Cruise::count())->toBe(6)
        ->and(Activity::count())->toBe(12)
        ->and(Hotel::count())->toBe(8)
        ->and(VisaProduct::count())->toBe(10);
});

it('keeps bilingual content intact', function () {
    $t = Tour::where('slug', 'maldives-honeymoon')->firstOrFail();
    expect($t->getTranslation('title', 'en'))->toBe('Maldives Water-Villa Honeymoon')
        ->and($t->getTranslation('title', 'bn'))->toBe('মালদ্বীপ ওয়াটার-ভিলা হানিমুন')
        ->and($t->itinerary)->toHaveCount(5)
        ->and($t->departures)->toHaveCount(6)
        ->and($t->inclusions)->not->toBeEmpty()
        ->and($t->categories->pluck('slug')->all())->toContain('honeymoon')
        ->and($t->cancellationPolicy->code)->toBe('free30')
        ->and($t->destination->slug)->toBe('maldives');
});

it('imports demo photos into the media library with responsive conversions', function () {
    $asset = MediaAsset::where('key', 'maldives')->firstOrFail();
    $img = $asset->toImage('en');
    expect($img['src'])->toContain('maldives')
        ->and($img['srcset'])->toHaveCount(4)
        ->and($img['width'])->toBe(1600);
});

it('creates demo accounts with roles', function () {
    $admin = User::where('email', 'admin@musafir.test')->firstOrFail();
    expect($admin->hasRole('owner'))->toBeTrue()
        ->and($admin->can('settings.manage'))->toBeTrue();
    $visa = User::where('email', 'visa@musafir.test')->firstOrFail();
    expect($visa->can('visa.manage'))->toBeTrue()->and($visa->can('payments.refund'))->toBeFalse();
    expect(User::where('email', 'farhana@example.com')->first()->tier->code)->toBe('gold');
});

it('seeds consistent bookings and payments', function () {
    $b = Booking::where('ref', 'MSF-26-48213')->firstOrFail();
    expect((float) $b->total)->toBe(289000.0)
        ->and((float) $b->paid)->toBe(86700.0)
        ->and($b->status)->toBe('partial')
        ->and($b->instalments)->toHaveCount(3)
        ->and($b->product)->toBeInstanceOf(Tour::class);
    expect(Booking::whereColumn('paid', '>', 'total')->count())->toBe(0);
    expect(Payment::whereNull('gateway_txn')->count())->toBe(0);
});

it('seeds SEO meta for every public mockup page', function () {
    expect(SeoMeta::count())->toBeGreaterThan(100);
    expect(Page::where('slug', 'home')->first()->seo->getTranslation('meta_title', 'bn'))->not->toBeEmpty();
    expect(Tour::where('slug', 'turkey-classic')->first()->seo->getTranslation('meta_title', 'en'))->toContain('Turkey');
});
