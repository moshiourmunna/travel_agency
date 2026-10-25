<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            $domain = config('musafir.admin_domain');
            $path = config('musafir.admin_path');
            $group = Illuminate\Support\Facades\Route::middleware(['web', App\Http\Middleware\HandleInertiaRequests::class])->name('admin.');
            if ($domain) {
                $group->domain($domain);
            }
            if ($path !== '') {
                $group->prefix($path);
            }
            $group->group(base_path('routes/admin.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
