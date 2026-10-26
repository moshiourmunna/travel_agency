<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Booking;
use App\Models\Cruise;
use App\Models\FlightOffer;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\Review;
use App\Models\Tour;
use App\Models\TripPlan;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaProduct;
use Carbon\CarbonImmutable;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Bookings, items, travellers, payments, instalments, refunds, wallet/miles, referrals, saved payment methods, trips, reviews, visa applications. */
class CommerceSeeder extends Seeder
{
    private const MODEL = ['tour' => Tour::class, 'cruise' => Cruise::class, 'activity' => Activity::class, 'hotel' => Hotel::class, 'visa' => VisaProduct::class];

    private const METHOD_GATEWAY = ['bKash' => 'bkash', 'Nagad' => 'nagad', 'Card · SSLCommerz' => 'sslcommerz', 'Bank transfer' => 'bank_transfer', 'Rocket' => 'sslcommerz', 'EMI · City Bank' => 'sslcommerz', 'Wallet' => 'wallet'];

    public function run(): void
    {
        $farhana = User::where('email', 'farhana@example.com')->firstOrFail();
        $staff = User::where('type', 'staff')->get()->keyBy('name');
        $customers = User::where('type', 'customer')->get()->keyBy('name');

        // Farhana's travellers
        $farhana->travellers()->forceDelete();
        $travellers = [];
        foreach (S::app('TRAVELLERS') as $i => $t) {
            $travellers[] = $farhana->travellers()->create([
                // relation is stored as a code (Self/Spouse/Child…) with its Bangla label; the portal words "You" / "Child (8)".
                'name' => $t['name']['en'], 'relation' => [['en' => 'Self', 'bn' => 'নিজে'], ['en' => 'Spouse', 'bn' => 'স্বামী/স্ত্রী'], ['en' => 'Child', 'bn' => 'সন্তান']][$i] ?? ['en' => 'Other', 'bn' => 'অন্যান্য'],
                'dob' => $t['dob'], 'gender' => $i === 0 ? 'female' : 'male', 'is_self' => $i === 0,
                'passport_no_enc' => $pp = str_replace('•••••', (string) (10000 + $i * 1111), $t['passport']), 'passport_last4' => substr($pp, -4), 'passport_expiry' => $t['exp'],
                'meal_pref' => $i === 0 ? 'halal' : null, 'seat_pref' => $i === 0 ? 'window' : null, 'frequent_flyer' => $i === 0 ? 'BS 3014 7781' : null,
            ]);
        }

        Booking::query()->forceDelete();
        $refs = [];
        foreach (S::app('MY_BOOKINGS') as $b) {
            $this->booking($b, $farhana, $staff['Nadia Islam'] ?? null, 'web', 'bKash', $b['booked'], $travellers);
            $refs[$b['ref']] = true;
        }
        foreach (S::app('ADMIN_BOOKINGS') as $b) {
            if ($b['ref'] === 'MSF-26-48213') {
                continue;
            }
            $ref = $b['ref'];
            while (isset($refs[$ref])) {
                $ref = preg_replace_callback('/(\d+)$/', fn ($m) => (string) ($m[1] + 1), $ref);
            }
            $refs[$ref] = true;
            $b['ref'] = $ref;
            $b['start'] = $b['travel'];
            $b['end'] = CarbonImmutable::parse($b['travel'])->addDays(['tour' => 4, 'cruise' => 4, 'hotel' => 3, 'activity' => 0, 'visa' => 12][$b['kind']] ?? 0)->toDateString();
            $user = $customers[$b['cust']['en']] ?? $farhana;
            $this->booking($b, $user, $staff[$b['agent']] ?? null, $b['channel'][0], $b['method'], $b['created'], [], $b);
        }

        // Payments from the mockup ledger (by booking ref); bookings without a ledger row get one "success" row for their paid amount
        Payment::query()->delete();
        $bookings = Booking::all()->keyBy('ref');
        $ledger = collect(S::app('PAYMENTS'));
        foreach ($ledger as $p) {
            $bk = $bookings[$p['ref']] ?? null;
            Payment::create([
                'booking_id' => $bk?->id, 'user_id' => $bk?->user_id, 'gateway' => self::METHOD_GATEWAY[$p['method']] ?? 'mock', 'method' => $p['method'], 'amount' => $p['amount'], 'fee' => $p['fee'],
                'status' => $p['status'], 'gateway_txn' => $p['txn'], 'val_id' => $p['status'] === 'success' ? 'VAL'.substr($p['txn'], 3) : null,
                'paid_at' => in_array($p['status'], ['success', 'refunded'], true) ? $p['date'].' 12:00:00' : null, 'created_at' => $p['date'].' 11:58:00',
            ]);
        }
        foreach ($bookings as $bk) {
            $sum = (float) Payment::where('booking_id', $bk->id)->whereIn('status', ['success', 'refunded'])->sum('amount');
            if ((float) $bk->paid > $sum + 0.5) {
                Payment::create(['booking_id' => $bk->id, 'user_id' => $bk->user_id, 'gateway' => 'bkash', 'method' => 'bKash', 'amount' => (float) $bk->paid - $sum, 'fee' => round(((float) $bk->paid - $sum) * 0.0185),
                    'status' => 'success', 'gateway_txn' => 'TXN'.mt_rand(80000000, 89999999), 'paid_at' => $bk->created_at, 'created_at' => $bk->created_at]);
            }
        }
        // Farhana's Maldives instalment plan + refund for the refunded flight
        $maldives = $bookings['MSF-26-48213'];
        $maldives->update(['payment_plan' => 'instalments']);
        $first = Payment::where('booking_id', $maldives->id)->where('status', 'success')->first();
        foreach (S::app('INSTALMENTS') as $i => [$due, $amount, $status]) {
            $maldives->instalments()->create(['seq' => $i + 1, 'due_date' => $due, 'amount' => $amount, 'status' => $status, 'payment_id' => $status === 'paid' ? $first?->id : null]);
        }
        foreach (Booking::where('status', 'refunded')->get() as $rb) {
            $pay = Payment::where('booking_id', $rb->id)->first();
            if ($pay) {
                $pay->update(['status' => 'refunded']);
                $rb->refunds()->create(['payment_id' => $pay->id, 'amount' => $pay->amount, 'reason' => 'Airline schedule change', 'status' => 'processed',
                    'requested_by' => $rb->user_id, 'approved_by' => $staff['Kazi Fahim']->id ?? null, 'processed_at' => $rb->travel_start?->subDays(10)]);
            }
        }

        // Wallet, miles, referrals, saved methods, trip plans
        $farhana->walletTransactions()->delete();
        $balance = (float) S::app('USER')['wallet'];
        foreach (S::app('WALLET_TX') as [$date, $desc, $amount, $dir, $icon]) {
            $farhana->walletTransactions()->create(['direction' => $dir, 'amount' => $amount, 'balance_after' => $balance, 'description' => S::b($desc), 'icon' => $icon, 'created_at' => $date.' 10:00:00']);
            $balance += $dir === 'credit' ? -$amount : $amount;
        }
        $farhana->milesTransactions()->delete();
        foreach (S::app('MILES_TX') as [$date, $desc, $miles]) {
            $farhana->milesTransactions()->create(['miles' => $miles, 'description' => S::b($desc), 'created_at' => $date.' 10:00:00']);
        }
        $farhana->referrals()->delete();
        foreach (S::app('REFERRALS') as [$name, $date, $status, $reward]) {
            $farhana->referrals()->create(['referred_name' => $name['en'], 'status' => $status, 'reward' => $reward, 'created_at' => $date.' 10:00:00']);
        }
        $farhana->savedPaymentMethods()->delete();
        foreach (S::app('SAVED_PAY') as [$gw, $label, $masked, $default]) {
            $farhana->savedPaymentMethods()->create(['gateway' => $gw, 'label' => $label, 'masked' => $masked, 'is_default' => $default, 'token_ref' => 'tok_demo_'.$gw]);
        }
        $farhana->tripPlans()->delete();
        foreach (S::app('SAVED_TRIPS') as $t) {
            TripPlan::create(['user_id' => $farhana->id, 'name' => S::b($t['name']), 'data' => ['destinations' => $t['dests'], 'days' => $t['days'], 'adults' => 2, 'children' => 0, 'pax_label' => S::b($t['pax'])],
                'estimate' => $t['est'], 'share_token' => Str::random(24), 'updated_at' => $t['upd'].' 10:00:00', 'created_at' => $t['upd'].' 09:00:00']);
        }

        // Farhana's account wishlist (mockup trips page); Turkey was saved before a ৳ 4,500 price drop.
        \App\Models\Wishlist::where('user_id', $farhana->id)->delete();
        foreach (['bhutan-happiness' => 0, 'turkey-classic' => 4500, 'kashmir-paradise' => 0, 'egypt-wonders' => 0] as $slug => $drop) {
            if ($t = Tour::where('slug', $slug)->first()) {
                \App\Models\Wishlist::create(['user_id' => $farhana->id, 'wishable_type' => Tour::class, 'wishable_id' => $t->id, 'saved_price' => (float) $t->price_from + $drop,
                    'created_at' => now()->subDays(20), 'updated_at' => now()->subDays(20)]);
            }
        }

        // Reviews: product reviews (testimonial set attached to products) + Farhana's own reviews + moderation queue states
        Review::query()->delete();
        $products = [Tour::where('slug', 'maldives-honeymoon')->first(), Cruise::first(), Tour::where('slug', 'sajek-rangamati')->first(), Tour::where('slug', 'turkey-classic')->first(), Tour::where('slug', 'nepal-pokhara')->first(), Tour::where('slug', 'bali-highlights')->first()];
        foreach (S::public('REVIEWS') as $i => $r) {
            $prod = $products[$i] ?? null;
            Review::create(['reviewable_type' => $prod ? $prod::class : null, 'reviewable_id' => $prod?->id, 'author_name' => S::b($r['name']), 'author_city' => S::b($r['city']), 'initials' => $r['ini'],
                'trip_title' => S::b($r['trip']), 'rating' => $r['rating'], 'body' => S::b($r['text']), 'status' => 'published', 'travelled_on' => $r['date'],
                'category_scores' => ['guide' => 4.9, 'hotels' => 4.7, 'value' => 4.8, 'transport' => 4.6], 'created_at' => $r['date'].' 18:00:00']);
        }
        // Moderation queue demo: fresh submissions awaiting review plus one hidden (spam) — never shown publicly.
        $queue = [
            [['en' => 'Nabila Hossain', 'bn' => 'নাবিলা হোসেন'], ['en' => 'Dhaka', 'bn' => 'ঢাকা'], 'NH', 'sajek-rangamati', 5, 'review',
                ['en' => 'Sunrise over the clouds at Sajek was unreal. The jeep driver was careful on the hill roads and the cottage was spotless.', 'bn' => 'সাজেকে মেঘের ওপর সূর্যোদয় অবিশ্বাস্য ছিল। পাহাড়ি পথে জিপচালক সাবধানী ছিলেন, কটেজও ঝকঝকে পরিষ্কার।']],
            [['en' => 'Arif Mahmud', 'bn' => 'আরিফ মাহমুদ'], ['en' => 'Cumilla', 'bn' => 'কুমিল্লা'], 'AM', 'bali-highlights', 4, 'review',
                ['en' => 'Lovely villas and a great guide in Ubud. The airport pickup was 30 minutes late, but the team called ahead to let us know.', 'bn' => 'উবুদে চমৎকার ভিলা ও দারুণ গাইড। এয়ারপোর্ট পিকআপ ৩০ মিনিট দেরি করেছিল, তবে টিম আগেই ফোন করে জানিয়েছিল।']],
            [['en' => 'Cheap Visa Agent', 'bn' => 'Cheap Visa Agent'], ['en' => '—', 'bn' => '—'], 'CV', null, 1, 'hidden',
                ['en' => 'Get any visa in 2 days!!! WhatsApp me for cheap tickets, best price guaranteed.', 'bn' => 'Get any visa in 2 days!!! WhatsApp me for cheap tickets, best price guaranteed.']],
        ];
        foreach ($queue as $k => [$name, $city, $ini, $slug, $rating, $status, $body]) {
            $prod = $slug ? Tour::where('slug', $slug)->first() : null;
            Review::create(['reviewable_type' => $prod ? Tour::class : null, 'reviewable_id' => $prod?->id, 'author_name' => $name, 'author_city' => $city, 'initials' => $ini,
                'trip_title' => $prod?->title, 'rating' => $rating, 'body' => $body, 'status' => $status,
                'travelled_on' => now()->subDays(6 + $k)->toDateString(), 'created_at' => now()->subDays(2 + $k)]);
        }
        foreach (S::app('MY_REVIEWS') as $r) {
            $bk = $bookings[$r['ref']] ?? null;
            Review::create(['reviewable_type' => $bk?->product_type, 'reviewable_id' => $bk?->product_id, 'user_id' => $farhana->id, 'booking_id' => $bk?->id, 'author_name' => ['en' => 'Farhana Rahman', 'bn' => 'ফারহানা রহমান'],
                'initials' => 'FR', 'trip_title' => S::b($r['title']), 'rating' => $r['rating'], 'body' => S::b($r['text']), 'status' => 'published', 'travelled_on' => $r['date'], 'created_at' => $r['date'].' 18:00:00']);
        }

        // Visa applications: Farhana's (VISA_APPS) + the desk queue (VISA_QUEUE)
        VisaApplication::query()->delete();
        $stageNames = ['submitted' => 1, 'docs' => 2, 'verified' => 2, 'embassy' => 3, 'approved' => 5, 'rejected' => 4, 'delivered' => 5];
        $visaBySlug = VisaProduct::all()->keyBy(fn ($v) => $v->getTranslation('country_name', 'en'));
        $queue = collect(S::app('VISA_QUEUE'))->keyBy(0);
        foreach (S::app('VISA_APPS') as $i => $v) {
            $q = $queue[$v['ref']] ?? null;
            $app = VisaApplication::create(['ref' => $v['ref'], 'visa_product_id' => $visaBySlug[$v['country']['en']]->id ?? null, 'user_id' => $farhana->id,
                'traveller_id' => collect($travellers)->firstWhere('name', $v['who']['en'])?->id, 'booking_id' => $v['ref'] === 'VSA-26-1182' ? $bookings['MSF-26-49388']->id ?? null : null,
                'assignee_id' => $staff[$q[6] ?? 'Sohel Rana']->id ?? null, 'applicant_name' => $v['who']['en'], 'stage' => $v['status'], 'stage_no' => $v['stage'], 'eta' => $v['eta']]);
            foreach (S::app('VISA_STAGES') as $k => [$label, $date, $state]) {
                $st = $k + 1 < $v['stage'] ? 'done' : ($k + 1 === $v['stage'] ? ($v['stage'] >= 5 ? 'done' : 'current') : 'todo');
                // The featured application uses the mockup's stage dates; others are dated back from their ETA.
                $when = $v['ref'] === 'VSA-26-1182' ? $date : CarbonImmutable::parse($v['eta'])->subDays([14, 12, 10, 0, 0][$k] ?? 0)->toDateString();
                $app->events()->create(['label' => S::b($label), 'state' => $v['ref'] === 'VSA-26-1182' ? $state : $st, 'happened_on' => ($v['ref'] === 'VSA-26-1182' ? $state : $st) === 'todo' ? null : $when]);
            }
        }
        foreach ($queue as $ref => [$r, $name, $flag, $country, $stage, $eta, $assignee]) {
            if (VisaApplication::where('ref', $ref)->exists()) {
                continue;
            }
            $user = $customers[$name['en']] ?? null;
            $app = VisaApplication::create(['ref' => $ref, 'visa_product_id' => $visaBySlug[$country['en']]->id ?? null, 'user_id' => $user?->id, 'assignee_id' => $staff[$assignee]->id ?? null,
                'applicant_name' => $name['en'], 'stage' => $stage, 'stage_no' => $stageNames[$stage] ?? 1, 'eta' => $eta]);
            foreach (S::app('VISA_STAGES') as $k => [$label]) {
                $app->events()->create(['label' => S::b($label), 'state' => $k + 1 < $app->stage_no ? 'done' : ($k + 1 === $app->stage_no ? 'current' : 'todo')]);
            }
        }
    }

    private function booking(array $b, User $user, ?User $owner, string $channel, ?string $method, string $created, array $travellers, ?array $admin = null): Booking
    {
        $model = self::MODEL[$b['kind']] ?? null;
        $product = $model && $b['slug'] ? $model::where('slug', $b['slug'])->first() : null;
        if (! $product && $b['kind'] === 'flight') {
            // "Dhaka → Malé (BS 341)" → that offer; otherwise the cheapest Dubai fare.
            $no = preg_match('/\(([A-Z0-9]{2} \d{2,4})\)/', (string) $b['title']['en'], $m) ? $m[1] : null;
            $city = preg_match('/→\s*([^(]+)/u', (string) $b['title']['en'], $cm) ? trim($cm[1]) : null;
            $iata = $city ? \App\Models\Airport::where('city->en', $city)->value('iata') : null;
            $product = ($no ? FlightOffer::where('flight_no', $no)->when($iata, fn ($q) => $q->where('destination', $iata))->first() : null)
                ?? FlightOffer::where('origin', 'DAC')->where('destination', 'DXB')->orderBy('fare')->first();
        }
        $pnr = $b['kind'] === 'flight' && preg_match('/PNR ([A-Z0-9]{6})/', (string) ($b['sub']['en'] ?? ''), $pm) ? $pm[1] : null;
        $total = (float) $b['total'];
        $paid = (float) $b['paid'];
        $booking = Booking::create([
            'ref' => $b['ref'], 'user_id' => $user->id, 'owner_staff_id' => $owner?->id, 'kind' => $b['kind'],
            'product_type' => $product ? $product::class : null, 'product_id' => $product?->id, 'title' => S::b($b['title']), 'subtitle' => S::b($b['sub'] ?? null),
            'image_key' => $b['img'] ?? null, 'status' => $b['status'], 'payment_status' => $paid <= 0 ? 'unpaid' : ($paid + 0.5 >= $total ? ($b['status'] === 'refunded' ? 'refunded' : 'paid') : 'partial'),
            'channel' => $channel, 'contact' => ['name' => $user->name, 'email' => $user->email, 'phone' => $admin['phone'] ?? $user->phone, 'city' => $admin['city']['en'] ?? $user->city] + ($pnr ? ['pnr' => $pnr, 'options' => ['cabin' => 'economy']] : []),
            'travel_start' => $b['start'], 'travel_end' => $b['end'], 'pax' => ['adults' => $b['pax'], 'children' => 0, 'infants' => 0], 'pax_count' => $b['pax'],
            'subtotal' => $total, 'total' => $total, 'paid' => min($paid, $total), 'cost' => round($total * 0.82), 'payment_plan' => $paid > 0 && $paid < $total ? 'deposit' : 'full',
            'miles_earned' => (int) floor($total / 100), 'cancelled_at' => in_array($b['status'], ['cancelled', 'refunded'], true) ? CarbonImmutable::parse($created)->addDays(3) : null,
            'cancel_reason' => $b['status'] === 'cancelled' ? 'Customer request' : null, 'created_at' => $created.' 11:30:00', 'updated_at' => $created.' 11:30:00',
        ]);
        $unit = $b['pax'] > 0 ? round($total / $b['pax'], 2) : $total;
        $booking->items()->create(['bookable_type' => $product ? $product::class : null, 'bookable_id' => $product?->id, 'label' => S::b($b['title']), 'qty' => $b['pax'], 'unit_price' => $unit, 'line_total' => $total, 'cost' => round($total * 0.82)]);
        $names = $travellers ? array_map(fn ($t) => $t->name, array_slice($travellers, 0, max(1, $b['pax']))) : [$user->name];
        for ($k = 0; $k < $b['pax']; $k++) {
            $booking->travellers()->create(['traveller_id' => $travellers[$k]->id ?? null, 'name' => $names[$k] ?? ($user->name.' +'.$k), 'type' => 'adult',
                'ticket_no' => $b['kind'] === 'flight' ? ($pnr ? '179-'.(2468013579 + $k) : '997'.str_pad((string) mt_rand(0, 9999999999), 10, '0', STR_PAD_LEFT)) : null,
                'seat' => $pnr ? '14'.chr(65 + $k) : null]);
        }
        $booking->activities()->create(['type' => 'created', 'body' => ['en' => 'Booking created via '.$channel, 'bn' => $channel.' মাধ্যমে বুকিং তৈরি'], 'created_at' => $created.' 11:30:00']);
        if ($paid > 0) {
            $booking->activities()->create(['type' => 'payment', 'body' => ['en' => 'Payment received: ৳ '.number_format($paid).' via '.($method ?? 'bKash'), 'bn' => 'পেমেন্ট গৃহীত: ৳ '.number_format($paid)], 'created_at' => $created.' 11:35:00']);
        }
        foreach (['voucher' => ['E-voucher', 'ই-ভাউচার'], 'invoice' => ['Invoice', 'ইনভয়েস']] as $kind => [$en, $bn]) {
            if ($paid > 0) {
                $booking->documents()->create(['kind' => $kind, 'title' => ['en' => $en, 'bn' => $bn]]);
            }
        }

        return $booking;
    }
}
