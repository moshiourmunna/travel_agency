<?php

use App\Http\Controllers\Pay\PaymentReturnController;
use Illuminate\Support\Facades\Route;

// The public website is the Next.js app (frontend/). Laravel serves the API, the admin panel and media.
// (Skipped when the admin owns "/" on its own domain: ADMIN_DOMAIN set and ADMIN_PATH empty.)
if (! (config('musafir.admin_domain') && config('musafir.admin_path') === '')) {
    Route::get('/', fn () => redirect()->away(config('musafir.frontend_url')))->name('home');
}

// Payment gateway returns (gateways POST or redirect here) and the local payment simulator.
Route::group([], function () { // CSRF is skipped for pay/* in bootstrap/app.php
    Route::match(['get', 'post'], 'pay/{gateway}/return/{payment}', [PaymentReturnController::class, 'return'])->name('pay.return')->where('gateway', '[a-z_]+');
    Route::get('pay/mock/{payment}', [PaymentReturnController::class, 'mock'])->middleware('signed')->name('pay.mock');
    Route::post('pay/mock/{payment}', [PaymentReturnController::class, 'mockSubmit'])->middleware(['signed', 'throttle:30,1'])->name('pay.mock.submit');
});
