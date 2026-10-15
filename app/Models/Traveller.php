<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Traveller extends Model
{
    use SoftDeletes;
    protected $guarded=['id'];
    protected $casts=["needs_wheelchair"=>"boolean",'nid_enc'=>'encrypted','dob'=>'date'];
    public function customer(){ return $this->belongsTo(Customer::class); }
    public function mahram(){ return $this->belongsTo(Traveller::class,"mahram_traveller_id"); }
    public function bookingLinks(){ return $this->hasMany(BookingTraveller::class); }
    public const RELATIONS=["self"=>"Self","husband"=>"Husband","wife"=>"Wife","father"=>"Father","mother"=>"Mother","son"=>"Son","daughter"=>"Daughter","brother"=>"Brother","sister"=>"Sister","other"=>"Other"];
    public function passport(){ return $this->hasOne(Passport::class); }
}
