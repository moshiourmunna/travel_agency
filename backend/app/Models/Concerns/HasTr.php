<?php

namespace App\Models\Concerns;

use Spatie\Translatable\HasTranslations;

/** spatie/laravel-translatable with Musafir defaults: fallback to English, never return null for missing BN. */
trait HasTr
{
    use HasTranslations;

    public function useFallbackLocale(): bool
    {
        return true;
    }

    /** Localised value of a translatable attribute for the current app locale. */
    public function tr(string $key, ?string $locale = null): ?string
    {
        $v = $this->getTranslation($key, $locale ?? app()->getLocale(), true);

        return $v === '' ? null : $v;
    }
}
