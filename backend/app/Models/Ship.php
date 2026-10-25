<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ship extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'facts' => 'array',
        ];
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(CruiseLine::class, 'cruise_line_id');
    }

    public function cruises(): HasMany
    {
        return $this->hasMany(Cruise::class);
    }
}
