<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityOption extends Model
{
    use HasTr;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name', 'description'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'child_price' => 'decimal:2',
        ];
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
