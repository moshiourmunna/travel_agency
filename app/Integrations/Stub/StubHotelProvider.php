<?php

namespace App\Integrations\Stub;

use App\Integrations\Contracts\HotelProvider;
use App\Integrations\LogsCalls;
use App\Models\Hotel;
use Illuminate\Support\Collection;

class StubHotelProvider implements HotelProvider
{
    use LogsCalls;

    public function search(string $city, ?string $checkIn = null, ?string $checkOut = null, ?int $maxDistance = null): Collection
    {
        return $this->logged('hotel_stub', 'search', compact('city', 'checkIn', 'checkOut', 'maxDistance'), fn () => Hotel::where('is_active', true)
            ->when($city !== 'all', fn ($q) => $q->where('city', $city))
            ->when($maxDistance, fn ($q) => $q->where('distance_to_haram_m', '<=', $maxDistance))
            ->orderBy('distance_to_haram_m')->get(), logResponse: false);
    }

    public function book(array $offer, array $guests): array
    {
        return $this->logged('hotel_stub', 'book', ['hotel' => $offer['id'] ?? null], fn () => ['supplier_ref' => 'HB-'.random_int(100000, 999999), 'status' => 'confirmed']);
    }
}
