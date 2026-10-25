<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlannerCost extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'cost_per_day_standard' => 'decimal:2',
            'cost_per_day_premium' => 'decimal:2',
            'flight_estimate' => 'decimal:2',
        ];
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }
}
