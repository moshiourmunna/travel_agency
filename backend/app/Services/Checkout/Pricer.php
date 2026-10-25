<?php

namespace App\Services\Checkout;

use App\Models\Activity;
use App\Models\ActivitySlot;
use App\Models\Cruise;
use App\Models\FlightOffer;
use App\Models\GiftCardDesign;
use App\Models\Hotel;
use App\Models\MediaAsset;
use App\Models\Tour;
use App\Models\TourAddon;
use App\Models\User;
use App\Models\VisaProduct;
use App\Support\Settings;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Server-side pricing for every bookable product. The browser only sends *what* was picked
 * (slug, date, room, pax, add-ons); every amount is recomputed here from the database, so a
 * tampered price can never reach a booking. The same maths as the public booking cards.
 *
 * Output (a "quote"):
 *   kind, product (model), title/subtitle {en,bn}, image_key, travel_start/end, pax{}, pax_count,
 *   lines[] {code,label{en,bn},qty,unit,total,bookable?}, subtotal, discount, coupon, total,
 *   plans {full, deposit, instalments} with amount due now and schedule, cancellation policy.
 */
final class Pricer
{
    public const KINDS = ['tour', 'cruise', 'activity', 'hotel', 'flight', 'visa', 'gift_card'];

    public function __construct(private CouponService $coupons) {}

    /** @param array<string,mixed> $in */
    public function quote(array $in, ?User $user = null): array
    {
        $kind = (string) ($in['kind'] ?? '');
        $q = match ($kind) {
            'tour' => $this->tour($in),
            'cruise' => $this->cruise($in),
            'activity' => $this->activity($in),
            'hotel' => $this->hotel($in),
            'flight' => $this->flight($in),
            'visa' => $this->visa($in),
            'gift_card' => $this->gift($in),
            default => throw ValidationException::withMessages(['kind' => __('Unknown product type.')]),
        };
        $q['kind'] = $kind;
        $q['image_key'] = $q['image_id'] ? MediaAsset::whereKey($q['image_id'])->value('key') : null;
        $q['subtotal'] = (int) round(array_sum(array_column($q['lines'], 'total')));

        // Coupon (optional): validated against kind, spend, dates, usage caps and first-booking rules.
        $q['discount'] = 0;
        $q['coupon'] = null;
        if (! empty($in['coupon'])) {
            $c = $this->coupons->evaluate((string) $in['coupon'], $kind, $q['subtotal'], $user, $in['contact']['email'] ?? null);
            $q['discount'] = $c['discount'];
            $q['coupon'] = ['code' => $c['coupon']->code, 'id' => $c['coupon']->id, 'label' => $c['coupon']->tr('name'), 'discount' => $c['discount']];
        }
        $q['total'] = max(0, $q['subtotal'] - $q['discount']);
        $q['plans'] = $this->plans($q);

        return $q;
    }

    /** Payment plans: full (optional instant discount), deposit (balance due N days before travel), instalments (monthly). */
    public function plans(array $q): array
    {
        $total = $q['total'];
        $fullPct = (float) Settings::get('commerce.full_pay_discount_pct', 2);
        $depPct = (float) Settings::get('commerce.deposit_pct', 30);
        $n = max(2, (int) Settings::get('commerce.instalments', 3));
        $dueDays = (int) Settings::get('commerce.balance_due_days', 21);
        $start = isset($q['travel_start']) ? Carbon::parse($q['travel_start']) : null;
        $today = today();
        $fullDiscount = in_array($q['kind'], ['tour', 'cruise', 'hotel'], true) ? (int) round($total * $fullPct / 100) : 0;
        $plans = ['full' => ['code' => 'full', 'now' => $total - $fullDiscount, 'discount' => $fullDiscount, 'total' => $total - $fullDiscount, 'schedule' => []]];

        // Deposits/instalments only make sense for trips far enough away and above a minimum value.
        $balanceDue = $start ? $start->copy()->subDays($dueDays) : null;
        $minForPlans = (int) Settings::get('commerce.plans_min_total', 20000);
        if ($start && $balanceDue->gt($today->copy()->addDays(6)) && $total >= $minForPlans && in_array($q['kind'], ['tour', 'cruise', 'hotel'], true)) {
            $dep = (int) round($total * $depPct / 100);
            $plans['deposit'] = ['code' => 'deposit', 'now' => $dep, 'discount' => 0, 'total' => $total, 'pct' => $depPct,
                'schedule' => [['seq' => 1, 'due_date' => $today->toDateString(), 'amount' => $dep], ['seq' => 2, 'due_date' => $balanceDue->toDateString(), 'amount' => $total - $dep]]];
            // Instalments: equal monthly parts, the last one no later than the balance due date.
            $parts = [];
            $each = (int) floor($total / $n);
            for ($k = 0; $k < $n; $k++) {
                $due = $k === 0 ? $today->copy() : $today->copy()->addMonthsNoOverflow($k);
                if ($due->gt($balanceDue)) {
                    $due = $balanceDue->copy();
                }
                $parts[] = ['seq' => $k + 1, 'due_date' => $due->toDateString(), 'amount' => $k === $n - 1 ? $total - $each * ($n - 1) : $each];
            }
            $plans['instalments'] = ['code' => 'instalments', 'now' => $parts[0]['amount'], 'discount' => 0, 'total' => $total, 'count' => $n, 'schedule' => $parts];
        }

        return $plans;
    }

    private static function pax(array $in, int $minAdults = 1, int $max = 9): array
    {
        $p = ['adults' => (int) ($in['adults'] ?? 1), 'children' => (int) ($in['children'] ?? 0), 'infants' => (int) ($in['infants'] ?? 0)];
        if ($p['adults'] < $minAdults || $p['adults'] > $max || $p['children'] < 0 || $p['children'] > $max || $p['infants'] < 0 || $p['infants'] > $p['adults']) {
            throw ValidationException::withMessages(['adults' => __('Please check the number of travellers.')]);
        }

        return $p;
    }

    private static function tr(mixed $model, string $attr): array
    {
        $v = $model->getTranslations($attr);

        return ['en' => $v['en'] ?? '', 'bn' => ($v['bn'] ?? '') ?: ($v['en'] ?? '')];
    }

    private static function both(string $en, string $bn): array
    {
        return ['en' => $en, 'bn' => $bn];
    }

    private static function fail(string $field, string $msg): never
    {
        throw ValidationException::withMessages([$field => $msg]);
    }

    private function addonLines(array $codes, array $catalogue, int $persons): array
    {
        $lines = [];
        foreach (array_unique(array_filter($codes, 'is_string')) as $code) {
            $a = collect($catalogue)->firstWhere('code', $code);
            if (! $a) {
                self::fail('addons', __('An add-on is no longer available.'));
            }
            $qty = ($a['per'] ?? 'booking') === 'person' ? $persons : 1;
            $lines[] = ['code' => 'addon:'.$code, 'label' => $a['label'], 'qty' => $qty, 'unit' => (int) $a['price'], 'total' => (int) $a['price'] * $qty, 'bookable' => $a['bookable'] ?? null];
        }

        return $lines;
    }

    private function tour(array $in): array
    {
        $t = Tour::published()->with(['departures', 'priceTiers', 'cancellationPolicy'])->where('slug', (string) ($in['slug'] ?? ''))->first() ?? self::fail('slug', __('This trip is not available.'));
        $p = self::pax($in);
        $dep = $t->departures->first(fn ($d) => $d->date->toDateString() === ($in['date'] ?? null));
        if (! $dep || $dep->date->lt(today()) || $dep->status === 'sold_out') {
            self::fail('date', __('Please pick an available departure date.'));
        }
        $persons = $p['adults'] + $p['children'];
        if ($dep->seatsLeft() < $persons) {
            self::fail('date', __('Only :n seats are left on this date.', ['n' => $dep->seatsLeft()]));
        }
        $tier = $t->priceTiers->firstWhere('code', $in['room'] ?? 'twin') ?? $t->priceTiers->first();
        $factor = (float) ($tier?->factor ?? 1);
        $unit = (float) $dep->price * $factor;
        $f = Settings::get('commerce.pax_factors', ['adults' => 1, 'children' => 0.7, 'infants' => 0.1]);
        $tierLabel = $tier ? self::tr($tier, 'label') : self::both('Twin sharing', 'দুজনের রুম');
        $title = self::tr($t, 'title');
        $lines = [['code' => 'adult', 'label' => ['en' => "{$title['en']} — adult ({$tierLabel['en']})", 'bn' => "{$title['bn']} — প্রাপ্তবয়স্ক ({$tierLabel['bn']})"], 'qty' => $p['adults'], 'unit' => (int) round($unit * $f['adults']), 'bookable' => ['TourDeparture', $dep->id]]];
        if ($p['children']) {
            $lines[] = ['code' => 'child', 'label' => self::both('Child (2–11)', 'শিশু (২–১১)'), 'qty' => $p['children'], 'unit' => (int) round($unit * $f['children']), 'bookable' => ['TourDeparture', $dep->id]];
        }
        if ($p['infants']) {
            $lines[] = ['code' => 'infant', 'label' => self::both('Infant (0–2)', 'ইনফ্যান্ট (০–২)'), 'qty' => $p['infants'], 'unit' => (int) round($unit * $f['infants']), 'bookable' => ['TourDeparture', $dep->id]];
        }
        foreach ($lines as &$l) {
            $l['total'] = $l['unit'] * $l['qty'];
        }
        unset($l);
        $cat = TourAddon::where('is_active', true)->where(fn ($q) => $q->whereNull('tour_id')->orWhere('tour_id', $t->id))->get()
            ->map(fn ($a) => ['code' => $a->code, 'label' => self::tr($a, 'label'), 'price' => (float) $a->price, 'per' => $a->per, 'bookable' => ['TourAddon', $a->id]])->all();
        $lines = array_merge($lines, $this->addonLines((array) ($in['addons'] ?? []), $cat, $persons));

        return ['product' => $t, 'title' => $title, 'subtitle' => ['en' => "{$t->days} days · ".($t->getTranslation('location', 'en') ?? ''), 'bn' => "{$t->days} দিন · ".($t->getTranslation('location', 'bn') ?: $t->getTranslation('location', 'en'))],
            'image_id' => $t->image_id, 'travel_start' => $dep->date->toDateString(), 'travel_end' => ($dep->return_date ?? $dep->date->copy()->addDays(max(0, $t->days - 1)))->toDateString(),
            'pax' => $p, 'pax_count' => $persons + $p['infants'], 'seats' => $persons, 'hold' => ['TourDeparture', $dep->id],
            'options' => ['date' => $dep->date->toDateString(), 'room' => $tier?->code, 'addons' => array_values((array) ($in['addons'] ?? []))],
            'addons_catalogue' => array_map(fn ($a) => array_diff_key($a, ['bookable' => 1]), $cat), 'policy' => $t->cancellationPolicy, 'lines' => $lines];
    }

    private function cruise(array $in): array
    {
        $c = Cruise::published()->with(['cabins', 'sailings', 'cancellationPolicy'])->where('slug', (string) ($in['slug'] ?? ''))->first() ?? self::fail('slug', __('This cruise is not available.'));
        $guests = (int) ($in['adults'] ?? 2);
        if ($guests < 1 || $guests > 8) {
            self::fail('adults', __('Please check the number of travellers.'));
        }
        $s = $c->sailings->first(fn ($x) => $x->date->toDateString() === ($in['date'] ?? null) && $x->date->gte(today())) ?? self::fail('date', __('Please pick an available sailing.'));
        if ($s->seats_total - $s->seats_held < $guests) {
            self::fail('date', __('Only :n berths are left on this sailing.', ['n' => max(0, $s->seats_total - $s->seats_held)]));
        }
        $def = $c->cabins->firstWhere('code', 'ocean') ?? $c->cabins->first();
        $cab = $c->cabins->firstWhere('code', $in['cabin'] ?? $def?->code) ?? self::fail('cabin', __('Please pick a cabin.'));
        $unit = (int) round((float) $s->price * ((float) $cab->price / max(1, (float) $def->price)));
        $title = self::tr($c, 'title');
        $lines = [['code' => 'cabin', 'label' => ['en' => "{$title['en']} — {$cab->getTranslation('name', 'en')}", 'bn' => "{$title['bn']} — ".($cab->getTranslation('name', 'bn') ?: $cab->getTranslation('name', 'en'))], 'qty' => $guests, 'unit' => $unit, 'total' => $unit * $guests, 'bookable' => ['CruiseSailing', $s->id]]];
        $cat = array_map(fn ($a) => $a + ['bookable' => null], (array) Settings::get('commerce.cruise_addons', []));
        $lines = array_merge($lines, $this->addonLines((array) ($in['addons'] ?? []), $cat, $guests));

        return ['product' => $c, 'title' => $title, 'subtitle' => ['en' => "{$c->nights} nights · ".$c->getTranslation('depart_port', 'en'), 'bn' => "{$c->nights} রাত · ".($c->getTranslation('depart_port', 'bn') ?: $c->getTranslation('depart_port', 'en'))],
            'image_id' => $c->image_id, 'travel_start' => $s->date->toDateString(), 'travel_end' => ($s->return_date ?? $s->date->copy()->addDays($c->nights))->toDateString(),
            'pax' => ['adults' => $guests, 'children' => 0, 'infants' => 0], 'pax_count' => $guests, 'seats' => $guests, 'hold' => ['CruiseSailing', $s->id],
            'options' => ['date' => $s->date->toDateString(), 'cabin' => $cab->code, 'addons' => array_values((array) ($in['addons'] ?? []))],
            'addons_catalogue' => array_map(fn ($a) => array_diff_key($a, ['bookable' => 1]), $cat), 'policy' => $c->cancellationPolicy, 'lines' => $lines];
    }

    private function activity(array $in): array
    {
        $a = Activity::published()->with(['options', 'cancellationPolicy'])->where('slug', (string) ($in['slug'] ?? ''))->first() ?? self::fail('slug', __('This activity is not available.'));
        $p = self::pax($in, 1, 10);
        $date = (string) ($in['date'] ?? '');
        $slot = ActivitySlot::where('activity_id', $a->id)->whereDate('starts_at', $date)->get()->first(fn ($s) => $s->starts_at->format('H:i') === ($in['time'] ?? ''));
        if (! $slot || $slot->starts_at->lt(now())) {
            self::fail('time', __('Please pick an available time slot.'));
        }
        $n = $p['adults'] + $p['children'];
        if ($slot->capacity - $slot->booked < $n) {
            self::fail('time', __('Only :n places are left at this time.', ['n' => max(0, $slot->capacity - $slot->booked)]));
        }
        $opt = isset($in['option']) ? $a->options->firstWhere('id', (int) $in['option']) : null;
        $price = (int) round((float) ($opt?->price ?? $slot->price ?? $a->price));
        $child = (int) round((float) ($opt?->child_price ?? $price * 0.7));
        $title = self::tr($a, 'title');
        $lines = [['code' => 'adult', 'label' => ['en' => "{$title['en']} — adult", 'bn' => "{$title['bn']} — প্রাপ্তবয়স্ক"], 'qty' => $p['adults'], 'unit' => $price, 'total' => $price * $p['adults'], 'bookable' => ['ActivitySlot', $slot->id]]];
        if ($p['children']) {
            $lines[] = ['code' => 'child', 'label' => self::both('Child', 'শিশু'), 'qty' => $p['children'], 'unit' => $child, 'total' => $child * $p['children'], 'bookable' => ['ActivitySlot', $slot->id]];
        }

        return ['product' => $a, 'title' => $title, 'subtitle' => ['en' => $slot->starts_at->format('j M Y, H:i').' · '.$a->getTranslation('city', 'en'), 'bn' => $slot->starts_at->format('Y-m-d H:i').' · '.($a->getTranslation('city', 'bn') ?: $a->getTranslation('city', 'en'))],
            'image_id' => $a->image_id, 'travel_start' => $slot->starts_at->toDateString(), 'travel_end' => $slot->starts_at->toDateString(),
            'pax' => $p, 'pax_count' => $n, 'seats' => $n, 'hold' => ['ActivitySlot', $slot->id],
            'options' => ['date' => $slot->starts_at->toDateString(), 'time' => $slot->starts_at->format('H:i'), 'option' => $opt?->id], 'addons_catalogue' => [], 'policy' => $a->cancellationPolicy, 'lines' => $lines];
    }

    private function hotel(array $in): array
    {
        $h = Hotel::published()->with('roomTypes')->where('slug', (string) ($in['slug'] ?? ''))->first() ?? self::fail('slug', __('This hotel is not available.'));
        try {
            $din = Carbon::parse((string) ($in['in'] ?? ''))->startOfDay();
            $dout = Carbon::parse((string) ($in['out'] ?? ''))->startOfDay();
        } catch (\Throwable) {
            self::fail('in', __('Please pick your stay dates.'));
        }
        $nights = (int) $din->diffInDays($dout);
        if ($din->lt(today()) || $nights < 1 || $nights > 30) {
            self::fail('in', __('Please pick your stay dates.'));
        }
        $rooms = (int) ($in['rooms'] ?? 1);
        if ($rooms < 1 || $rooms > 5) {
            self::fail('rooms', __('Please check the number of rooms.'));
        }
        $rt = $h->roomTypes->firstWhere('id', (int) ($in['room'] ?? 0)) ?? $h->roomTypes->sortBy('price')->first() ?? self::fail('room', __('Please pick a room.'));
        $p = ['adults' => (int) ($in['adults'] ?? min(2 * $rooms, 9)), 'children' => (int) ($in['children'] ?? 0), 'infants' => 0];
        $name = self::tr($h, 'name');
        $rn = self::tr($rt, 'name');
        $unit = (int) round((float) $rt->price);
        $lines = [['code' => 'room', 'label' => ['en' => "{$rn['en']} × {$nights} nights", 'bn' => "{$rn['bn']} × {$nights} রাত"], 'qty' => $rooms, 'unit' => $unit * $nights, 'total' => $unit * $nights * $rooms, 'bookable' => ['HotelRoomType', $rt->id]]];
        $cat = array_map(fn ($a) => $a + ['bookable' => null], (array) Settings::get('commerce.hotel_addons', []));
        $lines = array_merge($lines, $this->addonLines((array) ($in['addons'] ?? []), $cat, $rooms));

        return ['product' => $h, 'title' => $name, 'subtitle' => ['en' => "{$din->format('j M')} – {$dout->format('j M Y')} · {$nights} nights", 'bn' => "{$din->toDateString()} – {$dout->toDateString()} · {$nights} রাত"],
            'image_id' => $h->image_id, 'travel_start' => $din->toDateString(), 'travel_end' => $dout->toDateString(), 'pax' => $p, 'pax_count' => $p['adults'] + $p['children'], 'seats' => 0, 'hold' => null,
            'options' => ['in' => $din->toDateString(), 'out' => $dout->toDateString(), 'room' => $rt->id, 'rooms' => $rooms, 'addons' => array_values((array) ($in['addons'] ?? []))],
            'addons_catalogue' => array_map(fn ($a) => array_diff_key($a, ['bookable' => 1]), $cat), 'policy' => null, 'refundable' => (bool) $rt->refundable, 'lines' => $lines];
    }

    private function flight(array $in): array
    {
        $o = FlightOffer::with('airline')->where('is_active', true)->find((int) ($in['flight'] ?? 0)) ?? self::fail('flight', __('This fare is no longer available.'));
        $paxMap = ['1' => [1, 0], '2' => [2, 0], '2-1' => [2, 1], '3' => [3, 0], '4' => [4, 0]];
        $p = isset($in['pax']) && isset($paxMap[$in['pax']]) ? ['adults' => $paxMap[$in['pax']][0], 'children' => $paxMap[$in['pax']][1], 'infants' => 0] : self::pax($in);
        try {
            $date = Carbon::parse((string) ($in['date'] ?? ''))->startOfDay();
        } catch (\Throwable) {
            self::fail('date', __('Please pick a travel date.'));
        }
        if ($date->lt(today())) {
            self::fail('date', __('Please pick a travel date.'));
        }
        if ($o->seats < $p['adults'] + $p['children']) {
            self::fail('flight', __('Not enough seats on this fare.'));
        }
        $cabin = in_array($in['cabin'] ?? 'economy', ['economy', 'premium', 'business', 'first'], true) ? ($in['cabin'] ?? 'economy') : 'economy';
        $perAdult = FlightFare::perAdult($o, $cabin, $date);
        $f = Settings::get('commerce.pax_factors', ['adults' => 1, 'children' => 0.7, 'infants' => 0.1]);
        $route = "{$o->origin} → {$o->destination}";
        $lines = [['code' => 'adult', 'label' => self::both("{$o->airline->name} {$o->flight_no} · {$route} — adult", "{$o->airline->name} {$o->flight_no} · {$route} — প্রাপ্তবয়স্ক"), 'qty' => $p['adults'], 'unit' => $perAdult, 'total' => $perAdult * $p['adults'], 'bookable' => ['FlightOffer', $o->id]]];
        if ($p['children']) {
            $u = (int) round($perAdult * $f['children']);
            $lines[] = ['code' => 'child', 'label' => self::both('Child fare', 'শিশু ভাড়া'), 'qty' => $p['children'], 'unit' => $u, 'total' => $u * $p['children'], 'bookable' => ['FlightOffer', $o->id]];
        }
        $ret = null;
        if (! empty($in['return'])) {
            try {
                $ret = Carbon::parse((string) $in['return'])->startOfDay();
            } catch (\Throwable) {
                $ret = null;
            }
        }

        return ['product' => $o, 'title' => self::both("Flight {$route}", "ফ্লাইট {$route}"), 'subtitle' => self::both("{$o->airline->name} {$o->flight_no} · ".ucfirst($cabin), "{$o->airline->name} {$o->flight_no} · ".ucfirst($cabin)),
            'image_id' => null, 'travel_start' => $date->toDateString(), 'travel_end' => ($ret && $ret->gte($date) ? $ret : $date)->toDateString(), 'pax' => $p, 'pax_count' => $p['adults'] + $p['children'], 'seats' => 0, 'hold' => null,
            'options' => ['flight' => $o->id, 'date' => $date->toDateString(), 'return' => $ret?->toDateString(), 'cabin' => $cabin, 'pax' => $in['pax'] ?? null], 'addons_catalogue' => [], 'policy' => null, 'refundable' => (bool) $o->refundable, 'lines' => $lines];
    }

    private function visa(array $in): array
    {
        $v = VisaProduct::published()->where('slug', (string) ($in['slug'] ?? ''))->first() ?? self::fail('slug', __('This visa service is not available.'));
        $n = (int) ($in['adults'] ?? 1);
        if ($n < 1 || $n > 9) {
            self::fail('adults', __('Please check the number of applicants.'));
        }
        $country = self::tr($v, 'country_name');
        $type = self::tr($v, 'type');
        $fee = (int) round((float) $v->fee);

        return ['product' => $v, 'title' => ['en' => "{$country['en']} visa — {$type['en']}", 'bn' => "{$country['bn']} ভিসা — {$type['bn']}"], 'subtitle' => self::tr($v, 'processing'),
            'image_id' => $v->image_id, 'travel_start' => null, 'travel_end' => null, 'pax' => ['adults' => $n, 'children' => 0, 'infants' => 0], 'pax_count' => $n, 'seats' => 0, 'hold' => null,
            'options' => ['adults' => $n], 'addons_catalogue' => [], 'policy' => null,
            'lines' => [['code' => 'applicant', 'label' => self::both('Visa processing — per applicant', 'ভিসা প্রসেসিং — প্রতি আবেদনকারী'), 'qty' => $n, 'unit' => $fee, 'total' => $fee * $n, 'bookable' => ['VisaProduct', $v->id]]]];
    }

    private function gift(array $in): array
    {
        $d = GiftCardDesign::where('is_active', true)->where('code', (string) ($in['gift'] ?? $in['slug'] ?? ''))->first() ?? self::fail('gift', __('Please pick a gift card design.'));
        $amount = (int) ($in['amount'] ?? 0);
        $min = (int) Settings::get('commerce.gift_min', 1000);
        $max = (int) Settings::get('commerce.gift_max', 500000);
        if ($amount < $min || $amount > $max) {
            self::fail('amount', __('Gift card amount must be between :min and :max.', ['min' => $min, 'max' => $max]));
        }
        $name = self::tr($d, 'name');

        return ['product' => $d, 'title' => ['en' => "Gift card — {$name['en']}", 'bn' => "গিফট কার্ড — {$name['bn']}"], 'subtitle' => ['en' => 'For '.mb_substr((string) ($in['to'] ?? 'someone special'), 0, 60), 'bn' => mb_substr((string) ($in['to'] ?? 'প্রিয়জনের জন্য'), 0, 60)],
            'image_id' => $d->image_id, 'travel_start' => null, 'travel_end' => null, 'pax' => ['adults' => 1, 'children' => 0, 'infants' => 0], 'pax_count' => 1, 'seats' => 0, 'hold' => null,
            'options' => ['gift' => $d->code, 'amount' => $amount, 'to' => mb_substr((string) ($in['to'] ?? ''), 0, 80), 'email' => mb_substr((string) ($in['email'] ?? ''), 0, 120), 'message' => mb_substr((string) ($in['message'] ?? ''), 0, 300), 'send_on' => $in['send_on'] ?? null],
            'addons_catalogue' => [], 'policy' => null,
            'lines' => [['code' => 'gift', 'label' => $name, 'qty' => 1, 'unit' => $amount, 'total' => $amount, 'bookable' => ['GiftCardDesign', $d->id]]]];
    }
}
