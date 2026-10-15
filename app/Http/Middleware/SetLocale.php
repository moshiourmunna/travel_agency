<?php

namespace App\Http\Middleware;

use App\Support\SiteConfig;
use Closure;
use Illuminate\Http\Request;

/** Locale from ?lang=, session or user, restricted to languages enabled in admin. Arabic renders RTL. */
class SetLocale
{
    public function handle(Request $request, Closure $next)
    {
        $enabled = array_column(SiteConfig::enabledLanguages(), 'code');
        if (($q = $request->query('lang')) && in_array($q, $enabled, true) && $request->hasSession()) {
            $request->session()->put('locale', $q);
        }
        $locale = $request->hasSession() ? $request->session()->get('locale') : null;
        $locale ??= $request->user()?->locale;
        if (! in_array($locale, $enabled, true)) {
            $locale = SiteConfig::defaultLocale();
        }
        app()->setLocale($locale);

        return $next($request);
    }
}
