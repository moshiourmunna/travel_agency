<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\VisaApplication;
use App\Support\SiteConfig;
use Illuminate\Http\Request;

class V1Controller extends Controller
{
    public function config() { return response()->json(['data' => SiteConfig::public()]); }

    public function packages(Request $r)
    {
        app()->setLocale(in_array($r->query('lang'), array_column(SiteConfig::enabledLanguages(), 'code'), true) ? $r->query('lang') : SiteConfig::defaultLocale());
        $items = Package::visible()->with('prices')->when($r->query('type'), fn ($q, $t) => $q->where('type', $t))->orderBy('price_from')->get();
        return response()->json(['data' => $items->map(fn ($p) => $this->pkg($p))]);
    }

    public function package(Package $package)
    {
        abort_unless($package->status === 'published' && module_on(Package::TYPE_MODULE[$package->type]), 404);
        return response()->json(['data' => $this->pkg($package->load('prices', 'hotels', 'itinerary')) + [
            'hotels' => $package->hotels->map(fn ($h) => ['name' => $h->name, 'city' => $h->city, 'stars' => $h->stars, 'distance_to_haram_m' => $h->distance_to_haram_m, 'nights' => $h->pivot->nights]),
            'itinerary' => $package->itinerary->map(fn ($d) => ['day' => $d->label(), 'title' => $d->title, 'body' => $d->body]),
        ]]);
    }

    public function visaStatus(string $ref)
    {
        $v = VisaApplication::where('ref', strtoupper($ref))->firstOrFail();
        return response()->json(['data' => ['ref' => $v->ref, 'status' => $v->status, 'visa_type' => $v->visa_type, 'issued_at' => $v->issued_at]]);
    }

    private function pkg(Package $p): array
    {
        return ['slug' => $p->slug, 'type' => $p->type, 'class' => $p->class, 'title' => $p->title, 'summary' => $p->summary, 'duration_days' => $p->duration_days,
            'departure_date' => $p->departure_date?->toDateString(), 'makkah_distance_m' => $p->makkah_distance_m, 'madinah_distance_m' => $p->madinah_distance_m,
            'seats_left' => $p->seatsLeft(), 'currency' => 'BDT', 'prices' => $p->prices->map(fn ($x) => ['room_type' => $x->room_type, 'price' => $x->price, 'deposit' => $x->deposit_amount])];
    }
}
