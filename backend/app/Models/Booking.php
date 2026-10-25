<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use App\Models\Concerns\HasTr;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasTr, SoftDeletes, HasPublicUlid;

    protected $guarded = ['id'];

    /** @var list<string> */
    public array $translatable = ['title', 'subtitle'];

    protected function casts(): array
    {
        return [
            'contact' => 'array',
            'pax' => 'array',
            'travel_start' => 'date',
            'travel_end' => 'date',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'paid' => 'decimal:2',
            'cost' => 'decimal:2',
            'cancelled_at' => 'datetime',
            'hold_expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_staff_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function product(): MorphTo
    {
        return $this->morphTo();
    }

    public function items(): HasMany
    {
        return $this->hasMany(BookingItem::class);
    }

    public function travellers(): HasMany
    {
        return $this->hasMany(BookingTraveller::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(BookingActivity::class)->latest();
    }

    public function documents(): HasMany
    {
        return $this->hasMany(BookingDocument::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function instalments(): HasMany
    {
        return $this->hasMany(Instalment::class)->orderBy('seq');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function getRouteKeyName(): string
    {
        return 'ref';
    }

    public function balance(): float
    {
        return max(0, (float) $this->total - (float) $this->paid);
    }

    public function isUpcoming(): bool
    {
        return $this->travel_start && $this->travel_start->isFuture() && ! in_array($this->status, ['cancelled', 'refunded'], true);
    }
}
