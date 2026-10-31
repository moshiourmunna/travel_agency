<?php

use App\Admin\Registry;

it('sends guests to the admin login and shows the login page', function () {
    $this->get(adminUrl('/'))->assertRedirect();
    $this->get(adminUrl('login'))->assertOk()->assertInertia(fn ($p) => $p->component('Auth/Login'));
});

it('signs every seeded staff role in with the demo password', function (string $who, string $role) {
    app('auth')->forgetGuards();
    $this->post(adminUrl('login'), ['email' => "$who@musafir.test", 'password' => 'password'])->assertRedirect();
    $this->assertAuthenticatedAs(staff($who), 'web');
    expect(staff($who)->hasRole($role))->toBeTrue();
    $this->get(adminUrl('/'))->assertOk()->assertInertia(fn ($p) => $p->component('Dashboard')->has('kpis'));
})->with(collect(STAFF)->map(fn ($r, $w) => [$w, $r])->values()->all());

it('rejects a wrong password and travellers on the admin login', function () {
    $this->post(adminUrl('login'), ['email' => 'admin@musafir.test', 'password' => 'nope'])->assertSessionHasErrors('email');
    $this->post(adminUrl('login'), ['email' => 'farhana@example.com', 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest('web');
});

it('enforces every resource permission per role (index 200 or 403, nav matches)', function (string $who) {
    $u = staff($who);
    $nav = collect(Registry::nav($u))->flatMap(fn ($g) => $g['items'])->pluck('key')->all();
    foreach (Registry::all() as $slug => $res) {
        $can = $res->can($u, 'view');
        asStaff($who)->get(adminUrl($slug))->assertStatus($can ? 200 : 403);
        if (! $can) {
            expect($nav)->not->toContain($slug);
        }
    }
})->with(array_keys(STAFF));

it('keeps role-specific areas separate', function () {
    asStaff('content')->get(adminUrl('bookings'))->assertForbidden();
    asStaff('content')->get(adminUrl('pages'))->assertOk();
    $s = asStaff('content')->get(adminUrl('settings?group=payments'));
    $s->status() === 403 ? $s->assertForbidden() : $s->assertInertia(fn ($p) => $p->where('groups', fn ($g) => ! collect($g)->contains('key', 'payments'))->etc());
    asStaff('content')->put(adminUrl('settings/payments'), ['values' => ['gateways' => ['mock' => true]]])->assertForbidden();
    asStaff('accounts')->get(adminUrl('payments'))->assertOk();
    asStaff('accounts')->get(adminUrl('pages'))->assertForbidden();
    asStaff('visa')->get(adminUrl('visa-applications'))->assertOk();
    asStaff('visa')->get(adminUrl('roles'))->assertForbidden();
    asStaff('support')->get(adminUrl('tickets'))->assertOk();
    asStaff('support')->get(adminUrl('settings'))->assertForbidden();
});
