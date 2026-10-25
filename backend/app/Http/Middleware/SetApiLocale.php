<?php

namespace App\Http\Middleware;

use App\Http\Presenters\Catalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** ?lang=bn | Accept-Language: bn → app locale for localised API output (default en). */
class SetApiLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        Catalog::flush(); // per-request lookup caches (safe under long-running workers)
        $supported = config('musafir.locales', ['en', 'bn']);
        $lang = $request->query('lang');
        if (! in_array($lang, $supported, true)) {
            $lang = $request->getPreferredLanguage($supported) ?? config('musafir.default_locale', 'en');
        }
        app()->setLocale($lang);
        $response = $next($request);
        $response->headers->set('Content-Language', $lang);
        $response->headers->set('Vary', trim(($response->headers->get('Vary') ? $response->headers->get('Vary').', ' : '').'Accept-Language', ', '));

        return $response;
    }
}
