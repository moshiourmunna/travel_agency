<?php

namespace App\Services\Checkout;

use App\Models\FlightOffer;
use App\Support\Settings;
use Illuminate\Support\Carbon;

/** One source of truth for flight fares (search results and checkout use the same maths). */
final class FlightFare
{
    public const CABIN_MULT = ['economy' => 1, 'premium' => 1.6, 'business' => 3.2, 'first' => 5];

    public static function perAdult(FlightOffer $o, string $cabin, Carbon $date): int
    {
        $cfg = Settings::get('flights.pricing', []);
        $day = (float) (($cfg['weekday_factors'] ?? [])[$date->dayOfWeekIso - 1] ?? 1);

        return (int) (round((float) $o->fare * (self::CABIN_MULT[$cabin] ?? 1) * $day / 10) * 10);
    }
}
