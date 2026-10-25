<?php

namespace Database\Seeders;

use App\Models\Airline;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\Faq;
use App\Models\FaqCategory;
use App\Models\GalleryAlbum;
use App\Models\JobPost;
use App\Models\Page;
use App\Models\Partner;
use App\Models\Stat;
use App\Models\Tag;
use App\Models\TeamMember;
use App\Models\Testimonial;
use App\Models\User;
use Database\Seeders\Support\SeedData as S;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** FAQs, testimonials, team, stats, partners, blog, careers, legal/CMS pages, gallery. */
class ContentSeeder extends Seeder
{
    public function run(): void
    {
        // FAQ categories + FAQs (general FAQS + visa FAQs captured from the visa pages)
        $cats = ['booking' => ['Booking', 'বুকিং', 'calendar-check'], 'payment' => ['Payments & refunds', 'পেমেন্ট ও রিফান্ড', 'wallet'], 'visa' => ['Visa', 'ভিসা', 'stamp']];
        $catIds = [];
        $n = 0;
        foreach ($cats as $slug => [$en, $bn, $icon]) {
            $catIds[$slug] = FaqCategory::updateOrCreate(['slug' => $slug], ['name' => ['en' => $en, 'bn' => $bn], 'icon' => $icon, 'sort' => ++$n])->id;
        }
        Faq::query()->delete();
        foreach (S::public('FAQS') as $i => [$q, $a, $cat]) {
            Faq::create(['faq_category_id' => $catIds[$cat] ?? null, 'question' => S::b($q), 'answer' => S::b($a), 'show_on' => array_values(array_filter(['faq', $i < 6 ? 'home' : null, ($i >= 3 && $i < 8) ? 'tour' : null])), 'sort' => $i + 1]);
        }
        foreach (S::page('visa/thailand.html')['ctx']['en']['faqs'] ?? [] as $i => [$q, $a, $cat]) {
            Faq::create(['faq_category_id' => $catIds['visa'], 'question' => S::b($q), 'answer' => S::b($a), 'show_on' => ['visa'], 'sort' => 100 + $i]);
        }

        Testimonial::query()->delete();
        foreach (S::page('reviews.html')['ctx']['en']['revs'] as $i => $r) {
            Testimonial::create(['name' => S::b($r['name']), 'city' => S::b($r['city']), 'trip' => S::b($r['trip']), 'rating' => $r['rating'], 'text' => S::b($r['text']),
                'initials' => $r['ini'], 'travelled_on' => $r['date'], 'is_featured' => true, 'sort' => $i + 1]);
        }

        TeamMember::query()->delete();
        foreach (S::public('TEAM') as $i => $t) {
            TeamMember::create(['name' => S::b($t['name']), 'role' => S::b($t['role']), 'initials' => $t['ini'], 'gradient' => $t['c'], 'countries_visited' => 15 + $i * 3, 'sort' => $i + 1,
                'socials' => ['linkedin' => 'https://www.linkedin.com/company/musafir-travels', 'email' => 'hello@musafir.com.bd']]);
        }

        Stat::query()->delete();
        foreach (S::public('STATS') as $i => [$value, $suffix, $label]) {
            Stat::create(['value' => $value, 'suffix' => $suffix ?: null, 'label' => S::b($label), 'sort' => $i + 1]);
        }

        Partner::query()->delete();
        foreach (Airline::orderBy('id')->get() as $i => $a) {
            Partner::create(['kind' => 'airline', 'name' => $a->name, 'code' => $a->code, 'color' => $a->color, 'sort' => $i + 1]);
        }
        foreach (['bKash', 'Nagad', 'SSLCOMMERZ', 'Visa', 'Mastercard', 'American Express'] as $i => $p) {
            Partner::create(['kind' => 'payment', 'name' => $p, 'code' => Str::slug($p), 'sort' => $i + 1]);
        }
        foreach (['IATA', 'ATAB', 'TOAB', 'BTB'] as $i => $p) {
            Partner::create(['kind' => 'association', 'name' => $p, 'code' => strtolower($p), 'sort' => $i + 1]);
        }

        // Blog
        $author = User::where('email', 'content@musafir.test')->first();
        foreach (S::public('BLOG') as $i => $p) {
            $cat = BlogCategory::updateOrCreate(['slug' => Str::slug($p['cat']['en'])], ['name' => S::b($p['cat']), 'sort' => $i + 1]);
            $page = S::page("blog/{$p['slug']}.html");
            $post = BlogPost::updateOrCreate(['slug' => $p['slug']], [
                'blog_category_id' => $cat->id, 'author_id' => $author?->id, 'author_name' => S::b($p['author']), 'title' => S::b($p['title']), 'excerpt' => S::b($p['ex']),
                'body' => ['en' => self::bodyHtml($page['ctx']['en']['body']), 'bn' => self::bodyHtml($page['ctx']['bn']['body'])],
                'image_id' => S::asset($p['img']), 'reading_mins' => $p['mins'], 'is_featured' => $i === 0, 'status' => 'published', 'published_at' => $p['date'].' 09:00:00',
            ]);
            $tagIds = [];
            foreach ($page['ctx']['en']['tags'] as $k => $tag) {
                if (isset($tagIds[Str::slug($tag)])) {
                    continue; // mockup lists the category twice (category + destination); first one carries the translation
                }
                $bn = $page['ctx']['bn']['tags'][$k] ?? $tag;
                $prev = Tag::where('slug', Str::slug($tag))->first();
                if ($bn === $tag && $prev) { // untranslated in this post: keep a translation another post provided
                    $bn = $prev->getTranslation('name', 'bn', false) ?: $bn;
                }
                $tagIds[Str::slug($tag)] = Tag::updateOrCreate(['slug' => Str::slug($tag)], ['name' => ['en' => $tag, 'bn' => $bn]])->id;
            }
            $post->tags()->sync(array_values($tagIds));
        }

        // Careers
        foreach (S::public('CAREERS') as $i => $c) {
            JobPost::updateOrCreate(['slug' => Str::slug(Str::before($c['title']['en'], ' ('))], [
                'title' => S::b($c['title']), 'department' => S::b($c['dept']), 'location' => S::b($c['loc']), 'employment_type' => S::b($c['type']), 'experience' => S::b($c['exp']),
                'description' => ['en' => '<p>Join a fast-growing travel company and help Bangladeshi travellers explore the world with care.</p>', 'bn' => '<p>দ্রুত বর্ধনশীল একটি ট্রাভেল কোম্পানিতে যোগ দিন এবং বাংলাদেশি ভ্রমণকারীদের যত্নের সাথে বিশ্ব ঘুরে দেখতে সাহায্য করুন।</p>'],
                'closes_on' => '2026-12-31', 'status' => 'published', 'sort' => $i + 1,
            ]);
        }

        // Legal pages: sections become rich-text HTML (editable in admin), keep the structured copy in data
        foreach (['terms', 'privacy', 'refund-policy'] as $slug) {
            $ctx = S::page("{$slug}.html")['ctx']['en'];
            $html = ['en' => '', 'bn' => ''];
            foreach ($ctx['sections'] as [$h, $p]) {
                foreach (['en', 'bn'] as $l) {
                    $html[$l] .= '<h2>'.e($h[$l]).'</h2><p>'.e($p[$l]).'</p>';
                }
            }
            Page::updateOrCreate(['slug' => $slug], ['template' => 'legal', 'title' => S::b($ctx['heading']), 'body' => $html, 'data' => ['updated' => '2026-10-01'], 'status' => 'published', 'published_at' => '2026-10-01']);
        }

        // Gallery: one album per filter chip (Bangladesh / International)
        GalleryAlbum::where('slug', 'destinations')->delete(); // pre-M3 single album
        $albums = [];
        foreach (['bd' => ['bangladesh', 'Bangladesh', 'বাংলাদেশ'], 'intl' => ['international', 'International', 'আন্তর্জাতিক']] as $region => [$slug, $en, $bnName]) {
            $albums[$region] = GalleryAlbum::updateOrCreate(['slug' => $slug], ['title' => ['en' => $en, 'bn' => $bnName], 'sort' => count($albums) + 1, 'is_active' => true]);
            $albums[$region]->items()->delete();
        }
        $bn = S::page('gallery.html')['ctx']['bn']['photos'];
        foreach (S::page('gallery.html')['ctx']['en']['photos'] as $i => [$key, $caption, $region]) {
            if ($id = S::asset($key)) {
                $albums[$region === 'bd' ? 'bd' : 'intl']->items()->create(['media_asset_id' => $id, 'caption' => ['en' => $caption, 'bn' => $bn[$i][1] ?? $caption], 'sort' => $i + 1]);
            }
        }
    }

    /** Mockup blog body blocks [{h, p[], list[]}] -> HTML. */
    public static function bodyHtml(array $blocks): string
    {
        $out = '';
        foreach ($blocks as $b) {
            $out .= '<h2>'.e($b['h']).'</h2>';
            foreach ($b['p'] ?? [] as $p) {
                $out .= '<p>'.e($p).'</p>';
            }
            if (! empty($b['list'])) {
                $out .= '<ul>'.implode('', array_map(fn ($li) => '<li>'.e($li).'</li>', $b['list'])).'</ul>';
            }
        }

        return $out;
    }
}
