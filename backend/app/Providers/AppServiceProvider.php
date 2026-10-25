<?php

namespace App\Providers;

use App\Models\Setting;
use App\Models\Translation;
use App\Support\Settings;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());

        // Throttles (per IP). Server-side rendering calls from Next come from one IP, so it gets a generous bucket via its secret header.
        $ssr = fn (Request $r) => hash_equals((string) config('musafir.revalidate_secret'), (string) $r->header('X-Musafir-Ssr'));
        RateLimiter::for('public', fn (Request $r) => $ssr($r) ? Limit::none() : Limit::perMinute(240)->by($r->ip()));
        RateLimiter::for('search', fn (Request $r) => $ssr($r) ? Limit::perMinute(600) : Limit::perMinute(60)->by($r->ip()));
        RateLimiter::for('forms', fn (Request $r) => [Limit::perMinute(6)->by('f:'.$r->ip()), Limit::perDay(60)->by('fd:'.$r->ip())]);

        Setting::saved(fn () => Settings::forget());
        Setting::deleted(fn () => Settings::forget());
        Translation::saved(fn () => Cache::forget('musafir.translations.version'));
        Translation::deleted(fn () => Cache::forget('musafir.translations.version'));
    }
}
