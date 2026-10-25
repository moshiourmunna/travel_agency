<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Catalog as P;
use App\Models\Activity;
use App\Models\Airport;
use App\Models\BlogPost;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\FlightOffer;
use App\Models\Hotel;
use App\Models\Tour;
use App\Models\VisaProduct;
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
            'stops' => ['nullable', 'integer', 'min:0', 'max:2'], 'airline' => ['nullable', 'string', 'max:3'], 'sort' => ['nullable', 'in:cheapest,fastest,earliest'],
        ]);
        $from = strtoupper($v['from']);
        $to = strtoupper($v['to']);
        $pax = ['adults' => (int) ($v['adults'] ?? 1), 'children' => (int) ($v['children'] ?? 0), 'infants' => (int) ($v['infants'] ?? 0)];
        $f = Settings::get('commerce.pax_factors', ['adults' => 1, 'children' => 0.7, 'infants' => 0.1]);
        $mult = $pax['adults'] * $f['adults'] + $pax['children'] * $f['children'] + $pax['infants'] * $f['infants'];
        $cabinMult = ['economy' => 1, 'premium' => 1.6, 'business' => 3.2, 'first' => 5][$v['cabin'] ?? 'economy'];
        $date = isset($v['date']) ? Carbon::parse($v['date']) : today()->addDays(14);

        $q = FlightOffer::with('airline.logo.media')->where('is_active', true)->where('origin', $from)->where('destination', $to)
            ->when(isset($v['stops']), fn ($q) => $q->where('stops', '<=', $v['stops']))
            ->when($v['airline'] ?? null, fn ($q, $a) => $q->whereHas('airline', fn ($x) => $x->where('code', strtoupper($a))));
        match ($v['sort'] ?? 'cheapest') {
            'fastest' => $q->orderBy('duration_min'),
            'earliest' => $q->orderBy('dep_time'),
            default => $q->orderBy('fare'),
        };
        $offers = $q->get()->map(function ($o) use ($date, $mult, $cabinMult, $pax) {
            $perAdult = (int) round($o->fare * $cabinMult);

            return [
                'id' => $o->id, 'flight_no' => $o->flight_no, 'airline' => ['code' => $o->airline->code, 'name' => $o->airline->name, 'color' => $o->airline->color, 'logo' => Img::of($o->airline->logo)],
                'origin' => $o->origin, 'destination' => $o->destination, 'date' => $date->toDateString(),
                'dep_time' => substr((string) $o->dep_time, 0, 5), 'arr_time' => substr((string) $o->arr_time, 0, 5), 'duration_min' => $o->duration_min,
                'stops' => $o->stops, 'via' => $o->via, 'cabin' => $o->cabin, 'baggage' => $o->baggage, 'refundable' => (bool) $o->refundable, 'seats' => $o->seats,
                'fare' => $perAdult, 'total' => (int) round($perAdult * $mult), 'pax' => $pax,
            ];
        });
        $all = FlightOffer::with('airline')->where('is_active', true)->where('origin', $from)->where('destination', $to)->get();

        return response()->json(['data' => $offers->values(), 'meta' => [
            'from' => $from, 'to' => $to, 'date' => $date->toDateString(), 'return' => $v['return'] ?? null, 'total' => $offers->count(),
            'airlines' => $all->pluck('airline')->unique('id')->map(fn ($a) => ['code' => $a->code, 'name' => $a->name])->values(),
            'cheapest' => $offers->min('fare'), 'fastest_min' => $offers->min('duration_min'),
        ]]);
    }
}
