<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Payment extends Model
{
    
    protected $guarded=['id'];
    protected $casts=['payload'=>'array','paid_at'=>'datetime'];
    public const METHODS=['bkash'=>'bKash','nagad'=>'Nagad','sslcommerz'=>'Card (SSLCommerz)','bank'=>'Bank transfer','cash'=>'Pay at office'];
    public function booking(){ return $this->belongsTo(Booking::class)->withTrashed(); }
    public function installment(){ return $this->belongsTo(Installment::class); }
    public const STATUSES=["pending"=>"Pending","paid"=>"Paid","failed"=>"Failed","refunded"=>"Refunded","partially_refunded"=>"Partly refunded"];
    public function refunds(){ return $this->hasMany(Refund::class); }
    public function recorder(){ return $this->belongsTo(User::class,"recorded_by"); }
    public function refundable(): int { return $this->status==="paid"||$this->status==="partially_refunded" ? max(0,$this->amount-$this->refunded) : 0; }
    public function isOnline(): bool { return in_array($this->method,['bkash','nagad','sslcommerz'],true); }
}
