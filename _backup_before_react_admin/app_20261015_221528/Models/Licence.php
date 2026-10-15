<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Licence extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['show_on_site'=>'boolean','valid_until'=>'date'];
    public function scopeVisible($q){ return $q->where('show_on_site',true)->whereNotNull('number')->where('number','!=','')->orderBy('sort'); }
}
