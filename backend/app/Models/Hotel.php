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

class Hotel extends Model
{
    use HasPublicUlid, HasTr, Publishable, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name', 'city', 'address', 'description', 'distance_text'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['name', 'city', 'address'];

    protected function casts(): array
    {
        return [
            'amenities' => 'array',
            'gallery' => 'array',
            'refundable' => 'boolean',
            'breakfast' => 'boolean',
            'price_from' => 'decimal:2',
            'price_was' => 'decimal:2',
            'guest_score' => 'float',
            'lat' => 'float',
            'lng' => 'float',
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    public function roomTypes(): HasMany
    {
        return $this->hasMany(HotelRoomType::class)->orderBy('sort');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }
}
