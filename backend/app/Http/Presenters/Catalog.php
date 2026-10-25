<?php

namespace App\Http\Presenters;

use App\Models\Activity;
use App\Models\Amenity;
use App\Models\BlogPost;
use App\Models\CancellationPolicy;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\Hotel;
use App\Models\Offer;
use App\Models\Review;
use App\Models\SeoMeta;
use App\Models\Theme;
use App\Models\Tour;
use App\Models\VisaDocumentSet;
use App\Models\VisaProduct;
use App\Support\Img;

/**
 * Array presenters for the public API (localised to the current app locale).
 * "card" shapes feed listings; full shapes feed detail pages. Keep in sync with frontend/lib/types.ts.
 */
final class Catalog
{
    public static function money(mixed $v): ?int
    {
        return $v === null ? null : (int) round((float) $v);
    }

    public static function policy(?CancellationPolicy $p): ?array
    {
        return $p ? ['code' => $p->code, 'kind' => $p->kind, 'label' => $p->tr('name'), 'rules' => $p->rules] : null;
    }

    public static function seo(?SeoMeta $s): ?array
    {
        if (! $s) {
            return null;
        }

        return [
            'title' => $s->tr('meta_title'), 'description' => $s->tr('meta_description'), 'og_title' => $s->tr('og_title'),
            'og_image' => Img::of($s->ogImage), 'canonical' => $s->canonical, 'robots' => $s->robots, 'json_ld' => $s->json_ld_override,
        ];
    }

    public static function tourCard(Tour $t): array
    {
        return [
            'type' => 'tour', 'slug' => $t->slug, 'title' => $t->tr('title'), 'location' => $t->tr('location'), 'country' => $t->tr('country_name'), 'region' => $t->region,
            'days' => $t->days, 'nights' => $t->nights, 'price' => self::money($t->price_from), 'price_was' => self::money($t->price_was), 'rating' => (float) $t->rating,
            'reviews_count' => $t->reviews_count, 'badge' => $t->tr('badge'), 'highlights' => tr_list($t->highlights), 'group_size' => $t->group_size,
            'includes_flight' => $t->includes_flight, 'includes_visa' => $t->includes_visa,
            'categories' => $t->relationLoaded('categories') ? $t->categories->pluck('slug')->all() : [],
            'cancellation' => self::policy($t->cancellationPolicy), 'image' => Img::of($t->image),
            'destination' => $t->destination?->slug,
        ];
    }

    public static function tour(Tour $t): array
    {
        return self::tourCard($t) + [
            'summary' => $t->tr('summary'), 'description' => $t->tr('description'), 'inclusions' => tr_list($t->inclusions), 'exclusions' => tr_list($t->exclusions),
            'route_stops' => tr_list($t->route_stops), 'booked_this_week' => $t->booked_this_week, 'gallery' => Img::ids($t->gallery),
            'itinerary' => $t->itinerary->map(fn ($d) => ['day' => $d->day_no, 'title' => $d->tr('title'), 'body' => $d->tr('body'), 'meals' => $d->meals ?? [], 'stay' => $d->tr('stay')])->all(),
            'departures' => $t->departures->where('date', '>=', today())->values()->map(fn ($d) => [
                'id' => $d->id, 'date' => $d->date->toDateString(), 'return_date' => $d->return_date?->toDateString(), 'price' => self::money($d->price),
                'seats_left' => $d->seatsLeft(), 'status' => $d->status,
            ])->all(),
            'price_tiers' => $t->priceTiers->map(fn ($p) => ['code' => $p->code, 'label' => $p->tr('label'), 'factor' => $p->factor, 'price' => self::money($p->price)])->all(),
            'seo' => self::seo($t->seo),
        ];
    }

    public static function destinationCard(Destination $d): array
    {
        return [
            'type' => 'destination', 'slug' => $d->slug, 'name' => $d->tr('name'), 'country' => $d->tr('country_name'), 'region' => $d->region,
            'tours_count' => $d->tours_count_display ?? ($d->tours_count ?? 0), 'best_time' => $d->tr('best_time'), 'image' => Img::of($d->image),
        ];
    }

    public static function destination(Destination $d): array
    {
        return self::destinationCard($d) + [
            'description' => $d->tr('description'), 'visa_info' => $d->tr('visa_info'), 'currency' => $d->currency, 'flight_time' => $d->tr('flight_time'),
            'things_to_do' => tr_list($d->things_to_do), 'lat' => $d->lat, 'lng' => $d->lng, 'gallery' => Img::ids($d->gallery), 'seo' => self::seo($d->seo),
        ];
    }

    public static function themeCard(Theme $t): array
    {
        return ['type' => 'theme', 'slug' => $t->slug, 'category' => $t->category_slug, 'icon' => $t->icon, 'name' => $t->tr('name'), 'tagline' => $t->tr('tagline'),
            'perks' => tr_list($t->perks), 'image' => Img::of($t->image)];
    }

    public static function cruiseCard(Cruise $c): array
    {
        return [
            'type' => 'cruise', 'slug' => $c->slug, 'title' => $c->tr('title'), 'region' => $c->region, 'nights' => $c->nights, 'ship' => $c->ship?->name,
            'line' => $c->ship?->line?->name, 'depart_port' => $c->tr('depart_port'), 'route' => tr_list($c->route), 'cabin_from' => $c->tr('cabin_from'),
            'highlights' => tr_list($c->highlights), 'price' => self::money($c->price_from), 'price_was' => self::money($c->price_was), 'badge' => $c->tr('badge'),
            'rating' => (float) $c->rating, 'reviews_count' => $c->reviews_count, 'next_departure' => $c->next_departure?->toDateString(),
            'cancellation' => self::policy($c->cancellationPolicy), 'image' => Img::of($c->image),
        ];
    }

    public static function cruise(Cruise $c): array
    {
        return self::cruiseCard($c) + [
            'description' => $c->tr('description'), 'gallery' => Img::ids($c->gallery),
            'cabins' => $c->cabins->map(fn ($k) => ['code' => $k->code, 'name' => $k->tr('name'), 'description' => $k->tr('description'), 'price' => self::money($k->price), 'capacity' => $k->capacity])->all(),
            'ports_of_call' => $c->portsOfCall->map(fn ($p) => ['day' => $p->day_no, 'port' => $p->tr('port'), 'body' => $p->tr('body'), 'arrive' => $p->arrive, 'depart' => $p->depart])->all(),
            'sailings' => $c->sailings->where('date', '>=', today())->values()->map(fn ($s) => ['id' => $s->id, 'date' => $s->date->toDateString(), 'return_date' => $s->return_date?->toDateString(),
                'price' => self::money($s->price), 'seats_left' => max(0, $s->seats_total - $s->seats_held)])->all(),
            'seo' => self::seo($c->seo),
        ];
    }

    public static function activityCard(Activity $a): array
    {
        return [
            'type' => 'activity', 'slug' => $a->slug, 'title' => $a->tr('title'), 'city' => $a->tr('city'), 'category' => $a->category, 'region' => $a->region,
            'duration' => $a->tr('duration_text'), 'price' => self::money($a->price), 'price_was' => self::money($a->price_was), 'rating' => (float) $a->rating,
            'reviews_count' => $a->reviews_count, 'badge' => $a->tr('badge'), 'highlights' => tr_list($a->highlights), 'languages' => $a->languages ?? [],
            'instant_confirm' => $a->instant_confirm, 'pickup' => $a->pickup, 'cancellation' => self::policy($a->cancellationPolicy), 'image' => Img::of($a->image),
            'destination' => $a->destination?->slug,
        ];
    }

    public static function activity(Activity $a): array
    {
        $times = $a->slots->take(12)->map(fn ($s) => $s->starts_at->format('H:i'))->unique()->values()->all();

        return self::activityCard($a) + [
            'description' => $a->tr('description'), 'meeting_point' => $a->tr('meeting_point'), 'inclusions' => tr_list($a->inclusions), 'gallery' => Img::ids($a->gallery),
            'options' => $a->options->map(fn ($o) => ['id' => $o->id, 'name' => $o->tr('name'), 'price' => self::money($o->price), 'child_price' => self::money($o->child_price)])->all(),
            'times' => $times, 'seo' => self::seo($a->seo),
        ];
    }

    public static function hotelCard(Hotel $h): array
    {
        return [
            'type' => 'hotel', 'slug' => $h->slug, 'name' => $h->tr('name'), 'city' => $h->tr('city'), 'kind' => $h->kind, 'stars' => $h->stars,
            'distance' => $h->tr('distance_text'), 'amenities' => $h->amenities ?? [], 'refundable' => $h->refundable, 'breakfast' => $h->breakfast,
            'price' => self::money($h->price_from), 'price_was' => self::money($h->price_was), 'rating' => (float) $h->guest_score, 'reviews_count' => $h->reviews_count,
            'image' => Img::of($h->image),
        ];
    }

    public static function hotel(Hotel $h): array
    {
        $amen = Amenity::whereIn('code', $h->amenities ?? [])->get()->keyBy('code');

        return self::hotelCard($h) + [
            'description' => $h->tr('description'), 'address' => $h->tr('address'), 'gallery' => Img::ids($h->gallery), 'lat' => $h->lat, 'lng' => $h->lng,
            'amenity_list' => collect($h->amenities ?? [])->map(fn ($c) => ['code' => $c, 'icon' => $amen[$c]->icon ?? null, 'label' => $amen[$c]?->tr('name') ?? $c])->all(),
            'rooms' => $h->roomTypes->map(fn ($r) => ['id' => $r->id, 'name' => $r->tr('name'), 'bed' => $r->tr('bed'), 'size_sqm' => $r->size_sqm, 'occupancy' => $r->features['occupancy'] ?? $r->max_adults,
                'price' => self::money($r->price), 'breakfast' => $r->breakfast, 'refundable' => $r->refundable, 'rooms_left' => $r->features['rooms_left'] ?? null,
                'image' => Img::key($r->features['image'] ?? null)])->all(),
            'seo' => self::seo($h->seo),
        ];
    }

    public static function visaCard(VisaProduct $v): array
    {
        return [
            'type' => 'visa', 'slug' => $v->slug, 'country' => $v->tr('country_name'), 'iso2' => $v->country?->iso2, 'flag' => $v->flag, 'visa_type' => $v->tr('type'),
            'processing' => $v->tr('processing'), 'fee' => self::money($v->fee), 'validity' => $v->tr('validity'), 'stay' => $v->tr('stay'), 'entry' => $v->tr('entry'),
            'image' => Img::of($v->image),
        ];
    }

    public static function visa(VisaProduct $v): array
    {
        return self::visaCard($v) + [
            'description' => $v->tr('description'), 'extra_documents' => tr_list($v->extra_documents),
            'document_sets' => VisaDocumentSet::orderBy('sort')->get()->map(fn ($s) => ['code' => $s->code, 'name' => $s->tr('name'), 'items' => tr_list($s->items)])->all(),
            'seo' => self::seo($v->seo),
        ];
    }

    public static function offer(Offer $o): array
    {
        return ['code' => $o->code, 'title' => $o->tr('title'), 'description' => $o->tr('description'), 'kind' => $o->kind, 'discount' => $o->tr('discount_text'),
            'tag' => $o->tr('tag'), 'link' => $o->link, 'ends_at' => $o->ends_at?->toIso8601String(), 'is_flash' => $o->is_flash, 'image' => Img::of($o->image)];
    }

    public static function postCard(BlogPost $p): array
    {
        return ['slug' => $p->slug, 'title' => $p->tr('title'), 'excerpt' => $p->tr('excerpt'), 'category' => $p->category?->tr('name'), 'category_slug' => $p->category?->slug,
            'author' => $p->tr('author_name') ?? $p->author?->name, 'published_at' => $p->published_at?->toDateString(), 'reading_mins' => $p->reading_mins, 'image' => Img::of($p->image)];
    }

    public static function post(BlogPost $p): array
    {
        return self::postCard($p) + ['body' => $p->tr('body'), 'tags' => $p->tags->map(fn ($t) => ['slug' => $t->slug, 'name' => $t->tr('name')])->all(),
            'updated_at' => $p->updated_at?->toIso8601String(), 'seo' => self::seo($p->seo)];
    }

    public static function review(Review $r): array
    {
        return ['id' => $r->id, 'name' => $r->tr('author_name'), 'city' => $r->tr('author_city'), 'initials' => $r->initials, 'trip' => $r->tr('trip_title'),
            'rating' => $r->rating, 'title' => $r->tr('title'), 'body' => $r->tr('body'), 'reply' => $r->tr('reply'), 'date' => ($r->travelled_on ?? $r->created_at)?->toDateString(),
            'scores' => $r->category_scores];
    }
}
