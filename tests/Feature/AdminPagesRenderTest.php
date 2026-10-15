<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\PreRegistration;
use App\Models\Traveller;
use Tests\TestCase;

class AdminPagesRenderTest extends TestCase
{
    public static function locales(): array { return [['en'], ['bn'], ['ar']]; }

    #[\PHPUnit\Framework\Attributes\DataProvider('locales')]
    public function test_every_admin_page_renders_in_each_language(string $lang): void
    {
        $this->actingAs($this->admin())->get('/admin?lang='.$lang);
        $b = Booking::where('ref', 'BHA-27-00342')->first(); $c = Customer::first(); $t = Traveller::first(); $pr = PreRegistration::first(); $ag = Agent::first();
        $urls = ['/admin', '/admin/bookings', '/admin/bookings/create', "/admin/bookings/create?prereg={$pr->id}&customer={$c->id}", "/admin/bookings/{$b->ref}", "/admin/bookings/{$b->ref}/edit",
            "/admin/bookings/{$b->ref}/invoice", "/admin/bookings/{$b->ref}/voucher", '/admin/customers', '/admin/customers/create', "/admin/customers/{$c->id}", "/admin/customers/{$c->id}/edit",
            '/admin/pilgrims', "/admin/pilgrims/{$t->id}", "/admin/pilgrims/{$t->id}/edit", '/admin/payments', '/admin/pre-registrations', "/admin/pre-registrations/{$pr->id}",
            '/admin/commissions', "/admin/agents/{$ag->id}/statement", '/admin/audit-log', '/admin/bookings?payment_status=overdue&q=a&from=2020-01-01&to=2030-01-01',
            '/admin/pilgrims?passport=expiring', '/admin/pilgrims?mahram=needed', '/admin/pilgrims?passport=missing', '/admin/payments?status=paid&method=bkash', '/admin/pre-registrations?status=received'];
        foreach ($urls as $u) {
            $r = $this->get($u);
            $this->assertSame(200, $r->status(), "$u => ".$r->status().' '.mb_substr(strip_tags((string) $r->getContent()), 0, 400));
        }
    }
}
