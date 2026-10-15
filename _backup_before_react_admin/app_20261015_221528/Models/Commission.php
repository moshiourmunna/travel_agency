<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['paid_at' => 'datetime'];
    public const STATUSES = ['pending' => 'Pending', 'approved' => 'Approved', 'paid' => 'Paid', 'void' => 'Void'];

    public function booking() { return $this->belongsTo(Booking::class)->withTrashed(); }
    public function agent() { return $this->belongsTo(Agent::class)->withTrashed(); }
}
