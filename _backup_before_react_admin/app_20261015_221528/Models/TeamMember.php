<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\HasTranslations;

class TeamMember extends Model
{
    use HasTranslations;
    protected $guarded=['id'];
    protected array $translatable=['name','role'];
    protected $casts=['is_active'=>'boolean'];
}
