<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/** Cached access to the settings table (group.key). Busted by Setting model events. */
final class Settings
{
    public const CACHE_KEY = 'musafir.settings';

    public static function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $out = [];
            foreach (Setting::all() as $s) {
                $out[$s->group][$s->key] = ['value' => $s->value, 'public' => $s->is_public, 'type' => $s->type];
            }

            return $out;
        });
    }

    public static function get(string $path, mixed $default = null): mixed
    {
        [$group, $key] = array_pad(explode('.', $path, 2), 2, null);

        return self::all()[$group][$key]['value'] ?? $default;
    }

    /** Public settings, localised (tr fields resolved for the current locale). */
    public static function public(): array
    {
        $out = [];
        foreach (self::all() as $group => $items) {
            foreach ($items as $key => $s) {
                if (! $s['public']) {
                    continue;
                }
                $out[$group][$key] = self::localise($s['value']);
            }
        }

        return $out;
    }

    public static function localise(mixed $v): mixed
    {
        if (is_array($v) && (array_key_exists('en', $v) && array_key_exists('bn', $v)) && count($v) === 2) {
            return tr_pick($v);
        }
        if (is_array($v)) {
            return array_map(fn ($x) => self::localise($x), $v);
        }

        return $v;
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
