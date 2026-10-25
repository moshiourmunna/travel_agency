<?php

use App\Models\BlogPost;
use App\Models\Faq;
use App\Models\Page;
use App\Models\Redirect;
use App\Models\Setting;
use App\Models\Tour;
use App\Support\Settings;

beforeEach(fn () => $this->withHeader('X-Musafir-Ssr', config('musafir.revalidate_secret')));

it('reports health', function () {
    $this->getJson('/api/v1/health')->assertOk();
});

it('bootstraps the site with settings, languages, currencies, stats and partners', function () {
    $r = $this->getJson('/api/v1/site')->assertOk()
        ->assertJsonStructure(['data' => ['locale', 'languages', 'currencies', 'settings', 'menus', 'stats', 'partners', 'translations_version']]);
    expect($r->json('data.languages'))->toHaveCount(2)
        ->and(collect($r->json('data.currencies'))->pluck('code'))->toContain('BDT', 'USD')
        ->and($r->json('data.settings'))->toHaveKey('company');
});

it('never leaks private settings in the site payload', function () {
    $s = $this->getJson('/api/v1/site')->json('data.settings');
    $private = Setting::where('is_public', false)->get();
    expect($private)->not->toBeEmpty();
    foreach ($private as $p) {
        expect($s[$p->group][$p->key] ?? '__absent__')->toBe('__absent__');
    }
});

it('localises responses from ?lang and Accept-Language and sets Content-Language', function () {
    $en = $this->getJson('/api/v1/tours/maldives-honeymoon')->assertOk()->assertHeader('Content-Language', 'en');
    $bn = $this->getJson('/api/v1/tours/maldives-honeymoon?lang=bn')->assertOk()->assertHeader('Content-Language', 'bn');
    $al = $this->getJson('/api/v1/tours/maldives-honeymoon', ['Accept-Language' => 'bn-BD,bn;q=0.9']);
    expect($en->json('data.title'))->toBe('Maldives Water-Villa Honeymoon')
        ->and($bn->json('data.title'))->toBe('মালদ্বীপ ওয়াটার-ভিলা হানিমুন')
        ->and($al->json('data.title'))->toBe('মালদ্বীপ ওয়াটার-ভিলা হানিমুন');
    expect((string) $en->headers->get('Vary'))->toContain('Accept-Language');
});

it('falls back to English for unsupported locales', function () {
    $this->getJson('/api/v1/tours/maldives-honeymoon?lang=fr')->assertOk()->assertHeader('Content-Language', 'en');
});

it('sends ETag/Cache-Control and answers 304 for a matching If-None-Match', function () {
    $r = $this->getJson('/api/v1/destinations')->assertOk();
    $etag = $r->headers->get('ETag');
    expect($etag)->toStartWith('W/"')->and($r->headers->get('Cache-Control'))->toContain('public');
    $this->getJson('/api/v1/destinations', ['If-None-Match' => $etag])->assertStatus(304);
});

it('serves FAQs with categories and the show_on filter', function () {
    $all = $this->getJson('/api/v1/faqs')->assertOk();
    expect($all->json('data'))->toHaveCount(Faq::where('is_active', true)->count())->and($all->json('meta.categories'))->not->toBeEmpty();
    $visa = $this->getJson('/api/v1/faqs?show_on=visa')->assertOk()->json('data');
    expect($visa)->not->toBeEmpty()->and(count($visa))->toBeLessThan(count($all->json('data')));
});

it('serves testimonials, team, gallery, careers', function () {
    expect($this->getJson('/api/v1/testimonials')->assertOk()->json('data'))->not->toBeEmpty()
        ->and($this->getJson('/api/v1/team')->assertOk()->json('data.0'))->toHaveKeys(['name', 'role', 'initials'])
        ->and($this->getJson('/api/v1/gallery')->assertOk()->json('data.0.items.0.image.src'))->toBeString();
    $jobs = $this->getJson('/api/v1/careers')->assertOk()->json('data');
    expect($jobs)->not->toBeEmpty();
    $this->getJson('/api/v1/careers/'.$jobs[0]['slug'])->assertOk()->assertJsonPath('data.slug', $jobs[0]['slug'])->assertJsonStructure(['data' => ['description']]);
});

it('serves the blog list and a post with HTML body, tags and related posts', function () {
    $list = $this->getJson('/api/v1/posts')->assertOk()->json('data');
    expect($list)->not->toBeEmpty();
    $p = $this->getJson('/api/v1/posts/'.$list[0]['slug'].'?lang=bn')->assertOk();
    expect($p->json('data.body'))->toContain('<')->and($p->json('data.related'))->toHaveCount(3)
        ->and(collect($p->json('data.related'))->pluck('slug'))->not->toContain($list[0]['slug']);
});

it('paginates reviews with average and histogram, and scopes them to a product', function () {
    $r = $this->getJson('/api/v1/reviews?per_page=5')->assertOk();
    expect($r->json('data'))->toHaveCount(5)->and($r->json('meta.histogram'))->toHaveKeys(['5', '4', '3', '2', '1'])
        ->and($r->json('meta.average'))->toBeGreaterThan(3);
    $this->getJson('/api/v1/reviews?type=tour&slug=no-such-tour')->assertNotFound();
    $this->getJson('/api/v1/reviews?type=planet&slug=x')->assertUnprocessable();
});

it('serves legal CMS pages and 404s unknown or draft ones', function () {
    $this->getJson('/api/v1/pages/terms')->assertOk()->assertJsonStructure(['data' => ['title', 'body', 'sections', 'seo']]);
    $this->getJson('/api/v1/pages/does-not-exist')->assertNotFound()->assertJsonStructure(['message']);
    Page::where('slug', 'terms')->update(['status' => 'draft']);
    $this->getJson('/api/v1/pages/terms')->assertNotFound();
});

it('returns route SEO meta and a sitemap without noindex entries', function () {
    $seo = $this->getJson('/api/v1/seo?path=/tours')->assertOk()->json('data');
    expect($seo['title'] ?? $seo['meta_title'] ?? null)->not->toBeNull();
    $map = collect($this->getJson('/api/v1/sitemap')->assertOk()->json('data'))->pluck('path');
    expect($map)->toContain('/tours/maldives-honeymoon', '/blog/'.BlogPost::first()->slug)
        ->and($map->duplicates())->toBeEmpty();
    $t = Tour::where('slug', 'maldives-honeymoon')->first();
    $t->seo()->updateOrCreate([], ['robots' => 'noindex,follow', 'in_sitemap' => true]);
    expect(collect($this->getJson('/api/v1/sitemap')->json('data'))->pluck('path'))->not->toContain('/tours/maldives-honeymoon');
});

it('exposes active redirects and translations', function () {
    Redirect::create(['from_path' => '/old-tour', 'to_path' => '/tours/maldives-honeymoon', 'code' => 301, 'is_active' => true]);
    expect(collect($this->getJson('/api/v1/redirects')->assertOk()->json('data'))->pluck('from_path'))->toContain('/old-tour');
    $this->getJson('/api/v1/translations/en')->assertOk();
    $this->getJson('/api/v1/translations/xx')->assertNotFound();
});

it('busts the settings cache when a setting is saved', function () {
    Settings::all();
    $s = Setting::where('group', 'company')->where('is_public', true)->firstOrFail();
    $s->update(['value' => 'Changed Co']);
    expect(Settings::all()['company'][$s->key]['value'])->toBe('Changed Co');
});
