<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingActivity extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['data' => 'array'];

    public const ICONS = ['status' => '🔁', 'payment' => '💳', 'refund' => '↩', 'document' => '📄', 'visa' => '🛂', 'schedule' => '🗓', 'edit' => '✏', 'note' => '📝', 'system' => '⚙', 'created' => '✨', 'deleted' => '🗑', 'restored' => '♻'];

    public function booking() { return $this->belongsTo(Booking::class); }
    public function user() { return $this->belongsTo(User::class); }
}
