<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Customer;
use App\Models\Document;
use App\Models\LedgerEntry;
use App\Models\Module;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use App\Support\SiteConfig;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Page;
use Tests\TestCase;

class AdminBookingManagementTest extends TestCase
{
    private function staff(): User { return User::where('email', 'visa@blessinghajj.com')->first(); }
    private function demo(): Booking { return Booking::where('ref', 'BHA-27-00342')->first(); }

    private function payload(array $over = []): array
    {
        return array_replace_recursive([
            'customer_mode' => 'new', 'new_name' => 'Abdul Karim', 'new_phone' => '01799887766', 'new_email' => 'abdul.karim.new@example.com', 'new_district' => 'Khulna',
            'package_id' => 2, 'room_type' => 'quad', 'children' => 0, 'payment_mode' => 'full', 'payment_method' => 'cash', 'discount' => 5000, 'agent_id' => 1, 'notes' => 'Ground floor please',
            'travellers' => [
                ['full_name' => 'Abdul Karim', 'gender' => 'male', 'dob' => '1970-05-01', 'passport_no' => 'EB1234567', 'passport_issue' => '2022-01-01', 'passport_expiry' => '2032-01-01', 'relation' => 'self', 'blood_group' => 'B+'],
                ['full_name' => 'Rokeya Begum', 'gender' => 'female', 'dob' => '1975-03-03', 'passport_no' => 'EB7654321', 'passport_expiry' => '2031-06-01', 'relation' => 'wife', 'needs_wheelchair' => '1', 'medical_notes' => 'Diabetic'],
            ],
            'initial_payment' => 100000, 'initial_txn' => 'RCPT-1',
        ], $over);
    }

    public function test_guests_customers_and_agents_cannot_reach_booking_admin(): void
    {
        $b = $this->demo();
        $this->get('/admin/bookings/create')->assertRedirect('/login');
        $this->post('/admin/bookings', $this->payload())->assertRedirect('/login');
        foreach ([$this->customer(), $this->agentUser()] as $u) {
            $this->actingAs($u);
            $this->get('/admin/bookings/create')->assertForbidden();
            $this->post('/admin/bookings', $this->payload())->assertForbidden();
            $this->post("/admin/bookings/{$b->ref}/status", ['status' => 'cancelled'])->assertForbidden();
            $this->post("/admin/bookings/{$b->ref}/payments", ['amount' => 1, 'method' => 'cash'])->assertForbidden();
            $this->delete("/admin/bookings/{$b->ref}", ['confirm' => 1])->assertForbidden();
        }
        $this->assertSame('confirmed', $b->fresh()->status === 'cancelled' ? 'x' : 'confirmed');
    }

    public function test_admin_creates_booking_for_new_customer_with_pilgrims_discount_agent_and_initial_payment(): void
    {
        $sold = Package::find(2)->seats_sold;
        $this->actingAs($this->admin())->post('/admin/bookings', $this->payload())->assertRedirect()->assertSessionHasNoErrors();
        $u = User::where('phone', '01799887766')->firstOrFail();
        $b = Booking::where('customer_id', $u->customer->id)->firstOrFail();
        $this->assertSame('admin', $b->source);
        $this->assertSame(2, $b->travellers()->count());
        $this->assertSame(1, $b->agent_id);
        $this->assertSame(5000, (int) $b->meta['manual_discount']);
        $this->assertSame($b->subtotal - $b->discount, (int) $b->total);
        $this->assertGreaterThanOrEqual(5000, (int) $b->discount);
        $this->assertSame(100000, (int) $b->paid);
        $this->assertSame($sold + 2, Package::find(2)->seats_sold);
        $wife = $b->travellers()->with('traveller.passport')->get()[1]->traveller;
        $this->assertSame('ROKEYA BEGUM', $wife->full_name);
        $this->assertTrue($wife->needs_wheelchair);
        $this->assertSame('EB7654321', $wife->passport->number_enc);
        $this->assertSame(8, Document::whereIn('booking_traveller_id', $b->travellers()->pluck('id'))->count());
        $this->assertTrue(Commission::where('booking_id', $b->id)->where('amount', (int) round($b->total * $b->agent->commission_percent / 100))->exists());
        $this->assertTrue(LedgerEntry::where('account_type', 'booking')->where('account_id', $b->id)->where('credit', 100000)->exists());
        $this->assertTrue($b->activities()->where('type', 'created')->exists());
        $this->assertTrue(AuditLog::where('action', 'booking.create')->where('auditable_id', $b->id)->exists());
        $this->get("/admin/bookings/{$b->ref}")->assertOk()->assertSee('ROKEYA BEGUM')->assertSee('RCPT-1');
    }

    public function test_admin_creates_installment_booking_for_existing_customer(): void
    {
        $c = Customer::whereHas('user', fn ($u) => $u->where('email', 'rahim@example.com'))->first();
        $this->actingAs($this->admin())->post('/admin/bookings', $this->payload(['customer_mode' => 'existing', 'customer_id' => $c->id, 'new_name' => '', 'new_phone' => '', 'new_email' => '', 'payment_mode' => 'installment', 'payment_method' => 'bkash', 'initial_payment' => 0, 'discount' => 0]))
            ->assertSessionHasNoErrors();
        $b = $c->bookings()->latest('id')->first();
        $this->assertSame('installment', $b->payment_mode);
        $this->assertGreaterThan(1, $b->installments()->count());
        $this->assertSame((int) $b->total, (int) $b->installments()->sum('amount'));
    }

    public function test_pay_later_booking_creates_hold(): void
    {
        $this->actingAs($this->admin())->post('/admin/bookings', $this->payload(['payment_mode' => 'pay_later', 'payment_method' => null, 'initial_payment' => 0]))->assertSessionHasNoErrors();
        $b = Booking::latest('id')->first();
        $this->assertSame('hold', $b->status);
        $this->assertNotNull($b->hold_expires_at);
    }

    public function test_create_validation(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/bookings', ['customer_mode' => 'new'])->assertSessionHasErrors(['new_name', 'new_phone', 'package_id', 'room_type', 'travellers', 'payment_mode']);
        $this->post('/admin/bookings', $this->payload(['new_phone' => '01711111111']))->assertSessionHasErrors('new_phone'); // already taken (demo customer)
        $this->post('/admin/bookings', $this->payload(['travellers' => [0 => ['passport_no' => 'bad!', 'passport_expiry' => '2001-01-01', 'gender' => 'x']]]))->assertSessionHasErrors(['travellers.0.passport_no', 'travellers.0.passport_expiry', 'travellers.0.gender']);
        $this->post('/admin/bookings', $this->payload(['customer_mode' => 'existing', 'customer_id' => 99999]))->assertSessionHasErrors('customer_id');
        $this->post('/admin/bookings', $this->payload(['discount' => 99999999]))->assertSessionHasErrors('discount');
        $this->post('/admin/bookings', $this->payload(['initial_payment' => 99999999]))->assertSessionHasErrors('amount');
        $this->assertNull(User::where('phone', '01799887766')->first(), 'failed create must roll back the new customer');
    }

    public function test_seat_limit_enforced(): void
    {
        Package::find(2)->update(['seats_sold' => 89]);
        $this->actingAs($this->admin())->post('/admin/bookings', $this->payload())->assertSessionHasErrors('adults');
    }

    public function test_index_search_filters_pagination_and_csv(): void
    {
        $this->actingAs($this->admin());
        $this->get('/admin/bookings?q=00342')->assertOk()->assertSee('BHA-27-00342');
        $this->get('/admin/bookings?q=Rahim')->assertOk()->assertSee('BHA-27-00342');
        $this->get('/admin/bookings?q=zzzz-nothing')->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/bookings/index')->has('bookings.data', 0)->where('filters.q', 'zzzz-nothing'));
        $b = $this->demo();
        $this->get('/admin/bookings?status='.$b->status.'&package_id='.$b->package_id)->assertSee($b->ref);
        $this->get('/admin/bookings?status=cancelled')->assertDontSee($b->ref);
        $this->get('/admin/bookings?payment_status=paid')->assertDontSee($b->ref);
        $this->get('/admin/bookings?from=2099-01-01')->assertDontSee($b->ref);
        $this->get('/admin/bookings?from=bad')->assertSessionHasErrors('from');
        foreach (array_keys(Booking::PAYMENT_STATUSES) as $ps) $this->get('/admin/bookings?payment_status='.$ps)->assertOk();
        $csv = $this->get('/admin/bookings/export?q=00342');
        $csv->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $body = $csv->streamedContent();
        $this->assertStringContainsString('BHA-27-00342', $body);
        $lines = array_slice(explode("\n", trim($body)), 1);
        $this->assertNotEmpty($lines);
        foreach ($lines as $l) $this->assertStringContainsString('00342', $l);
    }

    public function test_csv_neutralises_formula_injection(): void
    {
        $this->demo()->customer->user->update(['name' => '=HYPERLINK("x")']);
        $body = $this->actingAs($this->admin())->get('/admin/bookings/export?q=00342')->streamedContent();
        $this->assertStringContainsString("'=HYPERLINK", $body);
    }

    public function test_edit_updates_pilgrims_room_discount_and_reprices(): void
    {
        $b = $this->demo()->load('travellers');
        $sold = $b->package->seats_sold; $first = $b->travellers->first();
        $this->actingAs($this->admin())->get("/admin/bookings/{$b->ref}/edit")->assertOk();
        $this->put("/admin/bookings/{$b->ref}", [
            'room_type' => 'triple', 'children' => 0, 'payment_mode' => $b->payment_mode, 'payment_method' => 'bkash', 'discount' => 10000, 'agent_id' => '', 'notes' => 'updated', 'admin_note' => 'VIP',
            'travellers' => [['id' => $first->id, 'full_name' => 'Rahim Uddin', 'gender' => 'male', 'passport_no' => 'AB9988776', 'passport_expiry' => '2033-01-01', 'ticket_no' => '997-123', 'govt_tracking_no' => 'BD-77']],
            'new_travellers' => [['full_name' => 'New Son', 'gender' => 'male', 'relation' => 'son']],
        ])->assertRedirect("/admin/bookings/{$b->ref}")->assertSessionHasNoErrors();
        $b->refresh();
        $this->assertSame('triple', $b->room_type);
        $this->assertSame($b->travellers()->count(), $b->adults + $b->children);
        $this->assertSame($sold + 1, $b->package->fresh()->seats_sold);
        $this->assertSame(10000, (int) $b->meta['manual_discount']);
        $this->assertSame((int) $b->subtotal - (int) $b->discount, (int) $b->total);
        $this->assertSame('RAHIM UDDIN', $first->traveller->fresh()->full_name);
        $this->assertSame('AB9988776', $first->traveller->passport()->first()->number_enc);
        $this->assertSame('BD-77', $first->fresh()->govt_tracking_no);
        $this->assertTrue($b->activities()->where('message', 'like', 'Pilgrim added%')->exists());
        if ($b->payment_mode === 'installment') $this->assertSame((int) $b->total, (int) $b->installments()->sum('amount'));
        // remove the added pilgrim again
        $new = $b->travellers()->latest('id')->first();
        $this->put("/admin/bookings/{$b->ref}", ['room_type' => 'triple', 'payment_mode' => $b->payment_mode, 'remove' => [$new->id]])->assertSessionHasNoErrors();
        $this->assertSame($sold, $b->package->fresh()->seats_sold);
        // cannot remove everybody
        $this->put("/admin/bookings/{$b->ref}", ['room_type' => 'triple', 'payment_mode' => $b->payment_mode, 'remove' => $b->travellers()->pluck('id')->all()])->assertSessionHasErrors('remove');
        // room type without a price
        $this->put("/admin/bookings/{$b->ref}", ['room_type' => 'single', 'payment_mode' => $b->payment_mode])->assertSessionHasErrors('room_type');
    }

    public function test_status_change_records_history_and_releases_seats_on_cancel(): void
    {
        $b = $this->demo(); $sold = $b->package->seats_sold; $pax = $b->adults + $b->children; $from = $b->status;
        $this->actingAs($this->staff())->post("/admin/bookings/{$b->ref}/status", ['status' => 'cancelled', 'note' => 'Customer request'])->assertSessionHasNoErrors();
        $this->assertSame('cancelled', $b->fresh()->status);
        $this->assertSame($sold - $pax, $b->package->fresh()->seats_sold);
        $act = $b->activities()->where('type', 'status')->first();
        $this->assertSame([$from, 'cancelled', 'Customer request'], [$act->from_status, $act->to_status, $act->message]);
        $this->post("/admin/bookings/{$b->ref}/status", ['status' => 'visa'])->assertSessionHasNoErrors();
        $this->assertSame($sold, $b->package->fresh()->seats_sold);
        $this->post("/admin/bookings/{$b->ref}/status", ['status' => 'nonsense'])->assertSessionHasErrors('status');
        $this->get("/admin/bookings/{$b->ref}")->assertSee('Customer request');
    }

    public function test_legacy_patch_update_still_works(): void
    {
        $b = $this->demo();
        $this->actingAs($this->admin())->patch("/admin/bookings/{$b->ref}", ['status' => 'docs_pending', 'note' => 'Need photos'])->assertSessionHasNoErrors();
        $this->assertSame('docs_pending', $b->fresh()->status);
        $this->assertSame('Need photos', $b->fresh()->meta['admin_note']);
    }

    public function test_record_payment_updates_balance_installments_ledger(): void
    {
        $b = $this->demo(); $paid = $b->paid; $inst = $b->installments()->whereNot('status', 'paid')->first();
        Storage::fake();
        $this->actingAs($this->staff())->post("/admin/bookings/{$b->ref}/payments", ['amount' => $inst->amount, 'method' => 'bank', 'txn' => 'BANK-777', 'installment_id' => $inst->id, 'note' => 'DBBL', 'slip' => UploadedFile::fake()->create('slip.jpg', 50, 'image/jpeg')])->assertSessionHasNoErrors();
        $p = Payment::where('gateway_txn_id', 'BANK-777')->first();
        $this->assertSame('paid', $p->status);
        $this->assertNotNull($p->slip_path);
        $this->assertSame($paid + $inst->amount, $b->fresh()->paid);
        $this->assertSame('paid', $inst->fresh()->status);
        $this->assertTrue(LedgerEntry::where('ref_type', 'payment')->where('ref_id', $p->id)->exists());
        $this->get("/admin/payments/{$p->id}/slip")->assertOk();
        // over-payment, duplicate txn and foreign installment rejected
        $this->post("/admin/bookings/{$b->ref}/payments", ['amount' => $b->fresh()->due() + 1, 'method' => 'cash'])->assertSessionHasErrors('amount');
        $this->post("/admin/bookings/{$b->ref}/payments", ['amount' => 10, 'method' => 'cash', 'txn' => 'BANK-777'])->assertSessionHasErrors('txn');
        $other = Booking::where('id', '!=', $b->id)->whereHas('installments')->first()?->installments()->first();
        if ($other) $this->post("/admin/bookings/{$b->ref}/payments", ['amount' => 10, 'method' => 'cash', 'installment_id' => $other->id])->assertSessionHasErrors('installment_id');
        $this->post("/admin/bookings/{$b->ref}/payments", ['amount' => 10, 'method' => 'paypal'])->assertSessionHasErrors('method');
    }

    public function test_refund_is_owner_only_and_reduces_paid(): void
    {
        $b = $this->demo(); $p = $b->payments()->where('status', 'paid')->first(); $paid = $b->paid;
        $this->actingAs($this->staff())->post("/admin/payments/{$p->id}/refund", ['amount' => 1000, 'reason' => 'x'])->assertForbidden();
        $this->actingAs($this->admin())->post("/admin/payments/{$p->id}/refund", ['amount' => $p->amount + 1, 'reason' => 'too much'])->assertSessionHasErrors('amount');
        $this->post("/admin/payments/{$p->id}/refund", ['amount' => 1000])->assertSessionHasErrors('reason');
        $this->post("/admin/payments/{$p->id}/refund", ['amount' => 1000, 'reason' => 'Overcharged'])->assertSessionHasNoErrors();
        $this->assertSame('partially_refunded', $p->fresh()->status);
        $this->assertSame($paid - 1000, $b->fresh()->paid);
        $this->assertTrue(LedgerEntry::where('ref_type', 'refund')->where('debit', 1000)->exists());
        $this->post("/admin/payments/{$p->id}/refund", ['amount' => $p->amount - 1000, 'reason' => 'Cancelled'])->assertSessionHasNoErrors();
        $this->assertSame('refunded', $p->fresh()->status);
        $this->assertSame(0, $p->fresh()->refundable());
    }

    public function test_generate_schedule_keeps_paid_rows_and_sums_to_total(): void
    {
        $b = $this->demo();
        $this->actingAs($this->staff())->post("/admin/bookings/{$b->ref}/schedule", ['count' => 4, 'first_due' => now()->addMonth()->toDateString(), 'last_due' => now()->addMonths(4)->toDateString()])->assertSessionHasNoErrors();
        $b->refresh();
        $open = $b->installments()->whereNot('status', 'paid')->get();
        $this->assertCount(4, $open);
        $this->assertSame($b->due(), (int) $open->sum('amount'));
        $this->assertSame('due', $open->first()->status);
        $this->post("/admin/bookings/{$b->ref}/schedule", ['count' => 0, 'first_due' => 'x', 'last_due' => '2000-01-01'])->assertSessionHasErrors(['count', 'first_due']);
        // full-pay booking can be switched to installments
        $full = Booking::where('payment_mode', 'full')->whereColumn('paid', '<', 'total')->first();
        if ($full) {
            $this->post("/admin/bookings/{$full->ref}/schedule", ['count' => 2, 'first_due' => now()->addWeek()->toDateString(), 'last_due' => now()->addMonths(2)->toDateString(), 'deposit' => 1000])->assertSessionHasNoErrors();
            $this->assertSame('installment', $full->fresh()->payment_mode);
            $this->assertSame($full->fresh()->due(), (int) $full->installments()->whereNot('status', 'paid')->sum('amount'));
        }
    }

    public function test_schedule_route_respects_installments_module(): void
    {
        Module::where('key', 'installments')->update(['enabled' => false]); SiteConfig::flush();
        $b = $this->demo();
        $this->actingAs($this->admin())->post("/admin/bookings/{$b->ref}/schedule", ['count' => 2, 'first_due' => '2030-01-01', 'last_due' => '2030-02-01'])->assertNotFound();
        $this->get("/admin/bookings/{$b->ref}")->assertOk()->assertDontSee(__('Generate installment schedule'));
    }

    public function test_documents_upload_verify_reject(): void
    {
        Storage::fake();
        $doc = Document::whereHas('bookingTraveller.booking', fn ($q) => $q->where('ref', 'BHA-27-00342'))->first();
        $doc->update(['path' => null, 'status' => 'pending']);
        $this->actingAs($this->staff());
        $this->post("/admin/documents/{$doc->id}/review", ['status' => 'verified'])->assertSessionHasErrors('status');
        $this->post("/admin/documents/{$doc->id}/upload", ['file' => UploadedFile::fake()->create('virus.exe', 10)])->assertSessionHasErrors('file');
        $this->post("/admin/documents/{$doc->id}/upload", ['file' => UploadedFile::fake()->create('passport.pdf', 200, 'application/pdf')])->assertSessionHasNoErrors();
        $this->assertNotNull($doc->fresh()->path);
        $this->get("/admin/documents/{$doc->id}/file")->assertOk();
        $this->post("/admin/documents/{$doc->id}/review", ['status' => 'rejected'])->assertSessionHasErrors('note');
        $this->post("/admin/documents/{$doc->id}/review", ['status' => 'rejected', 'note' => 'Blurry'])->assertSessionHasNoErrors();
        $this->assertSame('rejected', $doc->fresh()->status);
        $this->post("/admin/documents/{$doc->id}/review", ['status' => 'verified'])->assertSessionHasNoErrors();
        $this->assertSame(['verified', $this->staff()->id], [$doc->fresh()->status, $doc->fresh()->reviewer_id]);
        $this->assertTrue($doc->bookingTraveller->booking->activities()->where('type', 'document')->count() >= 3);
    }

    public function test_visa_status_update_creates_application_and_respects_module(): void
    {
        $bt = $this->demo()->travellers()->first(); $bt->visa?->delete();
        $this->actingAs($this->staff())->post("/admin/pilgrim-visa/{$bt->id}", ['status' => 'issued', 'visa_no' => 'V-123'])->assertSessionHasNoErrors();
        $v = $bt->fresh()->visa;
        $this->assertSame(['issued', 'V-123'], [$v->status, $v->visa_no]);
        $this->assertNotNull($v->issued_at);
        $this->post("/admin/pilgrim-visa/{$bt->id}", ['status' => 'bogus'])->assertSessionHasErrors('status');
        Module::where('key', 'visa')->update(['enabled' => false]); SiteConfig::flush();
        $this->post("/admin/pilgrim-visa/{$bt->id}", ['status' => 'approved'])->assertNotFound();
    }

    public function test_notes_agent_assignment_and_commission_sync(): void
    {
        $b = $this->demo();
        $this->actingAs($this->staff())->post("/admin/bookings/{$b->ref}/note", ['message' => 'Called customer'])->assertSessionHasNoErrors();
        $this->post("/admin/bookings/{$b->ref}/note", ['message' => ''])->assertSessionHasErrors('message');
        $this->post("/admin/bookings/{$b->ref}/agent", ['agent_id' => 1])->assertSessionHasNoErrors();
        $c = Commission::where('booking_id', $b->id)->whereIn('status', ['pending', 'approved'])->first();
        $this->assertSame(1, $c->agent_id);
        $this->post("/admin/bookings/{$b->ref}/agent", ['agent_id' => ''])->assertSessionHasNoErrors();
        $this->assertNull($b->fresh()->agent_id);
        $this->assertSame('void', $c->fresh()->status);
        $this->get("/admin/bookings/{$b->ref}")->assertSee('Called customer');
    }

    public function test_soft_delete_requires_confirm_owner_and_restore(): void
    {
        $b = $this->demo(); $sold = $b->package->seats_sold; $pax = $b->adults + $b->children;
        $this->actingAs($this->staff())->delete("/admin/bookings/{$b->ref}", ['confirm' => 1])->assertForbidden();
        $this->actingAs($this->admin())->delete("/admin/bookings/{$b->ref}")->assertSessionHasErrors('confirm');
        $this->delete("/admin/bookings/{$b->ref}", ['confirm' => 1, 'reason' => 'Duplicate'])->assertRedirect('/admin/bookings');
        $this->assertSoftDeleted('bookings', ['id' => $b->id]);
        $this->assertSame($sold - $pax, $b->package->fresh()->seats_sold);
        $this->assertFalse(collect($this->get('/admin/bookings')->inertiaProps('bookings.data'))->pluck('id')->contains($b->id));
        $this->assertTrue(collect($this->get('/admin/bookings?trashed=only')->inertiaProps('bookings.data'))->pluck('id')->contains($b->id));
        $this->get("/admin/bookings/{$b->ref}")->assertOk()->assertInertia(fn (Page $p) => $p->component('admin/bookings/show')->where('booking.trashed', true)->whereNot('booking.deleted_at', null));
        $this->get("/admin/bookings/{$b->ref}/edit")->assertNotFound();
        $this->actingAs($this->staff())->post("/admin/bookings/{$b->ref}/restore")->assertForbidden();
        $this->actingAs($this->admin())->post("/admin/bookings/{$b->ref}/restore")->assertRedirect("/admin/bookings/{$b->ref}");
        $this->assertNotSoftDeleted('bookings', ['id' => $b->id]);
        $this->assertSame($sold, $b->package->fresh()->seats_sold);
        $this->assertTrue(AuditLog::where('action', 'booking.delete')->exists() && AuditLog::where('action', 'booking.restore')->exists());
        $this->post("/admin/bookings/{$b->ref}/restore")->assertNotFound();
        // customer still sees their booking after restore
        $this->actingAs($this->customer())->get('/dashboard')->assertOk()->assertSee($b->ref);
    }

    public function test_invoice_and_voucher_print(): void
    {
        $b = $this->demo();
        $this->actingAs($this->staff())->get("/admin/bookings/{$b->ref}/invoice")->assertOk()->assertSee($b->ref)->assertSee(money($b->total));
        $this->get("/admin/bookings/{$b->ref}/voucher")->assertOk()->assertSee($b->travellers()->first()->traveller->full_name);
        $this->get("/admin/bookings/{$b->ref}/invoice?lang=ar")->assertOk()->assertSee('dir="rtl"', false);
    }

    public function test_verify_and_reject_pending_manual_payment(): void
    {
        $b = $this->demo();
        $p = $b->payments()->create(['method' => 'bank', 'amount' => 500, 'status' => 'pending']);
        $this->actingAs($this->staff())->post("/admin/payments/{$p->id}/verify", ['action' => 'approve'])->assertSessionHasNoErrors();
        $this->assertSame('paid', $p->fresh()->status);
        $q = $b->payments()->create(['method' => 'cash', 'amount' => 500, 'status' => 'pending']);
        $this->post("/admin/payments/{$q->id}/verify", ['action' => 'reject']);
        $this->assertSame('failed', $q->fresh()->status);
    }
}
