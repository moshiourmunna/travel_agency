<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Catalog as P;
use App\Models\Activity;
use App\Models\ActivitySlot;
use App\Models\Amenity;
use App\Models\Category;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\Faq;
use App\Models\GiftCardDesign;
use App\Models\Hotel;
use App\Models\InsurancePlan;
use App\Models\Offer;
use App\Models\Region;
use App\Models\Review;
use App\Models\Theme;
use App\Models\Tour;
use App\Models\TourAddon;
use App\Models\VisaProduct;
use App\Support\Img;
use App\Support\Settings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Public catalogue endpoints. Listings return everything published (catalogue sizes are small) plus facets; the site filters client-side like the mockup. */
class CatalogController extends Controller
{
    private const CARD_WITH = ['image.media', 'cancellationPolicy', 'categories', 'destination'];

    public function tours(Request $request): JsonResponse
    {
        $q = Tour::published()->with(self::CARD_WITH)->search($request->query('q'));
        $this->filterTours($q, $request);
        $this->sort($q, $request->query('sort'), 'price_from', 'days');
        [$tours, $page] = $this->paged($q, $request);
        $all = Tour::published()->with('categories')->get(['id', 'region', 'price_from', 'days', 'rating', 'cancellation_policy_id']);

        return response()->json([
            'data' => $tours->map(fn ($t) => P::tourCard($t))->all(),
            'meta' => [
                ...$page,
                'facets' => [
                    'region' => $all->countBy('region'),
                    'category' => $all->flatMap(fn ($t) => $t->categories->pluck('slug'))->countBy(),
                    'price' => ['min' => P::money($all->min('price_from')), 'max' => P::money($all->max('price_from'))],
                    'days' => ['min' => $all->min('days'), 'max' => $all->max('days')],
                ],
                'categories' => Category::orderBy('sort')->get()->map(fn ($c) => ['slug' => $c->slug, 'icon' => $c->icon, 'name' => $c->tr('name')]),
            ],
        ]);
    }

    /** Page a listing query: ?page=N&per_page=M (default 24, max 60). Returns [rows, pagination meta]. */
    private function paged(Builder $q, Request $r): array
    {
        $per = max(1, min(60, (int) $r->query('per_page', 24)));
        $p = $q->paginate($per, ['*'], 'page', max(1, (int) $r->query('page', 1)));

        return [$p->getCollection(), ['total' => $p->total(), 'current_page' => $p->currentPage(), 'last_page' => $p->lastPage(), 'per_page' => $per]];
    }

    private function filterTours(Builder $q, Request $r): void
    {
        $q->when($r->query('region'), fn ($q, $v) => $q->whereIn('region', (array) explode(',', $v)))
            ->when($r->query('destination'), fn ($q, $v) => $q->whereHas('destination', fn ($d) => $d->where('slug', $v)))
            ->when($r->query('category') ?? $r->query('theme'), fn ($q, $v) => $q->whereHas('categories', fn ($c) => $c->whereIn('slug', explode(',', $v))))
            ->when($r->query('price_min'), fn ($q, $v) => $q->where('price_from', '>=', (float) $v))
            ->when($r->query('price_max'), fn ($q, $v) => $q->where('price_from', '<=', (float) $v))
            ->when($r->query('days_min'), fn ($q, $v) => $q->where('days', '>=', (int) $v))
            ->when($r->query('days_max'), fn ($q, $v) => $q->where('days', '<=', (int) $v))
            ->when($r->query('rating'), fn ($q, $v) => $q->where('rating', '>=', (float) $v))
            ->when($r->boolean('free_cancel'), fn ($q) => $q->whereHas('cancellationPolicy', fn ($p) => $p->where('kind', 'free')))
            ->when($r->boolean('featured'), fn ($q) => $q->where('is_featured', true));
    }

    private function sort(Builder $q, ?string $sort, string $price = 'price_from', ?string $duration = null, string $rating = 'rating'): void
    {
        $t = $q->getModel()->getTable();
        match ($sort) {
            'price-asc' => $q->orderBy($price),
            'price-desc' => $q->orderByDesc($price),
            'rating' => $q->orderByDesc($rating)->orderByDesc('reviews_count'),
            'duration' => $duration ? $q->orderBy($duration) : $q->ordered(),
            'newest' => $q->orderByDesc("{$t}.published_at"),
            default => $q->orderByDesc("{$t}.is_featured")->orderBy("{$t}.sort")->orderBy("{$t}.id"),
        };
    }

    public function tour(string $slug): JsonResponse
    {
        $t = Tour::published()->with(array_merge(self::CARD_WITH, ['itinerary', 'departures', 'priceTiers', 'seo.ogImage.media']))->where('slug', $slug)->firstOrFail();
        $similar = Tour::published()->with(self::CARD_WITH)->where('id', '!=', $t->id)
            ->orderByRaw('region = ? desc', [$t->region])->orderByDesc('is_featured')->orderBy('sort')->limit(4)->get();

        return response()->json(['data' => P::tour($t) + [
            'similar' => $similar->map(fn ($s) => P::tourCard($s))->all(),
            'reviews' => $this->reviewSummary($t),
            'addons' => TourAddon::where('is_active', true)->where(fn ($q) => $q->whereNull('tour_id')->orWhere('tour_id', $t->id))->get()
                ->map(fn ($a) => ['code' => $a->code, 'label' => $a->tr('label'), 'price' => P::money($a->price), 'per' => $a->per])->all(),
        ]]);
    }

    public function departures(string $slug): JsonResponse
    {
        $t = Tour::published()->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => $t->departures()->where('date', '>=', today())->get()->map(fn ($d) => [
            'id' => $d->id, 'date' => $d->date->toDateString(), 'return_date' => $d->return_date?->toDateString(), 'price' => P::money($d->price), 'seats_left' => $d->seatsLeft(), 'status' => $d->status,
        ])]);
    }

    /** Rating summary + recent published reviews; falls back to the site-wide published reviews when a product has none yet (as the mockup does). */
    private function reviewSummary($model): array
    {
        $own = Review::where('status', 'published')->where('reviewable_type', $model::class)->where('reviewable_id', $model->id)->latest()->limit(4)->get();
        $list = $own->count() >= 2 ? $own : Review::where('status', 'published')->whereNull('user_id')->latest('travelled_on')->limit(4)->get();

        $rating = (float) ($model->rating ?? $model->guest_score ?? 0);
        $all = Review::where('status', 'published')->where('reviewable_type', $model::class)->where('reviewable_id', $model->id)->get(['rating', 'category_scores']);
        // Real distribution once there are enough first-party reviews; before that, the imported aggregate's typical spread.
        $histogram = $all->count() >= 10
            ? collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($s) => [(string) $s => (int) round(100 * $all->where('rating', $s)->count() / $all->count())])->all()
            : ($rating >= 4.7 ? ['5' => 78, '4' => 15, '3' => 5, '2' => 1, '1' => 1] : ['5' => 62, '4' => 24, '3' => 9, '2' => 3, '1' => 2]);
        $scores = $all->pluck('category_scores')->filter()->reduce(function ($c, $s) {
            foreach ($s as $k => $v) {
                $c[$k][] = (float) $v;
            }

            return $c;
        }, []);

        return [
            'rating' => $rating,
            'count' => (int) ($model->reviews_count ?? 0),
            'histogram' => $histogram,
            'scores' => $scores ? array_map(fn ($v) => round(array_sum($v) / count($v), 1), $scores) : null,
            'items' => $list->map(fn ($r) => P::review($r))->all(),
        ];
    }

    public function destinations(Request $request): JsonResponse
    {
        $q = Destination::published()->with('image.media')->withCount(['tours' => fn ($q) => $q->published()])
            ->when($request->query('region'), fn ($q, $v) => $q->where('region', $v))->ordered();

        return response()->json(['data' => $q->get()->map(fn ($d) => P::destinationCard($d))->all()]);
    }

    public function destination(string $slug): JsonResponse
    {
        $d = Destination::published()->with(['image.media', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();
        $tours = Tour::published()->with(self::CARD_WITH)->where('destination_id', $d->id)->ordered()->get();
        $acts = Activity::published()->with(['image.media', 'cancellationPolicy', 'destination'])->where('destination_id', $d->id)->ordered()->limit(4)->get();
        // Pad thin destinations with other packages in the same country (shown under a separate heading)
        $nearby = $tours->count() >= 3 || ! $d->country_id ? collect() : Tour::published()->with(self::CARD_WITH)
            ->where('destination_id', '!=', $d->id)->whereHas('destination', fn ($q) => $q->where('country_id', $d->country_id))
            ->ordered()->limit(3 - $tours->count())->get();

        return response()->json(['data' => P::destination($d) + [
            'tours' => $tours->map(fn ($t) => P::tourCard($t))->all(),
            'nearby_tours' => $nearby->map(fn ($t) => P::tourCard($t))->all(),
            'activities' => $acts->map(fn ($a) => P::activityCard($a))->all(),
            'planner' => $d->plannerCost ? ['per_day' => P::money($d->plannerCost->cost_per_day_standard), 'flight' => P::money($d->plannerCost->flight_estimate)] : null,
        ]]);
    }

    public function themes(): JsonResponse
    {
        $themes = Theme::published()->with('image.media')->ordered()->get();
        $tours = Tour::published()->with('categories:id,slug')->get(['id', 'price_from']);
        $by = fn (string $cat) => $tours->filter(fn ($t) => $t->categories->contains('slug', $cat));

        return response()->json(['data' => $themes->map(fn ($t) => P::themeCard($t) + ['tours_count' => $by($t->category_slug)->count(), 'price_from' => P::money($by($t->category_slug)->min('price_from'))])->all()]);
    }

    public function theme(string $slug): JsonResponse
    {
        $t = Theme::published()->with(['image.media', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();
        $tours = Tour::published()->with(self::CARD_WITH)->whereHas('categories', fn ($c) => $c->where('slug', $t->category_slug))->ordered()->get();
        $acts = Activity::published()->with(['image.media', 'cancellationPolicy', 'destination'])->whereIn('destination_id', $tours->pluck('destination_id')->filter())->ordered()->limit(4)->get();

        return response()->json(['data' => P::themeCard($t) + ['description' => $t->tr('description'), 'seo' => P::seo($t->seo),
            'tours' => $tours->map(fn ($x) => P::tourCard($x))->all(), 'activities' => $acts->map(fn ($a) => P::activityCard($a))->all()]]);
    }

    public function cruises(Request $request): JsonResponse
    {
        $q = Cruise::published()->with(['image.media', 'ship.line', 'cancellationPolicy'])->search($request->query('q'))
            ->when($request->query('region'), fn ($q, $v) => $q->whereIn('region', explode(',', $v)))
            ->when($request->query('nights_min'), fn ($q, $v) => $q->where('nights', '>=', (int) $v))
            ->when($request->query('nights_max'), fn ($q, $v) => $q->where('nights', '<=', (int) $v))
            ->when($request->query('price_max'), fn ($q, $v) => $q->where('price_from', '<=', (float) $v))
            ->when($request->query('rating'), fn ($q, $v) => $q->where('rating', '>=', (float) $v));
        if ($request->query('sort') === 'dep') {
            $q->orderByRaw('(select min(s.date) from cruise_sailings s where s.cruise_id = cruises.id and s.date >= ?) is null, (select min(s.date) from cruise_sailings s where s.cruise_id = cruises.id and s.date >= ?)', [today()->toDateString(), today()->toDateString()]);
        } else {
            $this->sort($q, $request->query('sort'), 'price_from', 'nights');
        }
        $codes = Cruise::published()->distinct()->pluck('region');
        $regions = Region::whereIn('code', $codes)->orderBy('sort')->get()->mapWithKeys(fn ($r) => [$r->code => $r->tr('name')]);

        [$rows, $page] = $this->paged($q, $request);

        return response()->json(['data' => $rows->map(fn ($c) => P::cruiseCard($c))->all(), 'meta' => $page + ['regions' => $regions]]);
    }

    public function cruise(string $slug): JsonResponse
    {
        $c = Cruise::published()->with(['image.media', 'ship.line', 'cancellationPolicy', 'cabins', 'portsOfCall', 'sailings', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();
        $more = Cruise::published()->with(['image.media', 'ship.line', 'cancellationPolicy'])->where('id', '!=', $c->id)->ordered()->limit(3)->get();

        return response()->json(['data' => P::cruise($c) + ['similar' => $more->map(fn ($m) => P::cruiseCard($m))->all(), 'reviews' => $this->reviewSummary($c)]]);
    }

    public function activities(Request $request): JsonResponse
    {
        $q = Activity::published()->with(['image.media', 'cancellationPolicy', 'destination'])->search($request->query('q'))
            ->when($request->query('category'), fn ($q, $v) => $q->whereIn('category', explode(',', $v)))
            ->when($request->query('region'), fn ($q, $v) => $q->whereIn('region', explode(',', $v)))
            ->when($request->query('price_max'), fn ($q, $v) => $q->where('price', '<=', (float) $v))
            ->when($request->query('rating'), fn ($q, $v) => $q->where('rating', '>=', (float) $v))
            ->when($request->boolean('free_cancel'), fn ($q) => $q->whereHas('cancellationPolicy', fn ($p) => $p->where('kind', 'free')))
            ->when($request->query('destination'), fn ($q, $v) => $q->whereHas('destination', fn ($d) => $d->where('slug', $v)));
        $this->sort($q, $request->query('sort'), 'price');
        $cats = collect(Settings::get('catalog.activity_categories', []))->map(fn ($c) => ['key' => $c['key'], 'icon' => $c['icon'], 'label' => tr_pick($c['label'])])->values();

        [$rows, $page] = $this->paged($q, $request);

        return response()->json(['data' => $rows->map(fn ($a) => P::activityCard($a))->all(), 'meta' => $page + ['categories' => $cats]]);
    }

    public function activity(string $slug): JsonResponse
    {
        $a = Activity::published()->with(['image.media', 'cancellationPolicy', 'destination', 'options', 'seo.ogImage.media',
            'slots' => fn ($s) => $s->where('starts_at', '>=', now()->startOfDay())->orderBy('starts_at')->limit(30)])->where('slug', $slug)->firstOrFail();
        $more = Activity::published()->with(['image.media', 'cancellationPolicy', 'destination'])->where('id', '!=', $a->id)
            ->where(fn ($q) => $q->where('category', $a->category)->orWhere('region', $a->region))->ordered()->limit(3)->get();

        return response()->json(['data' => P::activity($a) + ['similar' => $more->map(fn ($m) => P::activityCard($m))->all(), 'reviews' => $this->reviewSummary($a)]]);
    }

    public function activitySlots(Request $request, string $slug): JsonResponse
    {
        $a = Activity::published()->where('slug', $slug)->firstOrFail();
        $date = Carbon::parse($request->query('date', today()->toDateString()));
        $slots = ActivitySlot::where('activity_id', $a->id)->whereDate('starts_at', $date)->orderBy('starts_at')->get();

        return response()->json(['data' => $slots->map(fn ($s) => ['id' => $s->id, 'time' => $s->starts_at->format('H:i'), 'starts_at' => $s->starts_at->toIso8601String(),
            'available' => max(0, $s->capacity - $s->booked), 'price' => P::money($s->price ?? $a->price)])]);
    }

    public function hotels(Request $request): JsonResponse
    {
        $q = Hotel::published()->with('image.media')->search($request->query('q'))
            ->when($request->query('stars'), fn ($q, $v) => $q->whereIn('stars', explode(',', $v)))
            ->when($request->query('kind'), fn ($q, $v) => $q->where('kind', $v))
            ->when($request->boolean('refundable'), fn ($q) => $q->where('refundable', true))
            ->when($request->boolean('breakfast'), fn ($q) => $q->where('breakfast', true))
            ->when(is_numeric($request->query('rating')), fn ($q) => $q->where('guest_score', '>=', (float) $request->query('rating')))
            ->when(is_numeric($request->query('price_max')), fn ($q) => $q->where('price_from', '<=', (float) $request->query('price_max')));
        $this->sort($q, $request->query('sort'), 'price_from', null, 'guest_score');

        [$rows, $page] = $this->paged($q, $request);

        return response()->json(['data' => $rows->map(fn ($h) => P::hotelCard($h))->all(),
            'meta' => $page + ['amenities' => Amenity::all()->map(fn ($a) => ['code' => $a->code, 'icon' => $a->icon, 'label' => $a->tr('name')])]]);
    }

    public function hotel(string $slug): JsonResponse
    {
        $h = Hotel::published()->with(['image.media', 'roomTypes', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();
        $more = Hotel::published()->with('image.media')->where('id', '!=', $h->id)->ordered()->limit(3)->get();

        return response()->json(['data' => P::hotel($h) + ['similar' => $more->map(fn ($m) => P::hotelCard($m))->all(), 'reviews' => $this->reviewSummary($h)]]);
    }

    public function visas(): JsonResponse
    {
        return response()->json(['data' => VisaProduct::published()->with(['image.media', 'country'])->ordered()->get()->map(fn ($v) => P::visaCard($v))->all()]);
    }

    public function visa(string $slug): JsonResponse
    {
        $v = VisaProduct::published()->with(['image.media', 'country', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();
        $faqs = Faq::where('is_active', true)->whereJsonContains('show_on', 'visa')->orderBy('sort')->get();
        $more = VisaProduct::published()->with(['image.media', 'country'])->where('id', '!=', $v->id)->ordered()->limit(4)->get();

        return response()->json(['data' => P::visa($v) + [
            'faqs' => $faqs->map(fn ($f) => ['q' => $f->tr('question'), 'a' => $f->tr('answer')])->all(),
            'similar' => $more->map(fn ($m) => P::visaCard($m))->all(),
        ]]);
    }

    public function offers(): JsonResponse
    {
        $offers = Offer::with('image.media')->where('is_active', true)->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))->orderBy('sort')->get();

        return response()->json(['data' => $offers->map(fn ($o) => P::offer($o))->all()]);
    }

    public function insurancePlans(): JsonResponse
    {
        return response()->json(['data' => InsurancePlan::where('is_active', true)->orderBy('sort')->get()->map(fn ($p) => [
            'code' => $p->code, 'name' => $p->tr('name'), 'price' => P::money($p->price), 'price_note' => $p->tr('price_note'), 'coverage' => tr_list($p->coverage), 'is_popular' => $p->is_popular,
        ])]);
    }

    public function giftCardDesigns(): JsonResponse
    {
        return response()->json(['data' => GiftCardDesign::with('image.media')->where('is_active', true)->orderBy('sort')->get()->map(fn ($g) => [
            'code' => $g->code, 'name' => $g->tr('name'), 'gradient' => $g->gradient, 'amounts' => $g->amounts, 'image' => Img::of($g->image),
        ])]);
    }
}
