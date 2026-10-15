<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Payment extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['payload'=>'array','paid_at'=>'datetime'];
    public const METHODS=['bkash'=>'bKash','nagad'=>'Nagad','sslcommerz'=>'Card (SSLCommerz)','bank'=>'Bank transfer','cash'=>'Pay at office'];
    public function booking(){ return $this->belongsTo(Booking::class); }
    public function installment(){ return $this->belongsTo(Installment::class); }
    public function isOnline(): bool { return in_array($this->method,['bkash','nagad','sslcommerz'],true); }
}
