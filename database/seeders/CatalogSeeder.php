<?php

namespace Database\Seeders;

use App\Models\Flight;
use App\Models\Hotel;
use App\Models\Package;
use App\Models\VisaType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        // ---------- Hotels (walking distance to the Haram is shown everywhere) ----------
        $hotels = [
            ['Swissôtel Makkah', 'makkah', 5, 50, 'Abraj Al Bait, Ibrahim Al Khalil St', 28500, 8, ['Haram view rooms', 'Breakfast', 'Wi-Fi', 'Direct mall access']],
            ['Pullman ZamZam Makkah', 'makkah', 5, 80, 'Abraj Al Bait Complex', 24900, 1, ['Breakfast', 'Wi-Fi', 'Prayer hall link']],
            ['Hilton Suites Makkah', 'makkah', 5, 150, 'Jabal Omar', 21500, 3, ['Suites', 'Breakfast', 'Wi-Fi']],
            ['Al Kiswah Towers', 'makkah', 4, 600, 'Ibrahim Al Khalil St', 9800, 8, ['Breakfast & dinner', 'Wi-Fi', 'Shuttle at night']],
            ['Elaf Ajyad', 'makkah', 4, 300, 'Ajyad St', 12500, 9, ['Breakfast', 'Wi-Fi']],
            ['Makarem Ajyad', 'makkah', 4, 450, 'Ajyad Al Masafi', 10900, 5, ['Breakfast', 'Wi-Fi', 'Bangladeshi kitchen']],
            ['Al Massa Aziziyah', 'aziziyah', 3, 4500, 'Aziziyah, near Mina', 5200, 7, ['Shuttle bus 24h', 'Bangladeshi meals']],
            ['Anwar Al Madinah Mövenpick', 'madinah', 5, 100, 'Central North, Madinah', 19500, 2, ['Breakfast', 'Wi-Fi', 'Haram view']],
            ['Pullman Zamzam Madinah', 'madinah', 5, 180, 'Bab Al Salam area', 16800, 6, ['Breakfast', 'Wi-Fi']],
            ['Elaf Taiba', 'madinah', 4, 250, 'King Faisal Rd', 13400, 2, ['Breakfast', 'Wi-Fi']],
            ['Dar Al Taqwa', 'madinah', 4, 400, 'Central area, north side', 11200, 6, ['Breakfast', 'Wi-Fi']],
            ['Al Eiman Royal', 'madinah', 3, 900, 'Al Haram district', 6900, 4, ['Breakfast', 'Shuttle']],
            ['Jeddah Hilton', 'jeddah', 5, 0, 'Corniche Rd, Jeddah', 18500, 5, ['Sea view', 'Breakfast', 'Airport transfer']],
        ];
        $H = [];
        foreach ($hotels as [$name, $city, $stars, $dist, $addr, $price, $img, $am]) {
            $H[$name] = Hotel::create(['name' => $name, 'city' => $city, 'stars' => $stars, 'distance_to_haram_m' => $dist, 'address' => $addr, 'price_per_night' => $price,
                'image' => "assets/img/img{$img}.jpg", 'amenities' => $am, 'supplier' => $dist > 1000 ? 'hotelbeds' : 'direct', 'supplier_code' => 'HB'.random_int(10000, 99999)]);
        }

        // ---------- Flights (agency block seats; GDS adapter will add live fares) ----------
        $d0 = Carbon::parse('2026-12-12');
        $flights = [
            ['Saudia', 'SV', 'SV 803', 'DAC', 'JED', null, '10:45', 395, 0, 62500],
            ['Biman Bangladesh', 'BG', 'BG 035', 'DAC', 'JED', null, '13:30', 395, 0, 59800],
            ['US-Bangla', 'BS', 'BS 341', 'DAC', 'JED', null, '20:10', 405, 0, 57200],
            ['Flynas', 'XY', 'XY 562', 'DAC', 'JED', 'RUH', '02:15', 565, 1, 48900],
            ['Emirates', 'EK', 'EK 583', 'DAC', 'JED', 'DXB', '09:55', 555, 1, 71400],
            ['Saudia', 'SV', 'SV 805', 'DAC', 'MED', null, '07:20', 410, 0, 64800],
            ['Biman Bangladesh', 'BG', 'BG 137', 'CGP', 'JED', null, '11:00', 420, 0, 61200],
            ['Air Arabia', 'G9', 'G9 512', 'DAC', 'JED', 'SHJ', '04:35', 610, 1, 46500],
            ['Saudia', 'SV', 'SV 802', 'JED', 'DAC', null, '01:30', 380, 0, 60500],
            ['Biman Bangladesh', 'BG', 'BG 036', 'JED', 'DAC', null, '19:40', 385, 0, 58200],
            ['Biman Bangladesh', 'BG', 'BG 247', 'ZYL', 'JED', null, '09:10', 430, 0, 63900],
        ];
        $F = [];
        foreach ($flights as $i => [$air, $code, $no, $from, $to, $via, $time, $dur, $stops, $fare]) {
            $dep = $d0->copy()->addDays($i % 3)->setTimeFromTimeString($time);
            $F[$no] = Flight::create(['airline' => $air, 'airline_code' => $code, 'flight_no' => $no, 'from_iata' => $from, 'to_iata' => $to, 'via_iata' => $via,
                'depart_at' => $dep, 'arrive_at' => $dep->copy()->addMinutes($dur)->subHours(3), 'duration_min' => $dur, 'stops' => $stops, 'fare' => $fare,
                'baggage' => $code === 'SV' || $code === 'BG' ? '2×23 kg + Zamzam 5L' : '30 kg', 'seats_block' => [90, 45, 30][$i % 3], 'pnr_group' => 'GRP'.strtoupper(Str::random(4)), 'supplier' => 'stub']);
        }

        // ---------- Packages ----------
        $L = fn ($en, $bn = null, $ar = null) => array_filter(['en' => $en, 'bn' => $bn, 'ar' => $ar]);
        $incHajj = $L(['Hajj visa & Nusuk registration', 'Return economy ticket, 46 kg baggage', 'Hotels in Makkah, Madinah, Aziziyah', 'Mina & Arafat tents with meals', 'Ziyarah tours in Makkah & Madinah', 'Ihram, bag, ID card, SIM', 'Pre-Hajj training (3 sessions)'],
            ['হজ্জ ভিসা ও নুসুক নিবন্ধন', 'রিটার্ন ইকোনমি টিকেট, ৪৬ কেজি ব্যাগেজ', 'মক্কা, মদিনা, আজিজিয়ায় হোটেল', 'মিনা ও আরাফাতে তাঁবু ও খাবার', 'মক্কা ও মদিনায় যিয়ারাহ', 'ইহরাম, ব্যাগ, আইডি কার্ড, সিম', 'হজ্জ-পূর্ব প্রশিক্ষণ (৩টি সেশন)'],
            ['تأشيرة الحج والتسجيل في نسك', 'تذكرة ذهاب وعودة، 46 كغ', 'فنادق في مكة والمدينة والعزيزية', 'خيام منى وعرفات مع الوجبات', 'زيارات مكة والمدينة', 'إحرام، حقيبة، بطاقة، شريحة', 'تدريب قبل الحج']);
        $excHajj = $L(['Qurbani (sacrifice) – ৳ 28,000 optional', 'Government Hajj registration fee', 'Personal expenses & laundry', 'Travel insurance (optional)', 'Passport fees'],
            ['কুরবানি – ঐচ্ছিক ৳ ২৮,০০০', 'সরকারি হজ্জ নিবন্ধন ফি', 'ব্যক্তিগত খরচ ও লন্ড্রি', 'ভ্রমণ বীমা (ঐচ্ছিক)', 'পাসপোর্ট ফি']);
        $incUmrah = $L(['Umrah visa with insurance', 'Return air ticket', 'Hotels in Makkah & Madinah', 'Daily breakfast & dinner', 'AC bus transfers', 'Ziyarah in Makkah & Madinah', 'Bangla-speaking guide'],
            ['বীমাসহ উমরাহ ভিসা', 'রিটার্ন এয়ার টিকেট', 'মক্কা ও মদিনায় হোটেল', 'প্রতিদিন সকাল ও রাতের খাবার', 'এসি বাস ট্রান্সফার', 'মক্কা ও মদিনায় যিয়ারাহ', 'বাংলাভাষী গাইড']);
        $excUmrah = $L(['Lunch', 'Personal expenses', 'Excess baggage'], ['দুপুরের খাবার', 'ব্যক্তিগত খরচ', 'অতিরিক্ত ব্যাগেজ']);

        $hajjDates = ['2026-12-15', '2027-01-15', '2027-02-15', '2027-03-10'];
        $umrahDates = fn (Carbon $dep) => [$dep->copy()->subDays(45)->toDateString(), $dep->copy()->subDays(15)->toDateString()];

        $pk = [
            // type, class, en, bn, ar, img, days, mk, md, prices[quad,triple,double], deposit, rating, reviews, departure, airline, featured, makkahHotel, madinahHotel, seats
            ['hajj', 'economy', 'Economy Hajj 2027', 'ইকোনমি হজ্জ ২০২৭', 'حج اقتصادي 2027', 3, 40, 1200, 900, [698000, 735000, 790000], 50000, 4.8, 124, '2027-04-20', 'Biman Bangladesh (direct)', true, 'Al Massa Aziziyah', 'Al Eiman Royal', 120],
            ['hajj', 'standard', 'Standard Hajj 2027', 'স্ট্যান্ডার্ড হজ্জ ২০২৭', 'حج قياسي 2027', 1, 35, 600, 400, [845000, 905000, 985000], 50000, 4.9, 186, '2027-04-28', 'Saudia (direct)', true, 'Al Kiswah Towers', 'Dar Al Taqwa', 90],
            ['hajj', 'premium', 'Premium Shifting-free Hajj', 'প্রিমিয়াম নন-শিফটিং হজ্জ', 'حج مميز بدون تنقل', 4, 28, 300, 200, [1150000, 1240000, 1360000], 100000, 4.9, 97, '2027-05-03', 'Saudia (direct)', true, 'Elaf Ajyad', 'Elaf Taiba', 45],
            ['hajj', 'vip', 'VIP Hajj – Clock Tower', 'ভিআইপি হজ্জ – ক্লক টাওয়ার', 'حج VIP – برج الساعة', 8, 21, 50, 80, [1690000, 1820000, 1990000], 200000, 5.0, 41, '2027-05-08', 'Saudia (direct)', true, 'Swissôtel Makkah', 'Anwar Al Madinah Mövenpick', 30],
            ['umrah', 'economy', '7 Days Express Umrah', '৭ দিনের এক্সপ্রেস উমরাহ', 'عمرة سريعة 7 أيام', 2, 7, 900, 700, [98000, 105000, 118000], 30000, 4.7, 212, '2026-11-20', 'Flynas (via RUH)', false, 'Makarem Ajyad', 'Al Eiman Royal', 60],
            ['umrah', 'economy', '14 Days Group Umrah', '১৪ দিনের গ্রুপ উমরাহ', 'عمرة جماعية 14 يوماً', 2, 14, 750, 650, [135000, 142000, 158000], 40000, 4.8, 305, '2026-12-12', 'Biman Bangladesh (direct)', true, 'Makarem Ajyad', 'Dar Al Taqwa', 80],
            ['umrah', 'standard', '21 Days Family Umrah', '২১ দিনের পারিবারিক উমরাহ', 'عمرة عائلية 21 يوماً', 6, 21, 500, 300, [185000, 196000, 214000], 50000, 4.8, 88, '2027-01-08', 'Saudia (direct)', false, 'Elaf Ajyad', 'Elaf Taiba', 50],
            ['umrah', 'premium', 'Ramadan Last 10 Nights', 'রমজানের শেষ ১০ রাত', 'العشر الأواخر من رمضان', 6, 12, 250, 150, [295000, 315000, 345000], 80000, 4.9, 156, '2027-02-26', 'Saudia (direct)', true, 'Hilton Suites Makkah', 'Pullman Zamzam Madinah', 40],
            ['umrah', 'vip', 'VIP Umrah – 5★ Haram View', 'ভিআইপি উমরাহ – ৫★ হারাম ভিউ', 'عمرة VIP – إطلالة على الحرم', 8, 10, 50, 100, [345000, 372000, 410000], 100000, 5.0, 37, '2027-01-22', 'Emirates (via DXB)', false, 'Swissôtel Makkah', 'Anwar Al Madinah Mövenpick', 20],
            ['ziyarah', 'economy', 'Makkah Ziyarah (half day)', 'মক্কা যিয়ারাহ (অর্ধ দিবস)', 'زيارة مكة (نصف يوم)', 7, 1, null, null, [2500], 0, 4.8, 64, null, null, false, null, null, 0, 'Jabal al-Nour, Thawr, Arafat, Mina, Muzdalifah'],
            ['ziyarah', 'economy', 'Madinah Ziyarah (full day)', 'মদিনা যিয়ারাহ (পূর্ণ দিবস)', 'زيارة المدينة (يوم كامل)', 6, 1, null, null, [3000], 0, 4.9, 71, null, null, false, null, null, 0, 'Quba, Uhud, Qiblatain, Seven Mosques'],
            ['ziyarah', 'standard', 'Taif Day Trip', 'তায়েফ ভ্রমণ', 'رحلة الطائف', 4, 1, null, null, [6500], 0, 4.7, 29, null, null, false, null, null, 0, 'Rose farms, Masjid Abdullah ibn Abbas, cable car'],
            ['tour', 'standard', 'Istanbul & Bursa – 7 days', 'ইস্তাম্বুল ও বুরসা – ৭ দিন', 'إسطنبول وبورصة – 7 أيام', 2, 7, null, null, [145000, 152000, 165000], 40000, 4.8, 33, '2027-03-05', 'Turkish Airlines', false, null, null, 30, 'Islamic heritage tour, Ottoman mosques'],
            ['tour', 'premium', 'Jerusalem & Al-Aqsa via Jordan', 'জেরুজালেম ও আল-আকসা (জর্ডান হয়ে)', 'القدس والأقصى عبر الأردن', 3, 9, null, null, [195000, 205000, 225000], 60000, 4.9, 18, '2027-04-02', 'Royal Jordanian', false, null, null, 20, 'Al-Aqsa, Hebron, Petra (subject to permits)'],
            ['tour', 'economy', 'Umrah + Dubai stopover', 'উমরাহ + দুবাই স্টপওভার', 'عمرة + توقف في دبي', 5, 4, null, null, [35000], 10000, 4.6, 22, '2027-01-15', 'Emirates', false, null, null, 40, '3 nights Dubai after Umrah'],
        ];
        $rooms = ['quad', 'triple', 'double'];
        foreach ($pk as $row) {
            [$type, $class, $en, $bn, $ar, $img, $days, $mk, $md, $prices, $dep, $rating, $rev, $date, $airline, $feat, $mh, $mdh, $seats] = $row;
            $short = $row[19] ?? null;
            $isPilgrim = in_array($type, ['hajj', 'umrah'], true);
            $summary = $short ? $L($short) : ($type === 'hajj'
                ? $L("{$days}-day {$en} with Makkah hotel ".Package::distanceLabel($mk).' and Madinah hotel '.Package::distanceLabel($md).' from the Haram, scholar-led group and full Nusuk visa processing.',
                    "{$days} দিনের প্যাকেজ — মক্কার হোটেল হারাম থেকে ".Package::distanceLabel($mk).', আলেম পরিচালিত গ্রুপ ও পূর্ণ ভিসা প্রসেসিং।',
                    "باقة {$days} يوماً مع فندق قريب من الحرم ومجموعة بإشراف العلماء.")
                : $L("{$days}-day Umrah with hotels ".Package::distanceLabel($mk).' (Makkah) and '.Package::distanceLabel($md).' (Madinah) from the Haram.', "{$days} দিনের উমরাহ, হারামের কাছে হোটেল।", "عمرة {$days} أيام مع فنادق قريبة من الحرم."));
            $p = Package::create([
                'type' => $type, 'class' => $class, 'slug' => Str::slug($en), 'title' => $L($en, $bn, $ar), 'summary' => $summary,
                'description' => $isPilgrim ? $L(Package::CLASSES[$class]."-class package for ".($type === 'hajj' ? 'Hajj 1448 AH' : 'Umrah')." from Bangladesh: hotels within walking distance of both Harams, Bangla-speaking scholars, AC transport and full visa processing via Nusuk. Group led by Mufti Abdullah Al Mamun.",
                    'বাংলাদেশ থেকে '.($type === 'hajj' ? 'হজ্জ ১৪৪৮ হিজরি' : 'উমরাহ').'র জন্য সুষম প্যাকেজ: উভয় হারামের হাঁটা দূরত্বে হোটেল, বাংলাভাষী আলেম, এসি পরিবহন ও নুসুকের মাধ্যমে পূর্ণ ভিসা প্রসেসিং।') : $L($short),
                'inclusions' => $type === 'hajj' ? $incHajj : ($type === 'umrah' ? $incUmrah : $L(['Guide', 'Transport', 'Entry tickets'], ['গাইড', 'পরিবহন', 'প্রবেশ টিকেট'])),
                'exclusions' => $type === 'hajj' ? $excHajj : ($type === 'umrah' ? $excUmrah : $L(['Personal expenses'], ['ব্যক্তিগত খরচ'])),
                'terms' => $L('Prices per person in BDT. Government fees as per the MoRA circular. Refunds as per published refund policy.'),
                'season_year' => $date ? Carbon::parse($date)->year : null, 'hijri_year' => $type === 'hajj' ? '1448' : null, 'duration_days' => $days,
                'departure_city' => 'Dhaka (DAC)', 'departure_date' => $date, 'return_date' => $date ? Carbon::parse($date)->addDays($days)->toDateString() : null,
                'seats_total' => $seats, 'seats_sold' => $seats ? (int) round($seats * 0.45) : 0, 'makkah_distance_m' => $mk, 'madinah_distance_m' => $md, 'airline' => $airline,
                'price_from' => $prices[0], 'rating' => $rating, 'reviews_count' => $rev, 'image' => "assets/img/img{$img}.jpg",
                'gallery' => ["assets/img/img{$img}.jpg", 'assets/img/img2.jpg', 'assets/img/img4.jpg'], 'is_featured' => $feat, 'status' => 'published', 'published_at' => now(),
            ]);
            foreach ($prices as $i => $price) {
                $plan = $type === 'hajj' ? ['due_dates' => $hajjDates] : ($date ? ['due_dates' => $umrahDates(Carbon::parse($date))] : null);
                $p->prices()->create(['room_type' => count($prices) > 1 ? $rooms[$i] : 'quad', 'price' => $price, 'b2b_price' => (int) round($price * 0.953 / 500) * 500, 'deposit_amount' => $dep, 'installment_plan' => $plan, 'valid_from' => now()->toDateString(), 'valid_to' => $date]);
            }
            if ($isPilgrim) {
                $p->prices()->create(['room_type' => 'child', 'price' => (int) round($prices[0] * 0.75 / 1000) * 1000, 'deposit_amount' => $dep, 'installment_plan' => $type === 'hajj' ? ['due_dates' => $hajjDates] : ['due_dates' => $umrahDates(Carbon::parse($date))]]);
            }
            if ($mh) {
                $mkN = (int) round($days * ($type === 'hajj' ? 0.45 : 0.55));
                $p->hotels()->attach($H[$mh]->id, ['nights' => $mkN, 'check_in_day' => 1, 'meal_plan' => 'Breakfast & dinner']);
                $p->hotels()->attach($H[$mdh]->id, ['nights' => max(1, $days - $mkN - ($type === 'hajj' ? 6 : 1)), 'check_in_day' => $mkN + 1, 'meal_plan' => 'Breakfast & dinner']);
                $p->flights()->attach($F[$type === 'hajj' && $class === 'economy' ? 'BG 035' : 'SV 803']->id, ['leg' => 'outbound']);
                $p->flights()->attach($F[$type === 'hajj' && $class === 'economy' ? 'BG 036' : 'SV 802']->id, ['leg' => 'return']);
            }
            $this->itinerary($p, $type, $days);
        }

        // ---------- Visa services ----------
        $vs = [['🇸🇦', 'Saudi Arabia', 'Saudi Umrah Visa', 'সৌদি উমরাহ ভিসা', 'تأشيرة عمرة', '5–7 working days', 9500, 'nusuk'], ['🇸🇦', 'Saudi Arabia', 'Saudi Tourist e-Visa', 'সৌদি ট্যুরিস্ট ই-ভিসা', 'تأشيرة سياحية سعودية', '3–5 days', 14500, 'nusuk'],
            ['🇦🇪', 'UAE', 'UAE Tourist Visa', 'ইউএই ট্যুরিস্ট ভিসা', 'تأشيرة الإمارات', '4–6 days', 11000, 'manual'], ['🇹🇷', 'Turkey', 'Turkey e-Visa / Sticker', 'তুরস্ক ই-ভিসা / স্টিকার', 'تأشيرة تركيا', '10–15 days', 12500, 'embassy'],
            ['🇲🇾', 'Malaysia', 'Malaysia eVisa', 'মালয়েশিয়া ই-ভিসা', 'تأشيرة ماليزيا', '3–5 days', 6500, 'manual'], ['🇹🇭', 'Thailand', 'Thailand Tourist Visa', 'থাইল্যান্ড ট্যুরিস্ট ভিসা', 'تأشيرة تايلاند', '7–10 days', 7800, 'embassy']];
        foreach ($vs as $i => [$f, $c, $en, $bn, $ar, $time, $fee, $prov]) {
            VisaType::create(['flag' => $f, 'country' => $c, 'name' => $L($en, $bn, $ar), 'processing_time' => $time, 'fee' => $fee, 'provider' => $prov, 'sort' => $i,
                'requirements' => ['Passport valid 6+ months', 'Photo, white background', $c === 'Saudi Arabia' ? 'Meningitis vaccine (Hajj/Umrah)' : 'Bank statement (6 months)', 'Confirmed return ticket & hotel']]);
        }
    }

    private function itinerary(Package $p, string $type, int $days): void
    {
        $L = fn ($en, $bn = null) => array_filter(['en' => $en, 'bn' => $bn]);
        $rows = match ($type) {
            'hajj' => [[1, 1, 'Dhaka → Jeddah', 'Ihram at Miqat, transfer to Makkah, Umrah with guide', 'ঢাকা → জেদ্দা'], [2, 9, 'Makkah', 'Daily prayers at Masjid al-Haram, lessons on Hajj rites, Ziyarah of Jabal al-Nour, Thawr, Arafat', 'মক্কা'],
                [10, 14, 'Madinah', '40 prayers at Masjid an-Nabawi, Rawdah visit (Nusuk permit), Quba, Uhud, Qiblatain', 'মদিনা'], [15, 15, '8 Dhul Hijjah – Mina', 'Move to Mina – air-conditioned tents (Zone A)', '৮ জিলহজ্জ – মিনা'],
                [16, 16, '9 Dhul Hijjah – Arafah', 'Day of Arafah – Wuquf; night in Muzdalifah', '৯ জিলহজ্জ – আরাফাহ'], [17, 19, 'Rami, Qurbani, Tawaf', "Rami al-Jamarat, Qurbani (via official coupon), Tawaf al-Ifadah, Sa'i", 'রমি, কুরবানি, তাওয়াফ'],
                [$days, $days, 'Farewell', 'Tawaf al-Wada and return flight to Dhaka', 'বিদায়']],
            'umrah' => [[1, 1, 'Dhaka → Jeddah / Madinah', 'Ihram at Miqat, transfer to hotel, Umrah with guide', 'ঢাকা → জেদ্দা'], [2, (int) ceil($days / 2), 'Makkah', 'Prayers at Masjid al-Haram, Makkah Ziyarah', 'মক্কা'],
                [(int) ceil($days / 2) + 1, $days - 1, 'Madinah', 'Masjid an-Nabawi, Rawdah (Nusuk permit), Quba, Uhud', 'মদিনা'], [$days, $days, 'Return', 'Return flight to Dhaka', 'প্রত্যাবর্তন']],
            default => [[1, $days, $p->getTranslations('title')['en'], $p->getTranslations('summary')['en'] ?? '', null]],
        };
        foreach ($rows as $i => [$a, $b, $t, $body, $tbn]) {
            $p->itinerary()->create(['day_from' => $a, 'day_to' => $b, 'title' => $L($t, $tbn), 'body' => $L($body), 'sort' => $i]);
        }
    }
}
