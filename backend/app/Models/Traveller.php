<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Traveller extends Model
{
    use HasTr, SoftDeletes;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['relation'];

    protected $hidden = ['passport_no_enc'];

    protected function casts(): array
    {
        return [
            'dob' => 'date',
            'passport_expiry' => 'date',
            'passport_no_enc' => 'encrypted',
            'is_self' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
