<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Flight extends Model
{
    use SoftDeletes;
    protected $guarded=['id'];
    protected $casts=['depart_at'=>'datetime','arrive_at'=>'datetime','is_active'=>'boolean'];
    public function durationLabel(): string { return intdiv($this->duration_min,60).'h '.($this->duration_min%60).'m'; }
    public function stopsLabel(): string { return $this->stops ? $this->stops.' stop '.$this->via_iata : 'Direct'; }
}
