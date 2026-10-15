<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class VisaApplication extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['passport_enc'=>'encrypted','status_history'=>'array','issued_at'=>'datetime'];
    public const STEPS=['submitted'=>'Submitted','verified'=>'Documents verified','applied'=>'Applied (Nusuk)','approved'=>'Approved','issued'=>'Issued'];
    public function visaType(){ return $this->belongsTo(VisaType::class); }
    public function bookingTraveller(){ return $this->belongsTo(BookingTraveller::class); }
}
