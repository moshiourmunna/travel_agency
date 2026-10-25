<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CruiseSailing extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'return_date' => 'date',
            'price' => 'decimal:2',
        ];
    }

    public function cruise(): BelongsTo
    {
        return $this->belongsTo(Cruise::class);
    }
}
