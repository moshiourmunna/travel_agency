<?php

namespace App\Models;

use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    use HasTr;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['name'];
}
