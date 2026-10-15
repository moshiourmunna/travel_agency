<?php

namespace App\Integrations\Contracts;

use Illuminate\Support\Collection;

/** GDS / NDC flight supplier (Sabre, Amadeus, Travelport). */
interface FlightProvider
{
    /** @return Collection<int, array> normalised offers */
    public function search(string $from, string $to, ?string $date = null, int $pax = 1): Collection;

    /** @return array{pnr:string,status:string} */
    public function book(array $offer, array $passengers): array;
}
