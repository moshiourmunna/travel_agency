<?php

if (! function_exists('array_walk_recursive_safe')) {
    /** array_walk_recursive that also accepts scalars/null and only visits string leaves. */
    function array_walk_recursive_safe(mixed $value, callable $fn): void
    {
        if (is_array($value)) {
            array_walk_recursive($value, function ($v) use ($fn) {
                if (is_string($v) && $v !== '') {
                    $fn($v);
                }
            });
        } elseif (is_string($value) && $value !== '') {
            $fn($value);
        }
    }
}

if (! function_exists('tr_pick')) {
    /** Pick a locale from a {"en":..,"bn":..} array (or return a plain string). Falls back to English. */
    function tr_pick(mixed $value, ?string $locale = null): mixed
    {
        $locale ??= app()->getLocale();
        if (is_array($value) && (array_key_exists('en', $value) || array_key_exists('bn', $value))) {
            return ($value[$locale] ?? null) !== null && $value[$locale] !== '' ? $value[$locale] : ($value['en'] ?? null);
        }

        return $value;
    }
}

if (! function_exists('tr_list')) {
    /** Localise a list of {"en","bn"} items. */
    function tr_list(?array $items, ?string $locale = null): array
    {
        return array_values(array_map(fn ($i) => tr_pick($i, $locale), $items ?? []));
    }
}
