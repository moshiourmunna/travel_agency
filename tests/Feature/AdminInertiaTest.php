<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Hotel;
use App\Models\Language;
use App\Models\Module;
use App\Models\Payment;
use App\Models\PreRegistration;
use App\Models\Traveller;
use App\Models\User;
use App\Support\AdminResources;
use App\Support\SiteConfig;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Page;
use Tests\TestCase;

/**
 * Inertia contract for every admin screen and action of the React admin:
 * component names, prop shapes, server-side sort/filter/pagination, every mutating action, and the permission matrix.
 */
class AdminInertiaTest extends TestCase
{
    private function staff(): User { return User::where('email', 'visa@blessinghajj.com')->first(); }
    private function demo(): Booking { return Booking::where('ref', 'BHA-27-00342')->first(); }
    private function inertia(string $url, string $component, ?\Closure $more = null)
    {
        return $this->get($url)->assertOk()->assertInertia(fn (Page $p) => $more ? $more($p->component($component)) : $p->component($component));
    }

    public function test_root_view_shared_props_and_assets(): void
    {
        $r = $this->actingAs($this->admin())->get('/admin')->assertOk();
        $r->assertSee('id="app"', false)->assertSee('/build/assets/', false)->assertDontSee('/@vite/client', false);
        $r->assertInertia(fn (Page $p) => $p->component('admin/dashboard')
            ->has('auth.user', fn (Page $u) => $u->where('email', 'admin@blessinghajj.com')->where('isOwner', true)->hasAll(['id', 'name', 'initials', 'role']))
            ->has('flash')->where('locale', 'en')->where('dir', 'ltr')->has('languages', 3)->has('modules')->where('t', [])
            ->has('nav.resources')->has('site.name'));
    }

    public function test_inertia_partial_reload_and_version_mismatch(): void
    {
        $this->actingAs($this->admin());
        $page = $this->get('/admin/bookings')->inertiaPage();
        $r = $this->get('/admin/bookings?q=00342', ['X-Inertia' => 'true', 'X-Inertia-Version' => $page['version'], 'X-Inertia-Partial-Component' => 'admin/bookings/index', 'X-Inertia-Partial-Data' => 'bookings']);
        $r->assertOk()->assertHeader('X-Inertia', 'true');
        $this->assertSame(['bookings'], array_values(array_diff(array_keys($r->json('props')), ['auth', 'flash', 'locale', 'dir', 'languages', 'modules', 't', 'nav', 'site', 'errors'])));
        $this->assertContains('BHA-27-00342', collect($r->json('props.bookings.data'))->pluck('ref')->all());
        $this->get('/admin/bookings', ['X-Inertia' => 'true', 'X-Inertia-Version' => 'stale'])->assertStatus(409);
    }

    public function test_every_admin_page_component_and_props(): void
    {
        $this->actingAs($this->admin());
        $b = $this->demo();
        $c = $b->customer;
        $t = Traveller::first();
        $pr = PreRegistration::first();
        $ag = Agent::first();
        $this->inertia('/admin', 'admin/dashboard', fn ($p) => $p->has('stats')->has('chart', 12)->has('byStatus')->has('latest')->has('quick'));
        $this->inertia('/admin/bookings', 'admin/bookings/index', fn ($p) => $p->has('bookings.data')->has('bookings.meta')->has('totals')->has('options.statuses')->has('options.packages')->has('trashedCount'));
        $this->inertia('/admin/bookings/create', 'admin/bookings/form', fn ($p) => $p->where('booking', null)->has('packages')->has('customers')->has('options.modes'));
        $this->inertia("/admin/bookings/{$b->ref}/edit", 'admin/bookings/form', fn ($p) => $p->where('booking.ref', $b->ref)->has('booking.travellers', $b->travellers()->count()));
        $this->inertia("/admin/bookings/{$b->ref}", 'admin/bookings/show', fn ($p) => $p->where('booking.ref', $b->ref)->has('pilgrims')->has('payments')->has('installments')->has('ledger')->has('timeline')
            ->has('pilgrims.0.documents')->has('options.visa_statuses')->has('defaults'));
        $this->inertia('/admin/customers', 'admin/customers/index', fn ($p) => $p->has('customers.data')->has('districts'));
        $this->inertia('/admin/customers/create', 'admin/customers/form', fn ($p) => $p->where('customer', null)->has('agents'));
        $this->inertia("/admin/customers/{$c->id}", 'admin/customers/show', fn ($p) => $p->where('customer.id', $c->id)->has('stats')->has('bookings')->has('payments')->has('pilgrims'));
        $this->inertia("/admin/customers/{$c->id}/edit", 'admin/customers/form', fn ($p) => $p->where('customer.id', $c->id));
        $this->inertia('/admin/pilgrims', 'admin/pilgrims/index', fn ($p) => $p->has('pilgrims.data')->has('packages'));
        $this->inertia("/admin/pilgrims/{$t->id}", 'admin/pilgrims/show', fn ($p) => $p->where('pilgrim.id', $t->id));
        $this->inertia("/admin/pilgrims/{$t->id}/edit", 'admin/pilgrims/form', fn ($p) => $p->where('pilgrim.id', $t->id)->has('mahrams')->has('options.relations'));
        $this->inertia('/admin/payments', 'admin/payments/index', fn ($p) => $p->has('sum')->has('overdue'));
        $this->inertia('/admin/pre-registrations', 'admin/preregs/index', fn ($p) => $p->has('preregs.data')->has('counts'));
        $this->inertia("/admin/pre-registrations/{$pr->id}", 'admin/preregs/show', fn ($p) => $p->where('prereg.ref', $pr->ref));
        $this->inertia('/admin/commissions', 'admin/commissions/index', fn ($p) => $p->has('agents')->has('commissions.data'));
        $this->inertia("/admin/agents/{$ag->id}/statement", 'admin/commissions/statement', fn ($p) => $p->where('agent.code', $ag->code)->has('stats'));
        $this->inertia('/admin/audit-log', 'admin/audit/index', fn ($p) => $p->has('logs.data')->has('users'));
        $this->inertia('/admin/inbox', 'admin/inbox', fn ($p) => $p->has('inquiries.data')->has('preregs.data')->has('visas'));
        $this->inertia('/admin/integrations', 'admin/integrations', fn ($p) => $p->has('cards')->has('logs'));
        $this->inertia('/admin/settings', 'admin/settings', fn ($p) => $p->has('languages', 3)->has('modules')->has('licences')->has('settings.address_en'));
        foreach (array_keys(AdminResources::all()) as $res) {
            $this->inertia("/admin/manage/{$res}", 'admin/resource/index', fn ($p) => $p->where('resource', $res)->has('columns')->has('items.data'));
            $this->inertia("/admin/manage/{$res}/create", 'admin/resource/form', fn ($p) => $p->where('resource', $res)->where('id', null)->has('fields')->has('values'));
            $first = AdminResources::get($res)['model']::first();
            if ($first) $this->inertia("/admin/manage/{$res}/{$first->id}/edit", 'admin/resource/form', fn ($p) => $p->where('id', $first->id));
        }
    }

    public function test_print_csv_and_file_endpoints_stay_plain_responses(): void
    {
        $this->actingAs($this->admin());
        $b = $this->demo();
        foreach (["/admin/bookings/{$b->ref}/invoice", "/admin/bookings/{$b->ref}/voucher"] as $u) {
            $r = $this->get($u)->assertOk();
            $this->assertFalse(str_contains((string) $r->getContent(), 'data-page'), "$u must not be an Inertia page");
        }
        foreach (['bookings', 'customers', 'pilgrims', 'payments', 'pre-registrations', 'commissions'] as $e) {
            $this->get("/admin/{$e}/export")->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
        }
    }

    public function test_server_side_sort_filter_and_pagination(): void
    {
        $this->actingAs($this->admin());
        $refs = fn ($url) => collect($this->get($url)->inertiaProps('bookings.data'))->pluck('total')->all();
        $asc = $refs('/admin/bookings?sort=total&dir=asc');
        $desc = $refs('/admin/bookings?sort=total&dir=desc');
        $this->assertSame($asc, collect($asc)->sort()->values()->all());
        $this->assertSame($desc, collect($desc)->sortDesc()->values()->all());
        $this->get('/admin/bookings?sort=drop+table&dir=sideways')->assertOk();   // unknown keys are ignored (whitelist)
        $p = $this->get('/admin/bookings?per=10&page=2')->inertiaProps('bookings.meta');
        $this->assertSame([2, 10, 11], [$p['current_page'], $p['per_page'], $p['from']]);
        $this->assertSame('confirmed', $this->get('/admin/bookings?status=confirmed')->inertiaProps('filters.status'));
        foreach (collect($this->get('/admin/bookings?status=confirmed')->inertiaProps('bookings.data')) as $row) $this->assertSame('confirmed', $row['status']);
        $names = collect($this->get('/admin/customers?sort=name&dir=asc')->inertiaProps('customers.data'))->pluck('name')->all();
        $this->assertSame($names, collect($names)->sort(fn ($a, $b) => strcmp((string) $a, (string) $b))->values()->all());
        $this->get('/admin/pilgrims?sort=expiry&dir=asc')->assertOk();
        $this->get('/admin/payments?sort=amount&dir=desc')->assertOk();
        $this->get('/admin/pre-registrations?sort=name&dir=asc')->assertOk();
        $this->get('/admin/manage/hotels?sort=stars&dir=desc')->assertOk();
        $stars = collect($this->get('/admin/manage/hotels?sort=stars&dir=desc')->inertiaProps('items.data'))->pluck('cells.stars.value')->all();
        $this->assertSame($stars, collect($stars)->sortDesc()->values()->all());
    }

    public function test_booking_actions_from_show_page(): void
    {
        Storage::fake('local');
        $this->actingAs($this->admin());
        $b = $this->demo();
        $this->post("/admin/bookings/{$b->ref}/status", ['status' => 'visa', 'note' => 'via react'])->assertRedirect()->assertSessionHas('ok');
        $this->assertSame('visa', $b->fresh()->status);
        $this->post("/admin/bookings/{$b->ref}/note", ['message' => 'React note'])->assertSessionHasNoErrors();
        $this->post("/admin/bookings/{$b->ref}/note", ['message' => ''])->assertSessionHasErrors('message');
        $this->post("/admin/bookings/{$b->ref}/agent", ['agent_id' => Agent::first()->id])->assertSessionHasNoErrors();
        $due = $b->fresh()->due();
        $this->post("/admin/bookings/{$b->ref}/payments", ['amount' => 1000, 'method' => 'cash', 'txn' => 'REACT-1', 'slip' => UploadedFile::fake()->create('slip.pdf', 20, 'application/pdf')])->assertSessionHasNoErrors();
        $this->assertSame($due - 1000, $b->fresh()->due());
        $pay = Payment::where('gateway_txn_id', 'REACT-1')->first();
        $this->get("/admin/payments/{$pay->id}/slip")->assertOk();
        $this->post("/admin/bookings/{$b->ref}/schedule", ['count' => 3, 'first_due' => now()->addMonth()->toDateString(), 'last_due' => now()->addMonths(3)->toDateString(), 'deposit' => 0])->assertSessionHasNoErrors();
        $doc = Document::whereHas('bookingTraveller', fn ($q) => $q->where('booking_id', $b->id))->first();
        $this->post("/admin/documents/{$doc->id}/upload", ['file' => UploadedFile::fake()->create('p.jpg', 30, 'image/jpeg')])->assertSessionHasNoErrors();
        $this->post("/admin/documents/{$doc->id}/review", ['status' => 'rejected'])->assertSessionHasErrors('note');
        $this->post("/admin/documents/{$doc->id}/review", ['status' => 'verified'])->assertSessionHasNoErrors();
        $this->assertSame('verified', $doc->fresh()->status);
        $bt = $b->travellers()->first();
        $this->post("/admin/pilgrim-visa/{$bt->id}", ['status' => 'approved', 'visa_no' => 'V-REACT'])->assertSessionHasNoErrors();
        $this->get("/admin/bookings/{$b->ref}")->assertInertia(fn (Page $p) => $p->where('pilgrims.0.visa.visa_no', 'V-REACT')->where('pilgrims.0.visa.status', 'approved')
            ->where('timeline.0.message', fn ($m) => is_string($m) || $m === null));
        $paid = Payment::where('booking_id', $b->id)->where('status', 'paid')->first();
        $this->post("/admin/payments/{$paid->id}/refund", ['amount' => 500, 'reason' => 'React refund', 'method' => 'cash'])->assertSessionHasNoErrors();
        $this->get("/admin/bookings/{$b->ref}")->assertInertia(fn (Page $p) => $p->where('payments', fn ($ps) => collect($ps)->flatMap(fn ($x) => $x['refunds'])->contains(fn ($r) => $r['reason'] === 'React refund')));
    }

    public function test_pending_payment_verify_and_reject(): void
    {
        $this->actingAs($this->admin());
        $b = $this->demo();
        $p1 = $b->payments()->create(['method' => 'bank', 'amount' => 1000, 'status' => 'pending', 'gateway_txn_id' => 'PEND-1']);
        $p2 = $b->payments()->create(['method' => 'bank', 'amount' => 1000, 'status' => 'pending', 'gateway_txn_id' => 'PEND-2']);
        $this->post("/admin/payments/{$p1->id}/verify", ['action' => 'approve'])->assertSessionHasNoErrors();
        $this->post("/admin/payments/{$p2->id}/verify", ['action' => 'reject'])->assertSessionHasNoErrors();
        $this->post("/admin/payments/{$p2->id}/verify", ['action' => 'bogus'])->assertSessionHasErrors('action');
        $this->assertSame(['paid', 'failed'], [$p1->fresh()->status, $p2->fresh()->status === 'pending' ? 'pending' : 'failed']);
    }

    public function test_validation_errors_are_shared_as_inertia_errors(): void
    {
        $this->actingAs($this->admin());
        $this->from('/admin/customers/create')->post('/admin/customers', ['name' => '', 'phone' => '1'], ['X-Inertia' => 'true'])->assertRedirect('/admin/customers/create');
        $this->get('/admin/customers/create')->assertInertia(fn (Page $p) => $p->has('errors.name')->has('errors.phone'));
    }

    public function test_flash_messages_are_shared(): void
    {
        $this->actingAs($this->admin());
        $b = $this->demo();
        $this->post("/admin/bookings/{$b->ref}/note", ['message' => 'Flash me']);
        $this->get("/admin/bookings/{$b->ref}")->assertInertia(fn (Page $p) => $p->whereNot('flash.ok', null));
    }

    public function test_resource_crud_with_translations_image_and_delete(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());
        $this->post('/admin/manage/faqs', ['question' => ['en' => 'React Q?', 'bn' => 'প্রশ্ন?', 'ar' => 'سؤال؟'], 'answer' => ['en' => 'A'], 'category' => 'hajj', 'sort' => '9', 'is_active' => '1'])->assertSessionHasNoErrors()->assertRedirect('/admin/manage/faqs');
        $faq = \App\Models\Faq::latest('id')->first();
        $this->assertSame('سؤال؟', $faq->getTranslations('question')['ar']);
        $this->get("/admin/manage/faqs/{$faq->id}/edit")->assertInertia(fn (Page $p) => $p->where('values.question.bn', 'প্রশ্ন?'));
        $h = Hotel::first();
        $this->post("/admin/manage/hotels/{$h->id}", ['_method' => 'put', 'name' => 'React Hotel', 'city' => $h->city, 'stars' => 5, 'distance_to_haram_m' => 99, 'image' => UploadedFile::fake()->create('h.jpg', 30, 'image/jpeg'), 'is_active' => '1'])->assertSessionHasNoErrors();
        $this->assertSame('React Hotel', $h->fresh()->name);
        Storage::disk('public')->assertExists($h->fresh()->getRawOriginal('image'));
        $this->post('/admin/manage/faqs', ['question' => ['en' => '']])->assertSessionHasErrors('question.en');
        $this->delete("/admin/manage/faqs/{$faq->id}")->assertSessionHas('ok');
        $this->assertModelMissing($faq);
    }

    public function test_settings_toggles_languages_and_modules(): void
    {
        $this->actingAs($this->admin());
        $props = $this->get('/admin/settings')->inertiaProps();
        $payload = [
            'languages' => ['en' => '1', 'bn' => '1', 'ar' => '0'], 'default_language' => 'en',
            'modules' => collect($props['modules'])->mapWithKeys(fn ($m) => [$m['key'] => $m['key'] === 'blog' ? '0' : '1'])->all(),
            'licences' => collect($props['licences'])->mapWithKeys(fn ($l) => [$l['type'] => ['number' => $l['number'], 'valid_until' => $l['valid_until'], 'show' => $l['show'] ? '1' : '0']])->all(),
            's' => $props['settings'],
        ];
        $this->put('/admin/settings', $payload)->assertSessionHasNoErrors();
        $this->assertFalse((bool) Language::where('code', 'ar')->value('enabled'));
        $this->assertFalse((bool) Module::where('key', 'blog')->value('enabled'));
        $this->get('/admin')->assertInertia(fn (Page $p) => $p->has('languages', 2)->where('modules.blog', false));
        $this->get('/blog')->assertNotFound();
        $payload['languages']['ar'] = '1'; $payload['modules']['blog'] = '1';
        $this->put('/admin/settings', $payload)->assertSessionHasNoErrors();
        $this->get('/blog')->assertOk();
        $this->put('/admin/settings', ['s' => []] + $payload)->assertSessionHasErrors(['s.phone', 's.email']);
    }

    public function test_customer_pilgrim_prereg_commission_actions(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/customers', ['name' => 'React Cust', 'phone' => '01822334455', 'locale' => 'en', 'status' => 'active'])->assertSessionHasNoErrors();
        $c = Customer::whereHas('user', fn ($q) => $q->where('phone', '01822334455'))->first();
        $this->put("/admin/customers/{$c->id}", ['name' => 'React Cust 2', 'phone' => '01822334455', 'email' => '', 'locale' => 'bn', 'status' => 'active'])->assertSessionHasNoErrors();
        $this->delete("/admin/customers/{$c->id}", ['confirm' => '1'])->assertRedirect('/admin/customers');
        $this->assertSame(1, $this->get('/admin/customers?trashed=only')->inertiaProps('trashedCount'));
        $this->post("/admin/customers/{$c->id}/restore")->assertSessionHasNoErrors();
        $t = Traveller::first();
        $this->put("/admin/pilgrims/{$t->id}", ['full_name' => 'react pilgrim', 'gender' => $t->gender, 'needs_wheelchair' => 1, 'passport_verified' => 0])->assertSessionHasNoErrors();
        $this->assertSame('REACT PILGRIM', $t->fresh()->full_name);
        $pr = PreRegistration::where('status', 'received')->first();
        $this->put("/admin/pre-registrations/{$pr->id}", ['status' => 'contacted', 'govt_tracking_no' => '', 'notes' => 'x', 'pilgrims' => '2'])->assertSessionHasNoErrors();
        $this->post("/admin/pre-registrations/{$pr->id}/convert")->assertRedirect();
        $b = Booking::whereNotNull('agent_id')->first() ?? tap($this->demo())->update(['agent_id' => Agent::first()->id]);
        $com = Commission::firstOrCreate(['booking_id' => $b->id, 'agent_id' => $b->agent_id], ['amount' => 1000]);
        $this->put("/admin/commissions/{$com->id}", ['status' => 'approved', 'amount' => '1200', 'note' => 'ok'])->assertSessionHasNoErrors();
        $this->assertSame(1200, (int) $com->fresh()->amount);
    }

    public function test_permission_matrix_staff_vs_owner(): void
    {
        $b = $this->demo();
        $c = Customer::first();
        $pay = Payment::where('status', 'paid')->first();
        $pr = PreRegistration::first();
        $this->actingAs($this->staff());
        $this->get('/admin')->assertInertia(fn (Page $p) => $p->where('auth.user.isOwner', false));
        foreach (['/admin/bookings', '/admin/customers', '/admin/pilgrims', '/admin/payments', '/admin/pre-registrations', '/admin/commissions', '/admin/inbox', '/admin/integrations', '/admin/settings', '/admin/manage/packages'] as $u) $this->get($u)->assertOk();
        $this->get('/admin/audit-log')->assertForbidden();
        $this->delete("/admin/bookings/{$b->ref}", ['confirm' => 1])->assertForbidden();
        $this->post("/admin/bookings/{$b->ref}/restore")->assertForbidden();
        $this->post("/admin/payments/{$pay->id}/refund", ['amount' => 1, 'reason' => 'x'])->assertForbidden();
        $this->delete("/admin/customers/{$c->id}", ['confirm' => 1])->assertForbidden();
        $this->post("/admin/customers/{$c->id}/restore")->assertForbidden();
        $this->delete("/admin/pre-registrations/{$pr->id}", ['confirm' => 1])->assertForbidden();
        foreach ([$this->customer(), $this->agentUser()] as $u) {
            $this->actingAs($u);
            foreach (['/admin', '/admin/settings', '/admin/manage/packages', '/admin/inbox'] as $url) $this->get($url)->assertForbidden();
            $this->put('/admin/settings', [])->assertForbidden();
        }
        auth()->logout();
        $this->get('/admin/bookings', ['X-Inertia' => 'true'])->assertRedirect('/login');
    }

    public function test_module_off_hides_admin_routes(): void
    {
        $this->actingAs($this->admin());
        $b = $this->demo();
        foreach (['preregistration' => '/admin/pre-registrations', 'agents' => '/admin/commissions'] as $m => $url) {
            Module::where('key', $m)->update(['enabled' => false]); SiteConfig::flush();
            $this->get($url)->assertNotFound();
        }
        Module::where('key', 'visa')->update(['enabled' => false]); SiteConfig::flush();
        $bt = $b->travellers()->first();
        $this->post("/admin/pilgrim-visa/{$bt->id}", ['status' => 'approved'])->assertNotFound();
        Module::where('key', 'installments')->update(['enabled' => false]); SiteConfig::flush();
        $this->get('/admin/bookings/create')->assertInertia(fn (Page $p) => $p->where('modules.installments', false)
            ->where('options.modes', fn ($modes) => ! collect($modes)->pluck('value')->contains('installment')));
    }

    public function test_admin_language_and_rtl_dictionary(): void
    {
        $this->actingAs($this->admin());
        $this->get('/lang/ar');
        $this->get('/admin')->assertSee('dir="rtl"', false)->assertSee('lang="ar"', false)
            ->assertInertia(fn (Page $p) => $p->where('locale', 'ar')->where('dir', 'rtl')->where('t.Dashboard', fn ($v) => is_string($v) && $v !== 'Dashboard'));
    }
}
