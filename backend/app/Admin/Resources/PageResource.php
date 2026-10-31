<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Activity;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\Page;
use App\Models\PageSection;
use App\Models\Review;
use App\Models\Tour;
use Illuminate\Database\Eloquent\Model;

class PageResource extends Resource
{
    public string $model = Page::class;

    public string $slug = 'pages';

    public array $label = ['en' => 'Pages & home sections', 'bn' => 'পেজ ও হোম সেকশন'];

    public array $singular = ['en' => 'Page', 'bn' => 'পেজ'];

    public string $icon = 'file-text';

    public string $perm = 'content';

    public string $defaultSort = 'id';

    /** Pages that back a fixed website route (cannot be deleted or renamed). */
    public const BUILT_IN = ['home', 'about', 'activities', 'blog', 'careers', 'compare', 'contact', 'cruises', 'custom-tour', 'destinations', 'faq', 'flights', 'gallery', 'gift-cards',
        'group-tours', 'holidays', 'hotels', 'insurance', 'offers', 'privacy', 'refund-policy', 'reviews', 'sitemap', 'team', 'terms', 'tours', 'trip-planner', 'visa', 'wishlist'];

    public const TYPES = ['hero' => 'Hero banner with search', 'trust_strip' => 'Trust strip', 'categories' => 'Trip categories', 'destinations_bento' => 'Featured destinations',
        'deals' => 'Flash deals (offers)', 'tours' => 'Popular tours', 'themes' => 'Holiday themes', 'cruises' => 'Cruise band', 'activities' => 'Activities', 'trust_safety' => 'Trust & safety',
        'services' => 'Services grid', 'why_us' => 'Why choose us', 'how_it_works' => 'How it works', 'testimonials' => 'Testimonials / reviews', 'partners' => 'Partner logos',
        'blog' => 'Latest blog posts', 'app_promo' => 'App promotion', 'faq' => 'FAQ'];

    public function columns(): array
    {
        return [
            Col::tr('title', 'Page', 'পেজ')->sortable(),
            Col::make('slug', 'URL', 'ইউআরএল')->value(fn ($m) => $m->slug === 'home' ? '/' : '/'.$m->slug),
            Col::make('template', 'Template', 'টেমপ্লেট')->hideMobile(),
            Col::number('sections', 'Sections', 'সেকশন')->value(fn ($m) => $m->sections_count ?: null)->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
            Col::datetime('updated_at', 'Updated', 'আপডেট')->sortable()->hideMobile(),
        ];
    }

    public function query(): \Illuminate\Database\Eloquent\Builder
    {
        return Page::query()->withCount('sections');
    }

    public function filters(): array
    {
        return [Filter::status(), Filter::select('template', 'Template', 'টেমপ্লেট', ['home' => 'Home', 'hero' => 'Hero', 'legal' => 'Legal', 'plain' => 'Plain', 'search' => 'Search', 'default' => 'Default'])];
    }

    public static function sources(): array
    {
        $o = fn ($class, $col) => collect(self::opts($class, $col, fn ($q) => $q->orderBy('id')))->map(fn ($l, $id) => ['value' => $id, 'label' => $l])->values()->all();

        return [
            'destinations' => $o(Destination::class, 'name'), 'tours' => $o(Tour::class, 'title'), 'cruises' => $o(Cruise::class, 'title'), 'activities' => $o(Activity::class, 'title'),
            'reviews' => Review::where('status', 'published')->orderByDesc('id')->limit(200)->get()->map(fn ($r) => ['value' => $r->id, 'label' => $r->tr('author_name').' — '.$r->tr('trip_title').' ('.$r->rating.'★)'])->all(),
        ];
    }

    public function sections(): array
    {
        $templates = PageSection::orderBy('id')->get()->unique('type')->mapWithKeys(fn ($s) => [$s->type => self::emptied($s->data)])->all();

        return [
            ['title' => ['en' => 'Page', 'bn' => 'পেজ'], 'tab' => C::T_CONTENT, 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::slug('slug', 'title')->half()->help('Built-in pages keep their URL. A new page is published at /{slug}.', 'বিল্ট-ইন পেজের ইউআরএল বদলায় না। নতুন পেজ /{slug} ঠিকানায় প্রকাশ হবে।'),
                Field::select('template', 'Template', 'টেমপ্লেট', ['legal' => 'Article / legal (numbered sections)', 'hero' => 'Hero (built-in page)', 'home' => 'Home', 'plain' => 'Plain', 'search' => 'Search', 'default' => 'Default'])->required()->default('legal')->half(),
                Field::trtext('subtitle', 'Subtitle (hero text)', 'সাবটাইটেল (হিরো লেখা)'),
                Field::trhtml('body', 'Body', 'মূল লেখা')->help('Use Heading 2 for each numbered section on article pages.', 'আর্টিকেল পেজে প্রতিটি অংশের জন্য হেডিং ২ ব্যবহার করুন।'),
                Field::image('image_id', 'Hero photo', 'হিরো ছবি'),
                Field::json('data', 'Page blocks (story, values, form texts…)', 'পেজের ব্লক (গল্প, মূল্যবোধ, ফর্মের লেখা…)')
                    ->help('Structured texts used by this page’s design. Fields follow the existing content.', 'এই পেজের ডিজাইনে ব্যবহৃত লেখা।'),
            ]],
            ['title' => ['en' => 'Page sections (drag to reorder)', 'bn' => 'পেজ সেকশন (টেনে ক্রম বদলান)'], 'tab' => ['en' => 'Sections', 'bn' => 'সেকশন'], 'fields' => [
                Field::children('sections', 'Sections', 'সেকশন', [
                    Field::select('type', 'Section type', 'সেকশনের ধরন', self::TYPES)->required()->span(8),
                    Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true)->span(4),
                    Field::json('data', 'Content', 'কনটেন্ট')->meta(['sectionData' => true]),
                ], 'sort')->meta(['templates' => $templates, 'sources' => self::sources(), 'collapsible' => true, 'titleFrom' => 'type']),
            ]],
            C::seo(),
            C::publish(false, true, false),
        ];
    }

    /** A section's data with all texts blanked: the template for a new section of that type. */
    public static function emptied(mixed $v): mixed
    {
        if (is_array($v)) {
            if (array_is_list($v)) {
                return $v && is_array($v[0]) ? [self::emptied($v[0])] : [];
            }
            $out = [];
            foreach ($v as $k => $x) {
                $out[$k] = in_array($k, ['source', 'limit'], true) ? $x : self::emptied($x);
            }

            return $out;
        }

        return is_string($v) ? '' : (is_bool($v) ? $v : (is_numeric($v) ? null : null));
    }

    public function canDelete(Model $m): bool
    {
        return ! in_array($m->slug, self::BUILT_IN, true);
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        if (! $creating && in_array($m->getOriginal('slug'), self::BUILT_IN, true)) {
            $m->slug = $m->getOriginal('slug'); // fixed routes
        }
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site($m->slug === 'home' ? '/' : '/'.$m->slug);
    }
}
