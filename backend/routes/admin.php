<?php

use App\Http\Controllers\Admin\HealthController;
use Illuminate\Support\Facades\Route;

// Loaded from bootstrap/app.php under config('musafir.admin_domain') and/or config('musafir.admin_path').
Route::get('health', HealthController::class)->name('health');
