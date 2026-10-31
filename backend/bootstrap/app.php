<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\PublicCache;
use App\Http\Middleware\SetApiLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            $domain = config('musafir.admin_domain');
            $path = config('musafir.admin_path');
            $group = Route::middleware(['web', HandleInertiaRequests::class])->name('admin.');
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
        $middleware->alias([
            'api.locale' => SetApiLocale::class,
            'public.cache' => PublicCache::class,
            'traveller' => \App\Http\Middleware\EnsureTraveller::class,
        ]);
        // Gateways POST back to /pay/* from their own domains (verified via their APIs / signed URLs instead).
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->preventRequestForgery(except: ['pay/*']);
        // Trusted proxies come from config (musafir.trusted_proxies) in AppServiceProvider so `config:cache` keeps working.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
