<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'response' => 'array',
        ];
    }
}
