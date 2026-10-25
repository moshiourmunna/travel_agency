<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisaRequirement extends Model
{
    use HasTr;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['item'];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(VisaProduct::class, 'visa_product_id');
    }
}
