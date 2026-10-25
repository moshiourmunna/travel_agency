<?php

use App\Http\Controllers\Api\V1\CatalogController as Cat;
use App\Http\Controllers\Api\V1\ContentController as Content;
use App\Http\Controllers\Api\V1\FormController as Form;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PlannerController as Planner;
use App\Http\Controllers\Api\V1\SearchController as Search;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->middleware(['api.locale'])->group(function () {
    Route::get('health', HealthController::class)->name('health');

    // Cacheable public reads (ETag + Cache-Control; Next caches by tag and is revalidated on admin save)
    Route::middleware(['throttle:public', 'public.cache'])->group(function () {
        Route::get('site', [Content::class, 'site'])->name('site');
        Route::get('translations/{lang}', [Content::class, 'translations'])->name('translations');
        Route::get('redirects', [Content::class, 'redirects'])->name('redirects');
        Route::get('sitemap', [Content::class, 'sitemap'])->name('sitemap');
        Route::get('seo', [Content::class, 'seo'])->name('seo');
        Route::get('home', [Content::class, 'home'])->name('home');
        Route::get('pages/{slug}', [Content::class, 'page'])->name('pages.show');
        Route::get('faqs', [Content::class, 'faqs'])->name('faqs');
        Route::get('testimonials', [Content::class, 'testimonials'])->name('testimonials');
        Route::get('reviews', [Content::class, 'reviews'])->name('reviews');
        Route::get('team', [Content::class, 'team'])->name('team');
        Route::get('gallery', [Content::class, 'gallery'])->name('gallery');
        Route::get('careers', [Content::class, 'careers'])->name('careers');
        Route::get('careers/{slug}', [Content::class, 'career'])->name('careers.show');
        Route::get('posts', [Content::class, 'posts'])->name('posts');
        Route::get('posts/{slug}', [Content::class, 'post'])->name('posts.show');

        Route::get('tours', [Cat::class, 'tours'])->name('tours');
        Route::get('tours/{slug}', [Cat::class, 'tour'])->name('tours.show');
        Route::get('tours/{slug}/departures', [Cat::class, 'departures'])->name('tours.departures');
        Route::get('destinations', [Cat::class, 'destinations'])->name('destinations');
        Route::get('destinations/{slug}', [Cat::class, 'destination'])->name('destinations.show');
        Route::get('themes', [Cat::class, 'themes'])->name('themes');
        Route::get('themes/{slug}', [Cat::class, 'theme'])->name('themes.show');
        Route::get('cruises', [Cat::class, 'cruises'])->name('cruises');
        Route::get('cruises/{slug}', [Cat::class, 'cruise'])->name('cruises.show');
        Route::get('activities', [Cat::class, 'activities'])->name('activities');
        Route::get('activities/{slug}', [Cat::class, 'activity'])->name('activities.show');
        Route::get('activities/{slug}/slots', [Cat::class, 'activitySlots'])->name('activities.slots');
        Route::get('hotels', [Cat::class, 'hotels'])->name('hotels');
        Route::get('hotels/{slug}', [Cat::class, 'hotel'])->name('hotels.show');
        Route::get('visas', [Cat::class, 'visas'])->name('visas');
        Route::get('visas/{slug}', [Cat::class, 'visa'])->name('visas.show');
        Route::get('offers', [Cat::class, 'offers'])->name('offers');
        Route::get('insurance-plans', [Cat::class, 'insurancePlans'])->name('insurance');
        Route::get('gift-card-designs', [Cat::class, 'giftCardDesigns'])->name('gift-cards');

        Route::get('airports', [Search::class, 'airports'])->name('airports');
        Route::get('planner/config', [Planner::class, 'config'])->name('planner.config');
    });

    // Live (uncached) reads
    Route::middleware('throttle:search')->group(function () {
        Route::get('search', [Search::class, 'search'])->name('search');
        Route::get('flights/search', [Search::class, 'flights'])->name('flights.search');
        Route::post('planner/estimate', [Planner::class, 'estimate'])->name('planner.estimate');
    });

    // Writes from public forms
    Route::middleware('throttle:forms')->group(function () {
        Route::post('inquiries', [Form::class, 'inquiry'])->name('inquiries.store');
        Route::post('newsletter', [Form::class, 'newsletter'])->name('newsletter.store');
        Route::post('planner/quote', [Planner::class, 'quote'])->name('planner.quote');
    });
});
