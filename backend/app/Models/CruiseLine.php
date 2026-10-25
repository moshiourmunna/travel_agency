<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CruiseLine extends Model
{
    protected $guarded = ['id'];

    public function ships(): HasMany
    {
        return $this->hasMany(Ship::class);
    }
}
