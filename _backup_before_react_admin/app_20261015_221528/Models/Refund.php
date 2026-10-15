<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['processed_at' => 'datetime'];

    public function payment() { return $this->belongsTo(Payment::class); }
    public function processor() { return $this->belongsTo(User::class, 'processed_by'); }
}
