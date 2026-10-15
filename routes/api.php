<?php

use App\Http\Controllers\Api\V1Controller;
use Illuminate\Support\Facades\Route;

/* Versioned REST API for the future mobile app and partner portals (see docs/architecture.md §2). */
Route::prefix('v1')->name('api.')->middleware('throttle:60,1')->group(function () {
    Route::get('config', [V1Controller::class, 'config'])->name('config');
    Route::get('packages', [V1Controller::class, 'packages'])->name('packages');
    Route::get('packages/{package:slug}', [V1Controller::class, 'package'])->name('package');
    Route::get('visa/{ref}/status', [V1Controller::class, 'visaStatus'])->name('visa.status');
});
