<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class BookingTraveller extends Model
{
    
    protected $guarded=['id'];
    public function booking(){ return $this->belongsTo(Booking::class); }
    public function traveller(){ return $this->belongsTo(Traveller::class); }
    public function documents(){ return $this->hasMany(Document::class); }
    public function visa(){ return $this->hasOne(VisaApplication::class); }
}
