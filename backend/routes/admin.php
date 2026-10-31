<?php

use App\Admin\Registry;
use App\Http\Controllers\Admin;
use App\Http\Middleware\AdminAuthenticate;
use App\Http\Middleware\AdminLocale;
use App\Http\Middleware\FlushRevalidation;
use Illuminate\Support\Facades\Route;

// Loaded from bootstrap/app.php under config('musafir.admin_domain') and/or config('musafir.admin_path'); names are prefixed "admin.".
Route::get('health', Admin\HealthController::class)->name('health');

Route::middleware(AdminLocale::class)->group(function () {
    Route::get('login', [Admin\AuthController::class, 'show'])->name('login');
    Route::post('login', [Admin\AuthController::class, 'login'])->middleware('throttle:20,1')->name('login.attempt');
});

Route::middleware([AdminAuthenticate::class, AdminLocale::class, FlushRevalidation::class])->group(function () {
    Route::post('logout', [Admin\AuthController::class, 'logout'])->name('logout');
    Route::post('locale', [Admin\AuthController::class, 'locale'])->name('locale');
    Route::get('profile', [Admin\AuthController::class, 'profile'])->name('profile');
    Route::put('profile', [Admin\AuthController::class, 'updateProfile'])->name('profile.update');
    Route::put('profile/password', [Admin\AuthController::class, 'password'])->name('profile.password');

    Route::get('/', Admin\DashboardController::class)->name('dashboard');
    Route::get('search', [Admin\DashboardController::class, 'search'])->name('search');

    // Media library
    Route::get('media', [Admin\MediaController::class, 'index'])->name('media');
    Route::get('media/browse', [Admin\MediaController::class, 'browse'])->name('media.browse');
    Route::get('media/lookup', [Admin\MediaController::class, 'lookup'])->name('media.lookup');
    Route::post('media', [Admin\MediaController::class, 'store'])->name('media.store');
    Route::put('media/{asset}', [Admin\MediaController::class, 'update'])->name('media.update');
    Route::post('media/{asset}/replace', [Admin\MediaController::class, 'replace'])->name('media.replace');
    Route::delete('media/{asset}', [Admin\MediaController::class, 'destroy'])->name('media.destroy');
    Route::post('media/folders', [Admin\MediaController::class, 'folder'])->name('media.folder');

    // Settings, website cache
    Route::get('settings', [Admin\SettingsController::class, 'index'])->name('settings');
    Route::put('settings/{group}', [Admin\SettingsController::class, 'update'])->name('settings.update');
    Route::post('revalidate', [Admin\SettingsController::class, 'purge'])->name('revalidate');

    // UI strings
    Route::get('translations', [Admin\TranslationController::class, 'index'])->name('translations');
    Route::post('translations', [Admin\TranslationController::class, 'store'])->name('translations.store');
    Route::put('translations/{translation}', [Admin\TranslationController::class, 'update'])->name('translations.update');
    Route::delete('translations/{translation}', [Admin\TranslationController::class, 'destroy'])->name('translations.destroy');
    Route::get('translations/export', [Admin\TranslationController::class, 'export'])->name('translations.export');
    Route::post('translations/import', [Admin\TranslationController::class, 'import'])->name('translations.import');

    // Menus
    Route::get('menus', [Admin\MenuController::class, 'index'])->name('menus');
    Route::put('menus/{menu}', [Admin\MenuController::class, 'update'])->name('menus.update');

    // Roles & permission matrix
    Route::get('roles', [Admin\RoleController::class, 'index'])->name('roles');
    Route::post('roles', [Admin\RoleController::class, 'store'])->name('roles.store');
    Route::put('roles/{role}', [Admin\RoleController::class, 'update'])->name('roles.update');
    Route::delete('roles/{role}', [Admin\RoleController::class, 'destroy'])->name('roles.destroy');

    // Booking desk
    Route::get('bookings/{booking:id}', [Admin\BookingController::class, 'show'])->whereNumber('booking')->name('bookings.show');
    Route::post('bookings/{booking:id}/status', [Admin\BookingController::class, 'status'])->name('bookings.status');
    Route::post('bookings/{booking:id}/assign', [Admin\BookingController::class, 'assign'])->name('bookings.assign');
    Route::post('bookings/{booking:id}/note', [Admin\BookingController::class, 'note'])->name('bookings.note');
    Route::post('bookings/{booking:id}/payment', [Admin\BookingController::class, 'payment'])->name('bookings.payment');
    Route::post('bookings/{booking:id}/refund', [Admin\BookingController::class, 'refund'])->name('bookings.refund');
    Route::post('bookings/{booking:id}/notify', [Admin\BookingController::class, 'notify'])->name('bookings.notify');

    // Support desk
    Route::get('tickets/{ticket}', [Admin\TicketController::class, 'show'])->whereNumber('ticket')->name('tickets.show');
    Route::post('tickets/{ticket}/reply', [Admin\TicketController::class, 'reply'])->name('tickets.reply');
    Route::post('tickets/{ticket}/update', [Admin\TicketController::class, 'update'])->name('tickets.update');
    Route::get('tickets/{ticket}/files/{message}/{i}', [Admin\TicketController::class, 'file'])->name('tickets.file');

    // Private files (visa documents, CVs) — streamed after a permission check, never public.
    Route::get('files/document/{document}', [Admin\FileController::class, 'document'])->name('files.document');
    Route::get('files/cv/{application}', [Admin\FileController::class, 'cv'])->name('files.cv');

    // Generic modules (App\Admin\Resources\*)
    $slugs = implode('|', array_map(fn ($c) => preg_quote((new $c)->slug, '/'), Registry::RESOURCES));
    Route::prefix('{resource}')->where(['resource' => $slugs])->name('resource.')->group(function () {
        Route::get('/', [Admin\ResourceController::class, 'index'])->name('index');
        Route::get('create', [Admin\ResourceController::class, 'create'])->name('create');
        Route::get('export', [Admin\ResourceController::class, 'export'])->name('export');
        Route::post('/', [Admin\ResourceController::class, 'store'])->name('store');
        Route::post('bulk-delete', [Admin\ResourceController::class, 'bulkDestroy'])->name('bulk-delete');
        Route::post('bulk/{action}', [Admin\ResourceController::class, 'bulkAction'])->name('bulk');
        Route::post('reorder', [Admin\ResourceController::class, 'reorder'])->name('reorder');
        Route::get('{id}', [Admin\ResourceController::class, 'show'])->whereNumber('id')->name('show');
        Route::get('{id}/edit', [Admin\ResourceController::class, 'edit'])->whereNumber('id')->name('edit');
        Route::put('{id}', [Admin\ResourceController::class, 'update'])->whereNumber('id')->name('update');
        Route::delete('{id}', [Admin\ResourceController::class, 'destroy'])->whereNumber('id')->name('destroy');
        Route::post('{id}/restore', [Admin\ResourceController::class, 'restore'])->whereNumber('id')->name('restore');
        Route::post('{id}/action/{action}', [Admin\ResourceController::class, 'action'])->whereNumber('id')->name('action');
    });
});
