<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\HasTranslations;

class VisaType extends Model
{
    use HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['name'];
    protected $casts=['requirements'=>'array','is_active'=>'boolean'];
}
