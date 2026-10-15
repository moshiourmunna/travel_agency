<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\HasTranslations;

class Faq extends Model
{
    use HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['question','answer'];
    protected $casts=['is_active'=>'boolean'];
}
