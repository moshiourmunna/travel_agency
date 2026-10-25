<?php

namespace App\Models\Concerns;

use App\Models\MediaAsset;
use App\Models\SeoMeta;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Collection;

/**
 * Shared behaviour for public catalogue/CMS entities: status scopes, cover image + gallery from the
 * central media library, a morph-one SEO record and an EN+BN search_text column kept in sync on save.
 */
trait Publishable
{
    public static function bootPublishable(): void
    {
        static::saving(function ($model) {
            if (property_exists($model, 'searchable')) {
                $model->search_text = $model->buildSearchText();
            }
            if (($model->status ?? null) === 'published' && ! $model->published_at) {
                $model->published_at = now();
            }
        });
    }

    /** Fields concatenated (both locales) into search_text. Override with protected array $searchable. */
    public function buildSearchText(): string
    {
        $parts = [$this->slug ?? ''];
        foreach ($this->searchable ?? [] as $field) {
            $v = $this->getAttributes()[$field] ?? null;
            $v = is_string($v) ? (json_decode($v, true) ?? $v) : $v;
            array_walk_recursive_safe($v, function ($s) use (&$parts) {
                $parts[] = $s;
            });
        }

        return mb_substr(trim(preg_replace('/\s+/u', ' ', strip_tags(implode(' ', $parts)))), 0, 60000);
    }

    public function scopePublished(Builder $q): Builder
    {
        $t = $this->getTable();

        // Scheduled content goes live when published_at passes (Next revalidates listing pages every few minutes).
        return $q->where("{$t}.status", 'published')
            ->where(fn ($w) => $w->whereNull("{$t}.published_at")->orWhere("{$t}.published_at", '<=', now()));
    }

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where($this->getTable().'.is_featured', true);
    }

    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy($this->getTable().'.sort')->orderBy($this->getTable().'.id');
    }

    public function scopeSearch(Builder $q, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $q;
        }
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';

        return $q->where($this->getTable().'.search_text', 'like', $like);
    }

    public function image(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'image_id');
    }

    public function seo(): MorphOne
    {
        return $this->morphOne(SeoMeta::class, 'seoable');
    }

    /** Gallery assets in stored order (gallery = json array of media_asset ids). */
    public function galleryAssets(): Collection
    {
        $ids = array_values(array_filter((array) ($this->gallery ?? [])));
        if (! $ids) {
            return collect();
        }
        $assets = MediaAsset::with('media')->whereIn('id', $ids)->get()->keyBy('id');

        return collect($ids)->map(fn ($id) => $assets->get($id))->filter()->values();
    }
}
