<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\CancellationPolicy;
use App\Models\Category;
use App\Models\Country;
use App\Models\Currency;
use App\Models\Language;
use App\Models\LoyaltyTier;
use App\Models\Region;
use App\Models\Setting;
use App\Support\Permissions;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Languages, settings, currencies, geo, categories, cancellation policies, amenities, loyalty tiers, roles & permissions. */
class FoundationSeeder extends Seeder
{
    public const COUNTRIES = [
        // iso2 => [en, bn, flag, currency, region]
        'BD' => ['Bangladesh', 'বাংলাদেশ', '🇧🇩', 'BDT', 'bd'], 'MV' => ['Maldives', 'মালদ্বীপ', '🇲🇻', 'MVR', 'asia'], 'TR' => ['Türkiye', 'তুরস্ক', '🇹🇷', 'TRY', 'europe'],
        'ID' => ['Indonesia', 'ইন্দোনেশিয়া', '🇮🇩', 'IDR', 'asia'], 'AE' => ['United Arab Emirates', 'সংযুক্ত আরব আমিরাত', '🇦🇪', 'AED', 'gulf'], 'NP' => ['Nepal', 'নেপাল', '🇳🇵', 'NPR', 'asia'],
        'TH' => ['Thailand', 'থাইল্যান্ড', '🇹🇭', 'THB', 'asia'], 'BT' => ['Bhutan', 'ভুটান', '🇧🇹', 'BTN', 'asia'], 'SG' => ['Singapore', 'সিঙ্গাপুর', '🇸🇬', 'SGD', 'asia'],
        'MY' => ['Malaysia', 'মালয়েশিয়া', '🇲🇾', 'MYR', 'asia'], 'VN' => ['Vietnam', 'ভিয়েতনাম', '🇻🇳', 'VND', 'asia'], 'IN' => ['India', 'ভারত', '🇮🇳', 'INR', 'asia'],
        'JP' => ['Japan', 'জাপান', '🇯🇵', 'JPY', 'asia'], 'EG' => ['Egypt', 'মিশর', '🇪🇬', 'EGP', 'gulf'], 'LK' => ['Sri Lanka', 'শ্রীলঙ্কা', '🇱🇰', 'LKR', 'asia'],
        'GR' => ['Greece', 'গ্রিস', '🇬🇷', 'EUR', 'europe'], 'FR' => ['France', 'ফ্রান্স', '🇫🇷', 'EUR', 'europe'], 'QA' => ['Qatar', 'কাতার', '🇶🇦', 'QAR', 'gulf'],
        'SA' => ['Saudi Arabia', 'সৌদি আরব', '🇸🇦', 'SAR', 'gulf'], 'OM' => ['Oman', 'ওমান', '🇴🇲', 'OMR', 'gulf'], 'AZ' => ['Azerbaijan', 'আজারবাইজান', '🇦🇿', 'AZN', 'europe'],
        'EU' => ['Schengen area', 'শেনজেন এলাকা', '🇪🇺', 'EUR', 'europe'],
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Language::upsert([
            ['code' => 'en', 'name' => 'English', 'native' => 'English', 'dir' => 'ltr', 'is_default' => true, 'is_active' => true, 'sort' => 1],
            ['code' => 'bn', 'name' => 'Bangla', 'native' => 'বাংলা', 'dir' => 'ltr', 'is_default' => false, 'is_active' => true, 'sort' => 2],
        ], ['code']);

        $this->settings();

        foreach ([['BDT', '৳', 1, 1], ['USD', '$', 122, 2], ['EUR', '€', 132, 3]] as [$code, $sym, $rate, $sort]) {
            Currency::updateOrCreate(['code' => $code], ['symbol' => $sym, 'rate_to_bdt' => $rate, 'sort' => $sort, 'is_active' => true]);
        }

        $regions = ['bd' => ['Bangladesh', 'বাংলাদেশ'], 'intl' => ['International', 'আন্তর্জাতিক']] + array_map(fn ($b) => [$b['en'], $b['bn']], S::public('CRUISE_REGIONS'));
        $i = 0;
        foreach ($regions as $code => [$en, $bn]) {
            Region::updateOrCreate(['code' => $code], ['name' => ['en' => $en, 'bn' => $bn], 'sort' => ++$i]);
        }
        $regionIds = Region::pluck('id', 'code');
        foreach (self::COUNTRIES as $iso => [$en, $bn, $flag, $cur, $region]) {
            Country::updateOrCreate(['iso2' => $iso], ['name' => ['en' => $en, 'bn' => $bn], 'flag' => $flag, 'currency' => $cur, 'region_id' => $regionIds[$region] ?? null]);
        }

        foreach (S::public('CATEGORIES') as $n => [$slug, $icon, $name]) {
            Category::updateOrCreate(['slug' => $slug], ['icon' => $icon, 'name' => S::b($name), 'sort' => $n + 1]);
        }

        $rules = [
            'free24' => [['hours_before' => 24, 'refund_pct' => 100], ['hours_before' => 0, 'refund_pct' => 0]],
            'free72' => [['hours_before' => 72, 'refund_pct' => 100], ['hours_before' => 0, 'refund_pct' => 0]],
            'free7' => [['days_before' => 7, 'refund_pct' => 100], ['days_before' => 3, 'refund_pct' => 50], ['days_before' => 0, 'refund_pct' => 0]],
            'free30' => [['days_before' => 30, 'refund_pct' => 100], ['days_before' => 15, 'refund_pct' => 50], ['days_before' => 0, 'refund_pct' => 0]],
            'partial' => [['days_before' => 30, 'refund_pct' => 75], ['days_before' => 15, 'refund_pct' => 50], ['days_before' => 0, 'refund_pct' => 0]],
            'none' => [['days_before' => 0, 'refund_pct' => 0]],
        ];
        foreach (S::public('CANCEL') as $code => [$kind, $name]) {
            CancellationPolicy::updateOrCreate(['code' => $code], ['kind' => $kind, 'name' => S::b($name), 'rules' => $rules[$code] ?? $rules['none']]);
        }

        foreach (S::public('AMENITY') as $code => [$icon, $name]) {
            Amenity::updateOrCreate(['code' => $code], ['icon' => $icon, 'name' => S::b($name)]);
        }

        foreach (S::app('TIERS') as $n => [$name, $min, $perks]) {
            LoyaltyTier::updateOrCreate(['code' => strtolower($name['en'])], ['name' => S::b($name), 'min_miles' => $min, 'perks' => [S::b($perks)], 'miles_multiplier' => 1 + $n * 0.02, 'sort' => $n + 1]);
        }

        foreach (Permissions::all() as $p) {
            Permission::findOrCreate($p, 'web');
        }
        foreach (Permissions::ROLES as $name => $def) {
            Role::findOrCreate($name, 'web')->syncPermissions(Permissions::forGroups($def['groups']));
        }
        Role::findOrCreate('b2b_agent', 'web');
        Role::findOrCreate('traveller', 'web');
    }

    private function settings(): void
    {
        $c = S::public('COMPANY');
        $set = function (string $group, string $key, mixed $value, string $type = 'text', bool $public = true) {
            Setting::updateOrCreate(['group' => $group, 'key' => $key], ['value' => $value, 'type' => $type, 'is_public' => $public]);
        };
        $set('company', 'name', S::b($c['name']), 'tr');
        $set('company', 'short_name', S::b(['en' => 'Musafir', 'bn' => 'মুসাফির']), 'tr');
        $set('company', 'tagline', S::b($c['tagline']), 'tr');
        $set('company', 'about_short', ['en' => 'Bangladesh-born, world-ready. Holidays, cruises, flights, hotels and visas — trusted by 1,20,000+ travellers since 2012.', 'bn' => 'বাংলাদেশে জন্ম, বিশ্বমানের সেবা। ২০১২ সাল থেকে হলিডে, ক্রুজ, ফ্লাইট, হোটেল ও ভিসা — ১,২০,০০০+ ভ্রমণকারীর আস্থা।'], 'tr');
        $set('company', 'hotline', $c['hotline']);
        $set('company', 'hotline_tel', $c['hotline_tel']);
        $set('company', 'whatsapp', $c['whatsapp']);
        $set('company', 'whatsapp_number', $c['wa']);
        $set('company', 'email', $c['email']);
        $set('company', 'address', S::b($c['address']), 'tr');
        $set('company', 'branches', S::bl($c['branches']), 'json');
        $set('company', 'hours', S::b($c['hours']), 'tr');
        $set('company', 'licences', array_map(fn ($l) => ['name' => S::b($l[0]), 'number' => $l[1]], $c['licences']), 'json');
        $set('company', 'founded', $c['founded'], 'number');
        $set('company', 'geo', ['lat' => 23.7937, 'lng' => 90.4066], 'json');
        $set('company', 'rating', ['value' => 4.9, 'count' => 8421], 'json');
        $set('social', 'links', [
            ['key' => 'facebook', 'url' => 'https://facebook.com/musafirbd'], ['key' => 'instagram', 'url' => 'https://instagram.com/musafirbd'],
            ['key' => 'youtube', 'url' => 'https://youtube.com/@musafirbd'], ['key' => 'linkedin', 'url' => 'https://linkedin.com/company/musafirbd'], ['key' => 'whatsapp', 'url' => 'https://wa.me/'.$c['wa']], ['key' => 'x-logo', 'url' => 'https://x.com/musafirbd'],
        ], 'json');
        $set('app', 'links', ['play_url' => '', 'appstore_url' => ''], 'json'); // empty = shown as "coming soon" (never a dead link)
        $set('seo', 'site_url', rtrim((string) config('musafir.frontend_url'), '/'));
        $set('seo', 'production_url', 'https://musafir.com.bd');
        $set('seo', 'title_suffix', ['en' => 'Musafir', 'bn' => 'মুসাফির'], 'tr');
        $set('seo', 'default_description', ['en' => 'Musafir — Bangladesh-based holidays, cruises, flights, hotels and visa services.', 'bn' => 'মুসাফির — বাংলাদেশভিত্তিক হলিডে, ক্রুজ, ফ্লাইট, হোটেল ও ভিসা সেবা।'], 'tr');
        $set('seo', 'default_og_image', 'coxsbazar');
        $set('seo', 'google_site_verification', '');
        $set('seo', 'bing_site_verification', '');
        $set('analytics', 'ga4_id', '');
        $set('analytics', 'gtm_id', '');
        $set('analytics', 'meta_pixel_id', '');
        $set('commerce', 'currency', 'BDT');
        $set('commerce', 'deposit_pct', 30, 'number');
        $set('commerce', 'instalments', 3, 'number');
        $set('commerce', 'vat_included', true, 'bool');
        $set('commerce', 'hold_minutes', 30, 'number');
        $set('commerce', 'miles_per_100', 1, 'number');
        $set('commerce', 'room_factors', ['twin' => 1, 'triple' => 0.94, 'single' => 1.35], 'json');
        $set('commerce', 'cruise_addons', [['code' => 'drinks', 'label' => ['en' => 'Beverage & Wi-Fi package', 'bn' => 'পানীয় ও ওয়াই-ফাই প্যাকেজ'], 'price' => 9500, 'per' => 'booking']], 'json');
        $set('commerce', 'pax_factors', ['adults' => 1, 'children' => 0.7, 'infants' => 0.1], 'json');
        $set('payments', 'gateways', ['mock' => true, 'sslcommerz' => true, 'bkash' => true, 'nagad' => true, 'bank_transfer' => true, 'wallet' => true], 'json');
        $set('payments', 'mode', 'sandbox', 'text', false);
        $set('payments', 'bank_details', ['bank' => 'City Bank PLC, Banani Branch', 'account_name' => 'Musafir Tours & Travels Ltd.', 'account_no' => '1101 2345 6789 01', 'routing' => '225260437'], 'json');
        $set('modules', 'enabled', ['tours' => true, 'cruises' => true, 'activities' => true, 'hotels' => true, 'flights' => true, 'visa' => true, 'insurance' => true, 'gift_cards' => true, 'blog' => true, 'planner' => true, 'wallet' => true, 'referrals' => true], 'json');
        $set('home', 'countdown', ['ends_at' => '2026-11-30T23:59:00+06:00', 'label' => ['en' => 'Winter sale ends in', 'bn' => 'শীতের সেল শেষ হবে']], 'json');
        $set('cookie', 'banner', ['en' => 'We use essential cookies to run Musafir and optional analytics cookies to improve it.', 'bn' => 'মুসাফির চালাতে প্রয়োজনীয় কুকি এবং উন্নত করতে ঐচ্ছিক অ্যানালিটিক্স কুকি ব্যবহার করি।'], 'tr');
        $set('system', 'maintenance', false, 'bool', false);
        $set('catalog', 'activity_categories', collect(S::public('ACT_CATS'))->map(fn ($c, $k) => ['key' => $k, 'icon' => $c[0], 'label' => S::b($c[1])])->values()->all(), 'json');
    }
}
