<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\BlogPost;
use App\Models\Cruise;
use App\Models\Destination;
use App\Models\Hotel;
use App\Models\Page;
use App\Models\SeoMeta;
use App\Models\Theme;
use App\Models\Tour;
use App\Models\VisaProduct;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;

/**
 * Meta title/description of every public mockup page (captured per language by tooling/export_pages.py).
 * Entity pages are attached to their model (seoable); listing/static pages are keyed by path.
 */
class SeoSeeder extends Seeder
{
    private const ENTITY = ['tours' => Tour::class, 'destinations' => Destination::class, 'cruises' => Cruise::class, 'activities' => Activity::class, 'hotels' => Hotel::class,
        'visa' => VisaProduct::class, 'holidays' => Theme::class, 'blog' => BlogPost::class];

    public function run(): void
    {
        SeoMeta::query()->delete();
        foreach (S::pages() as $file => $p) {
            if (str_starts_with($file, 'admin/') || str_starts_with($file, 'account/')) {
                continue;
            }
            $path = '/'.preg_replace(['/(^|\/)index\.html$/', '/\.html$/'], ['', ''], $file);
            $attrs = [
                'meta_title' => $p['title'], 'meta_description' => $p['desc'], 'og_image_id' => S::asset($p['image'] ?? null),
                'robots' => $p['noindex'] ? 'noindex,follow' : null, 'in_sitemap' => ! $p['noindex'] && ! in_array($path, ['/404', '/compare', '/wishlist', '/booking', '/booking-confirmed', '/login', '/register', '/forgot-password'], true),
                'sitemap_priority' => $path === '/' ? 1.0 : (substr_count($path, '/') === 1 ? 0.9 : 0.7), 'sitemap_changefreq' => 'weekly',
            ];
            $seg = explode('/', trim($path, '/'));
            $model = count($seg) === 2 ? (self::ENTITY[$seg[0]] ?? null) : null;
            $entity = $model ? $model::where('slug', $seg[1])->first() : null;
            if (! $entity && count($seg) === 1) {
                $entity = Page::where('slug', $seg[0] === '' ? 'home' : $seg[0])->first();
            }
            if ($entity) {
                $entity->seo()->create($attrs);
            } else {
                SeoMeta::create($attrs + ['path' => $path]);
            }
        }
    }
}
