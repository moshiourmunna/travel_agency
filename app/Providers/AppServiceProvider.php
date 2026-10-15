<?php

namespace App\Providers;

use App\Integrations\Contracts\FlightProvider;
use App\Integrations\Contracts\HajjPortal;
use App\Integrations\Contracts\HotelProvider;
use App\Integrations\Contracts\VisaProvider;
use App\Support\SiteConfig;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        foreach (['visa' => VisaProvider::class, 'hajj_portal' => HajjPortal::class, 'flights' => FlightProvider::class, 'hotels' => HotelProvider::class] as $key => $contract) {
            $this->app->singleton($contract, fn ($app) => $app->make(config("integrations.drivers.$key.".config("integrations.$key"))));
        }
    }

    public function boot(): void
    {
        Blade::if('module', fn (string ...$keys) => collect($keys)->contains(fn ($k) => module_on($k)));

        RateLimiter::for('forms', fn (Request $r) => app()->environment('e2e') ? Limit::none() : Limit::perMinute(10)->by($r->ip()));
        RateLimiter::for('login', fn (Request $r) => app()->environment('e2e') ? Limit::none() : Limit::perMinute(6)->by($r->input('login').$r->ip()));

        View::composer('*', function ($view) {
            $locale = app()->getLocale();
            $lang = collect(SiteConfig::enabledLanguages())->firstWhere('code', $locale);
            $view->with('dir', $lang['dir'] ?? 'ltr');
        });
    }
}
