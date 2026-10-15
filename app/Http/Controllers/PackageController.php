<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Services\BookingService;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function hajj() { return $this->listing(['hajj'], 'hajj'); }
    public function umrah() { return $this->listing(['umrah'], 'umrah'); }

    public function tours()
    {
        $types = array_keys(array_filter(['tour' => module_on('tours'), 'ziyarah' => module_on('ziyarah')]));
        return view('packages.tours', ['packages' => Package::visible()->whereIn('type', $types)->with('prices')->orderBy('type', 'desc')->orderBy('price_from')->get()]);
    }

    private function listing(array $types, string $page)
    {
        $packages = Package::visible()->whereIn('type', $types)->with('prices')->orderBy('price_from')->get();

        return view('packages.index', ['packages' => $packages, 'page' => $page,
            'airlines' => $packages->pluck('airline')->filter()->unique()->values(),
            'maxPrice' => (int) ceil(($packages->max('price_from') ?: 100000) / 50000) * 50000]);
    }

    public function show(Package $package)
    {
        abort_unless($package->status === 'published' && module_on(Package::TYPE_MODULE[$package->type] ?? 'hajj'), 404);
        $package->load(['prices', 'itinerary', 'hotels', 'flights', 'reviews']);
        $svc = app(BookingService::class);
        $first = $package->cheapestPrice();
        $quote = $first ? $svc->quote($package, $first->room_type, 1) : null;

        return view('packages.show', ['p' => $package, 'quote' => $quote]);
    }

    /** JSON quote for the live calculator (room type, travellers, add-ons). */
    public function quote(Request $request, Package $package, BookingService $svc)
    {
        $d = $request->validate(['room_type' => 'required|string', 'adults' => 'required|integer|min:1|max:20', 'children' => 'nullable|integer|min:0|max:10', 'addons' => 'array']);
        $q = $svc->quote($package->load('prices'), $d['room_type'], (int) $d['adults'], (int) ($d['children'] ?? 0), $d['addons'] ?? []);
        unset($q['price']);

        return response()->json($q);
    }
}
