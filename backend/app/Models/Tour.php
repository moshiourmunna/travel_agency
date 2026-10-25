<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use App\Models\Concerns\HasTr;
use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tour extends Model
{
    use HasPublicUlid, HasTr, Publishable, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['title', 'location', 'country_name', 'summary', 'description', 'badge'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['title', 'location', 'country_name', 'summary', 'highlights'];

    protected function casts(): array
    {
        return [
            'highlights' => 'array',
            'inclusions' => 'array',
            'exclusions' => 'array',
            'route_stops' => 'array',
            'gallery' => 'array',
            'includes_flight' => 'boolean',
            'includes_visa' => 'boolean',
            'price_from' => 'decimal:2',
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

    public function itinerary(): HasMany
    {
        return $this->hasMany(TourItineraryDay::class)->orderBy('day_no');
    }

    public function departures(): HasMany
    {
        return $this->hasMany(TourDeparture::class)->orderBy('date');
    }

    public function priceTiers(): HasMany
    {
        return $this->hasMany(TourPriceTier::class)->orderBy('sort');
    }

    public function addons(): HasMany
    {
        return $this->hasMany(TourAddon::class);
    }

    public function categories(): MorphToMany
    {
        return $this->morphToMany(Category::class, 'categorizable');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }
}
