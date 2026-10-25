<?php

namespace Database\Seeders\Support;

use App\Models\MediaAsset;
use Illuminate\Support\Arr;
use RuntimeException;

/**
 * Access to the mockup data exported by tooling/export_seed.py and tooling/export_pages.py
 * (database/seeders/data/*.json) and to the bundled demo photos (database/seeders/media).
 */
final class SeedData
{
    private static array $cache = [];

    private static array $assetIds = [];

    public static function public(?string $key = null): mixed
    {
        return self::load('public', $key);
    }

    public static function app(?string $key = null): mixed
    {
        return self::load('app', $key);
    }

    /** Captured mockup page: ['tpl','title'=>{en,bn},'desc'=>{en,bn},'ctx'=>{en:{},bn:{}}, ...] */
    public static function page(string $path): ?array
    {
        return self::load('pages')[$path] ?? null;
    }

    public static function pages(): array
    {
        return self::load('pages');
    }

    private static function load(string $file, ?string $key = null): mixed
    {
        if (! isset(self::$cache[$file])) {
            $path = database_path("seeders/data/{$file}.json");
            if (! is_file($path)) {
                throw new RuntimeException("Seed data missing: {$path} (run python3 tooling/export_seed.py)");
            }
            self::$cache[$file] = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        }

        return $key === null ? self::$cache[$file] : Arr::get(self::$cache[$file], $key);
    }

    /** Bilingual value from a mockup B() dict or a plain string. */
    public static function b(mixed $v): ?array
    {
        if ($v === null) {
            return null;
        }
        if (is_array($v) && array_key_exists('en', $v)) {
            return ['en' => (string) $v['en'], 'bn' => (string) ($v['bn'] ?? $v['en'])];
        }

        return ['en' => (string) $v, 'bn' => (string) $v];
    }

    public static function bl(?array $list): array
    {
        return array_values(array_map(fn ($v) => self::b($v), $list ?? []));
    }

    /** Media asset id for a mockup photo key (e.g. "maldives"); imports the file on first use. */
    public static function asset(?string $key): ?int
    {
        if (! $key) {
            return null;
        }
        if (isset(self::$assetIds[$key])) {
            return self::$assetIds[$key];
        }
        $existing = MediaAsset::where('key', $key)->value('id');
        if ($existing) {
            return self::$assetIds[$key] = $existing;
        }
        $file = database_path("seeders/media/{$key}.jpg");
        if (! is_file($file)) {
            return null;
        }
        $credits = self::credits()[$key] ?? [];
        [$w, $h] = getimagesize($file) ?: [null, null];
        $label = ucwords(str_replace(['-', '_'], ' ', $key));
        $asset = MediaAsset::create([
            'key' => $key,
            'name' => $label,
            'alt' => ['en' => $credits['alt_en'] ?? $label, 'bn' => $credits['alt_bn'] ?? $label],
            'credit' => isset($credits['artist']) ? trim(strip_tags((string) $credits['artist'])) : null,
            'credit_url' => $credits['page'] ?? null,
            'license' => $credits['license'] ?? null,
            'width' => $w,
            'height' => $h,
        ]);
        $asset->addMedia($file)->preservingOriginal()->usingFileName($key.'.jpg')->toMediaCollection('file');

        return self::$assetIds[$key] = $asset->id;
    }

    /** @return list<int> */
    public static function assets(array $keys): array
    {
        return array_values(array_filter(array_map(fn ($k) => self::asset($k), array_values(array_unique($keys)))));
    }

    private static function credits(): array
    {
        return self::$cache['credits'] ??= (json_decode((string) @file_get_contents(database_path('seeders/media/credits.json')), true) ?: []);
    }

    public static function reset(): void
    {
        self::$assetIds = [];
    }
}
