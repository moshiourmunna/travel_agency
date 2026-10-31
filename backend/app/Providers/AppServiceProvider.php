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
        $this->app->singleton(\App\Support\Revalidator::class);
    }

    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());

        // Throttles (per IP). Server-side rendering calls from Next come from one IP, so it gets a generous bucket via its secret header.
        $ssr = fn (Request $r) => hash_equals((string) config('musafir.revalidate_secret'), (string) $r->header('X-Musafir-Ssr'));
        RateLimiter::for('public', fn (Request $r) => $ssr($r) ? Limit::none() : Limit::perMinute(240)->by($r->ip()));
        RateLimiter::for('search', fn (Request $r) => $ssr($r) ? Limit::perMinute(600) : Limit::perMinute(60)->by($r->ip()));
        RateLimiter::for('checkout', fn (Request $r) => $ssr($r) ? Limit::perMinute(600) : Limit::perMinute(40)->by('c:'.$r->ip()));
        RateLimiter::for('auth', fn (Request $r) => [Limit::perMinute(12)->by('a:'.$r->ip()), Limit::perHour(120)->by('ah:'.$r->ip())]);
        RateLimiter::for('me', fn (Request $r) => Limit::perMinute((int) config('musafir.me_rate', 240))->by('me:'.($r->user()?->id ?? $r->ip())));
        RateLimiter::for('forms', fn (Request $r) => [Limit::perMinute(6)->by('f:'.$r->ip()), Limit::perDay(60)->by('fd:'.$r->ip())]);

        // NB: closures must not return false — that halts the remaining model-event listeners (revalidation hook below).
        Setting::saved(function () { Settings::forget(); });
        Setting::deleted(function () { Settings::forget(); });
        Translation::saved(function () { Cache::forget('musafir.translations.version'); });
        Translation::deleted(function () { Cache::forget('musafir.translations.version'); });

        // Admin saves -> purge the matching Next.js cache tags (collected per request, flushed by FlushRevalidation).
        foreach (\App\Support\CacheTags::MODELS as $class) {
            $hook = function (Model $m) {
                $r = app(\App\Support\Revalidator::class);
                if ($r->collecting()) {
                    $r->add(\App\Support\CacheTags::for($m));
                }
            };
            $class::saved($hook);
            $class::deleted($hook);
            if (method_exists($class, 'restored')) {
                $class::restored($hook);
            }
        }
    }
}
