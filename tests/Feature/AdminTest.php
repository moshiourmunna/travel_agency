<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Language;
use App\Models\Module;
use App\Models\Package;
use App\Models\VisaApplication;
use Tests\TestCase;

class AdminTest extends TestCase
{
    public function test_admin_area_requires_admin(): void
    {
        $this->get('/admin')->assertRedirect('/login');
        $this->actingAs($this->customer())->get('/admin')->assertForbidden();
        $this->actingAs($this->customer())->get('/agent')->assertForbidden();
    }

    public function test_admin_pages_render(): void
    {
        $this->actingAs($this->admin());
        foreach (['/admin', '/admin/settings', '/admin/bookings', '/admin/inbox', '/admin/integrations', '/admin/bookings/BHA-27-00342'] as $u) {
            $this->get($u)->assertOk();
        }
        foreach (array_keys(\App\Support\AdminResources::all()) as $r) {
            $this->get("/admin/manage/$r")->assertOk();
            $this->get("/admin/manage/$r/create")->assertOk();
        }
        $this->get('/admin/manage/packages/2/edit')->assertOk()->assertSee('Standard Hajj 2027');
    }

    public function test_settings_toggle_languages_modules_licences(): void
    {
        $data = [
            'default_language' => 'en', 'languages' => ['en' => '1', 'bn' => '1', 'ar' => '0'],
            'modules' => array_merge(array_fill_keys(array_keys(\App\Support\SiteConfig::MODULES), '1'), ['hotels' => '0']),
            'licences' => ['mora' => ['number' => 'No. 9999', 'show' => '1'], 'haab' => ['number' => '', 'show' => '1'], 'iata' => ['number' => 'X', 'show' => '0']],
            's' => ['phone' => '+880 1711-000000', 'email' => 'hello@blessinghajj.com', 'address_en' => 'Paltan, Dhaka', 'hajj_date' => '2027-05-15', 'qurbani_price' => 30000, 'insurance_price' => 3500, 'early_bird_discount' => 10000, 'hold_hours' => 48],
        ];
        $this->actingAs($this->admin())->put('/admin/settings', $data)->assertSessionHas('ok');
        $this->assertFalse(Language::where('code', 'ar')->value('enabled'));
        $this->assertFalse(Module::where('key', 'hotels')->value('enabled'));
        $this->get('/hotels')->assertNotFound();
        $this->get('/')->assertSee('No. 9999')->assertDontSee('HAAB Member')->assertDontSee('hreflang="ar"', false)->assertSee('+880 1711-000000');
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.update']);
    }

    public function test_default_language_cannot_be_disabled(): void
    {
        $this->actingAs($this->admin())->put('/admin/settings', [
            'default_language' => 'bn', 'languages' => ['en' => '0', 'bn' => '0', 'ar' => '0'], 'modules' => [], 'licences' => [],
            's' => ['phone' => '1', 'email' => 'a@b.co', 'address_en' => 'x', 'hajj_date' => '2027-05-15', 'qurbani_price' => 1, 'insurance_price' => 1, 'early_bird_discount' => 0, 'hold_hours' => 1],
        ]);
        $this->assertTrue(Language::where('code', 'bn')->value('enabled'));
        $this->get('/')->assertSee('lang="bn"', false);
    }

    public function test_crud_package_and_hotel(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/manage/hotels', ['name' => 'Test Tower', 'city' => 'makkah', 'stars' => 5, 'distance_to_haram_m' => 120, 'amenities' => "Wi-Fi\nBreakfast", 'is_active' => '1'])->assertRedirect('/admin/manage/hotels');
        $h = Hotel::where('name', 'Test Tower')->first();
        $this->assertSame(['Wi-Fi', 'Breakfast'], $h->amenities);
        $this->put("/admin/manage/hotels/{$h->id}", ['name' => 'Test Tower 2', 'city' => 'makkah', 'stars' => 5, 'distance_to_haram_m' => 90, 'is_active' => '1'])->assertRedirect();
        $this->assertSame(90, $h->fresh()->distance_to_haram_m);

        $this->post('/admin/manage/packages', ['title' => ['en' => 'Shawwal Umrah 2027', 'bn' => 'শাওয়াল উমরাহ ২০২৭', 'ar' => 'عمرة شوال'], 'type' => 'umrah', 'class' => 'standard',
            'duration_days' => 15, 'price_from' => 150000, 'status' => 'published', 'inclusions' => ['en' => "Visa\nHotel"], 'is_featured' => '1'])->assertRedirect('/admin/manage/packages');
        $p = Package::where('price_from', 150000)->where('duration_days', 15)->first();
        $this->assertSame('Shawwal Umrah 2027', $p->getTranslations('title')['en']);
        $this->assertSame(['Visa', 'Hotel'], $p->getTranslations('inclusions')['en']);
        $this->post('/admin/manage/prices', ['package_id' => $p->id, 'room_type' => 'quad', 'price' => 150000, 'deposit_amount' => 30000, 'installment_plan_due_dates' => "2027-01-01\n2027-02-01"])->assertRedirect();
        $this->assertSame(['2027-01-01', '2027-02-01'], $p->prices()->first()->installment_plan['due_dates']);
        $this->get('/umrah')->assertSee('Shawwal Umrah 2027');
        $this->get('/umrah?lang=ar')->assertSee('عمرة شوال');

        $this->delete("/admin/manage/hotels/{$h->id}")->assertSessionHas('ok');
        $this->assertSoftDeleted('hotels', ['id' => $h->id]);
        $this->post('/admin/manage/packages', ['type' => 'bad'])->assertSessionHasErrors(['title.en', 'type', 'class', 'duration_days']);
    }

    public function test_booking_status_update_and_visa_submission(): void
    {
        $this->actingAs($this->admin());
        $b = Booking::where('ref', 'BHA-27-00342')->first();
        $this->patch(route('admin.bookings.update', $b), ['status' => 'visa', 'discount' => 30000, 'note' => 'VIP guest'])->assertSessionHas('ok');
        $b->refresh();
        $this->assertSame('visa', $b->status);
        $this->assertSame($b->subtotal - 30000, $b->total);
        $v = VisaApplication::where('ref', 'VA-26-0990')->first();
        $this->post(route('admin.visa.submit', $v))->assertSessionHas('ok');
        $this->assertStringStartsWith('NSK-', $v->fresh()->provider_ref);
        $this->assertDatabaseHas('integration_logs', ['provider' => 'nusuk', 'operation' => 'submit']);
        $this->get('/admin/bookings?status=visa')->assertSee('BHA-27-00342');
    }

    public function test_agent_portal_and_agent_booking(): void
    {
        $this->actingAs($this->agentUser())->get('/agent')->assertOk()->assertSee('Al Noor Travels')->assertSee('Madina Tours')->assertSee('B2B net prices');
        $this->post('/agent/bookings', ['package' => 'standard-hajj-2027', 'room_type' => 'quad', 'adults' => 2, 'name' => 'Agent Pilgrim', 'phone' => '01799999999', 'gender' => 'male'])->assertSessionHas('ok');
        $b = Booking::latest('id')->first();
        $this->assertSame('agent', $b->source);
        $this->assertSame('hold', $b->status);
        $this->assertNotNull($b->agent_id);
        $this->assertDatabaseHas('commissions', ['booking_id' => $b->id]);
    }

    public function test_agent_module_off_blocks_portal(): void
    {
        Module::where('key', 'agents')->update(['enabled' => false]);
        \App\Support\SiteConfig::flush();
        $this->actingAs($this->agentUser())->get('/agent')->assertNotFound();
    }
}
