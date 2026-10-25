<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Catalog as P;
use App\Models\Activity;
use App\Models\Airline;
use App\Models\Airport;
use App\Models\BlogPost;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\FlightOffer;
use App\Models\Hotel;
use App\Models\MediaAsset;
use App\Models\Tour;
use App\Models\VisaProduct;
use App\Services\Checkout\FlightFare;
use App\Support\Img;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SearchController extends Controller
{
    /** Site-wide search grouped by type (FULLTEXT ngram on MySQL, LIKE elsewhere). */
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'limit' => ['nullable', 'integer', 'min:1', 'max:20']]);
        $q = trim((string) ($data['q'] ?? ''));
        $n = (int) ($data['limit'] ?? 6);
        if (mb_strlen($q) < 2) {
            return response()->json(['data' => [], 'meta' => ['q' => $q, 'total' => 0]]);
        }
        $groups = [
            'tours' => Tour::published()->with(['image.media', 'cancellationPolicy', 'categories', 'destination'])->search($q)->limit($n)->get()->map(fn ($x) => P::tourCard($x)),
            'destinations' => Destination::published()->with('image.media')->search($q)->limit($n)->get()->map(fn ($x) => P::destinationCard($x)),
            'cruises' => Cruise::published()->with(['image.media', 'ship.line', 'cancellationPolicy'])->search($q)->limit($n)->get()->map(fn ($x) => P::cruiseCard($x)),
            'activities' => Activity::published()->with(['image.media', 'cancellationPolicy', 'destination'])->search($q)->limit($n)->get()->map(fn ($x) => P::activityCard($x)),
            'hotels' => Hotel::published()->with('image.media')->search($q)->limit($n)->get()->map(fn ($x) => P::hotelCard($x)),
            'visas' => VisaProduct::published()->with(['image.media', 'country'])->search($q)->limit($n)->get()->map(fn ($x) => P::visaCard($x)),
            'posts' => BlogPost::published()->with(['image.media', 'category'])->search($q)->limit($n)->get()->map(fn ($x) => P::postCard($x)),
        ];
        $groups = array_filter(array_map(fn ($c) => $c->values()->all(), $groups));

        return response()->json(['data' => $groups, 'meta' => ['q' => $q, 'total' => array_sum(array_map('count', $groups))]]);
    }

    public function airports(): JsonResponse
    {
        return response()->json(['data' => Airport::with('country')->orderByDesc('is_popular')->orderBy('iata')->get()->map(fn ($a) => [
            'iata' => $a->iata, 'name' => $a->tr('name'), 'city' => $a->tr('city'), 'country' => $a->country?->tr('name'), 'popular' => (bool) $a->is_popular,
        ])]);
    }

    /** Indicative fare search over admin-managed flight offers (a GDS/NDC connector can replace this source later). */
    public function flights(Request $request): JsonResponse
    {
        $v = $request->validate([
            'from' => ['required', 'string', 'size:3'], 'to' => ['required', 'string', 'size:3', 'different:from'],
            'date' => ['nullable', 'date'], 'return' => ['nullable', 'date', 'after_or_equal:date'],
            'adults' => ['nullable', 'integer', 'min:1', 'max:9'], 'children' => ['nullable', 'integer', 'min:0', 'max:8'], 'infants' => ['nullable', 'integer', 'min:0', 'max:4'],
            'cabin' => ['nullable', 'in:economy,premium,business,first'],
            'stops' => ['nullable', 'string', 'regex:/^[0-2](,[0-2])*$/'], 'airline' => ['nullable', 'string', 'regex:/^[A-Za-z0-9]{2,3}(,[A-Za-z0-9]{2,3})*$/'],
            'price_max' => ['nullable', 'numeric', 'min:0'], 'sort' => ['nullable', 'in:cheapest,fastest,earliest,best'],
        ]);
        $from = strtoupper($v['from']);
        $to = strtoupper($v['to']);
        $pax = ['adults' => (int) ($v['adults'] ?? 1), 'children' => (int) ($v['children'] ?? 0), 'infants' => (int) ($v['infants'] ?? 0)];
        $f = Settings::get('commerce.pax_factors', ['adults' => 1, 'children' => 0.7, 'infants' => 0.1]);
        $mult = $pax['adults'] * $f['adults'] + $pax['children'] * $f['children'] + $pax['infants'] * $f['infants'];
        $cabin = $v['cabin'] ?? 'economy';
        $cfg = Settings::get('flights.pricing', []);
        $taxShare = (float) ($cfg['tax_share'] ?? 0.22);
        $changeFee = (int) ($cfg['change_fee'] ?? 3500);
        $date = isset($v['date']) ? Carbon::parse($v['date'])->startOfDay() : today()->addDays(14);
        if ($date->lt(today())) {
            $date = today();
        }

        $all = FlightOffer::with('airline.logo.media')->where('is_active', true)->where('origin', $from)->where('destination', $to)->get();
        $price = fn ($o, Carbon $d) => FlightFare::perAdult($o, $cabin, $d);
        $stops = isset($v['stops']) ? array_map('intval', explode(',', $v['stops'])) : null;
        $airlines = isset($v['airline']) ? array_map('strtoupper', explode(',', $v['airline'])) : null;

        $offers = $all->filter(fn ($o) => (! $stops || in_array(min($o->stops, 2), $stops, true)) && (! $airlines || in_array($o->airline->code, $airlines, true)))
            ->map(function ($o) use ($date, $mult, $pax, $price, $taxShare, $changeFee) {
                $perAdult = $price($o, $date);
                $total = (int) round($perAdult * $mult);
                $taxes = (int) round($total * $taxShare);

                return [
                    'id' => $o->id, 'flight_no' => $o->flight_no, 'airline' => ['code' => $o->airline->code, 'name' => $o->airline->name, 'color' => $o->airline->color, 'logo' => Img::of($o->airline->logo)],
                    'origin' => $o->origin, 'destination' => $o->destination, 'date' => $date->toDateString(),
                    'dep_time' => substr((string) $o->dep_time, 0, 5), 'arr_time' => substr((string) $o->arr_time, 0, 5), 'duration_min' => $o->duration_min,
                    'next_day' => substr((string) $o->arr_time, 0, 5) < substr((string) $o->dep_time, 0, 5),
                    'stops' => $o->stops, 'via' => $o->via, 'cabin' => $o->cabin, 'baggage' => $o->baggage, 'refundable' => (bool) $o->refundable, 'seats' => $o->seats,
                    'fare' => $perAdult, 'total' => $total, 'base' => $total - $taxes, 'taxes' => $taxes, 'change_fee' => $changeFee, 'pax' => $pax,
                ];
            })
            ->when(isset($v['price_max']), fn ($c) => $c->filter(fn ($o) => $o['fare'] <= (float) $v['price_max']))
            ->values();
        // "Best" balances price and journey time (each normalised to the cheapest/fastest result).
        $minFare = max(1, (int) $offers->min('fare'));
        $minDur = max(1, (int) $offers->min('duration_min'));
        $offers = $offers->map(fn ($o) => $o + ['score' => round($o['fare'] / $minFare + 0.6 * $o['duration_min'] / $minDur, 4)]);
        $offers = match ($v['sort'] ?? 'cheapest') {
            'fastest' => $offers->sortBy([['duration_min', 'asc'], ['fare', 'asc']]),
            'earliest' => $offers->sortBy('dep_time'),
            'best' => $offers->sortBy('score'),
            default => $offers->sortBy([['fare', 'asc'], ['duration_min', 'asc']]),
        };
        $best = $offers->sortBy('score')->first();

        // Lowest fare for each day around the requested date (flexible-dates strip); never in the past.
        $startDay = $date->copy()->subDays(3)->max(today());
        $dates = collect(range(0, 6))->map(fn ($k) => $startDay->copy()->addDays($k))->map(fn (Carbon $d) => [
            'date' => $d->toDateString(), 'fare' => $all->isEmpty() ? null : $all->min(fn ($o) => $price($o, $d)),
        ]);
        $fares = $all->map(fn ($o) => $price($o, $date));

        return response()->json(['data' => $offers->values(), 'meta' => [
            'from' => $from, 'to' => $to, 'date' => $date->toDateString(), 'return' => $v['return'] ?? null, 'total' => $offers->count(),
            'airlines' => $all->pluck('airline')->unique('id')->map(fn ($a) => ['code' => $a->code, 'name' => $a->name])->values(),
            'cheapest' => $offers->min('fare'), 'fastest_min' => $offers->min('duration_min'), 'best' => $best['fare'] ?? null,
            'price_range' => ['min' => $fares->min(), 'max' => $fares->max()], 'dates' => $dates,
        ]]);
    }

    /** Popular routes (with live "from" fares) and ticketed airlines for the flights landing page. */
    public function flightRoutes(): JsonResponse
    {
        $routes = collect(Settings::get('flights.popular_routes', []));
        $mins = FlightOffer::where('is_active', true)->where('cabin', 'economy')->selectRaw('origin, destination, MIN(fare) as fare')->groupBy('origin', 'destination')->get()
            ->keyBy(fn ($r) => $r->origin.'-'.$r->destination);
        $ap = Airport::whereIn('iata', $routes->flatMap(fn ($r) => [$r['from'], $r['to']])->unique())->get()->keyBy('iata');
        $imgs = MediaAsset::with('media')->whereIn('key', $routes->pluck('image')->filter()->unique())->get()->keyBy('key');

        return response()->json(['data' => [
            'routes' => $routes->map(fn ($r) => [
                'from' => $r['from'], 'to' => $r['to'], 'from_city' => $ap[$r['from']]?->tr('city') ?? $r['from'], 'to_city' => $ap[$r['to']]?->tr('city') ?? $r['to'],
                'fare' => isset($mins[$r['from'].'-'.$r['to']]) ? (int) $mins[$r['from'].'-'.$r['to']]->fare : null, 'image' => Img::of($imgs[$r['image'] ?? ''] ?? null),
            ])->values(),
            'airlines' => Airline::where('is_active', true)->orderBy('id')->get()->map(fn ($a) => ['code' => $a->code, 'name' => $a->name, 'color' => $a->color]),
        ]]);
    }
}
