<?php

namespace App\Support;

use App\Models\MediaAsset;
use Illuminate\Support\Collection;

/** Image payloads for the API (see MediaAsset::toImage). */
final class Img
{
    public static function of(?MediaAsset $asset): ?array
    {
        return $asset?->toImage();
    }

    /** @param  iterable<MediaAsset>|Collection  $assets */
    public static function many(iterable $assets): array
    {
        $out = [];
        foreach ($assets as $a) {
            if ($a) {
                $out[] = $a->toImage();
            }
        }

        return $out;
    }

    /** Resolve a list of asset ids (json gallery column) preserving order, with one query. */
    public static function ids(?array $ids): array
    {
        $ids = array_values(array_filter($ids ?? []));
        if (! $ids) {
            return [];
        }
        $assets = MediaAsset::with('media')->whereIn('id', $ids)->get()->keyBy('id');

        return self::many(array_map(fn ($id) => $assets->get($id), $ids));
    }

    /** Image by seed key (e.g. "maldives") for content that stores keys. */
    public static function key(?string $key): ?array
    {
        static $cache = [];
        if (! $key) {
            return null;
        }

        return $cache[$key] ??= MediaAsset::with('media')->where('key', $key)->first()?->toImage();
    }
}
