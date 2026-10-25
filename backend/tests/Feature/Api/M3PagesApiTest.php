<?php

use App\Models\Inquiry;
use App\Models\JobApplication;
use App\Models\Lead;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => $this->withHeader('X-Musafir-Ssr', config('musafir.revalidate_secret')));

it('paginates blog posts and filters by category', function () {
    $r = $this->getJson('/api/v1/posts?per_page=4')->assertOk();
    expect($r->json('data'))->toHaveCount(4)
        ->and($r->json('meta'))->toMatchArray(['total' => 6, 'current_page' => 1, 'last_page' => 2, 'per_page' => 4])
        ->and($r->json('meta.categories'))->not->toBeEmpty();
    expect($this->getJson('/api/v1/posts?per_page=4&page=2')->json('data'))->toHaveCount(2);
    expect($this->getJson('/api/v1/posts?per_page=999')->json('meta.per_page'))->toBe(48);
    $card = $r->json('data.0');
    expect($card['reading_mins'])->toBeInt()->and($card)->toHaveKey('is_featured');
});

it('serves a post with its body and localises it', function () {
    $en = $this->getJson('/api/v1/posts/sajek-travel-guide')->assertOk()->json('data');
    $bn = $this->getJson('/api/v1/posts/sajek-travel-guide?lang=bn')->assertOk()->json('data');
    expect($en['body'])->toContain('<h2')->and($bn['title'])->not->toBe($en['title']);
    $this->getJson('/api/v1/posts/does-not-exist')->assertNotFound();
});

it('accepts a career application with a private PDF CV', function () {
    Storage::fake('local');
    $before = JobApplication::count();
    $r = $this->post('/api/v1/careers/air-ticketing-executive/apply', [
        'name' => 'Nusrat Jahan', 'email' => 'Nusrat@Example.com', 'phone' => '01711000000', 'cover_letter' => 'Hello',
        'cv' => UploadedFile::fake()->create('cv.pdf', 300, 'application/pdf'),
    ], ['Accept' => 'application/json'])->assertCreated();
    expect($r->json('data.reference'))->toMatch('/^MSF-JOB-\d{5}$/')->and(JobApplication::count())->toBe($before + 1);
    $app = JobApplication::latest('id')->first();
    expect($app->email)->toBe('nusrat@example.com')->and($app->cv_path)->toStartWith('cvs/');
    Storage::disk('local')->assertExists($app->cv_path);
});

it('rejects bad career applications and swallows bots', function () {
    Storage::fake('local');
    $this->post('/api/v1/careers/air-ticketing-executive/apply', ['name' => 'X'], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email']);
    $this->post('/api/v1/careers/air-ticketing-executive/apply', ['name' => 'Valid Name', 'email' => 'a@b.co', 'cv' => UploadedFile::fake()->create('cv.exe', 10, 'application/x-msdownload')], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('cv');
    $this->post('/api/v1/careers/air-ticketing-executive/apply', ['name' => 'Valid Name', 'email' => 'a@b.co', 'cv' => UploadedFile::fake()->create('cv.pdf', 6000, 'application/pdf')], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('cv');
    $this->post('/api/v1/careers/no-such-job/apply', ['name' => 'Valid Name', 'email' => 'a@b.co'], ['Accept' => 'application/json'])->assertNotFound();
    $before = JobApplication::count();
    $this->post('/api/v1/careers/air-ticketing-executive/apply', ['name' => 'Bot', 'email' => 'bot@x.co', 'website' => 'http://spam'], ['Accept' => 'application/json'])->assertCreated();
    expect(JobApplication::count())->toBe($before);
});

it('ignores honeypot planner quotes', function () {
    $leads = Lead::count();
    $inq = Inquiry::count();
    $this->postJson('/api/v1/planner/quote', ['stops' => [['slug' => 'nepal', 'days' => 5]], 'adults' => 2, 'name' => 'Bot', 'phone' => '+8801711000000', 'website' => 'x'])->assertCreated();
    expect(Lead::count())->toBe($leads)->and(Inquiry::count())->toBe($inq);
});

it('filters catalogue listings by an explicit slug list (compare / wishlist)', function () {
    $r = $this->getJson('/api/v1/tours?slugs=bali-highlights,maldives-honeymoon,nope')->assertOk()->json('data');
    expect(collect($r)->pluck('slug')->sort()->values()->all())->toBe(['bali-highlights', 'maldives-honeymoon']);
    expect($this->getJson('/api/v1/hotels?slugs=ocean-pearl-resort')->json('data'))->toHaveCount(1);
});

it('lists image credits with licence and attribution', function () {
    $c = $this->getJson('/api/v1/credits')->assertOk()->json('data');
    expect($c)->not->toBeEmpty();
    foreach ($c as $row) {
        expect($row['license'])->not->toBeEmpty()->and($row['image']['src'])->not->toBeEmpty()->and($row['title'])->not->toContain('File:');
    }
});

it('tags reviews with a bd / intl region and resolves page data images', function () {
    $regions = collect($this->getJson('/api/v1/reviews?per_page=48')->assertOk()->json('data'))->pluck('region')->unique()->sort()->values()->all();
    expect($regions)->toBe(['bd', 'intl']);
    $about = $this->getJson('/api/v1/pages/about')->assertOk()->json('data.data');
    expect($about['photos'][0]['image'])->toHaveKey('src');
    $team = $this->getJson('/api/v1/team')->assertOk()->json('data.0');
    expect($team['countries_visited'])->toBeInt();
});

it('serves localised legal pages and SEO rows for path-only routes', function () {
    foreach (['terms', 'privacy', 'refund-policy'] as $slug) {
        $p = $this->getJson("/api/v1/pages/{$slug}?lang=bn")->assertOk()->json('data');
        expect($p['body'])->toContain('<h2')->and($p['data']['updated'])->toBe('2026-10-01');
    }
    expect($this->getJson('/api/v1/seo?path=/brand')->assertOk()->json('data.robots'))->toContain('noindex');
    $paths = collect($this->getJson('/api/v1/sitemap')->json('data'))->pluck('path');
    expect($paths)->toContain('/credits')->toContain('/terms')->not->toContain('/brand')->not->toContain('/login')->not->toContain('/booking');
});
