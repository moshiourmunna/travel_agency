<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Destination;
use App\Models\Inquiry;
use App\Models\Lead;
use App\Support\Img;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Trip planner: admin-managed cost model (planner_costs + settings.planner) and a server-side estimate identical to the mockup's live calculator. */
class PlannerController extends Controller
{
    public function config(): JsonResponse
    {
        $dests = Destination::published()->with(['image.media', 'plannerCost'])->whereHas('plannerCost')->ordered()->get();
        $acts = Activity::published()->with(['image.media', 'destination'])->ordered()->get();

        return response()->json(['data' => [
            'destinations' => $dests->map(fn ($d) => ['slug' => $d->slug, 'name' => $d->tr('name'), 'region' => $d->region, 'image' => Img::of($d->image),
                'land' => (int) $d->plannerCost->cost_per_day_standard, 'air' => (int) $d->plannerCost->flight_estimate, 'default_days' => $d->region === 'bd' ? 3 : 4])->values(),
            'activities' => $acts->map(fn ($a) => ['slug' => $a->slug, 'title' => $a->tr('title'), 'city' => $a->tr('city'), 'price' => (int) $a->price,
                'destination' => $a->destination?->slug, 'image' => Img::of($a->image)])->values(),
            'tiers' => collect(self::tiers())->map(fn ($t, $k) => ['key' => $k, 'mult' => $t['mult'], 'label' => tr_pick($t['label']), 'description' => tr_pick($t['description'])])->values(),
            'rules' => self::rules(),
        ]]);
    }

    private static function tiers(): array
    {
        return Settings::get('planner.tiers', [
            'budget' => ['mult' => 0.75, 'label' => ['en' => 'Budget', 'bn' => 'বাজেট'], 'description' => ['en' => '3★ hotels, shared transfers', 'bn' => '৩★ হোটেল, শেয়ার্ড ট্রান্সফার']],
            'comfort' => ['mult' => 1, 'label' => ['en' => 'Comfort', 'bn' => 'কমফোর্ট'], 'description' => ['en' => '4★ hotels, private transfers', 'bn' => '৪★ হোটেল, প্রাইভেট ট্রান্সফার']],
            'luxury' => ['mult' => 1.7, 'label' => ['en' => 'Luxury', 'bn' => 'লাক্সারি'], 'description' => ['en' => '5★ & villas, private guide', 'bn' => '৫★ ও ভিলা, প্রাইভেট গাইড']],
        ]);
    }

    private static function rules(): array
    {
        return Settings::get('planner.rules', ['max_destinations' => 4, 'min_days' => 1, 'max_days' => 14, 'child_factor' => 0.7, 'leg_cost' => 6000, 'round_to' => 100]);
    }

    private function validated(Request $request): array
    {
        $r = self::rules();

        return $request->validate([
            'stops' => ['required', 'array', 'min:1', 'max:'.$r['max_destinations']],
            'stops.*.slug' => ['required', 'string', 'distinct', 'exists:destinations,slug'],
            'stops.*.days' => ['required', 'integer', 'min:'.$r['min_days'], 'max:'.$r['max_days']],
            'adults' => ['required', 'integer', 'min:1', 'max:20'], 'children' => ['nullable', 'integer', 'min:0', 'max:10'],
            'tier' => ['nullable', 'in:'.implode(',', array_keys(self::tiers()))],
            'activities' => ['nullable', 'array', 'max:20'], 'activities.*' => ['string', 'exists:activities,slug'],
            'start' => ['nullable', 'date', 'after_or_equal:today'],
        ]);
    }

    public static function compute(array $v): array
    {
        $r = self::rules();
        $mult = self::tiers()[$v['tier'] ?? 'comfort']['mult'] ?? 1;
        $adults = (int) $v['adults'];
        $kids = (int) ($v['children'] ?? 0);
        $pax = $adults + $kids * $r['child_factor'];
        $heads = $adults + $kids;
        $dests = Destination::with('plannerCost')->whereIn('slug', array_column($v['stops'], 'slug'))->get()->keyBy('slug');
        $land = 0;
        $maxAir = 0;
        $days = 0;
        foreach ($v['stops'] as $s) {
            $c = $dests[$s['slug']]->plannerCost;
            $land += ($c?->cost_per_day_standard ?? 0) * $s['days'] * $mult * $pax;
            $maxAir = max($maxAir, (float) ($c?->flight_estimate ?? 0));
            $days += $s['days'];
        }
        $air = ($maxAir + (count($v['stops']) - 1) * $r['leg_cost']) * $pax;
        $slugs = array_keys($dests->all());
        $acts = Activity::with('destination')->whereIn('slug', $v['activities'] ?? [])->get()
            ->filter(fn ($a) => ! $a->destination_id || in_array($a->destination?->slug, $slugs, true))->sum(fn ($a) => $a->price * $heads);
        $round = fn ($x) => (int) (round($x / $r['round_to']) * $r['round_to']);
        $total = $round($land) + $round($air) + (int) $acts;

        return ['air' => $round($air), 'land' => $round($land), 'activities' => (int) $acts, 'total' => $total, 'per_person' => $heads ? (int) round($total / $heads) : 0,
            'days' => $days, 'places' => count($v['stops']), 'currency' => 'BDT'];
    }

    public function estimate(Request $request): JsonResponse
    {
        return response()->json(['data' => self::compute($this->validated($request))]);
    }

    /** Free quote request: stores an inquiry + CRM lead with the plan snapshot. */
    public function quote(Request $request): JsonResponse
    {
        $plan = $this->validated($request);
        $c = $request->validate(['name' => ['required', 'string', 'max:120'], 'phone' => ['required', 'string', 'regex:/^\+?[0-9 \-]{8,20}$/'], 'email' => ['nullable', 'email', 'max:190'], 'note' => ['nullable', 'string', 'max:2000']]);
        $est = self::compute($plan);
        $inq = FormController::store('planner', $c + ['plan' => $plan, 'estimate' => $est], $request, ['en' => 'Trip planner', 'bn' => 'ট্রিপ প্ল্যানার'], 'trip-planner', $est['total']);

        return response()->json(['data' => ['reference' => FormController::reference($inq), 'estimate' => $est]], 201);
    }
}
