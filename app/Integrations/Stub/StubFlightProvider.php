<?php

namespace App\Integrations\Stub;

use App\Integrations\Contracts\FlightProvider;
use App\Integrations\LogsCalls;
use App\Models\Flight;
use Illuminate\Support\Collection;

/** Serves the agency's own block seats from the `flights` table, in the same shape a GDS adapter will return. */
class StubFlightProvider implements FlightProvider
{
    use LogsCalls;

    public function search(string $from, string $to, ?string $date = null, int $pax = 1): Collection
    {
        return $this->logged('gds_stub', 'search', compact('from', 'to', 'date', 'pax'), function () use ($from, $to) {
            return Flight::where('is_active', true)
                ->when($from, fn ($q) => $q->where('from_iata', strtoupper($from)))
                ->when($to, fn ($q) => $q->where('to_iata', strtoupper($to)))
                ->orderBy('fare')->get()
                ->map(fn (Flight $f) => [
                    'id' => $f->id, 'airline' => $f->airline, 'flight_no' => $f->flight_no, 'from' => $f->from_iata, 'to' => $f->to_iata,
                    'depart' => $f->depart_at->format('H:i'), 'arrive' => $f->arrive_at->format('H:i'), 'date' => $f->depart_at->format('d M Y'),
                    'duration_min' => $f->duration_min, 'duration' => $f->durationLabel(), 'stops' => $f->stops, 'stops_label' => $f->stopsLabel(),
                    'baggage' => $f->baggage, 'cabin' => $f->cabin, 'fare' => $f->fare, 'hour' => (int) $f->depart_at->format('G'),
                ]);
        }, logResponse: false);
    }

    public function book(array $offer, array $passengers): array
    {
        return $this->logged('gds_stub', 'book', ['offer' => $offer['id'] ?? null, 'pax' => count($passengers)], fn () => ['pnr' => strtoupper(substr(md5(microtime()), 0, 6)), 'status' => 'held']);
    }
}
