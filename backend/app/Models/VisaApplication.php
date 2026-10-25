<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUlid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class VisaApplication extends Model
{
    use HasPublicUlid;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'eta' => 'date',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(VisaProduct::class, 'visa_product_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function traveller(): BelongsTo
    {
        return $this->belongsTo(Traveller::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(VisaApplicationEvent::class)->orderBy('id');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'owner');
    }
}
