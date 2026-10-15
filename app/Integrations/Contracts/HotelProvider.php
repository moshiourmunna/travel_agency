<?php

namespace App\Integrations\Contracts;

use Illuminate\Support\Collection;

/** Bedbank / hotel supplier (Hotelbeds, WebBeds, direct contracts). */
interface HotelProvider
{
    public function search(string $city, ?string $checkIn = null, ?string $checkOut = null, ?int $maxDistance = null): Collection;

    /** @return array{supplier_ref:string,status:string} */
    public function book(array $offer, array $guests): array;
}
