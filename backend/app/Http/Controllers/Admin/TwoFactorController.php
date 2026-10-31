<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LoginActivity;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Staff two-step sign-in with an authenticator app (TOTP) + one-time recovery codes. */
class TwoFactorController extends Controller
{
    /* ── sign-in challenge (after a correct password) ── */

    private function pending(Request $r): ?User
    {
        $p = $r->session()->get('admin_2fa');
        if (! $p || ($p['until'] ?? 0) < now()->timestamp) {
            $r->session()->forget('admin_2fa');

            return null;
        }

        return User::find($p['id']);
    }

    public function show(Request $r): Response|RedirectResponse
    {
        if (! $this->pending($r)) {
            return redirect()->route('admin.login')->withErrors(['email' => __('admin.2fa_expired')]);
        }

        return Inertia::render('Auth/TwoFactor');
    }

    public function verify(Request $r): RedirectResponse
    {
        $u = $this->pending($r);
        if (! $u || ! $u->hasTwoFactor()) {
            return redirect()->route('admin.login')->withErrors(['email' => __('admin.2fa_expired')]);
        }
        $d = $r->validate(['code' => ['nullable', 'string', 'max:12'], 'recovery' => ['nullable', 'string', 'max:20']]);
        $key = 'admin-2fa:'.$u->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['code' => __('admin.login_throttled', ['seconds' => RateLimiter::availableIn($key)])]);
        }
        $via = 'totp';
        $ok = ! empty($d['code']) && Totp::verify($u->two_factor_secret, $d['code'], 'u'.$u->id);
        if (! $ok && ! empty($d['recovery'])) {
            $codes = $u->two_factor_recovery_codes ?? [];
            $given = Str::lower(trim($d['recovery']));
            $i = array_search($given, $codes, true);
            if ($i !== false) {
                unset($codes[$i]);
                $u->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();
                $ok = true;
                $via = 'recovery';
            }
        }
        LoginActivity::create(['user_id' => $u->id, 'identifier' => Str::lower($u->email).' (2fa)', 'guard' => 'admin', 'ip' => $r->ip(), 'user_agent' => mb_substr((string) $r->userAgent(), 0, 250), 'success' => $ok, 'created_at' => now()]);
        if (! $ok) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages([empty($d['code']) && ! empty($d['recovery']) ? 'recovery' : 'code' => __('admin.2fa_invalid')]);
        }
        RateLimiter::clear($key);
        $remember = (bool) ($r->session()->pull('admin_2fa')['remember'] ?? false);

        return AuthController::complete($r, $u, $remember, $via);
    }

    /* ── set-up from My profile ── */

    public function setup(Request $r): RedirectResponse
    {
        $u = $r->user();
        $r->validate(['password' => ['required', 'current_password']]);
        $secret = Totp::secret();
        $r->session()->put('admin_2fa_setup', $secret);

        return back()->with('two_factor_setup', [
            'secret' => trim(chunk_split($secret, 4, ' ')),
            'qr' => 'data:image/svg+xml;base64,'.base64_encode(Totp::qrSvg(Totp::uri($secret, $u->email, (string) (config('app.name') ?: 'Musafir').' Admin'))),
        ]);
    }

    public function confirm(Request $r): RedirectResponse
    {
        $u = $r->user();
        $d = $r->validate(['code' => ['required', 'string', 'max:12']]);
        $secret = $r->session()->get('admin_2fa_setup');
        if (! $secret || ! Totp::verify($secret, $d['code'], 'u'.$u->id)) {
            throw ValidationException::withMessages(['code' => __('admin.2fa_invalid')]);
        }
        $codes = Totp::recoveryCodes();
        $u->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => $codes])->save();
        $r->session()->forget('admin_2fa_setup');
        activity('admin')->causedBy($u)->performedOn($u)->event('2fa')->log('two-step sign-in enabled');

        return back()->with('success', __('admin.2fa_enabled'))->with('recovery_codes', $codes);
    }

    public function recovery(Request $r): RedirectResponse
    {
        $u = $r->user();
        $r->validate(['password' => ['required', 'current_password']]);
        abort_unless($u->hasTwoFactor(), 422);
        $codes = Totp::recoveryCodes();
        $u->forceFill(['two_factor_recovery_codes' => $codes])->save();

        return back()->with('recovery_codes', $codes);
    }

    public function disable(Request $r): RedirectResponse
    {
        $u = $r->user();
        $r->validate(['password' => ['required', 'current_password']]);
        if ($u->getRoleNames()->intersect(config('musafir.admin_2fa_roles'))->isNotEmpty()) {
            throw ValidationException::withMessages(['password' => __('admin.2fa_required_role')]);
        }
        $u->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null, 'two_factor_recovery_codes' => null])->save();
        activity('admin')->causedBy($u)->performedOn($u)->event('2fa')->log('two-step sign-in disabled');

        return back()->with('success', __('admin.2fa_disabled'));
    }
}
