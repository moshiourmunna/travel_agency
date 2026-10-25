<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use App\Models\Concerns\HasTr;
use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VisaProduct extends Model
{
    use HasPublicUlid, HasTr, Publishable, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['country_name', 'type', 'processing', 'validity', 'stay', 'entry', 'description'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['country_name', 'type'];

    protected function casts(): array
    {
        return [
            'fee_breakdown' => 'array',
            'extra_documents' => 'array',
            'fee' => 'decimal:2',
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(VisaRequirement::class)->orderBy('sort');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(VisaApplication::class);
    }
}
