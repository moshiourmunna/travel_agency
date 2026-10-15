<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Document;
use App\Models\Language;
use App\Models\Module;
use App\Models\User;
use App\Support\SiteConfig;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Public / user-facing regression suite.
 * Golden HTML snapshots (tests/Feature/__snapshots__/public) were recorded on the code BEFORE the React admin
 * rewrite. Every public page, the login page, customer dashboard and agent portal – in EN, BN and AR – must render
 * byte-for-byte the same markup (after masking CSRF tokens and seeded random values).
 * Re-record intentionally with:  UPDATE_SNAPSHOTS=1 php artisan test --filter=PublicRegressionTest
 */
class PublicRegressionTest extends TestCase
{
    private const PAGES = [
        '/', '/about', '/guide', '/faq', '/contact', '/hajj', '/umrah', '/tours', '/flights', '/flights?from=DAC&to=JED', '/hotels', '/hotels?city=makkah',
        '/visa', '/visa/track?ref=VA-26-0975', '/pre-registration', '/blog', '/blog/hajj-2027-registration-deadlines-and-fees', '/gallery', '/login',
        '/packages/standard-hajj-2027', '/packages/vip-hajj-clock-tower', '/packages/vip-umrah-5-haram-view', '/packages/makkah-ziyarah-half-day', '/packages/umrah-dubai-stopover',
    ];

    private function normalise(string $html): string
    {
        $html = preg_replace('/name="_token" value="[^"]+"/', 'name="_token" value="X"', $html);
        $html = preg_replace('/<meta name="csrf-token" content="[^"]+">/', '<meta name="csrf-token" content="X">', $html);
        $html = preg_replace('/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,}\b/', '<ID>', $html);   // gateway TrxIDs, NSK refs
        $html = preg_replace('/(TrxID |<td>)[A-Z]{8,12}(?=[ <])/', '$1<ID>', $html);         // all-letter random TrxIDs
        $html = preg_replace('/\b(NSK|HB|GRP)-?[A-Za-z0-9]+/', '$1<ID>', $html);
        $html = preg_replace('/\b01\d{9}\b/', '01<PHONE>', $html);                                   // seeded random phones
        $html = preg_replace('/\b\d{10,17}\b/', '<NUM>', $html);
        $html = preg_replace('/\b\d{1,2}:\d{2}( ?[AP]M)?\b/i', '<TIME>', $html);

        return trim(preg_replace("/[ \t]+\n/", "\n", $html));
    }

    private function snap(string $name, string $html): void
    {
        $file = (getenv('SNAPSHOT_DIR') ?: __DIR__.'/__snapshots__/public').'/'.preg_replace('/[^a-z0-9]+/i', '_', trim($name, '/_')).'.html';
        $html = $this->normalise($html);
        if (getenv('UPDATE_SNAPSHOTS') || ! is_file($file)) {
            @mkdir(dirname($file), 0777, true);
            file_put_contents($file, $html);
            if (! getenv('UPDATE_SNAPSHOTS')) $this->markTestIncomplete("Recorded new snapshot $name");
            $this->addToAssertionCount(1);

            return;
        }
        $this->assertSame(file_get_contents($file), $html, "Public markup changed: $name");
    }

    public function test_every_public_page_matches_baseline_in_every_language(): void
    {
        foreach (['en', 'bn', 'ar'] as $lang) {
            foreach (self::PAGES as $url) {
                $r = $this->withSession(['locale' => $lang])->get($url);
                $r->assertOk();
                $html = $r->getContent();
                $this->assertStringContainsString('lang="'.$lang.'"', $html, $url);
                $this->assertStringContainsString('dir="'.($lang === 'ar' ? 'rtl' : 'ltr').'"', $html, $url);
                $this->snap($lang.'_'.($url === '/' ? 'home' : $url), $html);
            }
        }
        $this->get('/no-such-page')->assertNotFound();
        $this->snap('en_404', $this->get('/no-such-page')->getContent());
    }

    public function test_customer_dashboard_and_booking_pages_match_baseline(): void
    {
        foreach (['en', 'bn', 'ar'] as $lang) {
            $this->actingAs($this->customer())->withSession(['locale' => $lang]);
            $this->snap("$lang dashboard", $this->get('/dashboard')->assertOk()->getContent());
            $this->snap("$lang dashboard b342", $this->get('/dashboard?b=BHA-27-00342')->assertOk()->getContent());
            $this->snap("$lang booking create", $this->get('/booking?package=standard-hajj-2027')->assertOk()->getContent());
            $this->snap("$lang booking create umrah", $this->get('/booking?package=7-days-express-umrah')->assertOk()->getContent());
        }
    }

    public function test_agent_portal_matches_baseline(): void
    {
        foreach (['en', 'bn', 'ar'] as $lang) {
            $this->snap("$lang agent", $this->actingAs($this->agentUser())->withSession(['locale' => $lang])->get('/agent')->assertOk()->getContent());
        }
    }

    public function test_auth_flows(): void
    {
        $this->post('/login', ['login' => 'rahim@example.com', 'password' => 'nope'])->assertSessionHasErrors();
        $this->assertGuest();
        $this->post('/login', ['login' => 'rahim@example.com', 'password' => 'password'])->assertRedirect();
        $this->assertAuthenticated();
        $this->post('/logout')->assertRedirect();
        $this->assertGuest();
        $this->post('/register', ['name' => 'Reg User', 'phone' => '01812345671', 'email' => 'reg1@example.com', 'password' => 'password123', 'password_confirmation' => 'password123'])->assertRedirect();
        $this->assertAuthenticated();
        $this->assertSame('customer', auth()->user()->role);
        $this->post('/logout');
        $this->post('/register', ['name' => 'Dup', 'phone' => '01812345671', 'password' => 'password123', 'password_confirmation' => 'password123'])->assertSessionHasErrors('phone');
        // role redirects + guards
        $this->actingAs($this->admin())->get('/dashboard')->assertRedirect(route('admin.dashboard'));
        $this->actingAs($this->agentUser())->get('/dashboard')->assertRedirect(route('agent.index'));
        $this->actingAs($this->customer())->get('/admin')->assertForbidden();
        $this->actingAs($this->customer())->get('/agent')->assertForbidden();
    }

    public function test_customer_dashboard_actions(): void
    {
        $u = $this->customer();
        $this->actingAs($u)->put('/dashboard/profile', ['name' => 'Rahim Updated', 'email' => $u->email, 'district' => 'Sylhet', 'address' => 'Zindabazar'])->assertSessionHas('ok');
        $this->assertSame('Sylhet', $u->fresh()->customer->district);
        $doc = Document::whereHas('bookingTraveller.booking.customer', fn ($c) => $c->where('user_id', $u->id))->whereNull('path')->first();
        if ($doc) {
            $this->post("/dashboard/documents/{$doc->id}", ['file' => UploadedFile::fake()->create('p.pdf', 50, 'application/pdf')])->assertSessionHas('ok');
            $this->assertNotNull($doc->fresh()->path);
        }
        $b = Booking::whereHas('customer', fn ($c) => $c->where('user_id', $u->id))->whereNot('status', 'cancelled')->get()->first(fn ($b) => $b->due() > 0);
        $this->post("/dashboard/bookings/{$b->ref}/pay", ['method' => 'cash'])->assertSessionHas('ok');
        // another customer's booking is private
        $other = User::create(['name' => 'Other', 'phone' => '01899999998', 'password' => 'password', 'role' => 'customer']);
        $this->actingAs($other)->post("/dashboard/bookings/{$b->ref}/pay", ['method' => 'cash'])->assertForbidden();
        $this->get('/dashboard')->assertOk()->assertDontSee($b->ref);
    }

    public function test_every_module_toggle_hides_menu_and_404s_routes(): void
    {
        $map = ['hajj' => ['/hajj'], 'umrah' => ['/umrah'], 'flights' => ['/flights'], 'hotels' => ['/hotels'], 'visa' => ['/visa', '/visa/track'], 'preregistration' => ['/pre-registration'], 'blog' => ['/blog'], 'gallery' => ['/gallery']];
        foreach ($map as $key => $urls) {
            Module::where('key', $key)->update(['enabled' => false]);
            SiteConfig::flush();
            foreach ($urls as $url) $this->get($url)->assertNotFound();
            $this->assertStringNotContainsString('href="'.url($urls[0]).'"', $this->get('/')->getContent(), "menu link for $key still visible");
            Module::where('key', $key)->update(['enabled' => true]);
            SiteConfig::flush();
            $this->get($urls[0])->assertOk();
        }
        Module::where('key', 'agents')->update(['enabled' => false]); SiteConfig::flush();
        $this->actingAs($this->agentUser())->get('/agent')->assertNotFound();
    }

    public function test_language_switch_and_disable(): void
    {
        $this->get('/lang/ar')->assertRedirect();
        $this->get('/')->assertSee('dir="rtl"', false)->assertSee('lang="ar"', false);
        $this->get('/lang/bn');
        $this->get('/')->assertSee('lang="bn"', false)->assertSee('dir="ltr"', false);
        Language::where('code', 'ar')->update(['enabled' => false]); SiteConfig::flush();
        $this->get('/')->assertDontSee('hreflang="ar"', false);
        $this->get('/?lang=ar')->assertSee('lang="bn"', false);
    }
}
