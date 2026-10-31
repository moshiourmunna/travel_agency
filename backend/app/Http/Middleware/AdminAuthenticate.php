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

        // Idle timeout for staff sessions (remember-me logins are re-checked too).
        $idle = (int) config('musafir.admin_idle_minutes');
        $seen = (int) $request->session()->get('admin_seen', 0);
        if ($idle > 0 && $seen && now()->timestamp - $seen > $idle * 60) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return $request->header('X-Inertia') ? \Inertia\Inertia::location(route('admin.login')) : redirect()->route('admin.login')->withErrors(['email' => __('admin.session_idle')]);
        }
        $request->session()->put('admin_seen', now()->timestamp);
        // Roles listed in ADMIN_2FA_REQUIRED_ROLES must set up an authenticator before using the admin.
        if (! $u->hasTwoFactor() && config('musafir.admin_2fa_roles') && $u->getRoleNames()->intersect(config('musafir.admin_2fa_roles'))->isNotEmpty()
            && ! $request->routeIs('admin.profile', 'admin.profile.*', 'admin.logout', 'admin.locale')) {
            return redirect()->route('admin.profile')->with('warning', __('admin.2fa_must_setup'));
        }

        return $next($request);
    }
}
