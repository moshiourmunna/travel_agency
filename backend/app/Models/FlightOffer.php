<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlightOffer extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'via' => 'array',
            'fare' => 'decimal:2',
            'refundable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function airline(): BelongsTo
    {
        return $this->belongsTo(Airline::class);
    }
}
