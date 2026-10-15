<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class PackagePrice extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['installment_plan'=>'array','valid_from'=>'date','valid_to'=>'date'];
    public const ROOM_TYPES=['quad'=>'Quad (4 per room)','triple'=>'Triple (3 per room)','double'=>'Double (2 per room)','single'=>'Single','child'=>'Child','infant'=>'Infant'];
    public function package(){ return $this->belongsTo(Package::class); }
}
