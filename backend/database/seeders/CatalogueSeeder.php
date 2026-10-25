<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Airline;
use App\Models\Airport;
use App\Models\CancellationPolicy;
use App\Models\Category;
use App\Models\Country;
use App\Models\Coupon;
use App\Models\Cruise;
use App\Models\CruiseLine;
use App\Models\Destination;
use App\Models\FlightOffer;
use App\Models\GiftCardDesign;
use App\Models\Hotel;
use App\Models\InsurancePlan;
use App\Models\Offer;
use App\Models\PlannerCost;
use App\Models\Ship;
use App\Models\Theme;
use App\Models\Tour;
use App\Models\TourAddon;
use App\Models\VisaDocumentSet;
use App\Models\VisaProduct;
use Carbon\CarbonImmutable;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Destinations, themes, tours, cruises, activities, hotels, flights, visas, insurance, gift cards, offers, coupons, planner costs. */
class CatalogueSeeder extends Seeder
{
    private const DEST_GEO = [
        'coxs-bazar' => [21.4272, 92.0058, 'BD'], 'sajek-valley' => [23.3820, 92.2938, 'BD'], 'sylhet' => [24.8949, 91.8687, 'BD'], 'sundarbans' => [21.9497, 89.1833, 'BD'],
        'maldives' => [3.2028, 73.2207, 'MV'], 'turkey' => [41.0082, 28.9784, 'TR'], 'bali' => [-8.3405, 115.0920, 'ID'], 'dubai' => [25.2048, 55.2708, 'AE'],
        'nepal' => [28.2096, 83.9856, 'NP'], 'thailand' => [7.8804, 98.3923, 'TH'], 'bhutan' => [27.4728, 89.6390, 'BT'], 'singapore-malaysia' => [1.3521, 103.8198, 'SG'],
    ];

    private const VISA_ISO = ['thailand' => 'TH', 'malaysia' => 'MY', 'singapore' => 'SG', 'uae' => 'AE', 'vietnam' => 'VN', 'turkey' => 'TR', 'india' => 'IN', 'schengen' => 'EU', 'japan' => 'JP', 'egypt' => 'EG'];

    private const TOUR_COUNTRY = ['kashmir-paradise' => 'IN', 'egypt-wonders' => 'EG', 'srilanka-culture' => 'LK'];

    public function run(): void
    {
        $policies = CancellationPolicy::pluck('id', 'code');
        $countries = Country::pluck('id', 'iso2');
        $categories = Category::pluck('id', 'slug');

        // Destinations
        foreach (S::public('DESTINATIONS') as $i => $d) {
            [$lat, $lng, $iso] = self::DEST_GEO[$d['slug']] ?? [null, null, null];
            Destination::updateOrCreate(['slug' => $d['slug']], [
                'country_id' => $countries[$iso] ?? null, 'region' => $d['region'], 'name' => S::b($d['name']), 'country_name' => S::b($d['country']),
                'description' => S::b($d['desc']), 'best_time' => S::b($d['best']), 'visa_info' => S::b($d['visa']), 'currency' => $d['cur'], 'flight_time' => S::b($d['fly']),
                'things_to_do' => S::bl($d['things']), 'lat' => $lat, 'lng' => $lng, 'image_id' => S::asset($d['img']), 'gallery' => S::assets([$d['img']]),
                'tours_count_display' => $d['tours'], 'status' => 'published', 'is_featured' => true, 'sort' => $i + 1,
            ]);
        }
        $destIds = Destination::pluck('id', 'slug');
        $tourDest = [];
        foreach (S::public('DEST_TOURS') as $dest => $tours) {
            foreach ($tours as $slug) {
                $tourDest[$slug] ??= $dest;
            }
        }
        foreach (S::public('PLAN_COST') as $slug => [$land, $air]) {
            if (isset($destIds[$slug])) {
                PlannerCost::updateOrCreate(['destination_id' => $destIds[$slug]], ['cost_per_day_standard' => $land, 'cost_per_day_premium' => round($land * 1.6), 'flight_estimate' => $air]);
            }
        }

        // Themes
        foreach (S::public('THEMES') as $i => $t) {
            Theme::updateOrCreate(['slug' => $t['slug']], [
                'category_slug' => $t['cat'], 'icon' => $t['icon'], 'name' => S::b($t['name']), 'tagline' => S::b($t['tag']), 'perks' => S::bl($t['perks']),
                'image_id' => S::asset($t['img']), 'status' => 'published', 'is_featured' => true, 'sort' => $i + 1,
            ]);
        }

        // Tours (+ derived data captured from the mockup builder: departures, inclusions, itinerary text, overview, route stops)
        foreach (S::public('TOURS') as $i => $x) {
            $page = S::page("tours/{$x['slug']}.html");
            $en = $page['ctx']['en'];
            $bnStops = $page['ctx']['bn']['stops'] ?? [];
            $tour = Tour::updateOrCreate(['slug' => $x['slug']], [
                'destination_id' => isset($tourDest[$x['slug']]) ? $destIds[$tourDest[$x['slug']]] : null,
                'cancellation_policy_id' => $policies[$x['cancel']] ?? null, 'region' => $x['region'], 'title' => S::b($x['title']),
                'location' => S::b($x['dest']), 'country_name' => S::b($x['country']), 'summary' => S::b(['en' => $x['hl'][0]['en'] ?? '', 'bn' => $x['hl'][0]['bn'] ?? '']),
                'description' => S::b($en['overview']), 'highlights' => S::bl($x['hl']), 'inclusions' => S::bl($en['incl']), 'exclusions' => S::bl($en['excl']),
                'route_stops' => array_map(fn ($s, $k) => ['en' => $s, 'bn' => $bnStops[$k] ?? $s], $en['stops'], array_keys($en['stops'])),
                'days' => $x['days'], 'nights' => $x['nights'], 'group_size' => $x['group'], 'price_from' => $x['price'], 'price_was' => $x['old'],
                'badge' => S::b($x['badge']), 'includes_flight' => (bool) $x['flight'], 'includes_visa' => (bool) $x['visa'],
                'rating' => $x['rating'], 'reviews_count' => $x['reviews'], 'booked_this_week' => 38,
                'image_id' => S::asset($x['img']), 'gallery' => S::assets(array_merge($x['gallery'], [$x['img'], 'resort', 'hotelroom', 'plane'])),
                'status' => 'published', 'is_featured' => $i < 8, 'sort' => $i + 1,
            ]);
            $tour->categories()->sync(array_values(array_filter(array_map(fn ($c) => $categories[$c] ?? null, $x['cats']))));
            $tour->itinerary()->delete();
            foreach ($en['itin'] as $n => $day) {
                $tour->itinerary()->create([
                    'day_no' => $n + 1, 'title' => S::b($day['t']), 'body' => S::b($day['d']),
                    'meals' => $n === 0 ? ['dinner'] : ['breakfast', 'dinner'],
                    'stay' => $n + 1 < count($en['itin']) ? ['en' => 'Overnight at the hotel', 'bn' => 'হোটেলে রাত্রিযাপন'] : null,
                ]);
            }
            $tour->departures()->delete();
            foreach ($en['deps'] as $d) {
                $tour->departures()->create(['date' => $d['d'], 'return_date' => $d['r'], 'seats_total' => 20, 'seats_held' => 20 - $d['s'], 'price' => $d['p'], 'status' => $d['s'] <= 4 ? 'guaranteed' : 'open']);
            }
            $tour->priceTiers()->delete();
            foreach ([['twin', 'Twin sharing', 'দুজনের রুম', 1], ['triple', 'Triple sharing (−6%)', 'তিনজনের রুম (−৬%)', 0.94], ['single', 'Single room (+35%)', 'একক রুম (+৩৫%)', 1.35]] as $k => [$code, $len, $lbn, $f]) {
                $tour->priceTiers()->create(['code' => $code, 'label' => ['en' => $len, 'bn' => $lbn], 'factor' => $f, 'sort' => $k]);
            }
        }
        TourAddon::updateOrCreate(['tour_id' => null, 'code' => 'insurance'], ['label' => ['en' => 'Travel insurance', 'bn' => 'ভ্রমণ বিমা'], 'price' => 1200, 'per' => 'booking']);
        TourAddon::updateOrCreate(['tour_id' => null, 'code' => 'pickup'], ['label' => ['en' => 'Airport pickup in Dhaka', 'bn' => 'ঢাকায় এয়ারপোর্ট পিকআপ'], 'price' => 1800, 'per' => 'booking']);

        // Cruises
        foreach (S::public('CRUISES') as $i => $c) {
            $line = CruiseLine::firstOrCreate(['slug' => Str::slug($c['line'])], ['name' => $c['line']]);
            $ship = Ship::firstOrCreate(['slug' => Str::slug($c['ship'])], ['name' => $c['ship'], 'cruise_line_id' => $line->id]);
            $page = S::page("cruises/{$c['slug']}.html");
            $portDays = $page['ctx']['en']['port_days'] ?? [];
            $cruise = Cruise::updateOrCreate(['slug' => $c['slug']], [
                'ship_id' => $ship->id, 'cancellation_policy_id' => $policies[$c['cancel']] ?? null, 'region' => $c['region'], 'title' => S::b($c['title']),
                'description' => ['en' => "{$c['nights']}-night cruise on {$c['ship']} ({$c['line']}) from {$c['port']['en']}.", 'bn' => "{$c['port']['bn']} থেকে {$c['ship']}-এ {$c['nights']} রাতের ক্রুজ।"],
                'nights' => $c['nights'], 'depart_port' => S::b($c['port']), 'route' => S::bl($c['ports']), 'cabin_from' => S::b($c['cabin']), 'highlights' => S::bl($c['hl']),
                'price_from' => $c['price'], 'price_was' => $c['old'], 'badge' => S::b($c['badge'] ?? null), 'rating' => $c['rating'], 'reviews_count' => $c['reviews'],
                'next_departure' => $c['depart'], 'image_id' => S::asset($c['img']), 'gallery' => S::assets([$c['img'], 'cruise', 'resort', 'hotelroom']),
                'status' => 'published', 'is_featured' => true, 'sort' => $i + 1,
            ]);
            $cruise->cabins()->delete();
            foreach ([['inside', 'Inside', 'ইনসাইড', 0.82], ['ocean', 'Ocean view', 'ওশান ভিউ', 1.0], ['balcony', 'Balcony', 'ব্যালকনি', 1.28]] as $k => [$code, $len, $lbn, $f]) {
                $cruise->cabins()->create(['code' => $code, 'name' => ['en' => $len, 'bn' => $lbn], 'price' => round($c['price'] * $f), 'capacity' => 2, 'sort' => $k]);
            }
            $cruise->portsOfCall()->delete();
            foreach ($c['ports'] as $k => $port) {
                $cruise->portsOfCall()->create(['day_no' => $portDays[$k] ?? $k + 1, 'port' => S::b($port)]);
            }
            $cruise->sailings()->delete();
            $start = CarbonImmutable::parse($c['depart']);
            foreach (range(0, 3) as $k) {
                $d = $start->addDays(14 * $k);
                $cruise->sailings()->create(['date' => $d, 'return_date' => $d->addDays($c['nights']), 'price' => $c['price'] + ($k % 2 ? 2500 : 0), 'seats_total' => 40, 'seats_held' => [28, 12, 5, 0][$k]]);
            }
        }

        // Activities
        $actDest = S::public('ACT_DEST');
        foreach (S::public('ACTIVITIES') as $i => $a) {
            $page = S::page("activities/{$a['slug']}.html");
            $slots = $page['ctx']['en']['slots'] ?? ['09:00', '13:00', '16:00'];
            $gal = $page['ctx']['en']['gal'] ?? [];
            $act = Activity::updateOrCreate(['slug' => $a['slug']], [
                'destination_id' => isset($actDest[$a['slug']]) ? ($destIds[$actDest[$a['slug']]] ?? null) : null,
                'cancellation_policy_id' => $policies[$a['cancel']] ?? null, 'category' => $a['cat'], 'region' => $a['region'], 'title' => S::b($a['title']),
                'city' => S::b($a['city']), 'duration_text' => S::b($a['dur']), 'languages' => $a['langs'], 'pickup' => (bool) $a['pickup'], 'instant_confirm' => (bool) $a['instant'],
                'highlights' => S::bl($a['hl']),
                'inclusions' => [['en' => 'Licensed guide or operator', 'bn' => 'লাইসেন্সপ্রাপ্ত গাইড বা অপারেটর'], ['en' => 'All entry fees listed above', 'bn' => 'উপরে উল্লেখিত সব প্রবেশ ফি'], ['en' => 'Insurance during the activity', 'bn' => 'অ্যাক্টিভিটি চলাকালীন বিমা']],
                'description' => ['en' => implode('; ', array_column($a['hl'], 'en')).'.', 'bn' => implode('; ', array_column($a['hl'], 'bn')).'।'],
                'price' => $a['price'], 'price_was' => $a['old'], 'badge' => S::b($a['badge'] ?? null), 'rating' => $a['rating'], 'reviews_count' => $a['reviews'],
                'image_id' => S::asset($a['img']), 'gallery' => S::assets(array_merge([$a['img']], $gal)), 'status' => 'published', 'is_featured' => $i < 8, 'sort' => $i + 1,
            ]);
            $act->options()->delete();
            $act->options()->create(['name' => ['en' => 'Standard', 'bn' => 'স্ট্যান্ডার্ড'], 'price' => $a['price'], 'child_price' => round($a['price'] * 0.7)]);
            $act->slots()->delete();
            $day = CarbonImmutable::parse('2026-10-26');
            foreach (range(0, 59) as $n) {
                foreach ($slots as $k => $time) {
                    $act->slots()->create(['starts_at' => $day->addDays($n)->setTimeFromTimeString($time), 'capacity' => 20, 'booked' => ($n * 7 + $k * 3) % 18]);
                }
            }
        }

        // Hotels
        foreach (S::public('HOTELS') as $i => $h) {
            $page = S::page("hotels/{$h['slug']}.html");
            $ctx = $page['ctx']['en'];
            $destSlug = collect(S::public('DESTINATIONS'))->first(fn ($d) => str_contains(strtolower($h['city']['en']), strtolower(explode(' ', $d['name']['en'])[0])))['slug'] ?? null;
            $hotel = Hotel::updateOrCreate(['slug' => $h['slug']], [
                'destination_id' => $destSlug ? ($destIds[$destSlug] ?? null) : null, 'kind' => $h['kind'], 'name' => S::b($h['name']), 'city' => S::b($h['city']),
                'description' => S::b($ctx['about']), 'stars' => $h['stars'], 'distance_text' => S::b($h['dist']), 'amenities' => $h['amen'], 'refundable' => (bool) $h['refundable'],
                'breakfast' => (bool) $h['breakfast'], 'price_from' => $h['price'], 'price_was' => $h['old'], 'guest_score' => $h['rating'], 'reviews_count' => $h['reviews'],
                'image_id' => S::asset($h['img']), 'gallery' => S::assets($ctx['gallery']), 'status' => 'published', 'is_featured' => true, 'sort' => $i + 1,
            ]);
            $hotel->roomTypes()->delete();
            foreach ($ctx['rooms'] as $k => $r) {
                $hotel->roomTypes()->create([
                    'name' => S::b($r['name']), 'bed' => S::b($r['bed']), 'max_adults' => min(2, $r['occ']), 'max_children' => max(0, $r['occ'] - 2), 'size_sqm' => $r['size'],
                    'price' => $r['price'], 'breakfast' => (bool) $r['bf'], 'refundable' => (bool) $r['ref'], 'sort' => $k,
                    'features' => ['image' => $r['img'], 'rooms_left' => $r['left'], 'occupancy' => $r['occ']],
                ]);
            }
        }

        // Airlines, airports, flight offers
        foreach (S::public('AIRLINES') as [$code, $name, $color]) {
            Airline::updateOrCreate(['code' => $code], ['name' => $name, 'color' => $color]);
        }
        $airports = [
            'DAC' => ['Hazrat Shahjalal International', 'হযরত শাহজালাল আন্তর্জাতিক', 'Dhaka', 'ঢাকা', 'BD'], 'CGP' => ['Shah Amanat International', 'শাহ আমানত আন্তর্জাতিক', 'Chattogram', 'চট্টগ্রাম', 'BD'],
            'CXB' => ["Cox's Bazar Airport", 'কক্সবাজার বিমানবন্দর', "Cox's Bazar", 'কক্সবাজার', 'BD'], 'ZYL' => ['Osmani International', 'ওসমানী আন্তর্জাতিক', 'Sylhet', 'সিলেট', 'BD'],
            'DXB' => ['Dubai International', 'দুবাই আন্তর্জাতিক', 'Dubai', 'দুবাই', 'AE'], 'KTM' => ['Tribhuvan International', 'ত্রিভুবন আন্তর্জাতিক', 'Kathmandu', 'কাঠমান্ডু', 'NP'],
            'MLE' => ['Velana International', 'ভেলানা আন্তর্জাতিক', 'Malé', 'মালে', 'MV'], 'KUL' => ['Kuala Lumpur International', 'কুয়ালালামপুর আন্তর্জাতিক', 'Kuala Lumpur', 'কুয়ালালামপুর', 'MY'],
            'SIN' => ['Changi', 'চাঙ্গি', 'Singapore', 'সিঙ্গাপুর', 'SG'], 'BKK' => ['Suvarnabhumi', 'সুবর্ণভূমি', 'Bangkok', 'ব্যাংকক', 'TH'],
            'IST' => ['Istanbul Airport', 'ইস্তাম্বুল বিমানবন্দর', 'Istanbul', 'ইস্তাম্বুল', 'TR'], 'LHR' => ['Heathrow', 'হিথ্রো', 'London', 'লন্ডন', null],
            'CCU' => ['Netaji Subhas Chandra Bose International', 'নেতাজি সুভাষ চন্দ্র বসু আন্তর্জাতিক', 'Kolkata', 'কলকাতা', 'IN'],
            'DOH' => ['Hamad International', 'হামাদ আন্তর্জাতিক', 'Doha', 'দোহা', 'QA'], 'RUH' => ['King Khalid International', 'কিং খালিদ আন্তর্জাতিক', 'Riyadh', 'রিয়াদ', 'SA'],
        ];
        foreach ($airports as $iata => [$nen, $nbn, $cen, $cbn, $iso]) {
            Airport::updateOrCreate(['iata' => $iata], ['name' => ['en' => $nen, 'bn' => $nbn], 'city' => ['en' => $cen, 'bn' => $cbn], 'country_id' => $iso ? ($countries[$iso] ?? null) : null, 'is_popular' => ! in_array($iata, ['DOH', 'RUH'], true)]);
        }
        $airlineIds = Airline::pluck('id', 'code');
        FlightOffer::query()->delete();
        $dur = fn (string $s) => (int) (preg_match('/(\d+)h\s*(\d+)m/', $s, $m) ? $m[1] * 60 + $m[2] : 0);
        foreach (S::public('FLIGHTS') as $f) {
            FlightOffer::create(['airline_id' => $airlineIds[$f['code']], 'origin' => 'DAC', 'destination' => 'DXB', 'flight_no' => $f['no'], 'dep_time' => $f['dep'], 'arr_time' => $f['arr'],
                'duration_min' => $dur($f['dur']['en']), 'stops' => $f['stops'], 'via' => isset($f['via']) ? [$f['via']] : null, 'fare' => $f['price'], 'baggage' => $f['bag'], 'refundable' => $f['refundable'], 'seats' => $f['seats']]);
        }
        $routes = [ // origin, dest, base fare (mockup "popular routes"), base minutes, carriers
            ['DAC', 'MLE', 31900, 230, ['BS', 'UL', 'BG']], ['DAC', 'KUL', 24500, 255, ['BS', 'BG', 'SQ']], ['DAC', 'BKK', 21800, 155, ['BG', 'BS', 'TK']],
            ['DAC', 'CXB', 5499, 65, ['BS', 'BG']], ['DAC', 'IST', 71500, 560, ['TK', 'QR', 'EK']], ['DAC', 'SIN', 29900, 250, ['SQ', 'BS', 'BG']],
            ['CGP', 'DXB', 36200, 330, ['BS', 'G9', 'BG']], ['DAC', 'KTM', 14900, 75, ['BS', 'BG']], ['DAC', 'CCU', 9800, 55, ['BS', 'BG']],
            ['DAC', 'CGP', 4299, 55, ['BS', 'BG']], ['DAC', 'ZYL', 3999, 45, ['BS', 'BG']], ['DAC', 'LHR', 98500, 690, ['BG', 'EK', 'QR']],
        ];
        $times = [['07:40', 0], ['13:15', 0], ['21:05', 1]];
        foreach ($routes as [$o, $d, $fare, $mins, $carriers]) {
            foreach ($carriers as $k => $code) {
                [$dep, $stops] = $times[$k % 3];
                $m = $mins + ($stops ? 150 : 0);
                $arr = CarbonImmutable::parse("2026-12-12 {$dep}")->addMinutes($m)->format('H:i');
                FlightOffer::create(['airline_id' => $airlineIds[$code], 'origin' => $o, 'destination' => $d, 'flight_no' => $code.' '.(100 + crc32($o.$d.$code) % 800),
                    'dep_time' => $dep, 'arr_time' => $arr, 'duration_min' => $m, 'stops' => $stops, 'via' => $stops ? ['DXB'] : null, 'fare' => $fare + $k * round($fare * 0.08),
                    'baggage' => $mins < 90 ? '20 kg' : '30 kg', 'refundable' => $k !== 1, 'seats' => 4 + ($k * 3)]);
            }
        }

        // Visa
        foreach (S::public('VISA_DOCS') as $k => $items) {
            $names = ['general' => ['All applicants', 'সব আবেদনকারী'], 'job' => ['Job holders', 'চাকরিজীবী'], 'business' => ['Business owners', 'ব্যবসায়ী'], 'student' => ['Students', 'শিক্ষার্থী']][$k] ?? [$k, $k];
            VisaDocumentSet::updateOrCreate(['code' => $k], ['name' => ['en' => $names[0], 'bn' => $names[1]], 'items' => S::bl($items), 'sort' => array_search($k, array_keys(S::public('VISA_DOCS')), true)]);
        }
        foreach (S::public('VISAS') as $i => $v) {
            VisaProduct::updateOrCreate(['slug' => $v['slug']], [
                'country_id' => $countries[self::VISA_ISO[$v['slug']] ?? ''] ?? null, 'country_name' => S::b($v['country']), 'flag' => $v['flag'], 'type' => S::b($v['vtype']),
                'processing' => S::b($v['days']), 'fee' => $v['fee'], 'fee_breakdown' => self::visaFees((int) $v['fee']), 'validity' => S::b($v['validity']), 'stay' => S::b($v['stay']), 'entry' => S::b($v['entry']),
                'extra_documents' => S::bl($v['docs_extra']), 'image_id' => S::asset($v['img']), 'status' => 'published', 'is_featured' => $i < 6, 'sort' => $i + 1,
            ]);
        }

        // Insurance plans (mockup insurance page)
        $plans = [
            ['asia-basic', 'Asia Basic', 'এশিয়া বেসিক', 650, 'US$ 30,000', [['Medical & hospital', 'চিকিৎসা ও হাসপাতাল'], ['Emergency evacuation', 'জরুরি স্থানান্তর']], false],
            ['worldwide-plus', 'Worldwide Plus', 'ওয়ার্ল্ডওয়াইড প্লাস', 1450, 'US$ 50,000', [['Schengen-approved', 'শেনজেন অনুমোদিত'], ['Trip cancellation ৳1,00,000', 'ট্রিপ বাতিল ৳১,০০,০০০'], ['Lost baggage', 'হারানো লাগেজ']], true],
            ['family-premium', 'Family Premium', 'ফ্যামিলি প্রিমিয়াম', 3200, 'US$ 1,00,000', [['Up to 2 adults + 3 kids', 'সর্বোচ্চ ২ প্রাপ্তবয়স্ক + ৩ শিশু'], ['Flight delay ৳5,000 / 6 h', 'ফ্লাইট বিলম্ব ৳৫,০০০ / ৬ ঘণ্টা'], ['Adventure sports', 'অ্যাডভেঞ্চার স্পোর্টস']], false],
        ];
        foreach ($plans as $k => [$code, $en, $bn, $price, $medical, $features, $popular]) {
            InsurancePlan::updateOrCreate(['code' => $code], ['name' => ['en' => $en, 'bn' => $bn], 'medical_cover' => $medical, 'price' => $price, 'price_note' => ['en' => '7 days', 'bn' => '৭ দিন'],
                'coverage' => array_map(fn ($f) => ['en' => $f[0], 'bn' => $f[1]], $features), 'is_popular' => $popular, 'sort' => $k]);
        }

        foreach ([['classic', 'Classic teal', 'ক্লাসিক টিল', 'from-brand-800 via-brand-600 to-accent-400', 'maldives'], ['celebration', 'Celebration', 'উদযাপন', 'from-accent-500 to-rose-500', 'santorini'], ['adventure', 'Adventure', 'অ্যাডভেঞ্চার', 'from-ink-900 to-brand-800', 'nepal']] as $k => [$code, $en, $bn, $grad, $img]) {
            GiftCardDesign::updateOrCreate(['code' => $code], ['name' => ['en' => $en, 'bn' => $bn], 'gradient' => $grad, 'image_id' => S::asset($img), 'amounts' => [5000, 10000, 25000, 50000, 100000], 'sort' => $k]);
        }

        // Offers (mockup OFFERS + the offers page extras) and coupons
        $info = S::page('offers.html')['ctx']['en']['deals'] ?? [];
        foreach ($info as $k => $o) {
            Offer::updateOrCreate(['code' => $o['code'], 'sort' => $k], [
                'title' => S::b($o['title']), 'description' => S::b($o['desc']), 'kind' => $o['kind'], 'discount_text' => S::b($o['off']), 'tag' => S::b($o['tag']), 'link' => CmsSeeder::path($o['link']),
                'image_id' => S::asset($o['img']), 'starts_at' => '2026-10-01 00:00:00', 'ends_at' => $o['ends'].' 23:59:59', 'is_flash' => $o['code'] === null || $k < 2, 'sort' => $k,
                'is_active' => true,
            ]);
        }
        foreach (S::app('COUPONS') as [$code, $name, $value, $used, $max, $until, $status]) {
            $pct = str_ends_with($value, '%');
            Coupon::updateOrCreate(['code' => $code], [
                'name' => S::b($name), 'type' => $pct ? 'percent' : 'fixed', 'value' => (float) preg_replace('/[^\d.]/', '', strtr($value, ['৳' => ''])),
                'max_discount' => $pct ? 25000 : null, 'min_spend' => $pct ? 10000 : 30000, 'max_uses' => $max, 'used' => $used,
                'scope' => self::couponScope($code), 'valid_from' => '2026-09-01 00:00:00', 'valid_to' => $until ? $until.' 23:59:59' : null, 'status' => $status,
            ]);
        }
    }

    private static function couponScope(string $code): ?array
    {
        return match (true) {
            str_starts_with($code, 'CRUISE') => ['kinds' => ['cruise']],
            str_starts_with($code, 'MUSAFIR10') => ['first_booking' => true],
            str_starts_with($code, 'WINTER') => ['kinds' => ['tour', 'hotel']],
            default => null,
        };
    }

    /** Mockup split of the all-in visa fee: embassy 62 %, service 30 %, VFS/courier + VAT the rest (admin-editable per visa). */
    public static function visaFees(int $fee): array
    {
        $embassy = (int) round($fee * 0.62);
        $service = (int) round($fee * 0.30);

        return [
            ['label' => ['en' => 'Embassy / e-visa fee', 'bn' => 'দূতাবাস / ই-ভিসা ফি'], 'amount' => $embassy],
            ['label' => ['en' => 'Musafir service charge', 'bn' => 'মুসাফির সার্ভিস চার্জ'], 'amount' => $service],
            ['label' => ['en' => 'VFS / courier & VAT', 'bn' => 'ভিএফএস / কুরিয়ার ও ভ্যাট'], 'amount' => $fee - $embassy - $service],
        ];
    }
}
