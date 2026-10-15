<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreRegistration extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['nid_enc' => 'encrypted', 'passport_enc' => 'encrypted', 'dob' => 'date', 'converted_at' => 'datetime'];
    public const STATUSES = ['received' => 'Received', 'contacted' => 'Contacted', 'registered' => 'Govt. registered', 'converted' => 'Converted to booking', 'cancelled' => 'Cancelled'];

    public function booking() { return $this->belongsTo(Booking::class)->withTrashed(); }
    public function user() { return $this->belongsTo(User::class); }
}
