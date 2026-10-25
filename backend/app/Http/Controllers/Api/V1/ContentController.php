<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Catalog as P;
use App\Http\Presenters\Sections;
use App\Models\Activity;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\Cruise;
use App\Models\Currency;
use App\Models\Destination;
use App\Models\Faq;
use App\Models\FaqCategory;
use App\Models\GalleryAlbum;
use App\Models\Hotel;
use App\Models\JobPost;
use App\Models\Language;
use App\Models\Menu;
use App\Models\Page;
use App\Models\Partner;
use App\Models\Redirect;
use App\Models\Review;
use App\Models\SeoMeta;
use App\Models\Stat;
use App\Models\TeamMember;
use App\Models\Testimonial;
use App\Models\Theme;
use App\Models\Tour;
use App\Models\Translation;
use App\Models\VisaProduct;
use App\Support\Img;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/** Site bootstrap, CMS pages, home sections, blog, FAQs, testimonials, team, gallery, careers, SEO helpers. */
class ContentController extends Controller
{
    public function site(): JsonResponse
    {
        $locale = app()->getLocale();
        $menus = Menu::with(['items' => fn ($q) => $q->where('is_active', true), 'items.children' => fn ($q) => $q->where('is_active', true)])->get()
            ->mapWithKeys(fn ($m) => [$m->location => $m->items->map(fn ($i) => self::menuItem($i))->all()]);

        return response()->json(['data' => [
            'locale' => $locale,
            'languages' => Language::where('is_active', true)->orderBy('sort')->get(['code', 'name', 'native', 'dir', 'is_default']),
            'currencies' => Currency::where('is_active', true)->orderBy('sort')->get(['code', 'symbol', 'rate_to_bdt']),
            'settings' => Settings::public(),
            'menus' => $menus,
            'stats' => Stat::where('is_active', true)->orderBy('sort')->get()->map(fn ($s) => ['value' => $s->value, 'suffix' => $s->suffix, 'label' => $s->tr('label'), 'icon' => $s->icon]),
            'partners' => Partner::with('logo.media')->where('is_active', true)->orderBy('kind')->orderBy('sort')->get()->groupBy('kind')
                ->map(fn ($g) => $g->map(fn ($p) => ['name' => $p->name, 'code' => $p->code, 'color' => $p->color, 'logo' => Img::of($p->logo)])->values()),
            'translations_version' => Cache::rememberForever('musafir.translations.version', fn () => (string) (Translation::max('updated_at') ?? '0')),
        ]]);
    }

    private static function menuItem($i): array
    {
        return ['label' => $i->tr('label'), 'url' => $i->url, 'icon' => $i->icon, 'badge' => $i->tr('badge'), 'description' => $i->tr('description'), 'new_tab' => $i->new_tab,
            'children' => $i->relationLoaded('children') ? $i->children->map(fn ($c) => self::menuItem($c))->all() : []];
    }

    public function translations(string $lang): JsonResponse
    {
        abort_unless(in_array($lang, config('musafir.locales'), true), 404);
        $rows = Translation::all();

        return response()->json(['data' => $rows->mapWithKeys(fn ($t) => [($t->group && $t->group !== '*' ? $t->group.'.' : '').$t->key => $t->value[$lang] ?? $t->value['en'] ?? $t->key])]);
    }

    public function home(): JsonResponse
    {
        return $this->page('home');
    }

    public function page(string $slug): JsonResponse
    {
        $page = Page::published()->with(['sections' => fn ($q) => $q->where('is_active', true)->orderBy('sort'), 'image.media', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => [
            'slug' => $page->slug, 'template' => $page->template, 'title' => $page->tr('title'), 'subtitle' => $page->tr('subtitle'), 'body' => $page->tr('body'),
            'image' => Img::of($page->image), 'data' => Settings::localise($page->data ?? []), 'updated_at' => $page->updated_at?->toIso8601String(),
            'sections' => $page->sections->map(fn ($s) => Sections::resolve($s))->filter()->values()->all(),
            'seo' => P::seo($page->seo),
        ]]);
    }

    public function faqs(Request $request): JsonResponse
    {
        $q = Faq::with('category')->where('is_active', true)->orderBy('sort')
            ->when($request->query('category'), fn ($q, $v) => $q->whereHas('category', fn ($c) => $c->where('slug', $v)))
            ->when($request->query('show_on'), fn ($q, $v) => $q->whereJsonContains('show_on', $v));

        return response()->json(['data' => $q->get()->map(fn ($f) => ['id' => $f->id, 'q' => $f->tr('question'), 'a' => $f->tr('answer'), 'category' => $f->category?->slug])->all(),
            'meta' => ['categories' => FaqCategory::orderBy('sort')->get()->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->tr('name'), 'icon' => $c->icon])]]);
    }

    public function testimonials(): JsonResponse
    {
        return response()->json(['data' => Testimonial::with('avatar.media')->where('is_active', true)->orderBy('sort')->get()->map(fn ($t) => [
            'name' => $t->tr('name'), 'city' => $t->tr('city'), 'trip' => $t->tr('trip'), 'rating' => $t->rating, 'text' => $t->tr('text'), 'initials' => $t->initials,
            'date' => $t->travelled_on?->toDateString(), 'avatar' => Img::of($t->avatar),
        ])]);
    }

    /** All published reviews (reviews page) or those of one product: ?type=tour&slug=... */
    public function reviews(Request $request): JsonResponse
    {
        $map = ['tour' => Tour::class, 'cruise' => Cruise::class, 'activity' => Activity::class, 'hotel' => Hotel::class];
        $v = $request->validate(['type' => ['nullable', 'in:'.implode(',', array_keys($map))], 'slug' => ['nullable', 'required_with:type', 'string'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:50']]);
        $base = Review::where('status', 'published');
        if ($v['type'] ?? null) {
            $model = $map[$v['type']]::published()->where('slug', $v['slug'])->firstOrFail();
            $base->where('reviewable_type', $model::class)->where('reviewable_id', $model->id);
        }
        $hist = (clone $base)->selectRaw('rating, count(*) c')->groupBy('rating')->pluck('c', 'rating');
        $page = (clone $base)->when($v['rating'] ?? null, fn ($q, $r) => $q->where('rating', $r))->orderByDesc('travelled_on')->orderByDesc('id')->paginate($v['per_page'] ?? 12);

        return response()->json([
            'data' => collect($page->items())->map(fn ($r) => P::review($r))->all(),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(),
                'average' => round((float) (clone $base)->avg('rating'), 2), 'histogram' => collect(range(5, 1))->mapWithKeys(fn ($i) => [(string) $i => (int) ($hist[$i] ?? 0)])],
            'links' => ['next' => $page->nextPageUrl(), 'prev' => $page->previousPageUrl()],
        ]);
    }

    public function team(): JsonResponse
    {
        return response()->json(['data' => TeamMember::with('photo.media')->where('is_active', true)->orderBy('sort')->get()->map(fn ($m) => [
            'name' => $m->tr('name'), 'role' => $m->tr('role'), 'bio' => $m->tr('bio'), 'initials' => $m->initials, 'gradient' => $m->gradient, 'photo' => Img::of($m->photo), 'socials' => $m->socials,
        ])]);
    }

    public function posts(Request $request): JsonResponse
    {
        $q = BlogPost::published()->with(['image.media', 'category'])->where('published_at', '<=', now())->orderByDesc('published_at')
            ->when($request->query('category'), fn ($q, $v) => $q->whereHas('category', fn ($c) => $c->where('slug', $v)))->search($request->query('q'));

        return response()->json(['data' => $q->get()->map(fn ($p) => P::postCard($p))->all(),
            'meta' => ['categories' => BlogCategory::orderBy('sort')->get()->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->tr('name')])]]);
    }

    public function post(string $slug): JsonResponse
    {
        $p = BlogPost::published()->with(['image.media', 'category', 'tags', 'seo.ogImage.media'])->where('slug', $slug)->firstOrFail();
        $related = BlogPost::published()->with(['image.media', 'category'])->where('id', '!=', $p->id)->orderByDesc('published_at')->limit(3)->get();

        return response()->json(['data' => P::post($p) + ['related' => $related->map(fn ($r) => P::postCard($r))->all()]]);
    }

    public function gallery(): JsonResponse
    {
        return response()->json(['data' => GalleryAlbum::with('items.asset.media')->where('is_active', true)->orderBy('sort')->get()->map(fn ($a) => [
            'slug' => $a->slug, 'title' => $a->tr('title'),
            'items' => $a->items->map(fn ($i) => ['caption' => $i->tr('caption'), 'image' => Img::of($i->asset)])->all(),
        ])]);
    }

    public function careers(): JsonResponse
    {
        return response()->json(['data' => JobPost::where('status', 'published')->orderBy('sort')->get()->map(fn ($j) => self::job($j))]);
    }

    public function career(string $slug): JsonResponse
    {
        return response()->json(['data' => self::job(JobPost::where('status', 'published')->where('slug', $slug)->firstOrFail(), true)]);
    }

    private static function job(JobPost $j, bool $full = false): array
    {
        return ['slug' => $j->slug, 'title' => $j->tr('title'), 'department' => $j->tr('department'), 'location' => $j->tr('location'), 'type' => $j->tr('employment_type'),
            'experience' => $j->tr('experience'), 'closes_on' => $j->closes_on?->toDateString()] + ($full ? ['description' => $j->tr('description')] : []);
    }

    /** SEO meta for a static/listing route, e.g. GET /seo?path=/tours */
    public function seo(Request $request): JsonResponse
    {
        $path = '/'.trim((string) $request->query('path', '/'), '/');
        $s = SeoMeta::with('ogImage.media')->where('path', $path === '/' ? '/' : $path)->first();

        return response()->json(['data' => P::seo($s)]);
    }

    public function redirects(): JsonResponse
    {
        return response()->json(['data' => Redirect::where('is_active', true)->get(['from_path', 'to_path', 'code'])]);
    }

    /** Everything the sitemap needs: static paths + entity slugs with lastmod. */
    public function sitemap(): JsonResponse
    {
        $entities = [];
        foreach (['tours' => Tour::class, 'destinations' => Destination::class, 'holidays' => Theme::class, 'cruises' => Cruise::class,
            'activities' => Activity::class, 'hotels' => Hotel::class, 'visa' => VisaProduct::class, 'blog' => BlogPost::class] as $prefix => $model) {
            foreach ($model::published()->with('seo')->get(['id', 'slug', 'updated_at']) as $m) {
                if ($m->seo && (! $m->seo->in_sitemap || str_contains((string) $m->seo->robots, 'noindex'))) {
                    continue;
                }
                $entities[] = ['path' => "/{$prefix}/{$m->slug}", 'lastmod' => $m->updated_at?->toDateString(), 'priority' => $m->seo?->sitemap_priority ?? 0.7, 'changefreq' => $m->seo?->sitemap_changefreq ?? 'weekly'];
            }
        }
        $static = SeoMeta::whereNotNull('path')->where('in_sitemap', true)->get()->map(fn ($s) => ['path' => $s->path, 'lastmod' => $s->updated_at?->toDateString(),
            'priority' => $s->sitemap_priority ?? 0.8, 'changefreq' => $s->sitemap_changefreq ?? 'weekly'])->all();
        foreach (Page::published()->with('seo')->whereNotIn('slug', ['home'])->get() as $p) {
            $static[] = ['path' => '/'.$p->slug, 'lastmod' => $p->updated_at?->toDateString(), 'priority' => 0.5, 'changefreq' => 'monthly'];
        }

        return response()->json(['data' => collect(array_merge($static, $entities))->unique('path')->values()]);
    }
}
