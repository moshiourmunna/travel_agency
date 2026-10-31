<?php

namespace App\Admin\Resources\Concerns;

use App\Admin\Field;
use App\Admin\Resource;
use App\Models\CancellationPolicy;
use App\Models\Destination;
use App\Models\Region;

/** Field groups shared by many modules. */
final class Common
{
    public const T_DETAILS = ['en' => 'Details', 'bn' => 'বিস্তারিত'];

    public const T_CONTENT = ['en' => 'Content', 'bn' => 'কনটেন্ট'];

    public const T_MEDIA = ['en' => 'Photos', 'bn' => 'ছবি'];

    public const T_SEO = ['en' => 'SEO', 'bn' => 'এসইও'];

    public const T_PRICING = ['en' => 'Pricing & dates', 'bn' => 'মূল্য ও তারিখ'];

    /** Status / featured / order / schedule card shown beside the form. */
    public static function publish(bool $featured = true, bool $schedule = true, bool $sort = true): array
    {
        $f = [Field::select('status', 'Status', 'অবস্থা', Resource::statusOptions())->required()->default('draft')];
        if ($featured) {
            $f[] = Field::switch('is_featured', 'Featured', 'ফিচার্ড')->help('Shown first on the home page and in listings.', 'হোম পেজ ও তালিকায় আগে দেখাবে।');
        }
        if ($sort) {
            $f[] = Field::number('sort', 'Display order', 'প্রদর্শনের ক্রম')->default(0)->rule('integer')->help('Lower numbers come first.', 'ছোট সংখ্যা আগে আসে।');
        }
        if ($schedule) {
            $f[] = Field::datetime('published_at', 'Publish date', 'প্রকাশের তারিখ')->help('A future date schedules the item; it goes live automatically.', 'ভবিষ্যতের তারিখ দিলে নির্ধারিত সময়ে নিজে থেকেই প্রকাশ হবে।');
        }

        return ['title' => ['en' => 'Publishing', 'bn' => 'প্রকাশ'], 'aside' => true, 'fields' => $f];
    }

    public static function media(bool $gallery = true, string $cover = 'image_id'): array
    {
        $f = [Field::image($cover, 'Cover photo', 'কভার ছবি')];
        if ($gallery) {
            $f[] = Field::gallery('gallery', 'Gallery', 'গ্যালারি')->help('Drag to reorder. The first photos appear in the page header.', 'টেনে ক্রম বদলান। প্রথম ছবিগুলো পেজের উপরে দেখাবে।');
        }

        return ['title' => ['en' => 'Photos', 'bn' => 'ছবি'], 'tab' => self::T_MEDIA, 'fields' => $f];
    }

    public static function seo(): array
    {
        return ['title' => ['en' => 'Search engines & sharing', 'bn' => 'সার্চ ইঞ্জিন ও শেয়ারিং'], 'tab' => self::T_SEO, 'fields' => [Field::seo()]];
    }

    public static function regions(): array
    {
        return Region::orderBy('sort')->get()->mapWithKeys(fn ($r) => [$r->code => $r->getTranslations('name')])->all();
    }

    public static function destinations(): array
    {
        return Resource::opts(Destination::class, 'name', fn ($q) => $q->orderBy('sort'));
    }

    public static function policies(): array
    {
        return Resource::opts(CancellationPolicy::class, 'name');
    }

    public static function site(string $path): string
    {
        return config('musafir.frontend_url').'/en'.($path === '/' ? '' : $path);
    }
}
