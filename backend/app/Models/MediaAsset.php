<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * One file in the central media library. Content (tours, pages, banners...) references assets by id,
 * so an image is uploaded once and reused. Responsive WebP conversions are generated on upload.
 */
class MediaAsset extends Model implements HasMedia
{
    use HasPublicUlid, HasTr, InteractsWithMedia, SoftDeletes;

    /** name => max width */
    /** webp variants (srcset). Order matters: [0] thumb and [1] card are used as fallbacks by the site; 'wide' was added in M7. */
    public const SIZES = ['thumb' => 480, 'card' => 800, 'hero' => 1600, 'wide' => 1200];

    protected $guarded = ['id'];

    public array $translatable = ['alt'];

    protected function casts(): array
    {
        return ['focal_x' => 'float', 'focal_y' => 'float'];
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('file')->singleFile();
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        if ($media && ! str_starts_with((string) $media->mime_type, 'image/') || ($media && $media->mime_type === 'image/svg+xml')) {
            return;
        }
        foreach (self::SIZES as $name => $w) {
            $this->addMediaConversion($name)->fit(Fit::Max, $w, $w * 2)->format('webp')->quality($w >= 1200 ? 68 : 72)->nonQueued(); // tuned in M7 (Lighthouse LCP) — visually identical on photos
        }
    }

    public function file(): ?Media
    {
        return $this->relationLoaded('media') ? $this->media->firstWhere('collection_name', 'file') : $this->getFirstMedia('file');
    }

    public function url(string $conversion = ''): ?string
    {
        $m = $this->file();
        if (! $m) {
            return null;
        }
        if ($conversion !== '' && $m->hasGeneratedConversion($conversion)) {
            return $m->getFullUrl($conversion);
        }

        return $m->getFullUrl();
    }

    /** Shape consumed by the Next.js image loader and the admin. */
    public function toImage(?string $locale = null): array
    {
        $m = $this->file();
        $srcset = [];
        if ($m) {
            foreach (self::SIZES as $name => $w) {
                if ($m->hasGeneratedConversion($name)) {
                    $srcset[] = ['w' => min($w, (int) ($this->width ?: $w)), 'url' => $m->getFullUrl($name)];
                }
            }
        }

        return [
            'id' => $this->id,
            'key' => $this->key,
            'src' => $m?->getFullUrl(),
            'alt' => $this->tr('alt', $locale) ?? '',
            'width' => $this->width,
            'height' => $this->height,
            'focal' => [$this->focal_x, $this->focal_y],
            'srcset' => $srcset,
            'credit' => $this->credit,
            'credit_url' => $this->credit_url,
            'license' => $this->license,
        ];
    }
}
