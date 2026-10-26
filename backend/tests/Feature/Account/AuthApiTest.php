<?php

use App\Models\LoginActivity;
use App\Models\OtpCode;
use App\Models\Referral;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/* Traveller auth for the BFF: register (+ referral), password sign-in, OTP sign-in, two-step, reset, guards. */

beforeEach(function () {
    config(['musafir.otp_debug' => true]);
});

it('registers a traveller, links a referral code and returns a token + user', function () {
    $r = $this->postJson('/api/v1/auth/register?lang=en', ['first_name' => 'Nusrat', 'last_name' => 'Jahan', 'email' => 'Nusrat.J@Example.com', 'phone' => '01812345678',
        'password' => 'safari2026', 'terms' => true, 'referral' => 'farhana500', 'website' => ''])->assertOk()->json('data');
    expect($r['token'])->toBeString()->not->toBeEmpty()->and($r['user']['first_name'])->toBe('Nusrat');
    $u = User::where('email', 'nusrat.j@example.com')->firstOrFail();
    expect($u->type)->toBe('customer')->and($u->phone)->toBe('+8801812345678')->and($u->referred_by)->toBe(farhana()->id)
        ->and(Referral::where('referred_user_id', $u->id)->value('status'))->toBe('joined');
});

it('rejects duplicate email/phone, weak passwords, bad phones and bots', function () {
    $this->postJson('/api/v1/auth/register', ['first_name' => 'A', 'last_name' => 'B', 'email' => 'farhana@example.com', 'phone' => '01712345678', 'password' => 'short', 'terms' => false])
        ->assertUnprocessable()->assertJsonValidationErrors(['email', 'phone', 'password', 'terms']);
    $this->postJson('/api/v1/auth/register', ['first_name' => 'A', 'last_name' => 'B', 'email' => 'x'.uniqid().'@example.com', 'phone' => '01212345678', 'password' => 'safari2026', 'terms' => true, 'website' => 'spam'])
        ->assertUnprocessable()->assertJsonValidationErrors(['phone', 'website']);
});

it('signs in with email + password and logs both failed and successful attempts', function () {
    $this->postJson('/api/v1/auth/login', ['email' => 'farhana@example.com', 'password' => 'wrong-pass'])->assertUnprocessable()->assertJsonValidationErrors('email');
    expect(LoginActivity::where('user_id', farhana()->id)->where('success', false)->exists())->toBeTrue();
    $r = $this->postJson('/api/v1/auth/login', ['email' => 'FARHANA@example.com', 'password' => 'password'])->assertOk()->json('data');
    expect($r['token'])->toBeString()->and($r)->not->toHaveKey('two_factor');
    $this->withToken($r['token'])->getJson('/api/v1/me/summary')->assertOk()->assertJsonPath('data.user.first_name', 'Farhana');
});

it('throttles repeated wrong passwords', function () {
    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', ['email' => 'farhana@example.com', 'password' => 'nope-nope'])->assertUnprocessable();
    }
    $this->postJson('/api/v1/auth/login', ['email' => 'farhana@example.com', 'password' => 'password'])->assertStatus(429);
});

it('signs in with a mobile OTP; a wrong code fails and the code is single-use', function () {
    $s = $this->postJson('/api/v1/auth/otp/send', ['identifier' => '01712345678', 'purpose' => 'login'])->assertOk()->json('data');
    expect($s['to'])->toContain('•••')->and($s['dev_code'])->toMatch('/^\d{6}$/');
    $wrong = $s['dev_code'] === '000000' ? '111111' : '000000';
    $this->postJson('/api/v1/auth/otp/verify', ['identifier' => '01712345678', 'code' => $wrong])->assertUnprocessable();
    $this->postJson('/api/v1/auth/otp/verify', ['identifier' => '+8801712345678', 'code' => $s['dev_code']])->assertOk()->assertJsonStructure(['data' => ['token']]);
    $this->postJson('/api/v1/auth/otp/verify', ['identifier' => '01712345678', 'code' => $s['dev_code']])->assertUnprocessable();
});

it('never reveals whether a number has an account', function () {
    $r = $this->postJson('/api/v1/auth/otp/send', ['identifier' => '01999999999', 'purpose' => 'login'])->assertOk()->json('data');
    expect($r['sent'])->toBeTrue()->and($r)->not->toHaveKey('dev_code');
    expect(OtpCode::where('destination', '+8801999999999')->exists())->toBeFalse();
});

it('asks for an SMS code after the password when two-step sign-in is on', function () {
    $u = farhana();
    $u->forceFill(['preferences' => array_merge($u->preferences ?? [], ['otp_login' => true])])->save();
    $r = $this->postJson('/api/v1/auth/login', ['email' => 'farhana@example.com', 'password' => 'password'])->assertOk()->json('data');
    expect($r['two_factor'])->toBeTrue()->and($r)->not->toHaveKey('token')->and($r['challenge'])->toBeString()->and($r['dev_code'])->toMatch('/^\d{6}$/');
    $this->postJson('/api/v1/auth/login/verify', ['challenge' => $r['challenge'].'x', 'code' => $r['dev_code']])->assertUnprocessable()->assertJsonValidationErrors('code');
    $this->postJson('/api/v1/auth/login/verify', ['challenge' => $r['challenge'], 'code' => $r['dev_code'] === '000000' ? '111111' : '000000'])->assertUnprocessable();
    $ok = $this->postJson('/api/v1/auth/login/verify', ['challenge' => $r['challenge'], 'code' => $r['dev_code']])->assertOk()->json('data');
    expect($ok['token'])->toBeString();
    // an expired challenge is refused even with a fresh code
    $this->travel(11)->minutes();
    $this->postJson('/api/v1/auth/login/resend', ['challenge' => $r['challenge']])->assertUnprocessable();
});

it('resets a password by email code and signs out every device', function () {
    $u = farhana();
    $old = $u->createToken('old', ['traveller'])->plainTextToken;
    $s = $this->postJson('/api/v1/auth/otp/send', ['identifier' => 'farhana@example.com', 'purpose' => 'reset'])->assertOk()->json('data');
    $r = $this->postJson('/api/v1/auth/reset', ['identifier' => 'farhana@example.com', 'code' => $s['dev_code'], 'password' => 'newpass2026'])->assertOk()->json('data');
    expect(Hash::check('newpass2026', $u->fresh()->password))->toBeTrue()->and($r['token'])->toBeString();
    app('auth')->forgetGuards();
    $this->withToken($old)->getJson('/api/v1/me/summary')->assertUnauthorized();
});

it('keeps the portal to signed-in travellers only', function () {
    $this->getJson('/api/v1/me/summary')->assertUnauthorized();
    $staff = User::where('type', '!=', 'customer')->firstOrFail();
    $this->withToken($staff->createToken('x', ['traveller'])->plainTextToken)->getJson('/api/v1/me/summary')->assertForbidden();
    app('auth')->forgetGuards();
    $this->withToken(farhana()->createToken('x', ['admin'])->plainTextToken)->getJson('/api/v1/me/summary')->assertForbidden();
});

it('signs out by revoking the current token', function () {
    $t = farhana()->createToken('x', ['traveller'])->plainTextToken;
    $this->withToken($t)->postJson('/api/v1/auth/logout')->assertOk();
    app('auth')->forgetGuards();
    $this->withToken($t)->getJson('/api/v1/me/summary')->assertUnauthorized();
});
