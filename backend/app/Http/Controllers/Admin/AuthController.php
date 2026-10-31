<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LoginActivity;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Staff sign-in for the admin panel (session guard, throttled per email + IP, every attempt logged). */
class AuthController extends Controller
{
    public function show(Request $r): Response|RedirectResponse
    {
        if ($r->user()?->isStaff()) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Auth/Login', ['demo' => app()->environment('local')]);
    }

    public function login(Request $r): RedirectResponse
    {
        $data = $r->validate(['email' => ['required', 'email'], 'password' => ['required', 'string'], 'remember' => ['nullable', 'boolean']]);
        $key = 'admin-login:'.Str::lower($data['email']).'|'.$r->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => __('admin.login_throttled', ['seconds' => RateLimiter::availableIn($key)])]);
        }
        $u = User::where('email', $data['email'])->first();
        $ok = $u && $u->isStaff() && $u->status !== 'suspended' && Hash::check($data['password'], $u->password);
        LoginActivity::create(['user_id' => $u?->id, 'identifier' => Str::lower($data['email']), 'guard' => 'admin', 'ip' => $r->ip(), 'user_agent' => mb_substr((string) $r->userAgent(), 0, 250), 'success' => $ok, 'created_at' => now()]);
        if (! $ok) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['email' => __('admin.login_failed')]);
        }
        if (! $u->can('admin.access')) {
            throw ValidationException::withMessages(['email' => __('admin.no_access')]);
        }
        RateLimiter::clear($key);
        Auth::guard('web')->login($u, (bool) ($data['remember'] ?? false));
        $r->session()->regenerate();
        $u->forceFill(['last_login_at' => now()])->save();
        activity('admin')->causedBy($u)->performedOn($u)->event('login')->withProperties(['ip' => $r->ip()])->log('login');

        return redirect()->intended(route('admin.dashboard'));
    }

    public function logout(Request $r): RedirectResponse
    {
        if ($u = $r->user()) {
            activity('admin')->causedBy($u)->performedOn($u)->event('logout')->log('logout');
        }
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return redirect()->route('admin.login')->with('success', __('admin.logged_out'));
    }

    public function locale(Request $r): RedirectResponse
    {
        $loc = $r->validate(['locale' => ['required', 'in:en,bn']])['locale'];
        $r->session()->put('admin_locale', $loc);
        $r->user()?->forceFill(['locale' => $loc])->save();

        return back();
    }

    public function profile(Request $r): Response
    {
        $u = $r->user();

        return Inertia::render('Profile', [
            'profile' => ['name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'title' => $u->title, 'branch' => $u->branch, 'role' => $u->getRoleNames()->first(), 'last_login_at' => $u->last_login_at?->format('Y-m-d H:i')],
            'logins' => LoginActivity::where('user_id', $u->id)->latest('created_at')->limit(10)->get()->map(fn ($l) => ['at' => $l->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'), 'ip' => $l->ip, 'agent' => Str::limit((string) $l->user_agent, 80), 'success' => $l->success, 'guard' => $l->guard]),
        ]);
    }

    public function updateProfile(Request $r): RedirectResponse
    {
        $u = $r->user();
        $data = $r->validate(['name' => ['required', 'string', 'max:120'], 'phone' => ['nullable', 'string', 'max:20', 'unique:users,phone,'.$u->id]]);
        $u->forceFill($data)->save();

        return back()->with('success', __('admin.saved', ['name' => $u->name]));
    }

    public function password(Request $r): RedirectResponse
    {
        $data = $r->validate(['current_password' => ['required', 'current_password'], 'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()]]);
        $u = $r->user();
        $u->forceFill(['password' => $data['password']])->save();
        Auth::logoutOtherDevices($data['password']);
        activity('admin')->causedBy($u)->performedOn($u)->event('password')->log('password changed');

        return back()->with('success', __('admin.done'));
    }
}
