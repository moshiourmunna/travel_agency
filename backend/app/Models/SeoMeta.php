<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class SeoMeta extends Model
{
    use HasTr;

    protected $table = 'seo_meta';

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['meta_title', 'meta_description', 'og_title', 'keywords'];

    protected function casts(): array
    {
        return [
            'json_ld_override' => 'array',
            'in_sitemap' => 'boolean',
            'sitemap_priority' => 'float',
        ];
    }

    public function seoable(): MorphTo
    {
        return $this->morphTo();
    }

    public function ogImage(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'og_image_id');
    }
}
