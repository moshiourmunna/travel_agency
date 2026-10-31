<?php

namespace App\Http\Controllers\Admin;

use App\Admin\Field;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\Revalidator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public const GROUPS = [
        'company' => ['en' => 'Company & contact', 'bn' => 'প্রতিষ্ঠান ও যোগাযোগ', 'icon' => 'building-2'],
        'commerce' => ['en' => 'Booking & pricing rules', 'bn' => 'বুকিং ও মূল্যের নিয়ম', 'icon' => 'shopping-bag'],
        'payments' => ['en' => 'Payments', 'bn' => 'পেমেন্ট', 'icon' => 'credit-card', 'perm' => 'settings.payments'],
        'home' => ['en' => 'Home page', 'bn' => 'হোম পেজ', 'icon' => 'home'],
        'catalog' => ['en' => 'Catalog texts', 'bn' => 'ক্যাটালগের লেখা', 'icon' => 'map'],
        'flights' => ['en' => 'Flights', 'bn' => 'ফ্লাইট', 'icon' => 'plane'],
        'reviews' => ['en' => 'Review summary', 'bn' => 'রিভিউ সারাংশ', 'icon' => 'star'],
        'seo' => ['en' => 'SEO & verification', 'bn' => 'এসইও ও ভেরিফিকেশন', 'icon' => 'search'],
        'social' => ['en' => 'Social links', 'bn' => 'সোশ্যাল লিংক', 'icon' => 'share-2'],
        'app' => ['en' => 'Mobile app', 'bn' => 'মোবাইল অ্যাপ', 'icon' => 'smartphone'],
        'analytics' => ['en' => 'Analytics', 'bn' => 'অ্যানালিটিক্স', 'icon' => 'bar-chart-3'],
        'cookie' => ['en' => 'Cookie banner', 'bn' => 'কুকি ব্যানার', 'icon' => 'cookie'],
        'modules' => ['en' => 'Modules', 'bn' => 'মডিউল', 'icon' => 'layout-grid'],
        'system' => ['en' => 'System', 'bn' => 'সিস্টেম', 'icon' => 'cpu'],
    ];

    /** Labels and help for known keys (others are humanised). */
    public const KEYS = [
        'company.name' => ['Legal name', 'আইনি নাম'], 'company.short_name' => ['Short name', 'সংক্ষিপ্ত নাম'], 'company.tagline' => ['Tagline', 'ট্যাগলাইন'],
        'company.about_short' => ['Short description (footer)', 'সংক্ষিপ্ত বিবরণ (ফুটার)'], 'company.hotline' => ['Hotline (display)', 'হটলাইন (প্রদর্শন)'], 'company.hotline_tel' => ['Hotline (dialable, +880…)', 'হটলাইন (ডায়াল, +৮৮০…)'],
        'company.whatsapp' => ['WhatsApp (display)', 'হোয়াটসঅ্যাপ (প্রদর্শন)'], 'company.whatsapp_number' => ['WhatsApp number (digits only)', 'হোয়াটসঅ্যাপ নম্বর (শুধু সংখ্যা)'], 'company.email' => ['Email', 'ইমেইল'],
        'company.address' => ['Head office address', 'প্রধান কার্যালয়ের ঠিকানা'], 'company.branches' => ['Branches', 'শাখা'], 'company.hours' => ['Opening hours', 'খোলার সময়'], 'company.licences' => ['Licences', 'লাইসেন্স'],
        'company.founded' => ['Founded (year)', 'প্রতিষ্ঠার বছর'], 'company.geo' => ['Map location', 'ম্যাপ লোকেশন'], 'company.rating' => ['Overall rating (shown in search results)', 'সামগ্রিক রেটিং'], 'company.bin' => ['VAT BIN', 'ভ্যাট বিআইএন'],
        'commerce.currency' => ['Settlement currency', 'লেনদেনের মুদ্রা', 'Payments always settle in BDT.', 'পেমেন্ট সবসময় টাকায় হয়।'],
        'commerce.deposit_pct' => ['Deposit (%) to confirm a trip', 'ট্রিপ নিশ্চিত করতে জমা (%)'], 'commerce.instalments' => ['Number of instalments', 'কিস্তির সংখ্যা'], 'commerce.vat_included' => ['Prices include VAT', 'মূল্যে ভ্যাট অন্তর্ভুক্ত'],
        'commerce.hold_minutes' => ['Seat hold while paying (minutes)', 'পেমেন্টের সময় সিট হোল্ড (মিনিট)'], 'commerce.miles_per_100' => ['Miles earned per ৳100', 'প্রতি ৳১০০-তে মাইলস'],
        'commerce.full_pay_discount_pct' => ['Pay-in-full discount (%)', 'পুরো পরিশোধে ছাড় (%)'], 'commerce.balance_due_days' => ['Balance due before travel (days)', 'যাত্রার কত দিন আগে বাকি পরিশোধ'],
        'commerce.plans_min_total' => ['Minimum total for deposit / instalment plans (৳)', 'জমা / কিস্তির জন্য ন্যূনতম মোট (৳)'], 'commerce.bank_hold_hours' => ['Bank transfer hold (hours)', 'ব্যাংক ট্রান্সফার হোল্ড (ঘণ্টা)'],
        'commerce.gift_min' => ['Gift card minimum (৳)', 'গিফট কার্ড ন্যূনতম (৳)'], 'commerce.gift_max' => ['Gift card maximum (৳)', 'গিফট কার্ড সর্বোচ্চ (৳)'],
        'commerce.referral_friend_discount' => ['Referral: friend’s discount (৳)', 'রেফারেল: বন্ধুর ছাড় (৳)'], 'commerce.referral_min_total' => ['Referral: minimum booking (৳)', 'রেফারেল: ন্যূনতম বুকিং (৳)'],
        'commerce.referral_reward' => ['Referral: reward to the referrer (৳ wallet credit)', 'রেফারেল: রেফারকারীর পুরস্কার (৳ ওয়ালেট)'], 'commerce.review_miles' => ['Miles for a published review', 'প্রকাশিত রিভিউয়ের জন্য মাইলস'],
        'commerce.cancellation_fee' => ['Default cancellation fee (৳)', 'ডিফল্ট বাতিল ফি (৳)', 'Used when a product has no cancellation policy.', 'পণ্যের বাতিল নীতি না থাকলে প্রযোজ্য।'],
        'commerce.room_factors' => ['Room-sharing price factors', 'রুম শেয়ারিং মূল্য গুণক'], 'commerce.pax_factors' => ['Traveller price factors', 'যাত্রী মূল্য গুণক'],
        'commerce.cruise_addons' => ['Cruise add-ons', 'ক্রুজ অ্যাড-অন'], 'commerce.hotel_addons' => ['Hotel add-ons', 'হোটেল অ্যাড-অন'],
        'payments.gateways' => ['Payment methods offered at checkout', 'চেকআউটে দেওয়া পেমেন্ট মাধ্যম'], 'payments.bank_details' => ['Bank account for transfers', 'ট্রান্সফারের ব্যাংক অ্যাকাউন্ট'],
        'payments.mode' => ['Gateway mode (read-only)', 'গেটওয়ে মোড (শুধু দেখার জন্য)', 'Sandbox / live is set by PAYMENT_MODE in the server .env.', 'স্যান্ডবক্স / লাইভ সার্ভারের .env-এর PAYMENT_MODE দিয়ে ঠিক হয়।'],
        'home.countdown' => ['Sale countdown', 'সেলের কাউন্টডাউন'], 'catalog.hotel_house_rules' => ['Hotel house rules', 'হোটেলের নিয়ম'], 'catalog.visa_approval_note' => ['Visa approval note', 'ভিসা অনুমোদনের নোট'],
        'catalog.compare_default' => ['Compare page: default tours (slugs)', 'তুলনা পেজ: ডিফল্ট ট্যুর (স্লাগ)'], 'catalog.activity_categories' => ['Activity categories', 'অ্যাক্টিভিটির ক্যাটাগরি'],
        'flights.pricing' => ['Flight price model', 'ফ্লাইট মূল্যের মডেল'], 'flights.popular_routes' => ['Popular routes', 'জনপ্রিয় রুট'],
        'reviews.summary' => ['Score summary', 'স্কোর সারাংশ'], 'reviews.platforms' => ['Review platforms', 'রিভিউ প্ল্যাটফর্ম'],
        'seo.site_url' => ['Website URL (this environment)', 'ওয়েবসাইট ইউআরএল (এই পরিবেশ)'], 'seo.production_url' => ['Production URL', 'প্রোডাকশন ইউআরএল'], 'seo.title_suffix' => ['Title suffix', 'শিরোনামের শেষাংশ'],
        'seo.default_description' => ['Default meta description', 'ডিফল্ট মেটা বিবরণ'], 'seo.default_og_image' => ['Default share image (media key)', 'ডিফল্ট শেয়ার ছবি (মিডিয়া কী)'],
        'seo.google_site_verification' => ['Google site verification', 'গুগল সাইট ভেরিফিকেশন'], 'seo.bing_site_verification' => ['Bing site verification', 'বিং সাইট ভেরিফিকেশন'],
        'social.links' => ['Social profiles', 'সোশ্যাল প্রোফাইল'], 'app.links' => ['App store links', 'অ্যাপ স্টোর লিংক'],
        'analytics.ga4_id' => ['Google Analytics 4 ID', 'গুগল অ্যানালিটিক্স ৪ আইডি'], 'analytics.gtm_id' => ['Google Tag Manager ID', 'গুগল ট্যাগ ম্যানেজার আইডি'], 'analytics.meta_pixel_id' => ['Meta Pixel ID', 'মেটা পিক্সেল আইডি'],
        'cookie.banner' => ['Cookie banner text', 'কুকি ব্যানারের লেখা'], 'modules.enabled' => ['Website sections switched on', 'চালু থাকা ওয়েবসাইট বিভাগ'],
        'system.maintenance' => ['Maintenance mode (bookings paused)', 'রক্ষণাবেক্ষণ মোড (বুকিং বন্ধ)'],
    ];

    public const READONLY = ['payments.mode', 'commerce.currency'];

    private function groupsFor($u): array
    {
        return array_filter(self::GROUPS, fn ($g) => $u->can($g['perm'] ?? 'settings.manage'));
    }

    public function index(Request $r): Response
    {
        $groups = $this->groupsFor($r->user());
        abort_unless($groups, 403);
        $rows = Setting::orderBy('id')->get()->groupBy('group');
        $out = [];
        foreach ($groups + array_fill_keys(array_diff($rows->keys()->all(), array_keys(self::GROUPS)), ['en' => null]) as $g => $meta) {
            if (! isset($rows[$g]) || ! $r->user()->can($meta['perm'] ?? 'settings.manage')) {
                continue;
            }
            $out[] = [
                'key' => $g, 'label' => $meta['en'] ? tr_pick(['en' => $meta['en'], 'bn' => $meta['bn']]) : Field::humanize($g), 'icon' => $meta['icon'] ?? 'settings',
                'items' => $rows[$g]->map(function (Setting $s) use ($g) {
                    $k = self::KEYS["$g.{$s->key}"] ?? null;

                    return [
                        'key' => $s->key, 'type' => $s->type, 'value' => $s->value, 'public' => $s->is_public,
                        'label' => $k ? tr_pick(['en' => $k[0], 'bn' => $k[1]]) : Field::humanize($s->key),
                        'help' => isset($k[2]) ? tr_pick(['en' => $k[2], 'bn' => $k[3] ?? $k[2]]) : null,
                        'readonly' => in_array("$g.{$s->key}", self::READONLY, true),
                    ];
                })->values(),
            ];
        }

        return Inertia::render('Settings', [
            'groups' => $out,
            'active' => (string) $r->query('group', $out[0]['key'] ?? ''),
            'revalidate' => cache('musafir.revalidate.last'),
            'env' => ['payment_mode' => config('musafir.payment_mode'), 'frontend' => config('musafir.frontend_url')],
        ]);
    }

    public function update(Request $r, string $group): RedirectResponse
    {
        $meta = self::GROUPS[$group] ?? [];
        abort_unless($r->user()->can($meta['perm'] ?? 'settings.manage'), 403);
        $rows = Setting::where('group', $group)->get()->keyBy('key');
        abort_if($rows->isEmpty(), 404);
        $values = (array) $r->input('values', []);
        $errors = [];
        $changed = [];
        foreach ($values as $key => $v) {
            $s = $rows->get($key);
            if (! $s || in_array("$group.$key", self::READONLY, true)) {
                continue;
            }
            [$clean, $err] = self::coerce($s->type, $v, "$group.$key");
            if ($err) {
                $errors["values.$key"] = $err;

                continue;
            }
            if ($clean !== $s->value) {
                $changed[$key] = [$s->value, $clean];
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
        DB::transaction(function () use ($rows, $changed, $group) {
            foreach ($changed as $key => [, $new]) {
                $rows[$key]->update(['value' => $new]);
            }
            if ($changed) {
                activity('admin')->causedBy(auth()->user())->event('updated')
                    ->withProperties(['resource' => 'settings', 'title' => $group, 'old' => array_map(fn ($c) => $c[0], $changed), 'attributes' => array_map(fn ($c) => $c[1], $changed)])->log('updated');
            }
        });
        app(Revalidator::class)->add(['settings', 'site', 'all']);
        \Illuminate\Support\Facades\Cache::forget('admin.badges');

        return back()->with('success', $changed ? __('admin.saved', ['name' => tr_pick(['en' => $meta['en'] ?? $group, 'bn' => $meta['bn'] ?? $group])]) : (app()->getLocale() === 'bn' ? 'কোনো পরিবর্তন নেই।' : 'Nothing changed.'));
    }

    /** @return array{0: mixed, 1: ?string} */
    public static function coerce(string $type, mixed $v, string $path): array
    {
        $bn = app()->getLocale() === 'bn';
        switch ($type) {
            case 'number':
                if (! is_numeric($v)) {
                    return [null, $bn ? 'একটি সংখ্যা দিন।' : 'Enter a number.'];
                }
                $n = $v + 0;
                if ($n < 0) {
                    return [null, $bn ? 'ঋণাত্মক হতে পারবে না।' : 'Cannot be negative.'];
                }
                if (str_ends_with($path, '_pct') && $n > 100) {
                    return [null, $bn ? '০ থেকে ১০০-এর মধ্যে দিন।' : 'Use 0–100.'];
                }

                return [$n, null];
            case 'bool':
                return [filter_var($v, FILTER_VALIDATE_BOOLEAN), null];
            case 'tr':
                $t = Field::cleanTr($v);
                if (($t['en'] ?? '') === '' && in_array($path, ['company.name', 'company.short_name'], true)) {
                    return [null, $bn ? 'ইংরেজি লেখা আবশ্যক।' : 'English text is required.'];
                }

                return [$t, null];
            case 'json':
                if (is_string($v)) {
                    $d = json_decode($v, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        return [null, $bn ? 'সঠিক JSON নয়।' : 'Invalid JSON.'];
                    }
                    $v = $d;
                }
                if ($path === 'payments.gateways' && is_array($v)) {
                    $v = array_map(fn ($x) => filter_var($x, FILTER_VALIDATE_BOOLEAN), $v);
                    if (! array_filter($v)) {
                        return [null, $bn ? 'অন্তত একটি পেমেন্ট মাধ্যম চালু রাখুন।' : 'Keep at least one payment method switched on.'];
                    }
                }

                return [self::clean($v), null];
            default:
                if (is_array($v)) {
                    return [null, $bn ? 'লেখা দিন।' : 'Enter text.'];
                }
                $s = trim((string) $v);
                if (mb_strlen($s) > 2000) {
                    return [null, $bn ? 'খুব দীর্ঘ।' : 'Too long.'];
                }
                if (str_ends_with($path, 'email') && $s !== '' && ! filter_var($s, FILTER_VALIDATE_EMAIL)) {
                    return [null, $bn ? 'সঠিক ইমেইল দিন।' : 'Enter a valid email.'];
                }
                if (str_ends_with($path, '_url') && $s !== '' && ! filter_var($s, FILTER_VALIDATE_URL)) {
                    return [null, $bn ? 'সঠিক ইউআরএল দিন।' : 'Enter a valid URL.'];
                }

                return [$s, null];
        }
    }

    /** Strip tags from every string inside a json value. */
    private static function clean(mixed $v): mixed
    {
        if (is_array($v)) {
            return array_map(fn ($x) => self::clean($x), $v);
        }

        return is_string($v) ? trim(strip_tags($v)) : $v;
    }

    /** "Clear website cache": purge every cached page on the public site now. */
    public function purge(Request $r): RedirectResponse
    {
        abort_unless($r->user()->can('settings.manage') || $r->user()->can('content.manage'), 403);
        $tags = array_values(array_filter((array) $r->input('tags', ['all']), 'is_string')) ?: ['all'];
        $res = app(Revalidator::class)->send($tags);
        activity('admin')->causedBy($r->user())->event('updated')->withProperties(['resource' => 'cache', 'title' => implode(', ', $tags), 'ok' => $res['ok'] ?? false])->log('revalidated');

        return back()->with(($res['ok'] ?? false) ? 'success' : 'error', ($res['ok'] ?? false) ? __('admin.purged') : __('admin.revalidate_failed', ['error' => $res['error'] ?? '']));
    }
}
