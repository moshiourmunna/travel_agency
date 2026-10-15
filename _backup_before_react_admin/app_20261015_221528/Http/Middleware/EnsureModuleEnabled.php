<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Route middleware `module:flights` (or `module:tours,ziyarah` = any of) – 404 when switched off in admin. */
class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string ...$modules)
    {
        foreach ($modules as $m) {
            if (module_on($m)) {
                return $next($request);
            }
        }
        abort(404);
    }
}
