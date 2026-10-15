<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use SoftDeletes;
    protected $guarded=['id'];
    protected $casts=['nid_enc'=>'encrypted','dob'=>'date'];
    public function user(){ return $this->belongsTo(User::class); }
    public function travellers(){ return $this->hasMany(Traveller::class); }
    public function bookings(){ return $this->hasMany(Booking::class); }
    public function agent(){ return $this->belongsTo(Agent::class); }
}
