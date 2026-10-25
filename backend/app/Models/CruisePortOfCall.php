<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CruisePortOfCall extends Model
{
    use HasTr;

    protected $table = 'cruise_ports_of_call';

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['port', 'body'];

    public function cruise(): BelongsTo
    {
        return $this->belongsTo(Cruise::class);
    }
}
