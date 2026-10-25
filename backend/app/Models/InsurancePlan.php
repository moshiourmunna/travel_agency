<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;

class InsurancePlan extends Model
{
    use HasTr;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name', 'price_note'];

    protected function casts(): array
    {
        return [
            'coverage' => 'array',
            'price' => 'decimal:2',
            'is_popular' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
