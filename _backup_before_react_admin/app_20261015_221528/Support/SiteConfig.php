<?php

namespace App\Support;

use App\Models\Language;
use App\Models\Licence;
use App\Models\Module;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Admin-controlled runtime configuration (languages, modules/feature flags, licences, settings).
 * Cached forever; call SiteConfig::flush() after any admin change.
 * The same payload is served to future mobile apps / partner portals at GET /api/v1/config.
 */
class SiteConfig
{
    public const MODULES = [
        'hajj' => 'Hajj packages', 'umrah' => 'Umrah packages', 'flights' => 'Flights (GDS)', 'hotels' => 'Hotels',
        'visa' => 'Visa services', 'tours' => 'Islamic tours', 'ziyarah' => 'Ziyarah', 'installments' => 'Installment payments',
        'blog' => 'Blog', 'gallery' => 'Gallery', 'agents' => 'Agent / B2B portal', 'preregistration' => 'Hajj pre-registration',
    ];

    public const SETTING_DEFAULTS = [
        'site_name' => 'Blessing Hajj Agency',
        'tagline' => ['en' => 'Your Sacred Journey, Our Trusted Care', 'bn' => 'আপনার পবিত্র যাত্রা, আমাদের বিশ্বস্ত যত্ন', 'ar' => 'رحلتك المقدسة، في رعايتنا الأمينة'],
        'phone' => '+880 1700-000000', 'whatsapp' => '8801800000000', 'email' => 'info@blessinghajj.com',
        'address' => ['en' => 'House 12, Road 5, Naya Paltan, Dhaka 1000', 'bn' => 'বাড়ি ১২, রোড ৫, নয়া পল্টন, ঢাকা ১০০০', 'ar' => 'منزل 12، طريق 5، نايا بالتان، دكا 1000'],
        'hours' => 'Sat–Thu 9:30am–8pm', 'hajj_date' => '2027-05-15T00:00:00+06:00',
        'bank_details' => 'Islami Bank Bangladesh PLC · A/C Blessing Hajj Agency · 2050-xxxx-xxxx · Paltan branch',
        'qurbani_price' => 28000, 'insurance_price' => 3500, 'early_bird_discount' => 10000, 'preregistration_fee' => 30000,
        'hold_hours' => 72, 'facebook' => '#', 'youtube' => '#',
    ];

    public static function load(): array
    {
        return Cache::rememberForever('site_config', function () {
            try {
                $languages = Language::orderBy('sort')->get(['code', 'name', 'native_name', 'label', 'dir', 'enabled', 'is_default'])->toArray();
                $modules = Module::pluck('enabled', 'key')->map(fn ($v) => (bool) $v)->all();
                $licences = Licence::visible()->get(['type', 'label', 'number', 'issuer'])->toArray();
                $settings = Setting::pluck('value', 'key')->all();
            } catch (\Throwable) {
                $languages = []; $modules = []; $licences = []; $settings = [];
            }
            if (! $languages) {
                $languages = [['code' => 'en', 'name' => 'English', 'native_name' => 'English', 'label' => 'EN', 'dir' => 'ltr', 'enabled' => true, 'is_default' => true]];
            }

            return [
                'languages' => $languages,
                'modules' => array_merge(array_fill_keys(array_keys(self::MODULES), true), $modules),
                'licences' => $licences,
                'settings' => array_merge(self::SETTING_DEFAULTS, $settings),
            ];
        });
    }

    public static function flush(): void { Cache::forget('site_config'); }

    public static function enabledLanguages(): array
    {
        return array_values(array_filter(self::load()['languages'], fn ($l) => $l['enabled']));
    }

    public static function defaultLocale(): string
    {
        $en = self::enabledLanguages();
        foreach ($en as $l) { if ($l['is_default']) return $l['code']; }
        return $en[0]['code'] ?? 'en';
    }

    public static function moduleOn(string $key): bool { return (bool) (self::load()['modules'][$key] ?? true); }

    public static function setting(string $key, $default = null)
    {
        $v = self::load()['settings'][$key] ?? $default;
        if (is_array($v) && (isset($v['en']) || isset($v['bn']) || isset($v['ar']))) {
            return $v[app()->getLocale()] ?? $v['en'] ?? reset($v);
        }
        return $v;
    }

    /** Public payload for JS and the API (no secrets). */
    public static function public(): array
    {
        $c = self::load();
        return [
            'locale' => app()->getLocale(),
            'languages' => self::enabledLanguages(),
            'modules' => $c['modules'],
            'licences' => $c['licences'],
            'hajjDate' => $c['settings']['hajj_date'],
            'currency' => 'BDT',
        ];
    }
}
