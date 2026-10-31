<?php

use App\Support\Totp;
use Illuminate\Support\Facades\Cache;

function enable2fa(string $login = 'accounts'): array
{
    $u = staff($login);
    $secret = Totp::secret();
    $codes = Totp::recoveryCodes();
    $u->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => $codes])->save();

    return [$u, $secret, $codes];
}

it('matches the RFC 6238 test vector', function () {
    expect(Totp::code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1))->toBe('287082')
        ->and(Totp::code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', intdiv(1111111109, 30)))->toBe('081804');
});

it('sets up two-step sign-in from the profile with password, QR and a confirming code', function () {
    $u = staff('content');
    asStaff('content')->post(adminUrl('profile/two-factor'), ['password' => 'wrong'])->assertSessionHasErrors('password');
    $r = asStaff('content')->post(adminUrl('profile/two-factor'), ['password' => 'password']);
    $setup = $r->getSession()->get('two_factor_setup');
    expect($setup['qr'])->toStartWith('data:image/svg+xml;base64,');
    $secret = session('admin_2fa_setup');
    asStaff('content')->post(adminUrl('profile/two-factor/confirm'), ['code' => '000000'])->assertSessionHasErrors('code');
    $ok = asStaff('content')->post(adminUrl('profile/two-factor/confirm'), ['code' => Totp::code($secret)]);
    $ok->assertSessionHasNoErrors();
    expect($ok->getSession()->get('recovery_codes'))->toHaveCount(8);
    $u->refresh();
    expect($u->hasTwoFactor())->toBeTrue()->and($u->two_factor_secret)->toBe($secret);
    expect(DB::table('users')->where('id', $u->id)->value('two_factor_secret'))->not->toBe($secret); // encrypted at rest
});

it('asks for the authenticator code after the password and rejects bad, replayed and expired codes', function () {
    [$u, $secret] = enable2fa();
    auth()->forgetGuards();
    $this->post(adminUrl('login'), ['email' => $u->email, 'password' => 'password'])->assertRedirect(route('admin.2fa'));
    $this->assertGuest('web');
    $this->get(adminUrl(''))->assertRedirect(route('admin.login'));
    $this->get(adminUrl('login/two-factor'))->assertOk();
    $this->post(adminUrl('login/two-factor'), ['code' => '123456'])->assertSessionHasErrors('code');
    $this->assertGuest('web');
    $code = Totp::code($secret);
    $this->post(adminUrl('login/two-factor'), ['code' => $code])->assertRedirect(route('admin.dashboard'));
    $this->assertAuthenticatedAs($u, 'web');
    // the same code cannot be used twice
    auth()->guard('web')->logout();
    $this->post(adminUrl('login'), ['email' => $u->email, 'password' => 'password']);
    $this->post(adminUrl('login/two-factor'), ['code' => $code])->assertSessionHasErrors('code');
    // the pending step expires after 5 minutes
    $this->travel(6)->minutes();
    $this->post(adminUrl('login/two-factor'), ['code' => Totp::code($secret)])->assertRedirect(route('admin.login'));
    $this->assertGuest('web');
});

it('accepts each recovery code once', function () {
    [$u, , $codes] = enable2fa();
    auth()->forgetGuards();
    $this->post(adminUrl('login'), ['email' => $u->email, 'password' => 'password']);
    $this->post(adminUrl('login/two-factor'), ['recovery' => strtoupper($codes[0])])->assertRedirect(route('admin.dashboard'));
    expect($u->fresh()->two_factor_recovery_codes)->toHaveCount(7);
    auth()->guard('web')->logout();
    $this->post(adminUrl('login'), ['email' => $u->email, 'password' => 'password']);
    $this->post(adminUrl('login/two-factor'), ['recovery' => $codes[0]])->assertSessionHasErrors('recovery');
});

it('locks the code step after 5 wrong codes', function () {
    [$u] = enable2fa();
    auth()->forgetGuards();
    $this->post(adminUrl('login'), ['email' => $u->email, 'password' => 'password']);
    foreach (range(1, 5) as $i) {
        $this->post(adminUrl('login/two-factor'), ['code' => '00000'.$i]);
    }
    $this->post(adminUrl('login/two-factor'), ['code' => '000009'])->assertSessionHasErrors('code');
    expect(Illuminate\Support\Facades\RateLimiter::tooManyAttempts('admin-2fa:'.$u->id, 5))->toBeTrue();
});

it('forces roles listed in ADMIN_2FA_REQUIRED_ROLES to set up 2FA first and blocks turning it off', function () {
    config(['musafir.admin_2fa_roles' => ['finance']]);
    asStaff('accounts')->get(adminUrl('payments'))->assertRedirect(route('admin.profile'));
    asStaff('accounts')->get(adminUrl('profile'))->assertOk()->assertInertia(fn ($p) => $p->where('two_factor.required', true)->etc());
    asStaff('sales')->get(adminUrl('bookings'))->assertOk();
    enable2fa('accounts');
    asStaff('accounts')->get(adminUrl('payments'))->assertOk();
    asStaff('accounts')->delete(adminUrl('profile/two-factor'), ['password' => 'password'])->assertSessionHasErrors('password');
    expect(staff('accounts')->fresh()->hasTwoFactor())->toBeTrue();
});

it('ends idle staff sessions', function () {
    asStaff()->get(adminUrl(''))->assertOk();
    $this->travel(config('musafir.admin_idle_minutes') + 1)->minutes();
    $this->get(adminUrl(''))->assertRedirect(route('admin.login'));
    $this->assertGuest('web');
});

it('sends security headers and a nonce CSP on admin pages', function () {
    $r = $this->get(adminUrl('login'));
    $csp = $r->headers->get('Content-Security-Policy');
    expect($csp)->toContain("script-src 'self' 'nonce-")->toContain("object-src 'none'")->toContain("frame-ancestors 'self'");
    preg_match("/'nonce-([^']+)'/", $csp, $m);
    expect($r->getContent())->toContain('nonce="'.$m[1].'"');
    $r->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'SAMEORIGIN')->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    $api = $this->getJson('/api/v1/health');
    $api->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Robots-Tag', 'noindex');
    expect($api->headers->get('Content-Security-Policy'))->toBeNull();
});
