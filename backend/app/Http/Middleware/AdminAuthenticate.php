<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** Admin area: a signed-in staff user with the admin.access permission. Sets the admin UI language. */
class AdminAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $u = $request->user();
        if (! $u) {
            if ($request->header('X-Inertia')) {
                return \Inertia\Inertia::location(route('admin.login'));
            }

            return redirect()->guest(route('admin.login'));
        }
        if (! $u->isStaff() || $u->status === 'suspended' || ! $u->can('admin.access')) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('admin.login')->withErrors(['email' => __('admin.no_access')]);
        }

        return $next($request);
    }
}
