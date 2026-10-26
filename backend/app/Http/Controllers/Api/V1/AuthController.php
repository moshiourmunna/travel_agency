<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Account as P;
use App\Models\LoginActivity;
use App\Models\Referral;
use App\Models\User;
use App\Services\Auth\Otp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Traveller authentication for the Next.js BFF. Tokens are Sanctum personal access tokens; the BFF keeps them in an
 * httpOnly cookie, so the browser never sees them. Staff and agents use the admin panel, not this API.
 */
class AuthController extends Controller
{
    public function __construct(private Otp $otp) {}

    private function issue(User $u, Request $r, bool $remember, string $via): JsonResponse
    {
        $days = $remember ? 30 : 1;
        $token = $u->createToken(Str::limit((string) $r->userAgent(), 80, '') ?: 'web', ['traveller'], now()->addDays($days));
        $u->forceFill(['last_login_at' => now()])->save();
        LoginActivity::create(['user_id' => $u->id, 'identifier' => $via, 'guard' => 'traveller', 'ip' => $r->ip(), 'user_agent' => Str::limit((string) $r->userAgent(), 250, ''), 'success' => true, 'created_at' => now()]);

        return response()->json(['data' => ['token' => $token->plainTextToken, 'expires_in' => $days * 86400, 'user' => P::user($u)]], 200, ['Cache-Control' => 'no-store']);
    }

    private function throttle(string $key, int $max = 5): void
    {
        if (RateLimiter::tooManyAttempts($key, $max)) {
            throw ValidationException::withMessages(['email' => __('Too many attempts. Please wait :s seconds.', ['s' => RateLimiter::availableIn($key)])])->status(429);
        }
        RateLimiter::hit($key, 60);
    }

    private function traveller(?User $u): ?User
    {
        return $u && $u->type === 'customer' && $u->status !== 'blocked' ? $u : null;
    }

    public function register(Request $r): JsonResponse
    {
        $r->merge(['phone' => Otp::phone($r->input('phone')) ?? $r->input('phone'), 'email' => Str::lower(trim((string) $r->input('email')))]);
        $v = $r->validate([
            'first_name' => ['required', 'string', 'max:60'], 'last_name' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email:rfc', 'max:120', 'unique:users,email'], 'phone' => ['required', 'regex:/^\+8801[3-9]\d{8}$/', 'unique:users,phone'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()], 'terms' => ['accepted'], 'referral' => ['nullable', 'string', 'max:32'],
            'website' => ['nullable', 'max:0'],
        ], ['phone.regex' => __('Enter a valid BD mobile number.'), 'email.unique' => __('An account with this email already exists. Try signing in.'), 'phone.unique' => __('An account with this mobile already exists. Try signing in.')]);
        $u = new User(['name' => trim($v['first_name'].' '.$v['last_name']), 'email' => $v['email'], 'phone' => $v['phone'], 'password' => $v['password'], 'locale' => app()->getLocale()]);
        $u->forceFill(['type' => 'customer', 'status' => 'active', 'code' => 'CU-'.strtoupper(Str::random(6)), 'referral_code' => strtoupper(Str::slug(Str::before($v['first_name'], ' '), '')).random_int(100, 999)]);
        if (! empty($v['referral']) && ($ref = User::where('referral_code', strtoupper($v['referral']))->first())) {
            $u->forceFill(['referred_by' => $ref->id]);
        }
        $u->save();
        $u->refresh(); // load column defaults (miles, tier, …) the presenter reads
        if ($u->referred_by) {
            Referral::create(['referrer_id' => $u->referred_by, 'referred_user_id' => $u->id, 'referred_name' => $u->name, 'status' => 'joined', 'reward' => (int) \App\Support\Settings::get('commerce.referral_reward', 500)]);
        }

        return $this->issue($u, $r, true, $u->email);
    }

    public function login(Request $r): JsonResponse
    {
        $v = $r->validate(['email' => ['required', 'email', 'max:120'], 'password' => ['required', 'string', 'max:200'], 'remember' => ['nullable', 'boolean']]);
        $key = 'login:'.Str::lower($v['email']).'|'.$r->ip();
        $this->throttle($key);
        $u = $this->traveller(User::where('email', Str::lower($v['email']))->first());
        if (! $u || ! Hash::check($v['password'], (string) $u->password)) {
            LoginActivity::create(['user_id' => $u?->id, 'identifier' => Str::lower($v['email']), 'guard' => 'traveller', 'ip' => $r->ip(), 'user_agent' => Str::limit((string) $r->userAgent(), 250, ''), 'success' => false, 'created_at' => now()]);
            throw ValidationException::withMessages(['email' => __('Email or password is incorrect.')]);
        }
        RateLimiter::clear($key);
        $remember = (bool) ($v['remember'] ?? true);
        // Two-step sign-in: the password is right, now prove you hold the phone. The challenge is an encrypted,
        // 10-minute ticket naming the user, so the second call never needs the password again.
        if (($u->preferences['otp_login'] ?? false) && $u->phone) {
            try {
                $code = $this->otp->send('sms', $u->phone, 'login2', app()->getLocale());
            } catch (ValidationException) {
                $code = null; // a code went out under a minute ago — it is still valid, so just ask for it
            }
            $challenge = Crypt::encryptString(json_encode(['u' => $u->id, 'r' => $remember, 'e' => now()->addMinutes(10)->timestamp]));

            return response()->json(['data' => ['two_factor' => true, 'challenge' => $challenge, 'to' => substr($u->phone, 0, 7).'•••'.substr($u->phone, -3), 'ttl' => Otp::TTL_MIN * 60]
                + (app()->environment('local', 'testing') && config('musafir.otp_debug') && $code ? ['dev_code' => $code] : [])], 200, ['Cache-Control' => 'no-store']);
        }

        return $this->issue($u, $r, $remember, $u->email);
    }

    /** Second step of a password sign-in with two-step on: the SMS code for the challenge from login(). */
    public function loginVerify(Request $r): JsonResponse
    {
        $v = $r->validate(['challenge' => ['required', 'string', 'max:2000'], 'code' => ['required', 'digits:6'], 'resend' => ['nullable', 'boolean']]);
        $this->throttle('login2:'.$r->ip(), 10);
        try {
            $c = json_decode(Crypt::decryptString($v['challenge']), true, 4, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $c = null;
        }
        $u = is_array($c) && ($c['e'] ?? 0) >= now()->timestamp ? $this->traveller(User::find($c['u'] ?? 0)) : null;
        if (! $u || ! $u->phone) {
            throw ValidationException::withMessages(['code' => __('This sign-in has expired. Please enter your password again.')]);
        }
        $this->otp->verify($u->phone, 'login2', $v['code']);

        return $this->issue($u, $r, (bool) ($c['r'] ?? true), $u->email);
    }

    /** Send the two-step code again for a live challenge. */
    public function loginResend(Request $r): JsonResponse
    {
        $v = $r->validate(['challenge' => ['required', 'string', 'max:2000']]);
        $this->throttle('otp:'.$r->ip(), 10);
        try {
            $c = json_decode(Crypt::decryptString($v['challenge']), true, 4, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $c = null;
        }
        $u = is_array($c) && ($c['e'] ?? 0) >= now()->timestamp ? $this->traveller(User::find($c['u'] ?? 0)) : null;
        if (! $u || ! $u->phone) {
            throw ValidationException::withMessages(['code' => __('This sign-in has expired. Please enter your password again.')]);
        }
        $code = $this->otp->send('sms', $u->phone, 'login2', app()->getLocale());

        return response()->json(['data' => ['sent' => true] + (app()->environment('local', 'testing') && config('musafir.otp_debug') ? ['dev_code' => $code] : [])]);
    }

    /** Send a code by SMS (sign-in) — or by SMS/email for a password reset. Never reveals whether an account exists. */
    public function otpSend(Request $r): JsonResponse
    {
        $v = $r->validate(['identifier' => ['required', 'string', 'max:120'], 'purpose' => ['required', 'in:login,reset']]);
        $this->throttle('otp:'.$r->ip(), 10);
        $phone = Otp::phone($v['identifier']);
        $email = filter_var($v['identifier'], FILTER_VALIDATE_EMAIL) ? Str::lower($v['identifier']) : null;
        if (! $phone && ! ($email && $v['purpose'] === 'reset')) {
            throw ValidationException::withMessages(['identifier' => $v['purpose'] === 'login' ? __('Enter a valid BD mobile number.') : __('Enter your mobile number or email.')]);
        }
        $u = $this->traveller($phone ? User::where('phone', $phone)->first() : User::where('email', $email)->first());
        $dest = $phone ?? $email;
        $code = null;
        if ($u) {
            $code = $this->otp->send($phone ? 'sms' : 'email', $dest, $v['purpose'], app()->getLocale());
        }
        $masked = $phone ? substr($phone, 0, 7).'•••'.substr($phone, -3) : preg_replace('/(?<=.).(?=[^@]*@)/u', '•', (string) $email);

        return response()->json(['data' => ['sent' => true, 'to' => $masked, 'ttl' => Otp::TTL_MIN * 60]
            + (app()->environment('local', 'testing') && config('musafir.otp_debug') && $code ? ['dev_code' => $code] : [])]);
    }

    public function otpVerify(Request $r): JsonResponse
    {
        $v = $r->validate(['identifier' => ['required', 'string', 'max:120'], 'code' => ['required', 'digits:6'], 'remember' => ['nullable', 'boolean']]);
        $this->throttle('otpv:'.$r->ip(), 10);
        $phone = Otp::phone($v['identifier']) ?? throw ValidationException::withMessages(['identifier' => __('Enter a valid BD mobile number.')]);
        $this->otp->verify($phone, 'login', $v['code']);
        $u = $this->traveller(User::where('phone', $phone)->first()) ?? throw ValidationException::withMessages(['code' => __('No account uses this number yet. Create one in 30 seconds.')]);
        if (! $u->phone_verified_at) {
            $u->forceFill(['phone_verified_at' => now()])->save();
        }

        return $this->issue($u, $r, (bool) ($v['remember'] ?? true), $phone);
    }

    public function reset(Request $r): JsonResponse
    {
        $v = $r->validate(['identifier' => ['required', 'string', 'max:120'], 'code' => ['required', 'digits:6'], 'password' => ['required', 'string', Password::min(8)->letters()->numbers()]]);
        $this->throttle('reset:'.$r->ip(), 10);
        $phone = Otp::phone($v['identifier']);
        $dest = $phone ?? Str::lower($v['identifier']);
        $this->otp->verify($dest, 'reset', $v['code']);
        $u = $this->traveller($phone ? User::where('phone', $phone)->first() : User::where('email', $dest)->first()) ?? throw ValidationException::withMessages(['code' => __('That code is not right. Please check and try again.')]);
        $u->forceFill(['password' => $v['password']])->save();
        $u->tokens()->delete(); // sign out everywhere after a reset

        return $this->issue($u, $r, true, $dest);
    }

    public function logout(Request $r): JsonResponse
    {
        $r->user()?->currentAccessToken()?->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function me(Request $r): JsonResponse
    {
        return response()->json(['data' => P::user($r->user())], 200, ['Cache-Control' => 'no-store']);
    }
}
