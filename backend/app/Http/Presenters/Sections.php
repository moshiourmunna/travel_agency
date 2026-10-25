<?php

namespace App\Http\Presenters;

use App\Http\Presenters\Catalog as P;
use App\Models\Activity;
use App\Models\Airline;
use App\Models\BlogPost;
use App\Models\Category;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\Faq;
use App\Models\Offer;
use App\Models\PageSection;
use App\Models\Review;
use App\Models\Stat;
use App\Models\Theme;
use App\Models\Tour;
use App\Support\Img;
use App\Support\Settings;

/**
 * Resolves CMS page sections. A section's `data` holds admin-edited copy ({en,bn} leaves),
 * static item lists, image references (`*_image_id` / `*_image_ids`) and, for dynamic blocks,
 * a `source` with `limit` and optional pinned `ids`. Output is localised and ready to render.
 */
final class Sections
{
    public static function resolve(PageSection $s): ?array
    {
        $data = self::images(Settings::localise($s->data ?? []));
        $source = $data['source'] ?? null;
        $items = $source ? self::source($source, (int) ($data['limit'] ?? 8), $data['ids'] ?? null) : null;
        if ($source === 'tours') {
            $data['total'] = Tour::published()->count();
        }

        return ['id' => $s->id, 'type' => $s->type, 'data' => $data] + ($items !== null ? ['items' => $items] : []);
    }

    /** Swap image id references for image payloads, recursively. */
    public static function images(array $data): array
    {
        foreach ($data as $k => $v) {
            if (is_string($k) && str_ends_with($k, 'image_id')) {
                $data[substr($k, 0, -3) ?: 'image'] = $v ? Img::ids([$v])[0] ?? null : null;
                unset($data[$k]);
            } elseif (is_string($k) && str_ends_with($k, 'image_ids')) {
                $data[substr($k, 0, -9).'images'] = Img::ids((array) $v);
                unset($data[$k]);
            } elseif (is_array($v)) {
                $data[$k] = self::images($v);
            }
        }

        return $data;
    }

    private static function pinned($query, ?array $ids, int $limit)
    {
        if ($ids) {
            $rows = $query->whereIn('id', $ids)->get()->keyBy('id');

            return collect($ids)->map(fn ($id) => $rows->get($id))->filter()->values();
        }

        return $query->limit($limit)->get();
    }

    public static function source(string $source, int $limit, ?array $ids = null): array
    {
        $card = ['image.media', 'cancellationPolicy', 'categories', 'destination'];

        return match ($source) {
            'categories' => Category::where('is_active', true)->orderBy('sort')->get()->map(fn ($c) => ['slug' => $c->slug, 'icon' => $c->icon, 'name' => $c->tr('name')])->all(),
            'destinations' => self::pinned(Destination::published()->with('image.media')->withCount(['tours' => fn ($q) => $q->published()])->orderByDesc('is_featured')->ordered(), $ids, $limit)->map(fn ($d) => P::destinationCard($d))->all(),
            'offers' => Offer::with('image.media')->where('is_active', true)->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))->orderBy('sort')->limit($limit)->get()->map(fn ($o) => P::offer($o))->all(),
            'tours' => self::pinned(Tour::published()->with($card)->orderByDesc('is_featured')->ordered(), $ids, $limit)->map(fn ($t) => P::tourCard($t))->all(),
            'themes' => (function () use ($limit) {
                $counts = Tour::published()->with('categories:id,slug')->get(['id'])->flatMap(fn ($t) => $t->categories->pluck('slug'))->countBy();

                return Theme::published()->with('image.media')->ordered()->limit($limit)->get()->map(fn ($t) => P::themeCard($t) + ['tours_count' => $counts[$t->category_slug] ?? 0])->all();
            })(),
            'cruises' => self::pinned(Cruise::published()->with(['image.media', 'ship.line', 'cancellationPolicy'])->ordered(), $ids, $limit)->map(fn ($c) => P::cruiseCard($c))->all(),
            'activities' => self::pinned(Activity::published()->with(['image.media', 'cancellationPolicy', 'destination'])->ordered(), $ids, $limit)->map(fn ($a) => P::activityCard($a))->all(),
            'reviews' => self::pinned(Review::where('status', 'published')->orderByDesc('rating')->latest('travelled_on'), $ids, $limit)->map(fn ($r) => P::review($r))->all(),
            'airlines' => Airline::with('logo.media')->where('is_active', true)->orderBy('id')->limit($limit)->get()->map(fn ($a) => ['code' => $a->code, 'name' => $a->name, 'color' => $a->color, 'logo' => Img::of($a->logo)])->all(),
            'posts' => BlogPost::published()->with(['image.media', 'category'])->where('published_at', '<=', now())->orderByDesc('published_at')->limit($limit)->get()->map(fn ($p) => P::postCard($p))->all(),
            'faqs' => Faq::where('is_active', true)->whereJsonContains('show_on', 'home')->orderBy('sort')->limit($limit)->get()->map(fn ($f) => ['id' => $f->id, 'q' => $f->tr('question'), 'a' => $f->tr('answer')])->all(),
            'stats' => Stat::where('is_active', true)->orderBy('sort')->get()->map(fn ($s) => ['value' => $s->value, 'suffix' => $s->suffix, 'label' => $s->tr('label'), 'icon' => $s->icon])->all(),
            default => [],
        };
    }
}
