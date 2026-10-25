<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyTier extends Model
{
    use HasTr;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name'];

    protected function casts(): array
    {
        return [
            'perks' => 'array',
            'miles_multiplier' => 'float',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tier_id');
    }
}
