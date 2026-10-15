<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
    protected $casts = ['meta' => 'array', 'hold_expires_at' => 'datetime'];

    public const STATUSES = ['pending' => 'Pending', 'hold' => 'On hold (pay later)', 'confirmed' => 'Confirmed', 'docs_pending' => 'Docs pending', 'visa' => 'Visa processing', 'ticketed' => 'Ticketed', 'completed' => 'Completed', 'cancelled' => 'Cancelled'];
    public const MODES = ['full' => 'Pay full', 'installment' => 'Deposit + installments', 'pay_later' => 'Book now, pay later'];

    public function getRouteKeyName(): string { return 'ref'; }

    public function customer() { return $this->belongsTo(Customer::class); }
    public function package() { return $this->belongsTo(Package::class)->withTrashed(); }
    public function agent() { return $this->belongsTo(Agent::class); }
    public function travellers() { return $this->hasMany(BookingTraveller::class); }
    public function items() { return $this->hasMany(BookingItem::class); }
    public function installments() { return $this->hasMany(Installment::class)->orderBy('seq'); }
    public function payments() { return $this->hasMany(Payment::class)->latest('id'); }

    public function due(): int { return max(0, $this->total - $this->paid); }
    public function progress(): int { return $this->total ? (int) round($this->paid * 100 / $this->total) : 0; }

    public function statusClass(): string
    {
        return match ($this->status) { 'confirmed', 'ticketed', 'completed' => 'ok', 'cancelled' => 'no', 'pending', 'hold', 'docs_pending' => 'pen', default => 'inf' };
    }

    public static function nextRef(string $type): string
    {
        $prefix = match ($type) { 'hajj' => 'BHA-27', 'umrah' => 'BHA-U', 'flight' => 'BHA-F', default => 'BHA-T' };
        $n = static::withTrashed()->where('ref', 'like', $prefix.'-%')->count() + 1;
        do {
            $ref = sprintf('%s-%05d', $prefix, $n + 341);
            $n++;
        } while (static::withTrashed()->where('ref', $ref)->exists());

        return $ref;
    }
}
