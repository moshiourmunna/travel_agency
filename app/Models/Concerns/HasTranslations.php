<?php

namespace App\Models\Concerns;

/**
 * Translatable JSON columns: {"en": "...", "bn": "...", "ar": "..."}.
 * $model->title returns the current locale, falling back to the default language and then to any filled value.
 * Use $model->getTranslations('title') for the raw array (admin forms).
 */
trait HasTranslations
{
    public function getAttribute($key)
    {
        if (in_array($key, $this->translatable ?? [], true)) {
            return $this->translate($key);
        }

        return parent::getAttribute($key);
    }

    public function getTranslations(string $field): array
    {
        $raw = parent::getAttribute($field);
        if (is_string($raw)) {
            $raw = json_decode($raw, true) ?? ['en' => $raw];
        }

        return is_array($raw) ? $raw : [];
    }

    public function translate(string $field, ?string $locale = null): mixed
    {
        $all = $this->getTranslations($field);
        $locale = $locale ?: app()->getLocale();
        foreach ([$locale, config('app.fallback_locale', 'en'), 'en'] as $l) {
            if (isset($all[$l]) && $this->filled($all[$l])) {
                return $all[$l];
            }
        }
        foreach ($all as $v) {
            if ($this->filled($v)) {
                return $v;
            }
        }

        return null;
    }

    protected function initializeHasTranslations(): void
    {
        foreach ($this->translatable ?? [] as $f) {
            $this->casts[$f] = 'array';
        }
    }

    private function filled(mixed $v): bool
    {
        return is_array($v) ? count(array_filter($v)) > 0 : trim((string) $v) !== '';
    }
}
