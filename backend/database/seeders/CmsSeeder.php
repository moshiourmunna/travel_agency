<?php

namespace Database\Seeders;

use App\Models\Destination;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\PageSection;
use App\Models\Translation;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;

/**
 * CMS content ported from the mockup: UI string dictionary (every label is admin-editable),
 * header/footer/mobile menus, and the home page as ordered, editable sections.
 */
class CmsSeeder extends Seeder
{
    private static function b(string $en, string $bn): array
    {
        return ['en' => $en, 'bn' => $bn];
    }

    /** "tours.html?region=bd" -> "/tours?region=bd" */
    public static function path(string $href): string
    {
        if (str_starts_with($href, 'http') || str_starts_with($href, '/')) {
            return $href;
        }
        [$p, $q] = array_pad(explode('?', $href, 2), 2, null);
        $p = preg_replace('/(index)?\.html$/', '', $p);

        return '/'.rtrim($p, '/').($q ? '?'.$q : '');
    }

    public function run(): void
    {
        $this->translations();
        $this->menus();
        $this->home();
    }

    private function translations(): void
    {
        $rows = json_decode(file_get_contents(database_path('seeders/data/ui.json')), true);
        $now = now();
        foreach (array_chunk($rows, 500) as $chunk) {
            Translation::upsert(array_map(fn ($r) => ['group' => 'ui', 'key' => $r['key'], 'value' => json_encode(['en' => $r['en'], 'bn' => $r['bn']], JSON_UNESCAPED_UNICODE),
                'created_at' => $now, 'updated_at' => $now], $chunk), ['group', 'key'], ['value', 'updated_at']);
        }
    }

    private function menu(string $location, array $name, array $items, ?int $parent = null, ?Menu $menu = null): Menu
    {
        $menu ??= Menu::updateOrCreate(['location' => $location], ['name' => $name]);
        if ($parent === null) {
            $menu->allItems()->delete();
        }
        foreach (array_values($items) as $i => $it) {
            $row = MenuItem::create(['menu_id' => $menu->id, 'parent_id' => $parent, 'label' => $it['label'], 'url' => isset($it['url']) ? self::path($it['url']) : null,
                'icon' => $it['icon'] ?? null, 'badge' => $it['badge'] ?? null, 'description' => $it['description'] ?? null, 'sort' => $i + 1, 'is_active' => true, 'new_tab' => $it['new_tab'] ?? false,
                'meta' => $it['meta'] ?? null]);
            if (! empty($it['children'])) {
                $this->menu($location, $name, $it['children'], $row->id, $menu);
            }
        }

        return $menu;
    }

    private function menus(): void
    {
        $b = fn ($en, $bn) => self::b($en, $bn);
        $l = fn (array $pairs) => array_map(fn ($p) => ['url' => $p[0], 'label' => is_array($p[1]) && isset($p[1]['en']) ? $p[1] : $b(...$p[1])], $pairs);

        // Tours mega menu: 3 columns from the mockup NAV_TOURS
        $mega = array_map(fn ($col) => ['label' => S::b($col[0]), 'children' => array_map(fn ($x) => ['url' => $x[0], 'label' => S::b($x[1])], $col[1])], S::public('NAV_TOURS'));
        $this->menu('mega-tours', $b('Tours mega menu', 'ট্যুর মেগা মেনু'), $mega);

        $this->menu('header', $b('Header', 'হেডার'), [
            ['label' => $b('Tours', 'ট্যুর'), 'url' => 'tours.html', 'meta' => ['mega' => 'tours']],
            ['label' => $b('Holidays', 'হলিডে'), 'url' => 'holidays.html', 'meta' => ['mega' => 'holidays']],
            ['label' => $b('Cruises', 'ক্রুজ'), 'url' => 'cruises.html'],
            ['label' => $b('Activities', 'অ্যাক্টিভিটি'), 'url' => 'activities.html', 'meta' => ['show_from' => 'xl']],
            ['label' => $b('Flights', 'ফ্লাইট'), 'url' => 'flights.html'],
            ['label' => $b('Hotels', 'হোটেল'), 'url' => 'hotels.html'],
            ['label' => $b('Visa', 'ভিসা'), 'url' => 'visa.html'],
            ['label' => $b('Destinations', 'গন্তব্য'), 'url' => 'destinations.html', 'meta' => ['show_from' => '2xl']],
            ['label' => $b('Offers', 'অফার'), 'url' => 'offers.html', 'meta' => ['dot' => true]],
            ['label' => $b('More', 'আরও'), 'children' => $l([['destinations.html', ['Destinations', 'গন্তব্য']], ['group-tours.html', ['Group & corporate', 'গ্রুপ ও কর্পোরেট']],
                ['custom-tour.html', ['Custom tour / quote', 'কাস্টম ট্যুর / কোটেশন']], ['insurance.html', ['Travel insurance', 'ভ্রমণ বিমা']], ['gift-cards.html', ['Gift cards', 'গিফট কার্ড']],
                ['compare.html', ['Compare packages', 'প্যাকেজ তুলনা']], ['blog.html', ['Travel blog', 'ট্রাভেল ব্লগ']], ['gallery.html', ['Gallery', 'গ্যালারি']], ['reviews.html', ['Reviews', 'রিভিউ']],
                ['about.html', ['About us', 'আমাদের সম্পর্কে']], ['contact.html', ['Contact', 'যোগাযোগ']]])],
        ]);
        $this->menu('mobile', $b('Mobile drawer', 'মোবাইল মেনু'), $l([['activities.html', ['Things to do', 'অ্যাক্টিভিটি']], ['trip-planner.html', ['Trip planner', 'ট্রিপ প্ল্যানার']],
            ['flights.html', ['Flights', 'ফ্লাইট']], ['hotels.html', ['Hotels', 'হোটেল']], ['visa.html', ['Visa services', 'ভিসা সেবা']], ['destinations.html', ['Destinations', 'গন্তব্য']],
            ['offers.html', ['Offers & deals', 'অফার ও ডিল']], ['group-tours.html', ['Group & corporate', 'গ্রুপ ও কর্পোরেট']], ['custom-tour.html', ['Custom tour / quote', 'কাস্টম ট্যুর / কোটেশন']],
            ['insurance.html', ['Travel insurance', 'ভ্রমণ বিমা']], ['gift-cards.html', ['Gift cards', 'গিফট কার্ড']], ['blog.html', ['Blog', 'ব্লগ']], ['about.html', ['About', 'আমাদের সম্পর্কে']],
            ['contact.html', ['Contact', 'যোগাযোগ']]]));
        $this->menu('footer-1', $b('Travel', 'ভ্রমণ'), $l([['tours.html', ['Tour packages', 'ট্যুর প্যাকেজ']], ['destinations.html', ['Destinations', 'গন্তব্য']], ['flights.html', ['Flights', 'ফ্লাইট']],
            ['hotels.html', ['Hotels', 'হোটেল']], ['visa.html', ['Visa services', 'ভিসা সেবা']], ['insurance.html', ['Travel insurance', 'ভ্রমণ বিমা']], ['offers.html', ['Offers', 'অফার']]]));
        $this->menu('footer-2', $b('Holidays', 'হলিডে'), $l([['holidays/honeymoon.html', ['Honeymoon', 'হানিমুন']], ['holidays/family.html', ['Family holidays', 'পারিবারিক ভ্রমণ']],
            ['holidays/adventure.html', ['Adventure', 'অ্যাডভেঞ্চার']], ['cruises.html', ['Cruises', 'ক্রুজ']], ['group-tours.html', ['Group & corporate', 'গ্রুপ ও কর্পোরেট']], ['gift-cards.html', ['Gift cards', 'গিফট কার্ড']]]));
        $this->menu('footer-3', $b('Company', 'প্রতিষ্ঠান'), $l([['about.html', ['About us', 'আমাদের সম্পর্কে']], ['team.html', ['Our team', 'আমাদের টিম']], ['careers.html', ['Careers', 'ক্যারিয়ার']],
            ['blog.html', ['Blog', 'ব্লগ']], ['gallery.html', ['Gallery', 'গ্যালারি']], ['reviews.html', ['Reviews', 'রিভিউ']], ['faq.html', ['FAQ', 'প্রশ্নোত্তর']], ['contact.html', ['Contact', 'যোগাযোগ']]]));
        $this->menu('legal', $b('Legal', 'আইনি'), $l([['terms.html', ['Terms', 'শর্তাবলি']], ['privacy.html', ['Privacy', 'গোপনীয়তা']], ['refund-policy.html', ['Refund policy', 'রিফান্ড নীতিমালা']],
            ['sitemap.html', ['Sitemap', 'সাইটম্যাপ']]]));
    }

    private function home(): void
    {
        $b = fn ($en, $bn) => self::b($en, $bn);
        $it = fn ($icon, $t, $d = null) => array_filter(['icon' => $icon, 'title' => $b(...$t), 'text' => $d ? $b(...$d) : null]);
        $page = Page::updateOrCreate(['slug' => 'home'], ['template' => 'home', 'title' => $b('Musafir — Tours, holidays, cruises, flights & visas from Bangladesh', 'মুসাফির — বাংলাদেশ থেকে ট্যুর, হলিডে, ক্রুজ, ফ্লাইট ও ভিসা'),
            'status' => 'published', 'published_at' => '2026-10-01']);
        $page->sections()->delete();
        $dest = Destination::pluck('id', 'slug');
        $ds = array_map(fn ($d) => $d['slug'], S::public('DESTINATIONS'));
        $sections = [
            ['hero', ['rating_text' => $b('4.9/5 from 8,400+ travellers', '৮,৪০০+ ভ্রমণকারীর রেটিং ৪.৯/৫'), 'rating' => 4.9,
                'title' => $b('See the world,', 'পৃথিবী দেখুন,'), 'title_accent' => $b('the Musafir way', 'মুসাফিরের চোখে'),
                'subtitle' => $b('Handpicked holidays, cruises, activities, flights and visas — planned in Dhaka with care, delivered to world standards.', 'বাছাই করা হলিডে, ক্রুজ, অ্যাক্টিভিটি, ফ্লাইট ও ভিসা — ঢাকায় যত্নে পরিকল্পিত, বিশ্বমানে পরিচালিত।'),
                'image_alt' => $b("Sunset over Cox's Bazar sea beach, Bangladesh", 'কক্সবাজার সমুদ্রসৈকতে সূর্যাস্ত, বাংলাদেশ'), 'bg_image_id' => S::asset('coxsbazar'), 'show_search' => true]],
            ['trust_strip', ['label' => $b('Why travellers trust us', 'কেন ভ্রমণকারীরা আমাদের বিশ্বাস করেন'), 'items' => [
                $it('shield-check', ['Tourism Board registered', 'ট্যুরিজম বোর্ডে নিবন্ধিত'], ['BTB-2214 · since 2012', 'BTB-২২১৪ · ২০১২ থেকে']),
                $it('badge-check', ['IATA accredited', 'আয়াটা স্বীকৃত'], ['ATAB · TOAB member', 'আটাব · টোয়াব সদস্য']),
                $it('wallet', ['Easy installments', 'সহজ কিস্তি'], ['bKash, Nagad, 0% EMI', 'বিকাশ, নগদ, ০% ইএমআই']),
                $it('headset', ['24/7 support', '২৪/৭ সাপোর্ট'], ['Before, during & after', 'যাত্রার আগে, পথে ও পরে']),
                $it('receipt', ['No hidden fees', 'কোনো লুকানো খরচ নেই'], ['All-in prices with VAT', 'ভ্যাটসহ পূর্ণ মূল্য'])]]],
            ['categories', ['eyebrow' => $b('Travel your way', 'আপনার মতো ভ্রমণ'), 'title' => $b('What kind of trip are you dreaming of?', 'কেমন ভ্রমণের স্বপ্ন দেখছেন?'), 'source' => 'categories']],
            ['destinations_bento', ['eyebrow' => $b('Featured destinations', 'বাছাইকৃত গন্তব্য'), 'title' => $b('Trending this season', 'এই মৌসুমে জনপ্রিয়'),
                'subtitle' => $b('From the longest sea beach on earth to Himalayan monasteries — places our travellers love right now.', 'পৃথিবীর দীর্ঘতম সমুদ্রসৈকত থেকে হিমালয়ের মঠ — যেসব জায়গা এখন আমাদের ভ্রমণকারীদের সবচেয়ে প্রিয়।'),
                'link' => ['url' => '/destinations', 'label' => $b('All destinations', 'সব গন্তব্য')], 'source' => 'destinations',
                'ids' => array_values(array_filter([$dest[$ds[0]] ?? null, $dest[$ds[4]] ?? null, $dest[$ds[5]] ?? null, $dest[$ds[1]] ?? null, $dest[$ds[6]] ?? null]))]],
            ['deals', ['eyebrow' => $b('Flash deals', 'ফ্ল্যাশ ডিল'), 'title' => $b('Limited-time offers', 'সীমিত সময়ের অফার'), 'countdown_to' => '2026-11-30T23:59:59+06:00', 'source' => 'offers', 'limit' => 10]],
            ['tours', ['eyebrow' => $b('Popular packages', 'জনপ্রিয় প্যাকেজ'), 'title' => $b('Most-loved tours this month', 'এ মাসের সবচেয়ে প্রিয় ট্যুর'), 'source' => 'tours', 'limit' => 8,
                'filters' => [['value' => 'all', 'label' => $b('All', 'সব')], ['value' => 'bd', 'label' => $b('Bangladesh', 'বাংলাদেশ')], ['value' => 'intl', 'label' => $b('International', 'আন্তর্জাতিক')],
                    ['value' => 'honeymoon', 'label' => $b('Honeymoon', 'হানিমুন')], ['value' => 'family', 'label' => $b('Family', 'পরিবার')]],
                'link' => ['url' => '/tours', 'label' => $b('Browse all :count tours', 'সব :countটি ট্যুর দেখুন')]]],
            ['themes', ['eyebrow' => $b('Holidays by theme', 'থিম অনুযায়ী হলিডে'), 'title' => $b('What kind of trip are you dreaming of?', 'কেমন ভ্রমণের স্বপ্ন দেখছেন?'),
                'link' => ['url' => '/holidays', 'label' => $b('All themes', 'সব থিম')], 'source' => 'themes', 'limit' => 6]],
            ['cruises', ['eyebrow' => $b('Cruises', 'ক্রুজ'), 'title' => $b('Set sail — meals, shows and ports included', 'পাল তুলুন — খাবার, শো ও বন্দর ভ্রমণসহ'),
                'subtitle' => $b('From a 2-night Ha Long Bay junk to 7 nights in the Greek Isles — we handle visas, flights to the port and onboard packages, with 0% EMI for 12 months.', '২ রাতের হা লং বে জাঙ্ক থেকে গ্রিক দ্বীপে ৭ রাত — ভিসা, বন্দর পর্যন্ত ফ্লাইট ও জাহাজের প্যাকেজ আমরাই সামলাই, সাথে ১২ মাসের ০% ইএমআই।'),
                'features' => [$it('utensils', ['All main meals', 'সব প্রধান খাবার']), $it('ticket', ['Shows & entertainment', 'শো ও বিনোদন']), $it('baby', ['Kids clubs', 'কিডস ক্লাব']), $it('stamp', ['Visa handled', 'ভিসা আমাদের দায়িত্বে'])],
                'primary' => ['url' => '/cruises', 'label' => $b('Explore cruises', 'ক্রুজ দেখুন')], 'secondary' => ['url' => '/trip-planner', 'label' => $b('Plan a custom trip', 'নিজের মতো ট্রিপ সাজান')],
                'bg_image_id' => S::asset('cruise'), 'source' => 'cruises', 'limit' => 4]],
            ['activities', ['eyebrow' => $b('Things to do', 'যা যা করবেন'), 'title' => $b('Activities & experiences', 'অ্যাক্টিভিটি ও অভিজ্ঞতা'),
                'subtitle' => $b('Day tours, tickets and once-in-a-lifetime moments — instant confirmation, free cancellation on most.', 'ডে-ট্যুর, টিকিট আর জীবনে একবারের অভিজ্ঞতা — তাৎক্ষণিক নিশ্চিতকরণ, বেশিরভাগেই ফ্রি বাতিল।'),
                'link' => ['url' => '/activities', 'label' => $b('All activities', 'সব অ্যাক্টিভিটি')], 'source' => 'activities', 'limit' => 8]],
            ['trust_safety', ['eyebrow' => $b('Trust & safety', 'আস্থা ও নিরাপত্তা'), 'title' => $b('Book with total peace of mind', 'নিশ্চিন্তে বুক করুন'),
                'subtitle' => $b('Your money is protected, your plans are flexible and a real person answers 24/7 — before, during and after your trip.', 'আপনার টাকা সুরক্ষিত, পরিকল্পনা নমনীয়, আর যাত্রার আগে, পথে ও পরে ২৪/৭ একজন মানুষ উত্তর দেন।'),
                'badges' => ['IATA', 'ATAB', 'TOAB', 'BTB-2214', 'PCI-DSS'], 'items' => [
                    $it('lock', ['Secure payments', 'নিরাপদ পেমেন্ট'], ['SSLCommerz, bKash & Nagad with 3-D Secure. We never store card numbers.', '৩-ডি সিকিউরসহ এসএসএলকমার্জ, বিকাশ ও নগদ। আমরা কার্ড নম্বর সংরক্ষণ করি না।']),
                    $it('rotate-ccw', ['Free cancellation', 'ফ্রি বাতিল'], ['Clear badges on every trip: free, partial or non-refundable — no surprises.', 'প্রতিটি ট্রিপে স্পষ্ট ব্যাজ: ফ্রি, আংশিক বা অফেরতযোগ্য — কোনো চমক নেই।']),
                    $it('badge-check', ['Verified partners', 'যাচাইকৃত পার্টনার'], ['Every hotel, guide and operator is vetted and re-rated after each trip.', 'প্রতিটি হোটেল, গাইড ও অপারেটর যাচাই করা এবং প্রতি ট্রিপের পর পুনর্মূল্যায়িত।']),
                    $it('siren', ['24/7 emergency line', '২৪/৭ জরুরি লাইন'], ['Medical, lost passport or missed flight — one call and we take over.', 'অসুস্থতা, পাসপোর্ট হারানো বা ফ্লাইট মিস — এক কলেই আমরা দায়িত্ব নিই।'])]]],
            ['services', ['eyebrow' => $b('One agency, every need', 'এক এজেন্সিতে সব সেবা'), 'title' => $b('Everything for your journey', 'আপনার যাত্রার সবকিছু'), 'items' => [
                ['url' => '/flights', 'color' => 'sky'] + $it('plane', ['Air tickets', 'এয়ার টিকেট'], ['500+ airlines, instant e-ticket, date change support.', '৫০০+ এয়ারলাইন, তাৎক্ষণিক ই-টিকেট, তারিখ পরিবর্তনে সহায়তা।']),
                ['url' => '/hotels', 'color' => 'violet'] + $it('bed-double', ['Hotels & resorts', 'হোটেল ও রিসোর্ট'], ['From Sajek cottages to Maldives water villas — best-price guarantee.', 'সাজেকের কটেজ থেকে মালদ্বীপের ওয়াটার ভিলা — সেরা দামের নিশ্চয়তা।']),
                ['url' => '/visa', 'color' => 'amber'] + $it('stamp', ['Visa processing', 'ভিসা প্রসেসিং'], ['Checklists, appointments and status tracking for 40+ countries.', '৪০+ দেশের চেকলিস্ট, অ্যাপয়েন্টমেন্ট ও স্ট্যাটাস ট্র্যাকিং।']),
                ['url' => '/insurance', 'color' => 'emerald'] + $it('shield-plus', ['Travel insurance', 'ভ্রমণ বিমা'], ['Medical, baggage and trip-cancellation cover from ৳450.', 'মেডিকেল, ব্যাগেজ ও ট্রিপ-বাতিল কভার ৳৪৫০ থেকে।']),
                ['url' => '/group-tours', 'color' => 'rose'] + $it('building-2', ['Group & corporate', 'গ্রুপ ও কর্পোরেট'], ['Retreats, MICE, study tours and family reunions.', 'রিট্রিট, মাইস, শিক্ষা সফর ও পারিবারিক পুনর্মিলনী।']),
                ['url' => '/custom-tour', 'color' => 'brand'] + $it('wand-sparkles', ['Tailor-made trips', 'নিজের মতো ট্যুর'], ['Tell us your dates and budget — get a plan in 24 hours.', 'তারিখ ও বাজেট জানান — ২৪ ঘণ্টায় পরিকল্পনা পান।'])]]],
            ['why_us', ['eyebrow' => $b('Why Musafir', 'কেন মুসাফির'), 'title' => $b('Local heart. Global standards.', 'দেশীয় আন্তরিকতা, বিশ্বমানের সেবা।'),
                'subtitle' => $b('We are a licensed Bangladeshi agency with our own teams in Dhaka, Bangkok and Istanbul — so you are never handed off to a stranger.', 'আমরা ঢাকা, ব্যাংকক ও ইস্তাম্বুলে নিজস্ব টিমসহ লাইসেন্সপ্রাপ্ত বাংলাদেশি এজেন্সি — তাই আপনাকে কখনো অচেনা কারো হাতে ছেড়ে দেওয়া হয় না।'),
                'award' => ['title' => $b('Best Tour Operator 2025', 'সেরা ট্যুর অপারেটর ২০২৫'), 'text' => $b('Bangladesh Travel & Tourism Awards', 'বাংলাদেশ ট্রাভেল অ্যান্ড ট্যুরিজম অ্যাওয়ার্ডস')],
                'gallery_image_ids' => S::assets(['cappadocia', 'srilanka', 'sundarbans']),
                'gallery_alts' => [$b('Hot-air balloons over Cappadocia', 'কাপাদোকিয়ায় হট-এয়ার বেলুন'), $b('Sigiriya rock, Sri Lanka', 'সিগিরিয়া রক, শ্রীলঙ্কা'), $b('Boat in the Sundarbans', 'সুন্দরবনে নৌকা')],
                'items' => [$it('badge-percent', ['Best-price promise', 'সেরা দামের প্রতিশ্রুতি'], ['Found it cheaper? We match it.', 'অন্য কোথাও কম পেলে আমরা মিলিয়ে দেব।']),
                    $it('hand-heart', ['Travel your way', 'আপনার মতো ভ্রমণ'], ['Any diet, accessible rooms, flexible pacing.', 'যেকোনো খাদ্যাভ্যাস, সহজগম্য রুম, নিজের গতিতে ভ্রমণ।']),
                    $it('smartphone', ['Everything in one app', 'সব এক অ্যাপে'], ['Tickets, vouchers, live updates.', 'টিকিট, ভাউচার, লাইভ আপডেট।']),
                    $it('life-buoy', ['On-trip assistance', 'ভ্রমণকালীন সহায়তা'], ['Local reps and a 24/7 hotline.', 'স্থানীয় প্রতিনিধি ও ২৪/৭ হটলাইন।'])],
                'source' => 'stats']],
            ['how_it_works', ['eyebrow' => $b('Simple & transparent', 'সহজ ও স্বচ্ছ'), 'title' => $b('Book in four easy steps', 'চারটি সহজ ধাপে বুকিং'), 'items' => [
                $it('search', ['Choose', 'বাছাই করুন'], ['Browse packages or request a custom plan.', 'প্যাকেজ দেখুন বা কাস্টম প্ল্যান চান।']),
                $it('calendar-check', ['Pick dates', 'তারিখ ঠিক করুন'], ['See live prices for your dates and group.', 'আপনার তারিখ ও দলের জন্য লাইভ মূল্য দেখুন।']),
                $it('credit-card', ['Pay securely', 'নিরাপদে পরিশোধ'], ['Deposit by bKash, Nagad, card or EMI.', 'বিকাশ, নগদ, কার্ড বা ইএমআইতে অগ্রিম দিন।']),
                $it('plane-takeoff', ['Fly happy', 'নিশ্চিন্তে উড়ুন'], ['Vouchers, visa and 24/7 support — sorted.', 'ভাউচার, ভিসা ও ২৪/৭ সাপোর্ট — সব প্রস্তুত।'])]]],
            ['testimonials', ['eyebrow' => $b('Testimonials', 'প্রশংসাপত্র'), 'title' => $b('Stories from our travellers', 'আমাদের ভ্রমণকারীদের গল্প'),
                'platforms' => [['name' => 'Google', 'rating' => 4.9, 'count' => 3214], ['name' => 'Facebook', 'rating' => 4.8, 'count' => 4102], ['name' => 'Trustpilot', 'rating' => 4.7, 'count' => 1105]],
                'link' => ['url' => '/reviews', 'label' => $b('Read all reviews', 'সব রিভিউ পড়ুন')], 'source' => 'reviews', 'limit' => 3]],
            ['partners', ['title' => $b('Ticketing partner of 500+ airlines, including', '৫০০+ এয়ারলাইনের টিকেটিং পার্টনার, যার মধ্যে রয়েছে'), 'label' => $b('Airline partners', 'এয়ারলাইন পার্টনার'), 'source' => 'airlines', 'limit' => 20]],
            ['blog', ['eyebrow' => $b('Travel journal', 'ট্রাভেল জার্নাল'), 'title' => $b('Guides & inspiration', 'গাইড ও অনুপ্রেরণা'), 'link' => ['url' => '/blog', 'label' => $b('Visit the blog', 'ব্লগে যান')], 'source' => 'posts', 'limit' => 3]],
            ['app_promo', ['eyebrow' => $b('Musafir app', 'মুসাফির অ্যাপ'), 'title' => $b('Your whole trip, in your pocket', 'পুরো ভ্রমণ আপনার হাতের মুঠোয়'),
                'subtitle' => $b('E-tickets offline, live flight alerts, day-by-day itineraries, local tips and an SOS button that reaches our 24/7 desk.', 'অফলাইনে ই-টিকিট, লাইভ ফ্লাইট অ্যালার্ট, দিনভিত্তিক ভ্রমণসূচি, স্থানীয় টিপস এবং ২৪/৭ ডেস্কে পৌঁছানোর এসওএস বাটন।'),
                'features' => [$b('App-only fares up to 8% off', 'অ্যাপে বিশেষ ভাড়া, ৮% পর্যন্ত ছাড়'), $b('Musafir Miles on every booking', 'প্রতি বুকিংয়ে মুসাফির মাইলস'), $b('Document wallet', 'ডকুমেন্ট ওয়ালেট'), $b('Group chat with your guide', 'গাইডের সাথে গ্রুপ চ্যাট')],
                'play_url' => '', 'appstore_url' => '', 'phone_image_id' => S::asset('maldives'),
                'phone' => ['greeting' => $b('Hi, Rahim 👋', 'হ্যালো, রহিম 👋'), 'trip' => $b('Maldives · in 12 days', 'মালদ্বীপ · ১২ দিন পর'), 'flight' => '✈ BS 325 · DAC → MLE · 10:40']]],
            ['faq', ['eyebrow' => $b('FAQ', 'প্রশ্নোত্তর'), 'title' => $b('Questions, answered', 'আপনার প্রশ্নের উত্তর'),
                'subtitle' => $b("Can't find what you need? Our travel experts are a call or message away.", 'যা খুঁজছেন পাচ্ছেন না? আমাদের ট্রাভেল এক্সপার্টরা একটি কল বা মেসেজ দূরে।'),
                'link' => ['url' => '/faq', 'label' => $b('All FAQs', 'সব প্রশ্নোত্তর')], 'source' => 'faqs', 'limit' => 6]],
        ];
        foreach ($sections as $i => [$type, $data]) {
            PageSection::create(['page_id' => $page->id, 'type' => $type, 'sort' => ($i + 1) * 10, 'is_active' => true, 'data' => $data]);
        }
    }
}
