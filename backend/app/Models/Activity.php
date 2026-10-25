<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use App\Models\Concerns\HasTr;
use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Activity extends Model
{
    use HasPublicUlid, HasTr, Publishable, SoftDeletes;

    protected $table = 'activities';

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['title', 'city', 'description', 'duration_text', 'meeting_point', 'badge'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['title', 'city', 'highlights'];

    protected function casts(): array
    {
        return [
            'languages' => 'array',
            'highlights' => 'array',
            'inclusions' => 'array',
            'gallery' => 'array',
            'pickup' => 'boolean',
            'instant_confirm' => 'boolean',
            'price' => 'decimal:2',
            'price_was' => 'decimal:2',
            'rating' => 'float',
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    public function cancellationPolicy(): BelongsTo
    {
        return $this->belongsTo(CancellationPolicy::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(ActivityOption::class)->orderBy('sort');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(ActivitySlot::class)->orderBy('starts_at');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }
}
