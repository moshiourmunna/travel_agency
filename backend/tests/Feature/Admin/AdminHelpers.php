<?php

/** Staff logins seeded by the demo seed. */
const STAFF = ['admin' => 'owner', 'sales' => 'manager', 'reservations' => 'agent', 'visa' => 'visa', 'support' => 'support', 'accounts' => 'finance', 'content' => 'editor'];

function staff(string $who = 'admin'): App\Models\User
{
    return App\Models\User::where('email', "$who@musafir.test")->firstOrFail();
}

/** Act as a staff member on the admin (web guard, session). */
function asStaff(string $who = 'admin'): Tests\TestCase
{
    app('auth')->forgetGuards();

    return test()->actingAs(staff($who), 'web');
}

function adminUrl(string $path = ''): string
{
    $p = trim((string) config('musafir.admin_path', 'admin'), '/');

    return '/'.ltrim(($p !== '' ? $p.'/' : '').ltrim($path, '/'), '/');
}

/** Fake the Next.js revalidate endpoint and switch revalidation on. */
function fakeRevalidate(): void
{
    config(['musafir.revalidate_enabled' => true, 'musafir.frontend_url' => 'http://frontend.test', 'musafir.revalidate_secret' => 'pest-secret']);
    Illuminate\Support\Facades\Http::fake(['frontend.test/*' => Illuminate\Support\Facades\Http::response(['ok' => true])]);
}

/** Assert one revalidate call carried $tag with expire 0 and the secret header. */
function assertRevalidated(string $tag): void
{
    Illuminate\Support\Facades\Http::assertSent(fn ($req) => str_ends_with($req->url(), '/api/revalidate')
        && $req->header('X-Revalidate-Secret')[0] === 'pest-secret'
        && $req['expire'] === 0
        && (in_array($tag, (array) $req['tags'], true) || in_array('all', (array) $req['tags'], true)));
}
