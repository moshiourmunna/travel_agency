<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Portal routes: a signed-in traveller (customer account, active, token with the traveller ability). */
class EnsureTraveller
{
    public function handle(Request $request, Closure $next): Response
    {
        $u = $request->user();
        abort_unless($u && $u->type === 'customer' && $u->status === 'active' && $u->tokenCan('traveller'), 403, 'Traveller accounts only.');

        return $next($request);
    }
}
