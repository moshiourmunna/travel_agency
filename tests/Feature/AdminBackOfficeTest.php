<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Customer;
use App\Models\LedgerEntry;
use App\Models\Module;
use App\Models\PreRegistration;
use App\Models\Traveller;
use App\Models\User;
use App\Support\SiteConfig;
use Inertia\Testing\AssertableInertia as Page;
use Tests\TestCase;

class AdminBackOfficeTest extends TestCase
{
    private function staff(): User { return User::where('email', 'visa@blessinghajj.com')->first(); }
    private function off(string $key): void { Module::where('key', $key)->update(['enabled' => false]); SiteConfig::flush(); }

    public function test_new_sections_forbidden_for_non_admins(): void
    {
        $urls = ['/admin/customers', '/admin/customers/create', '/admin/pilgrims', '/admin/payments', '/admin/pre-registrations', '/admin/commissions', '/admin/audit-log', '/admin/customers/export', '/admin/pilgrims/export', '/admin/payments/export'];
        foreach ($urls as $u) $this->get($u)->assertRedirect('/login');
        foreach ([$this->customer(), $this->agentUser()] as $usr) foreach ($urls as $u) $this->actingAs($usr)->get($u)->assertForbidden();
    }

    public function test_staff_cannot_see_audit_log_or_owner_actions(): void
    {
        $this->actingAs($this->staff())->get('/admin/audit-log')->assertForbidden();
        $this->get('/admin')->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/dashboard')->where('auth.user.isOwner', false));
        $c = Customer::first();
        $this->delete("/admin/customers/{$c->id}", ['confirm' => 1])->assertForbidden();
        $this->actingAs($this->admin())->get('/admin')->assertInertia(fn (Page $p) => $p->where('auth.user.isOwner', true));
    }

    public function test_customer_crud_with_soft_delete_and_restore(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/customers', ['name' => 'Nasima Akter', 'phone' => '01812345678', 'email' => 'nasima@example.com', 'gender' => 'female', 'district' => 'Rajshahi', 'nid' => '1234567890', 'agent_id' => 1, 'locale' => 'bn', 'status' => 'active'])->assertSessionHasNoErrors();
        $c = Customer::whereHas('user', fn ($u) => $u->where('phone', '01812345678'))->firstOrFail();
        $this->assertSame(['customer', 'Rajshahi', '1234567890'], [$c->user->role, $c->district, $c->nid_enc]);
        $this->post('/admin/customers', ['name' => 'Dup', 'phone' => '01812345678'])->assertSessionHasErrors('phone');
        $this->post('/admin/customers', ['name' => 'Bad', 'phone' => '123'])->assertSessionHasErrors('phone');
        $this->get('/admin/customers?q=Nasima')->assertSee('Nasima Akter');
        $this->get('/admin/customers?district=Rajshahi')->assertSee('Nasima Akter');
        $this->get("/admin/customers/{$c->id}")->assertOk()->assertSee('01812345678');
        $this->put("/admin/customers/{$c->id}", ['name' => 'Nasima Begum', 'phone' => '01812345678', 'email' => '', 'district' => 'Natore', 'password' => 'newsecret1'])->assertSessionHasNoErrors();
        $c->refresh();
        $this->assertSame(['Nasima Begum', null, 'Natore'], [$c->user->name, $c->user->email, $c->district]);
        $this->assertTrue(auth()->validate(['phone' => '01812345678', 'password' => 'newsecret1']));
        $this->assertStringContainsString('Nasima Begum', $this->get('/admin/customers/export?q=Nasima')->streamedContent());
        $this->delete("/admin/customers/{$c->id}")->assertSessionHasErrors('confirm');
        $this->delete("/admin/customers/{$c->id}", ['confirm' => 1])->assertRedirect('/admin/customers');
        $this->assertSoftDeleted('customers', ['id' => $c->id]);
        $this->assertSame('blocked', $c->user->fresh()->status);
        $this->get("/admin/customers/{$c->id}")->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/customers/show')->where('customer.trashed', true));
        $this->post("/admin/customers/{$c->id}/restore")->assertRedirect("/admin/customers/{$c->id}");
        $this->assertSame('active', $c->user->fresh()->status);
        $this->assertSame(4, AuditLog::where('auditable_type', Customer::class)->where('auditable_id', $c->id)->count());
    }

    public function test_customer_with_active_booking_cannot_be_deleted(): void
    {
        $c = Booking::where('ref', 'BHA-27-00342')->first()->customer;
        $this->actingAs($this->admin())->delete("/admin/customers/{$c->id}", ['confirm' => 1])->assertSessionHasErrors('confirm');
        $this->assertNotSoftDeleted('customers', ['id' => $c->id]);
    }

    public function test_pilgrim_register_filters_edit_mahram_and_manifest(): void
    {
        $this->actingAs($this->staff());
        $b = Booking::where('ref', 'BHA-27-00342')->first();
        $husband = $b->customer->travellers()->create(['full_name' => 'HUSBAND', 'gender' => 'male']);
        $wife = $b->customer->travellers()->create(['full_name' => 'YOUNG WIFE', 'gender' => 'female', 'dob' => now()->subYears(30)]);
        $this->get('/admin/pilgrims?mahram=needed')->assertSee('YOUNG WIFE');
        $this->get('/admin/pilgrims?passport=missing')->assertSee('YOUNG WIFE');
        $this->put("/admin/pilgrims/{$wife->id}", ['full_name' => 'Young Wife', 'gender' => 'female', 'mahram_traveller_id' => $husband->id, 'relation' => 'wife', 'passport_no' => 'EC1112223', 'passport_expiry' => now()->addMonths(3)->toDateString(), 'passport_verified' => 1, 'blood_group' => 'O+'])->assertSessionHasNoErrors();
        $wife->refresh();
        $this->assertSame([$husband->id, 'O+'], [$wife->mahram_traveller_id, $wife->blood_group]);
        $this->assertNotNull($wife->passport->verified_at);
        $this->get('/admin/pilgrims?mahram=needed')->assertDontSee('YOUNG WIFE');
        $this->get('/admin/pilgrims?passport=expiring')->assertSee('YOUNG WIFE');
        $this->get("/admin/pilgrims/{$wife->id}")->assertOk()->assertSee('EC1112223')->assertSee('HUSBAND');
        $other = Traveller::where('customer_id', '!=', $wife->customer_id)->first();
        $this->put("/admin/pilgrims/{$wife->id}", ['full_name' => 'x', 'gender' => 'female', 'mahram_traveller_id' => $other->id])->assertSessionHasErrors('mahram_traveller_id');
        $this->put("/admin/pilgrims/{$wife->id}", ['full_name' => 'x', 'gender' => 'female', 'mahram_traveller_id' => $wife->id])->assertSessionHasErrors('mahram_traveller_id');
        $csv = $this->get('/admin/pilgrims/export?q=YOUNG')->streamedContent();
        $this->assertStringContainsString('EC1112223', $csv);
        $this->assertStringContainsString('HUSBAND', $csv);
    }

    public function test_payments_list_filters_and_export(): void
    {
        $this->actingAs($this->staff());
        $this->get('/admin/payments')->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/payments/index')->has('overdue')->has('refunds')->has('payments.data')->has('payments.meta'));
        $this->get('/admin/payments?status=paid&method=bkash&q=BHA')->assertOk();
        $this->get('/admin/payments?from=nope')->assertSessionHasErrors('from');
        $this->assertStringContainsString('Booking,Customer', $this->get('/admin/payments/export')->streamedContent());
    }

    public function test_prereg_update_convert_to_booking_and_delete(): void
    {
        $this->actingAs($this->staff());
        $pr = PreRegistration::where('status', 'received')->first();
        $this->get('/admin/pre-registrations?status=received')->assertSee($pr->ref);
        $this->put("/admin/pre-registrations/{$pr->id}", ['status' => 'registered', 'govt_tracking_no' => 'HAJ-998877', 'notes' => 'Called'])->assertSessionHasNoErrors();
        $this->assertSame(['registered', 'HAJ-998877'], [$pr->fresh()->status, $pr->fresh()->govt_tracking_no]);
        $res = $this->post("/admin/pre-registrations/{$pr->id}/convert");
        $pr->refresh();
        $this->assertNotNull($pr->user_id);
        $cust = $pr->user->customer;
        $res->assertRedirect(route('admin.bookings.create', ['customer' => $cust->id, 'prereg' => $pr->id]));
        $this->get(route('admin.bookings.create', ['customer' => $cust->id, 'prereg' => $pr->id]))->assertOk()->assertSee($pr->name)->assertSee($pr->ref);
        $this->post('/admin/bookings', ['customer_mode' => 'existing', 'customer_id' => $cust->id, 'prereg_id' => $pr->id, 'package_id' => 1, 'room_type' => 'quad', 'payment_mode' => 'pay_later',
            'travellers' => [['full_name' => $pr->name, 'gender' => 'male']]])->assertSessionHasNoErrors();
        $pr->refresh();
        $this->assertSame('converted', $pr->status);
        $this->assertNotNull($pr->booking_id);
        $this->assertSame($cust->id, $pr->booking->customer_id);
        $this->post("/admin/pre-registrations/{$pr->id}/convert")->assertRedirect(route('admin.bookings.show', $pr->booking));
        $this->delete("/admin/pre-registrations/{$pr->id}", ['confirm' => 1])->assertForbidden();
        $this->actingAs($this->admin())->delete("/admin/pre-registrations/{$pr->id}", ['confirm' => 1])->assertRedirect('/admin/pre-registrations');
        $this->assertModelMissing($pr);
    }

    public function test_commissions_approve_pay_void_and_statement(): void
    {
        $agent = Agent::first();
        $b = Booking::whereNotNull('agent_id')->first() ?? tap(Booking::first())->update(['agent_id' => $agent->id]);
        $c = Commission::firstOrCreate(['booking_id' => $b->id, 'agent_id' => $b->agent_id], ['amount' => 5000]);
        $c->update(['status' => 'pending']);
        $this->actingAs($this->staff())->put("/admin/commissions/{$c->id}", ['status' => 'approved'])->assertSessionHasNoErrors();
        $this->assertSame('approved', $c->fresh()->status);
        $this->put("/admin/commissions/{$c->id}", ['status' => 'paid'])->assertForbidden();
        $this->actingAs($this->admin())->put("/admin/commissions/{$c->id}", ['status' => 'paid'])->assertSessionHasNoErrors();
        $this->assertNotNull($c->fresh()->paid_at);
        $this->assertTrue(LedgerEntry::where('account_type', 'agent')->where('ref_id', $c->id)->exists());
        $this->put("/admin/commissions/{$c->id}", ['status' => 'bogus'])->assertSessionHasErrors('status');
        $this->get('/admin/commissions?status=paid')->assertOk()->assertSee($b->ref);
        $this->get("/admin/agents/{$c->agent_id}/statement")->assertOk()->assertSee($b->ref);
        $this->assertStringContainsString($b->ref, $this->get('/admin/commissions/export')->streamedContent());
    }

    public function test_audit_log_lists_and_filters(): void
    {
        $this->actingAs($this->admin());
        $b = Booking::where('ref', 'BHA-27-00342')->first();
        $this->post("/admin/bookings/{$b->ref}/status", ['status' => 'visa']);
        $this->get('/admin/audit-log')->assertOk()->assertSee('booking.status');
        $this->get('/admin/audit-log?action=booking&user_id='.$this->admin()->id)->assertSee('booking.status');
        $this->get('/admin/audit-log?action=customer')->assertDontSee('booking.status');
    }

    public function test_module_toggles_hide_admin_menus_and_routes(): void
    {
        $this->actingAs($this->admin());
        $this->get('/admin')->assertInertia(fn (Page $p) => $p->where('modules.preregistration', true)->where('modules.agents', true));
        $this->off('preregistration'); $this->off('agents');
        $this->get('/admin')->assertOk()->assertInertia(fn (Page $p) => $p->where('modules.preregistration', false)->where('modules.agents', false));
        $this->get('/admin/pre-registrations')->assertNotFound();
        $this->get('/admin/commissions')->assertNotFound();
        $b = Booking::where('ref', 'BHA-27-00342')->first();
        $this->post("/admin/bookings/{$b->ref}/agent", ['agent_id' => 1])->assertNotFound();
        $this->get("/admin/bookings/{$b->ref}")->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/bookings/show')->where('modules.agents', false));
        $this->get('/admin/bookings/create')->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/bookings/form')->where('modules.agents', false));
        $this->off('visa');
        $this->get("/admin/bookings/{$b->ref}")->assertOk()->assertInertia(fn (Page $p) => $p->where('modules.visa', false));
    }

    public function test_dashboard_shows_attention_widgets_and_activity(): void
    {
        $this->actingAs($this->admin());
        $b = Booking::where('ref', 'BHA-27-00342')->first();
        $this->post("/admin/bookings/{$b->ref}/note", ['message' => 'Dashboard activity check']);
        $this->get('/admin')->assertOk()->assertSee('Dashboard activity check')->assertInertia(fn (Page $p) => $p->component('admin/dashboard')
            ->has('attention', fn (Page $a) => $a->hasAll(['overdue', 'overdue_amount', 'today', 'docs', 'missing_docs', 'passports', 'holds', 'preregs', 'commissions']))
            ->has('chart', 12)->has('stats')->has('byStatus')->has('latest')->has('pendingPayments')->where('activity.0.message', 'Dashboard activity check'));
    }

    public function test_admin_ui_translated_and_rtl(): void
    {
        $this->actingAs($this->admin());
        $this->get('/admin/bookings?lang=bn')->assertOk()->assertInertia(fn (Page $p) => $p->where('locale', 'bn')->where('dir', 'ltr')->where('t.Bookings', 'বুকিং'));
        $this->get('/admin/bookings?lang=ar')->assertOk()->assertSee('dir="rtl"', false)->assertInertia(fn (Page $p) => $p->where('dir', 'rtl')->where('t.Bookings', 'الحجوزات'));
        $this->get('/admin/bookings?lang=en')->assertOk()->assertSee('dir="ltr"', false);
    }
}
