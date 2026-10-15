<?php

namespace Tests\Feature;

use App\Models\Language;
use App\Models\Licence;
use App\Models\Module;
use App\Support\SiteConfig;
use Tests\TestCase;

class SiteTest extends TestCase
{
    public function test_all_public_pages_render(): void
    {
        foreach (['/', '/hajj', '/umrah', '/tours', '/flights', '/hotels', '/visa', '/pre-registration', '/about', '/guide', '/faq', '/contact', '/blog', '/gallery', '/login',
            '/packages/standard-hajj-2027', '/packages/makkah-ziyarah-half-day', '/blog/hajj-2027-registration-deadlines-and-fees', '/visa/track?ref=VA-26-0981'] as $url) {
            $this->get($url)->assertOk();
        }
        $this->get('/does-not-exist')->assertNotFound()->assertSee('404');
    }

    public function test_home_shows_seeded_dummy_data(): void
    {
        $this->get('/')->assertSee('Standard Hajj 2027')->assertSee('৳ 8,45,000')->assertSee('600 m')->assertSee('Mufti Abdullah Al Mamun')->assertSee('MoRA Hajj Licence');
        $this->get('/hotels')->assertSee('Swissôtel Makkah')->assertSee('50 m');
        $this->get('/flights')->assertSee('SV 803')->assertSee('৳ 62,500');
    }

    public function test_package_page_shows_hotels_distance_and_installment_plan(): void
    {
        $this->get('/packages/standard-hajj-2027')->assertSee('Al Kiswah Towers')->assertSee('600 m')->assertSee('Booking deposit')->assertSee('Final payment');
    }

    public function test_quote_endpoint_calculates_totals_and_schedule(): void
    {
        $r = $this->getJson('/packages/standard-hajj-2027/quote?room_type=quad&adults=2')->assertOk();
        $this->assertSame(1690000, $r->json('subtotal'));
        $this->assertSame(1670000, $r->json('total'));          // early-bird discount 2 × 10,000
        $this->assertSame(100000, $r->json('deposit'));
        $this->assertSame($r->json('total'), array_sum(array_column($r->json('schedule'), 'amount')));
    }

    public function test_arabic_renders_rtl_and_bangla_translates(): void
    {
        $this->get('/?lang=ar')->assertSee('dir="rtl"', false)->assertSee('رحلتك المقدسة');
        $this->get('/?lang=bn')->assertSee('dir="ltr"', false)->assertSee('বৈশিষ্ট্যপূর্ণ প্যাকেজ')->assertSee('স্ট্যান্ডার্ড হজ্জ ২০২৭');
    }

    public function test_disabled_language_is_hidden_and_cannot_be_selected(): void
    {
        Language::where('code', 'ar')->update(['enabled' => false]);
        SiteConfig::flush();
        $this->get('/?lang=ar')->assertSee('dir="ltr"', false)->assertDontSee('hreflang="ar"', false)->assertSee('hreflang="bn"', false);
        $this->get('/lang/ar')->assertNotFound();
    }

    public function test_switcher_hidden_when_only_one_language(): void
    {
        Language::whereIn('code', ['bn', 'ar'])->update(['enabled' => false]);
        SiteConfig::flush();
        $this->get('/')->assertDontSee('class="langsw"', false);
    }

    public function test_disabled_module_hides_menu_and_returns_404(): void
    {
        Module::where('key', 'flights')->update(['enabled' => false]);
        Module::where('key', 'blog')->update(['enabled' => false]);
        SiteConfig::flush();
        $this->get('/flights')->assertNotFound();
        $this->get('/blog')->assertNotFound();
        $this->get('/')->assertOk()->assertDontSee(route('flights'))->assertDontSee(route('blog'))->assertSee(route('hotels'));
    }

    public function test_disabled_hajj_module_hides_hajj_packages(): void
    {
        Module::where('key', 'hajj')->update(['enabled' => false]);
        SiteConfig::flush();
        $this->get('/hajj')->assertNotFound();
        $this->get('/packages/standard-hajj-2027')->assertNotFound();
        $this->get('/')->assertDontSee('Standard Hajj 2027')->assertSee('14 Days Group Umrah');
    }

    public function test_licence_badges_only_when_filled(): void
    {
        $this->get('/')->assertSee('No. 1234')->assertDontSee('Trade Licence');
        Licence::query()->update(['number' => null]);
        SiteConfig::flush();
        $this->get('/')->assertDontSee('lic-badge')->assertDontSee('Licences &amp; Accreditations', false);
    }

    public function test_api_config_and_packages(): void
    {
        $this->getJson('/api/v1/config')->assertOk()->assertJsonPath('data.modules.hajj', true)->assertJsonCount(3, 'data.languages')->assertJsonCount(5, 'data.licences');
        $this->getJson('/api/v1/packages?type=hajj')->assertOk()->assertJsonCount(4, 'data');
        $this->getJson('/api/v1/packages/standard-hajj-2027')->assertOk()->assertJsonPath('data.makkah_distance_m', 600);
        $this->getJson('/api/v1/visa/VA-26-0975/status')->assertOk()->assertJsonPath('data.status', 'issued');
    }

    public function test_contact_pre_registration_and_visa_forms(): void
    {
        $this->post('/contact', ['name' => 'Test', 'phone' => '01712345678', 'message' => 'Hello', 'interest' => 'Umrah'])->assertSessionHas('ok');
        $this->assertDatabaseHas('inquiries', ['name' => 'Test']);

        $this->post('/pre-registration', ['name' => 'Abdul Test', 'nid' => '1234567890', 'dob' => '1960-01-01', 'phone' => '01812345678', 'district' => 'Dhaka', 'package_class' => 'standard', 'pilgrims' => 2, 'agree' => '1'])
            ->assertRedirect('/pre-registration')->assertSessionHas('ok');
        $pr = \App\Models\PreRegistration::where('name', 'Abdul Test')->first();
        $this->assertNotNull($pr->govt_tracking_no);
        $this->assertSame('1234567890', $pr->nid_enc);                                  // decrypted by cast
        $this->assertStringNotContainsString('1234567890', \DB::table('pre_registrations')->where('id', $pr->id)->value('nid_enc')); // encrypted at rest

        $this->post('/pre-registration', ['name' => 'X'])->assertSessionHasErrors(['nid', 'dob', 'phone', 'agree']);

        $r = $this->post('/visa/apply', ['visa_type_id' => 1, 'applicants' => 1, 'name' => 'Visa Test', 'phone' => '01912345678']);
        $ref = \App\Models\VisaApplication::where('applicant_name', 'Visa Test')->value('ref');
        $r->assertRedirect(route('visa.track', ['ref' => $ref]));
        $this->get('/visa/track?ref='.$ref)->assertSee('Visa Test');
    }
}
