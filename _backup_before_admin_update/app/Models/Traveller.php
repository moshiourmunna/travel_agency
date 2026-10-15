<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Traveller extends Model
{
    use SoftDeletes;
    protected $guarded=['id'];
    protected $casts=['nid_enc'=>'encrypted','dob'=>'date'];
    public function customer(){ return $this->belongsTo(Customer::class); }
    public function passport(){ return $this->hasOne(Passport::class); }
}
