<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Commission extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['paid_at'=>'datetime'];
    public function booking(){ return $this->belongsTo(Booking::class); }
}
