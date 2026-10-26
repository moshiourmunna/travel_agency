<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\FeatureTestCase;
use Tests\TestCase;

/*
| Feature tests run against the MySQL database `musafir_test` (create it once: see docs/LOCAL_SETUP.md).
| RefreshDatabase + $seed: the full demo seed runs once per test run, then every test is wrapped in a transaction.
*/
pest()->extend(FeatureTestCase::class)->use(RefreshDatabase::class)->in('Feature');
pest()->extend(TestCase::class)->in('Unit');

/** The demo traveller (CU-10240). */
function farhana(): App\Models\User
{
    return App\Models\User::where('email', 'farhana@example.com')->firstOrFail();
}

/** Act as a traveller through a real Sanctum token (sessions, currentAccessToken), forgetting any earlier user. */
function asTraveller(?App\Models\User $u = null, string $name = 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0'): Tests\TestCase
{
    app('auth')->forgetGuards();

    return test()->withToken(($u ?? farhana())->createToken($name, ['traveller'])->plainTextToken);
}

/** A fresh customer with no bookings. */
function newTraveller(array $attrs = []): App\Models\User
{
    $u = new App\Models\User(array_merge(['name' => 'Pest Traveller', 'email' => 'pest.'.uniqid().'@example.com', 'phone' => '+88017'.random_int(10000000, 99999999), 'password' => 'password'], $attrs));
    $u->forceFill(['type' => 'customer', 'status' => 'active', 'code' => 'CU-'.strtoupper(Illuminate\Support\Str::random(6)), 'referral_code' => 'PEST'.random_int(1000, 9999)] + array_intersect_key($attrs, array_flip(['referred_by', 'phone_verified_at', 'wallet_balance'])))->save();

    return $u->refresh();
}
