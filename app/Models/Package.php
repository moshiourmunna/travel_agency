<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Package extends Model
{
    use HasTranslations, SoftDeletes;

    protected $guarded = ['id'];
    protected array $translatable = ['title', 'summary', 'description', 'inclusions', 'exclusions', 'terms'];
    protected $casts = ['departure_date' => 'date', 'return_date' => 'date', 'gallery' => 'array', 'is_featured' => 'boolean', 'published_at' => 'datetime'];

    public const TYPES = ['hajj' => 'Hajj', 'umrah' => 'Umrah', 'tour' => 'Islamic tour', 'ziyarah' => 'Ziyarah'];
    public const CLASSES = ['economy' => 'Economy', 'standard' => 'Standard', 'premium' => 'Premium', 'vip' => 'VIP'];
    /** Module that must be enabled for this package type to be visible. */
    public const TYPE_MODULE = ['hajj' => 'hajj', 'umrah' => 'umrah', 'tour' => 'tours', 'ziyarah' => 'ziyarah'];

    public function getRouteKeyName(): string { return 'slug'; }

    public function prices() { return $this->hasMany(PackagePrice::class)->orderByDesc('price'); }
    public function itinerary() { return $this->hasMany(ItineraryDay::class)->orderBy('sort'); }
    public function hotels() { return $this->belongsToMany(Hotel::class, 'package_hotels')->withPivot('nights', 'check_in_day', 'meal_plan'); }
    public function flights() { return $this->belongsToMany(Flight::class, 'package_flights')->withPivot('leg'); }
    public function reviews() { return $this->hasMany(Review::class)->where('status', 'approved'); }
    public function bookings() { return $this->hasMany(Booking::class); }

    public function scopePublished($q) { return $q->where('status', 'published'); }

    /** Only package types whose module is switched on. */
    public function scopeVisible($q)
    {
        $types = array_keys(array_filter(self::TYPE_MODULE, fn ($m) => module_on($m)));
        return $q->published()->whereIn('type', $types ?: ['-']);
    }

    public function seatsLeft(): int { return max(0, $this->seats_total - $this->seats_sold); }
    public function classLabel(): string { return self::CLASSES[$this->class] ?? ucfirst($this->class); }
    public static function distanceLabel(?int $m): string { return $m === null ? '—' : ($m >= 1000 ? rtrim(rtrim(number_format($m / 1000, 1), '0'), '.').' km' : $m.' m'); }

    public function cheapestPrice(): ?PackagePrice
    {
        return $this->prices->whereNotIn('room_type', ['child', 'infant'])->sortBy('price')->first();
    }

    public function durationBucket(): string
    {
        $d = $this->duration_days;
        return match (true) { $d <= 10 => '7-10', $d <= 15 => '11-15', $d <= 21 => '15-21', $d <= 30 => '22-30', $d <= 40 => '31-40', default => '40+' };
    }
}
