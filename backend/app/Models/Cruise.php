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

class Cruise extends Model
{
    use HasPublicUlid, HasTr, Publishable, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['title', 'description', 'depart_port', 'cabin_from', 'badge'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['title', 'depart_port', 'route', 'highlights'];

    protected function casts(): array
    {
        return [
            'route' => 'array',
            'highlights' => 'array',
            'gallery' => 'array',
            'price_from' => 'decimal:2',
            'price_was' => 'decimal:2',
            'rating' => 'float',
            'next_departure' => 'date',
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    public function ship(): BelongsTo
    {
        return $this->belongsTo(Ship::class);
    }

    public function cancellationPolicy(): BelongsTo
    {
        return $this->belongsTo(CancellationPolicy::class);
    }

    public function sailings(): HasMany
    {
        return $this->hasMany(CruiseSailing::class)->orderBy('date');
    }

    public function cabins(): HasMany
    {
        return $this->hasMany(CruiseCabin::class)->orderBy('sort');
    }

    public function portsOfCall(): HasMany
    {
        return $this->hasMany(CruisePortOfCall::class)->orderBy('day_no');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }
}
