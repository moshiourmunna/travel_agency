<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('removes only the e2e marker rows and leaves the demo seed intact', function () {
    DB::table('newsletter_subscribers')->insert(['email' => 'e2e-site@musafir.test', 'created_at' => now(), 'updated_at' => now()] + (Schema::hasColumn('newsletter_subscribers', 'locale') ? ['locale' => 'en'] : []));
    $bookings = DB::table('bookings')->count();
    $users = DB::table('users')->count();

    $this->artisan('musafir:e2e-cleanup')->assertSuccessful();

    expect(DB::table('newsletter_subscribers')->where('email', 'e2e-site@musafir.test')->exists())->toBeFalse()
        ->and(DB::table('bookings')->count())->toBe($bookings)
        ->and(DB::table('users')->count())->toBe($users);
});
