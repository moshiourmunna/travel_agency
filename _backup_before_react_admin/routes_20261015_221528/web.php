<?php

use App\Http\Controllers as C;
use Illuminate\Support\Facades\Route;

// ---------- Public site ----------
Route::get('/', [C\PageController::class, 'home'])->name('home');
Route::get('/lang/{code}', [C\PageController::class, 'lang'])->name('lang');
Route::get('/about', [C\PageController::class, 'about'])->name('about');
Route::get('/guide', [C\PageController::class, 'guide'])->name('guide');
Route::get('/faq', [C\PageController::class, 'faq'])->name('faq');
Route::get('/contact', [C\PageController::class, 'contact'])->name('contact');
Route::post('/contact', [C\PageController::class, 'contactStore'])->middleware('throttle:forms')->name('contact.store');

Route::get('/hajj', [C\PackageController::class, 'hajj'])->middleware('module:hajj')->name('hajj');
Route::get('/umrah', [C\PackageController::class, 'umrah'])->middleware('module:umrah')->name('umrah');
Route::get('/tours', [C\PackageController::class, 'tours'])->middleware('module:tours,ziyarah')->name('tours');
Route::get('/packages/{package}', [C\PackageController::class, 'show'])->name('packages.show');
Route::get('/packages/{package}/quote', [C\PackageController::class, 'quote'])->name('packages.quote');

Route::get('/flights', [C\TravelController::class, 'flights'])->middleware('module:flights')->name('flights');
Route::get('/hotels', [C\TravelController::class, 'hotels'])->middleware('module:hotels')->name('hotels');
Route::middleware('module:visa')->group(function () {
    Route::get('/visa', [C\TravelController::class, 'visa'])->name('visa');
    Route::post('/visa/apply', [C\TravelController::class, 'visaApply'])->middleware('throttle:forms')->name('visa.apply');
    Route::get('/visa/track', [C\TravelController::class, 'visaTrack'])->name('visa.track');
});
Route::middleware('module:preregistration')->group(function () {
    Route::get('/pre-registration', [C\TravelController::class, 'preRegistration'])->name('prereg');
    Route::post('/pre-registration', [C\TravelController::class, 'preRegistrationStore'])->middleware('throttle:forms')->name('prereg.store');
});
Route::middleware('module:blog')->group(function () {
    Route::get('/blog', [C\PageController::class, 'blog'])->name('blog');
    Route::get('/blog/{post:slug}', [C\PageController::class, 'post'])->name('blog.show');
});
Route::get('/gallery', [C\PageController::class, 'gallery'])->middleware('module:gallery')->name('gallery');

// ---------- Auth ----------
Route::middleware('guest')->group(function () {
    Route::get('/login', [C\AuthController::class, 'show'])->name('login');
    Route::post('/login', [C\AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [C\AuthController::class, 'register'])->middleware('throttle:forms')->name('register');
});
Route::post('/logout', [C\AuthController::class, 'logout'])->middleware('auth')->name('logout');

// ---------- Booking & payment ----------
Route::middleware('auth')->group(function () {
    Route::get('/booking', [C\BookingController::class, 'create'])->name('booking.create');
    Route::post('/booking', [C\BookingController::class, 'store'])->middleware('throttle:forms')->name('booking.store');
    Route::get('/booking/{booking}/done', [C\BookingController::class, 'done'])->name('booking.done');
    Route::get('/payment/{payment}/simulate', [C\PaymentController::class, 'simulate'])->name('payment.simulate');

    Route::get('/dashboard', [C\DashboardController::class, 'index'])->name('dashboard');
    Route::post('/dashboard/bookings/{booking}/pay', [C\DashboardController::class, 'pay'])->name('dashboard.pay');
    Route::post('/dashboard/documents/{document}', [C\DashboardController::class, 'upload'])->name('dashboard.upload');
    Route::put('/dashboard/profile', [C\DashboardController::class, 'profile'])->name('dashboard.profile');
});
Route::post('/payment/callback/{payment}', [C\PaymentController::class, 'callback'])->name('payment.callback');

// ---------- Agent portal (B2B) ----------
Route::prefix('agent')->name('agent.')->middleware(['auth', 'role:agent', 'module:agents'])->group(function () {
    Route::get('/', [C\AgentController::class, 'index'])->name('index');
    Route::post('/bookings', [C\AgentController::class, 'book'])->name('book');
});

// ---------- Admin ----------
Route::prefix('admin')->name('admin.')->middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/', [C\Admin\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/settings', [C\Admin\SettingsController::class, 'edit'])->name('settings');
    Route::put('/settings', [C\Admin\SettingsController::class, 'update'])->name('settings.update');
    // ----- Bookings -----
    Route::controller(C\Admin\BookingController::class)->group(function () {
        Route::get('/bookings', 'index')->name('bookings.index');
        Route::get('/bookings/export', 'export')->name('bookings.export');
        Route::get('/bookings/create', 'create')->name('bookings.create');
        Route::post('/bookings', 'store')->name('bookings.store');
        Route::get('/bookings/{booking}', 'show')->withTrashed()->name('bookings.show');
        Route::get('/bookings/{booking}/edit', 'edit')->name('bookings.edit');
        Route::put('/bookings/{booking}', 'update')->name('bookings.edit.update');
        Route::patch('/bookings/{booking}', 'update')->name('bookings.update');
        Route::post('/bookings/{booking}/status', 'status')->name('bookings.status');
        Route::post('/bookings/{booking}/note', 'note')->name('bookings.note');
        Route::post('/bookings/{booking}/agent', 'assignAgent')->middleware('module:agents')->name('bookings.agent');
        Route::post('/bookings/{booking}/payments', 'payment')->name('bookings.payment');
        Route::post('/bookings/{booking}/schedule', 'schedule')->middleware('module:installments')->name('bookings.schedule');
        Route::get('/bookings/{booking}/invoice', 'invoice')->withTrashed()->name('bookings.invoice');
        Route::get('/bookings/{booking}/voucher', 'voucher')->name('bookings.voucher');
        Route::post('/payments/{payment}/verify', 'verifyPayment')->name('payments.verify');
        Route::post('/documents/{document}/upload', 'documentUpload')->name('documents.upload');
        Route::post('/documents/{document}/review', 'documentReview')->name('documents.review');
        Route::get('/documents/{document}/file', 'documentFile')->name('documents.file');
        Route::middleware('module:visa')->group(function () {
            Route::post('/visa/{visa}/submit', 'submitVisa')->name('visa.submit');
            Route::post('/pilgrim-visa/{bt}', 'visa')->name('bookings.visa');
        });
        Route::middleware('role:owner')->group(function () {
            Route::delete('/bookings/{booking}', 'destroy')->name('bookings.destroy');
            Route::post('/bookings/{booking}/restore', 'restore')->withTrashed()->name('bookings.restore');
            Route::post('/payments/{payment}/refund', 'refund')->name('payments.refund');
        });
    });
    // ----- Customers & pilgrims -----
    Route::get('/customers/export', [C\Admin\CustomerController::class, 'export'])->name('customers.export');
    Route::resource('customers', C\Admin\CustomerController::class)->except('destroy')->withTrashed(['show']);
    Route::delete('/customers/{customer}', [C\Admin\CustomerController::class, 'destroy'])->middleware('role:owner')->name('customers.destroy');
    Route::post('/customers/{customer}/restore', [C\Admin\CustomerController::class, 'restore'])->withTrashed()->middleware('role:owner')->name('customers.restore');
    Route::get('/pilgrims/export', [C\Admin\PilgrimController::class, 'export'])->name('pilgrims.export');
    Route::resource('pilgrims', C\Admin\PilgrimController::class)->only('index', 'show', 'edit', 'update');
    // ----- Payments -----
    Route::get('/payments', [C\Admin\PaymentController::class, 'index'])->name('payments.index');
    Route::get('/payments/export', [C\Admin\PaymentController::class, 'export'])->name('payments.export');
    Route::get('/payments/{payment}/slip', [C\Admin\PaymentController::class, 'slip'])->name('payments.slip');
    // ----- Pre-registrations -----
    Route::middleware('module:preregistration')->controller(C\Admin\PreRegistrationController::class)->group(function () {
        Route::get('/pre-registrations', 'index')->name('preregs.index');
        Route::get('/pre-registrations/export', 'export')->name('preregs.export');
        Route::get('/pre-registrations/{prereg}', 'show')->name('preregs.show');
        Route::put('/pre-registrations/{prereg}', 'update')->name('preregs.update');
        Route::post('/pre-registrations/{prereg}/convert', 'convert')->name('preregs.convert');
        Route::delete('/pre-registrations/{prereg}', 'destroy')->middleware('role:owner')->name('preregs.destroy');
    });
    // ----- Agent commissions -----
    Route::middleware('module:agents')->controller(C\Admin\CommissionController::class)->group(function () {
        Route::get('/commissions', 'index')->name('commissions.index');
        Route::get('/commissions/export', 'export')->name('commissions.export');
        Route::put('/commissions/{commission}', 'update')->name('commissions.update');
        Route::get('/agents/{agent}/statement', 'statement')->name('agents.statement');
    });
    Route::get('/audit-log', [C\Admin\AuditLogController::class, 'index'])->middleware('role:owner')->name('audit.index');
    Route::get('/inbox', [C\Admin\DashboardController::class, 'inbox'])->name('inbox');
    Route::get('/integrations', [C\Admin\DashboardController::class, 'integrations'])->name('integrations');
    // Generic CRUD for catalogue / CMS / agents (see App\Support\AdminResources)
    Route::get('/manage/{resource}', [C\Admin\ResourceController::class, 'index'])->name('res.index');
    Route::get('/manage/{resource}/create', [C\Admin\ResourceController::class, 'create'])->name('res.create');
    Route::post('/manage/{resource}', [C\Admin\ResourceController::class, 'store'])->name('res.store');
    Route::get('/manage/{resource}/{id}/edit', [C\Admin\ResourceController::class, 'edit'])->name('res.edit');
    Route::put('/manage/{resource}/{id}', [C\Admin\ResourceController::class, 'update'])->name('res.update');
    Route::delete('/manage/{resource}/{id}', [C\Admin\ResourceController::class, 'destroy'])->name('res.destroy');
});
