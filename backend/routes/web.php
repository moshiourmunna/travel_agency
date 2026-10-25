<?php

use Illuminate\Support\Facades\Route;

// The public website is the Next.js app (frontend/). Laravel serves the API, the admin panel and media.
Route::get('/', fn () => redirect()->away(config('musafir.frontend_url')))->name('home');
