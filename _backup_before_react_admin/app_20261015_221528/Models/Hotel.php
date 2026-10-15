<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hotel extends Model
{
    use SoftDeletes;
    protected $guarded=['id'];
    protected $casts=['amenities'=>'array','is_active'=>'boolean'];
    public const CITIES=['makkah'=>'Makkah','madinah'=>'Madinah','aziziyah'=>'Aziziyah','jeddah'=>'Jeddah','other'=>'Other'];
    public function packages(){ return $this->belongsToMany(Package::class,'package_hotels')->withPivot('nights','check_in_day','meal_plan'); }
    public function distanceLabel(): string { return $this->distance_to_haram_m>=1000 ? round($this->distance_to_haram_m/1000,1).' km' : $this->distance_to_haram_m.' m'; }
    public function haramName(): string { return $this->city==='madinah' ? 'Masjid an-Nabawi' : 'Masjid al-Haram'; }
}
