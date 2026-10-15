<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** `role:admin` (admin + staff) or `role:agent`. */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        $u = $request->user();
        $ok = $u && match ($role) { 'admin' => $u->isAdmin(), 'agent' => $u->isAgent() && $u->agent, default => $u->role === $role };
        abort_unless($ok, 403);

        return $next($request);
    }
}
