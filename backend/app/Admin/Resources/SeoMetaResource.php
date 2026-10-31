<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\SeoMeta;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/** Every SEO record: per-item ones (also editable on each item's SEO tab) and path-based ones for fixed pages. */
class SeoMetaResource extends Resource
{
    public string $model = SeoMeta::class;

    public string $slug = 'seo';

    public array $label = ['en' => 'SEO meta', 'bn' => 'এসইও মেটা'];

    public array $singular = ['en' => 'SEO record', 'bn' => 'এসইও রেকর্ড'];

    public string $icon = 'search';

    public string $perm = 'content';

    public array $abilities = ['view' => 'seo.manage', 'manage' => 'seo.manage', 'delete' => 'seo.manage'];

    public array $with = ['seoable'];

    public array $search = ['path', 'meta_title', 'meta_description'];

    public function columns(): array
    {
        return [
            Col::make('page', 'Page', 'পেজ')->value(fn ($m) => self::target($m)),
            Col::tr('meta_title', 'Meta title', 'মেটা শিরোনাম'),
            Col::make('robots', 'Robots', 'রোবটস')->hideMobile(),
            Col::bool('in_sitemap', 'Sitemap', 'সাইটম্যাপ')->hideMobile(),
            Col::datetime('updated_at', 'Updated', 'আপডেট')->sortable()->hideMobile(),
        ];
    }

    public static function target(SeoMeta $m): string
    {
        if ($m->path) {
            return $m->path;
        }
        $s = $m->seoable;
        if (! $s) {
            return '—';
        }
        $field = in_array('title', $s->translatable ?? [], true) ? 'title' : 'name';

        return class_basename($s).' · '.$s->tr($field);
    }

    public function filters(): array
    {
        return [Filter::select('seoable_type', 'Type', 'ধরন', ['path' => 'Fixed paths', 'App\\Models\\Page' => 'Pages', 'App\\Models\\Tour' => 'Tours', 'App\\Models\\Destination' => 'Destinations',
            'App\\Models\\BlogPost' => 'Blog posts', 'App\\Models\\Cruise' => 'Cruises', 'App\\Models\\Activity' => 'Activities', 'App\\Models\\Hotel' => 'Hotels', 'App\\Models\\VisaProduct' => 'Visas', 'App\\Models\\Theme' => 'Themes'])
            ->apply(fn ($q, $v) => $v === 'path' ? $q->whereNotNull('path') : $q->where('seoable_type', $v))];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Search result', 'bn' => 'সার্চ ফলাফল'], 'fields' => [
                Field::text('path', 'Fixed path (e.g. /flights) — only for pages without their own record', 'নির্দিষ্ট পাথ (যেমন /flights)')->rule('nullable')->rule('regex:/^\\/[a-z0-9\\/\\-]*$/'),
                Field::tr('meta_title', 'Meta title', 'মেটা শিরোনাম')->meta(['counter' => 60]),
                Field::trtext('meta_description', 'Meta description', 'মেটা বিবরণ')->meta(['counter' => 160]),
                Field::tr('og_title', 'Social share title', 'সোশ্যাল শেয়ার শিরোনাম'),
                Field::tr('keywords', 'Keywords', 'কীওয়ার্ড'),
                Field::image('og_image_id', 'Social share image', 'সোশ্যাল শেয়ার ছবি'),
            ]],
            ['title' => ['en' => 'Indexing', 'bn' => 'ইনডেক্সিং'], 'aside' => true, 'fields' => [
                Field::text('canonical', 'Canonical URL', 'ক্যানোনিকাল ইউআরএল')->rule('max:300'),
                Field::select('robots', 'Robots', 'রোবটস', ['index,follow' => 'index, follow', 'noindex,follow' => 'noindex, follow', 'index,nofollow' => 'index, nofollow', 'noindex,nofollow' => 'noindex, nofollow'])->default('index,follow'),
                Field::switch('in_sitemap', 'Include in sitemap', 'সাইটম্যাপে রাখুন')->default(true),
                Field::number('sitemap_priority', 'Sitemap priority (0–1)', 'সাইটম্যাপ অগ্রাধিকার')->rule('between:0,1'),
                Field::select('sitemap_changefreq', 'Change frequency', 'পরিবর্তনের হার', array_combine($f = ['daily', 'weekly', 'monthly', 'yearly'], $f))->default('weekly'),
            ]],
            ['title' => ['en' => 'Structured data (advanced)', 'bn' => 'স্ট্রাকচার্ড ডেটা (অ্যাডভান্সড)'], 'fields' => [
                Field::json('json_ld_override', 'JSON-LD override', 'JSON-LD ওভাররাইড')->meta(['raw' => true])->help('Replaces the generated schema.org data for this page. Leave empty to use the automatic data.', 'এই পেজের স্বয়ংক্রিয় schema.org ডেটার বদলে এটি ব্যবহার হবে।'),
            ]],
        ];
    }

    public function rules(?Model $m): array
    {
        $r = parent::rules($m);
        $r['path'] = ['nullable', 'string', 'max:200', 'regex:/^\/[a-z0-9\/\-]*$/', Rule::unique('seo_meta', 'path')->ignore($m?->id), Rule::requiredIf(fn () => ! $m?->seoable_type)];

        return $r;
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        if ($m->seoable_type) {
            $m->path = null; // item records are addressed by their item
        }
    }

    public function title(Model $m): string
    {
        return self::target($m);
    }
}
