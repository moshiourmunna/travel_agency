<?php

use App\Http\Controllers\Api\V1\AuthController as Auth;
use App\Http\Controllers\Api\V1\CatalogController as Cat;
use App\Http\Controllers\Api\V1\CheckoutController as Checkout;
use App\Http\Controllers\Api\V1\ContentController as Content;
use App\Http\Controllers\Api\V1\FormController as Form;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\MeController as Me;
use App\Http\Controllers\Api\V1\PlannerController as Planner;
use App\Http\Controllers\Api\V1\SearchController as Search;
use App\Http\Controllers\Pay\PaymentReturnController as PayReturn;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->middleware(['api.locale'])->group(function () {
    Route::get('health', HealthController::class)->name('health');

    // Cacheable public reads (ETag + Cache-Control; Next caches by tag and is revalidated on admin save)
    Route::middleware(['throttle:public', 'public.cache'])->group(function () {
        Route::get('site', [Content::class, 'site'])->name('site');
        Route::get('translations/{lang}', [Content::class, 'translations'])->name('translations');
        Route::get('redirects', [Content::class, 'redirects'])->name('redirects');
        Route::get('media/{key}', [Content::class, 'media'])->name('media')->where('key', '[a-z0-9\-_]+');
        Route::get('sitemap', [Content::class, 'sitemap'])->name('sitemap');
        Route::get('seo', [Content::class, 'seo'])->name('seo');
        Route::get('home', [Content::class, 'home'])->name('home');
        Route::get('pages/{slug}', [Content::class, 'page'])->name('pages.show');
        Route::get('faqs', [Content::class, 'faqs'])->name('faqs');
        Route::get('testimonials', [Content::class, 'testimonials'])->name('testimonials');
        Route::get('reviews', [Content::class, 'reviews'])->name('reviews');
        Route::get('team', [Content::class, 'team'])->name('team');
        Route::get('gallery', [Content::class, 'gallery'])->name('gallery');
        Route::get('credits', [Content::class, 'credits'])->name('credits');
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
        Route::get('hotels', [Cat::class, 'hotels'])->name('hotels');
        Route::get('hotels/{slug}', [Cat::class, 'hotel'])->name('hotels.show');
        Route::get('visas', [Cat::class, 'visas'])->name('visas');
        Route::get('visas/{slug}', [Cat::class, 'visa'])->name('visas.show');
        Route::get('offers', [Cat::class, 'offers'])->name('offers');
        Route::get('insurance-plans', [Cat::class, 'insurancePlans'])->name('insurance');
        Route::get('gift-card-designs', [Cat::class, 'giftCardDesigns'])->name('gift-cards');

        Route::get('airports', [Search::class, 'airports'])->name('airports');
        Route::get('flights/routes', [Search::class, 'flightRoutes'])->name('flights.routes');
        Route::get('planner/config', [Planner::class, 'config'])->name('planner.config');
    });

    // Live (uncached) reads
    Route::middleware('throttle:search')->group(function () {
        Route::get('search', [Search::class, 'search'])->name('search');
        Route::get('flights/search', [Search::class, 'flights'])->name('flights.search');
        // live availability — never cached
        Route::get('activities/{slug}/slots', [Cat::class, 'activitySlots'])->name('activities.slots');
        Route::post('planner/estimate', [Planner::class, 'estimate'])->name('planner.estimate');
    });

    // Writes from public forms
    Route::middleware('throttle:forms')->group(function () {
        Route::post('inquiries', [Form::class, 'inquiry'])->name('inquiries.store');
        Route::post('newsletter', [Form::class, 'newsletter'])->name('newsletter.store');
        Route::post('planner/quote', [Planner::class, 'quote'])->name('planner.quote');
        Route::post('careers/{slug}/apply', [Form::class, 'careerApply'])->name('careers.apply');
    });

    // Checkout (never cached). Amounts are always recomputed on the server.
    Route::middleware('throttle:checkout')->group(function () {
        Route::post('checkout/quote', [Checkout::class, 'quote'])->name('checkout.quote');
        Route::post('coupons/validate', [Checkout::class, 'coupon'])->name('coupons.validate');
        Route::post('bookings', [Checkout::class, 'store'])->name('bookings.store');
        Route::get('bookings/{ref}', [Checkout::class, 'show'])->name('bookings.show')->where('ref', '[A-Z]{3}-\d{2}-\d{5}');
        Route::post('bookings/{ref}/pay', [Checkout::class, 'pay'])->name('bookings.pay')->where('ref', '[A-Z]{3}-\d{2}-\d{5}');
        Route::get('bookings/{ref}/{doc}.pdf', [Checkout::class, 'pdf'])->name('bookings.pdf')->where(['ref' => '[A-Z]{3}-\d{2}-\d{5}', 'doc' => 'invoice|voucher']);
    });
    // Traveller authentication (tokens are kept in an httpOnly cookie by the Next.js BFF).
    Route::middleware('throttle:auth')->prefix('auth')->name('auth.')->group(function () {
        Route::post('register', [Auth::class, 'register'])->name('register');
        Route::post('login', [Auth::class, 'login'])->name('login');
        Route::post('otp/send', [Auth::class, 'otpSend'])->name('otp.send');
        Route::post('otp/verify', [Auth::class, 'otpVerify'])->name('otp.verify');
        Route::post('reset', [Auth::class, 'reset'])->name('reset');
    });

    // Traveller portal
    Route::middleware(['auth:sanctum', 'traveller', 'throttle:me'])->group(function () {
        Route::post('auth/logout', [Auth::class, 'logout'])->name('auth.logout');
        Route::get('auth/me', [Auth::class, 'me'])->name('auth.me');
        Route::prefix('me')->name('me.')->group(function () {
            Route::get('dashboard', [Me::class, 'dashboard'])->name('dashboard');
            Route::get('summary', [Me::class, 'summary'])->name('summary');
            Route::get('bookings', [Me::class, 'bookings'])->name('bookings');
            Route::get('bookings/{ref}', [Me::class, 'booking'])->name('booking')->where('ref', '[A-Z]{3}-\d{2}-\d{5}');
            Route::post('bookings/{ref}/request', [Me::class, 'bookingRequest'])->name('booking.request')->where('ref', '[A-Z]{3}-\d{2}-\d{5}');
            Route::get('bookings/{ref}/ticket', [Me::class, 'ticket'])->name('booking.ticket')->where('ref', '[A-Z]{3}-\d{2}-\d{5}');
            Route::get('payments', [Me::class, 'payments'])->name('payments');
            Route::delete('payment-methods/{id}', [Me::class, 'deleteMethod'])->name('methods.delete')->whereNumber('id');
            Route::get('wallet', [Me::class, 'wallet'])->name('wallet');
            Route::post('wallet/redeem', [Me::class, 'redeemGift'])->name('wallet.redeem');
            Route::get('trips', [Me::class, 'trips'])->name('trips');
            Route::post('wishlist', [Me::class, 'wishlist'])->name('wishlist');
            Route::delete('trips/{id}', [Me::class, 'deletePlan'])->name('trips.delete');
            Route::get('travellers', [Me::class, 'travellers'])->name('travellers');
            Route::post('travellers', [Me::class, 'storeTraveller'])->name('travellers.store');
            Route::put('travellers/{id}', [Me::class, 'updateTraveller'])->name('travellers.update')->whereNumber('id');
            Route::delete('travellers/{id}', [Me::class, 'deleteTraveller'])->name('travellers.delete')->whereNumber('id');
            Route::get('visa', [Me::class, 'visas'])->name('visa');
            Route::post('visa/{ref}/documents', [Me::class, 'uploadVisaDoc'])->name('visa.upload');
            Route::get('reviews', [Me::class, 'reviews'])->name('reviews');
            Route::post('reviews', [Me::class, 'storeReview'])->name('reviews.store');
            Route::get('referrals', [Me::class, 'referrals'])->name('referrals');
            Route::get('notifications', [Me::class, 'notifications'])->name('notifications');
            Route::post('notifications/read', [Me::class, 'readNotifications'])->name('notifications.read');
            Route::get('profile', [Me::class, 'profile'])->name('profile');
            Route::put('profile', [Me::class, 'updateProfile'])->name('profile.update');
            Route::get('settings', [Me::class, 'settings'])->name('settings');
            Route::put('settings', [Me::class, 'updateSettings'])->name('settings.update');
            Route::put('password', [Me::class, 'password'])->name('password');
            Route::delete('sessions/{id}', [Me::class, 'revokeSession'])->name('sessions.delete')->whereNumber('id');
            Route::get('export', [Me::class, 'export'])->name('export');
            Route::delete('account', [Me::class, 'deleteAccount'])->name('account.delete');
            Route::get('tickets', [Me::class, 'tickets'])->name('tickets');
            Route::post('tickets', [Me::class, 'storeTicket'])->name('tickets.store');
            Route::post('tickets/{ref}/messages', [Me::class, 'replyTicket'])->name('tickets.reply');
        });
    });

    // Server-to-server payment notifications (verified with the gateway's own API before anything changes).
    Route::post('payments/{gateway}/ipn', [PayReturn::class, 'ipn'])->name('payments.ipn')->where('gateway', '[a-z_]+');
});
