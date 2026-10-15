<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Agent extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
    public const TIERS = ['silver' => 'Silver', 'gold' => 'Gold', 'platinum' => 'Platinum'];

    public function user() { return $this->belongsTo(User::class); }
    public function parent() { return $this->belongsTo(Agent::class, 'parent_id'); }
    public function children() { return $this->hasMany(Agent::class, 'parent_id'); }
    public function bookings() { return $this->hasMany(Booking::class); }
    public function commissions() { return $this->hasMany(Commission::class); }

    /** B2B net price = public price minus this agent's commission. */
    public function netPrice(int $public, ?int $b2b = null): int
    {
        $base = $b2b ?? $public;
        return (int) max(0, $base - round($base * $this->commission_percent / 100));
    }
}
