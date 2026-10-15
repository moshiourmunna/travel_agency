<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Module;
use App\Models\Package;
use App\Models\Payment;
use App\Models\User;
use App\Support\SiteConfig;
use Tests\TestCase;

class BookingTest extends TestCase
{
    private function payload(array $over = []): array
    {
        return array_merge(['package' => '14-days-group-umrah', 'room_type' => 'quad', 'adults' => 2, 'children' => 0,
            'travellers' => [['full_name' => 'Test Pilgrim', 'gender' => 'male', 'passport_no' => 'A1234567'], ['full_name' => 'Test Wife', 'gender' => 'female']],
            'payment_mode' => 'full', 'payment_method' => 'bkash'], $over);
    }

    public function test_guest_is_sent_to_login(): void
    {
        $this->get('/booking')->assertRedirect('/login');
        $this->post('/booking', $this->payload())->assertRedirect('/login');
    }

    public function test_register_then_book(): void
    {
        $this->post('/register', ['name' => 'New Pilgrim', 'phone' => '01755555555', 'password' => 'secret123', 'password_confirmation' => 'secret123'])->assertRedirect('/dashboard');
        $this->get('/booking?package=standard-hajj-2027')->assertOk()->assertSee('Standard Hajj 2027');
    }

    public function test_full_online_payment_flow(): void
    {
        $u = $this->customer();
        $r = $this->actingAs($u)->post('/booking', $this->payload());
        $b = Booking::latest('id')->first();
        $p = $b->payments()->first();
        $r->assertRedirect(route('payment.simulate', $p));
        $this->assertSame(270000, $b->total);
        $this->assertSame(270000, $p->amount);
        $this->assertSame('pending', $b->status);
        $this->assertCount(2, $b->travellers);
        $this->assertSame(8, $b->travellers->flatMap->documents->count()); // checklist created

        $this->get(route('payment.simulate', $p))->assertOk()->assertSee('bKash');
        $this->post(route('payment.callback', $p), ['status' => 'success'])->assertRedirect(route('booking.done', $b));
        $b->refresh();
        $this->assertSame('confirmed', $b->status);
        $this->assertSame(270000, $b->paid);
        $this->assertNotNull($p->fresh()->gateway_txn_id);
        $this->get(route('booking.done', $b))->assertOk()->assertSee($b->ref);
    }

    public function test_failed_payment_keeps_booking_pending(): void
    {
        $this->actingAs($this->customer())->post('/booking', $this->payload());
        $p = Payment::latest('id')->first();
        $this->post(route('payment.callback', $p), ['status' => 'failed']);
        $this->assertSame('failed', $p->fresh()->status);
        $this->assertSame('pending', $p->booking->fresh()->status);
    }

    public function test_installment_booking_creates_schedule_and_pays_deposit(): void
    {
        $this->actingAs($this->customer())->post('/booking', $this->payload(['package' => 'standard-hajj-2027', 'payment_mode' => 'installment', 'payment_method' => 'nagad', 'addons' => ['qurbani']]));
        $b = Booking::latest('id')->first();
        $this->assertSame('installment', $b->payment_mode);
        $this->assertSame(845000 * 2 + 28000 * 2 - 20000, $b->total);
        $this->assertCount(5, $b->installments);                          // deposit + 4
        $this->assertSame($b->total, (int) $b->installments->sum('amount'));
        $deposit = $b->installments->first();
        $this->assertSame(100000, $deposit->amount);
        $p = $b->payments()->first();
        $this->assertSame($deposit->id, $p->installment_id);
        $this->post(route('payment.callback', $p), ['status' => 'success']);
        $this->assertSame('paid', $deposit->fresh()->status);
        $this->assertSame('due', $b->installments()->where('seq', 1)->first()->status);
        $this->assertSame('confirmed', $b->fresh()->status);

        // pay next installment from the dashboard
        $next = $b->installments()->where('seq', 1)->first();
        $r = $this->post(route('dashboard.pay', $b), ['installment_id' => $next->id, 'method' => 'sslcommerz']);
        $p2 = Payment::latest('id')->first();
        $r->assertRedirect(route('payment.simulate', $p2));
        $this->post(route('payment.callback', $p2), ['status' => 'success']);
        $this->assertSame('paid', $next->fresh()->status);
        $this->assertSame($deposit->amount + $next->amount, $b->fresh()->paid);
    }

    public function test_pay_later_holds_seats_without_payment(): void
    {
        $before = Package::where('slug', '14-days-group-umrah')->value('seats_sold');
        $this->actingAs($this->customer())->post('/booking', $this->payload(['payment_mode' => 'pay_later', 'payment_method' => null]))->assertRedirect();
        $b = Booking::latest('id')->first();
        $this->assertSame('hold', $b->status);
        $this->assertNotNull($b->hold_expires_at);
        $this->assertSame(0, $b->payments()->count());
        $this->assertSame($before + 2, Package::where('slug', '14-days-group-umrah')->value('seats_sold'));
        // later pays the balance by bank → pending until admin verifies
        $this->post(route('dashboard.pay', $b), ['method' => 'bank'])->assertSessionHas('ok');
        $p = $b->payments()->first();
        $this->assertSame('pending', $p->status);
        $this->actingAs($this->admin())->post(route('admin.payments.verify', $p), ['action' => 'approve']);
        $this->assertSame('confirmed', $b->fresh()->status);
        $this->assertSame(0, $b->fresh()->due());
    }

    public function test_installments_rejected_when_module_off(): void
    {
        Module::where('key', 'installments')->update(['enabled' => false]);
        SiteConfig::flush();
        $this->actingAs($this->customer())->post('/booking', $this->payload(['payment_mode' => 'installment']))->assertSessionHasErrors('payment_mode');
    }

    public function test_validation_and_seat_limit(): void
    {
        $u = $this->customer();
        $this->actingAs($u)->post('/booking', $this->payload(['travellers' => [['full_name' => '', 'gender' => 'x']], 'payment_method' => 'paypal']))
            ->assertSessionHasErrors(['travellers.0.full_name', 'travellers.0.gender', 'payment_method']);
        Package::where('slug', '14-days-group-umrah')->update(['seats_total' => 10, 'seats_sold' => 9]);
        $this->post('/booking', $this->payload())->assertSessionHasErrors('adults');
    }

    public function test_customer_dashboard_shows_demo_booking_and_is_private(): void
    {
        $u = $this->customer();
        $this->actingAs($u)->get('/dashboard')->assertOk()->assertSee('BHA-27-00342')->assertSee('Standard Hajj 2027')->assertSee('Installment 2')->assertSee('Photo unclear');
        $other = Booking::whereHas('customer', fn ($q) => $q->where('user_id', '!=', $u->id))->first();
        $this->get(route('booking.done', $other))->assertForbidden();
        $this->post(route('dashboard.pay', $other), ['method' => 'bkash'])->assertForbidden();
    }

    public function test_document_upload(): void
    {
        \Storage::fake();
        $u = $this->customer();
        $doc = Booking::where('ref', 'BHA-27-00342')->first()->travellers->first()->documents()->where('type', 'vaccine')->first();
        $this->actingAs($u)->post(route('dashboard.upload', $doc), ['file' => \Illuminate\Http\UploadedFile::fake()->create('vaccine.pdf', 100, 'application/pdf')])->assertSessionHas('ok');
        $this->assertNotNull($doc->fresh()->path);
    }

    public function test_login_by_phone_and_email_and_role_redirects(): void
    {
        $this->post('/login', ['login' => '01711111111', 'password' => 'password'])->assertRedirect('/dashboard');
        $this->post('/logout');
        $this->post('/login', ['login' => 'admin@blessinghajj.com', 'password' => 'password'])->assertRedirect('/admin');
        $this->post('/logout');
        $this->post('/login', ['login' => 'agent@blessinghajj.com', 'password' => 'password'])->assertRedirect('/agent');
        $this->post('/logout');
        $this->post('/login', ['login' => 'admin@blessinghajj.com', 'password' => 'wrong'])->assertSessionHasErrors('login');
    }
}
