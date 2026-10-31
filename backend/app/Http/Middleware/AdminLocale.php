<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Admin UI language (EN/BN) from the session, else the staff member's saved locale. */
class AdminLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $loc = $request->session()->get('admin_locale') ?? $request->user()?->locale ?? 'en';
        app()->setLocale(in_array($loc, ['en', 'bn'], true) ? $loc : 'en');

        return $next($request);
    }
}
