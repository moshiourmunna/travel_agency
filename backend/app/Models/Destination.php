<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use App\Models\Concerns\HasTr;
use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Destination extends Model
{
    use HasPublicUlid, HasTr, Publishable, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name', 'country_name', 'tagline', 'description', 'best_time', 'visa_info', 'flight_time'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['name', 'country_name', 'description', 'things_to_do'];

    protected function casts(): array
    {
        return [
            'things_to_do' => 'array',
            'gallery' => 'array',
            'lat' => 'float',
            'lng' => 'float',
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function tours(): HasMany
    {
        return $this->hasMany(Tour::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function hotels(): HasMany
    {
        return $this->hasMany(Hotel::class);
    }

    public function plannerCost(): HasOne
    {
        return $this->hasOne(PlannerCost::class);
    }
}
