<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    protected $table = 'currencies';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'rate_to_bdt' => 'float',
            'is_active' => 'boolean',
        ];
    }
}
