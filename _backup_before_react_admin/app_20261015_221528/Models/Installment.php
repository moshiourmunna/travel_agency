<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Installment extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['due_date'=>'date','paid_at'=>'datetime'];
    public function booking(){ return $this->belongsTo(Booking::class); }
}
