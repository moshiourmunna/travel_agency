<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Theme extends Model
{
    use HasTr, Publishable, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name', 'tagline', 'description'];

    /** @var list<string> fields indexed into search_text (EN + BN) */
    protected array $searchable = ['name', 'tagline'];

    protected function casts(): array
    {
        return [
            'perks' => 'array',
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }
}
