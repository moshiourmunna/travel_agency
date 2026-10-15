<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\HasTranslations;

class Branch extends Model
{
    use HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['name'];
    protected $casts=['is_head_office'=>'boolean'];
}
