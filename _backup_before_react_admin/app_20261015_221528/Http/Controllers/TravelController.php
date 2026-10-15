<?php

namespace App\Http\Controllers;

use App\Integrations\Contracts\FlightProvider;
use App\Integrations\Contracts\HajjPortal;
use App\Integrations\Contracts\HotelProvider;
use App\Models\PreRegistration;
use App\Models\VisaApplication;
use App\Models\VisaType;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TravelController extends Controller
{
    public function flights(Request $request, FlightProvider $gds)
    {
        $from = strtoupper($request->query('from', 'DAC')); $to = strtoupper($request->query('to', 'JED'));
        $offers = $gds->search($from, $to, $request->query('date'), (int) $request->query('pax', 1));

        return view('travel.flights', ['offers' => $offers, 'from' => $from, 'to' => $to, 'airlines' => $offers->pluck('airline')->unique()->values()]);
    }

    public function hotels(Request $request, HotelProvider $hotels)
    {
        $city = in_array($request->query('city'), ['makkah', 'madinah', 'aziziyah', 'jeddah'], true) ? $request->query('city') : 'all';
        $max = $request->integer('distance') ?: null;

        return view('travel.hotels', ['hotels' => $hotels->search($city, null, null, $max), 'city' => $city, 'distance' => $max]);
    }

    public function visa()
    {
        return view('travel.visa', ['types' => VisaType::where('is_active', true)->orderBy('sort')->get()]);
    }

    public function visaApply(Request $request)
    {
        $d = $request->validate(['visa_type_id' => 'required|exists:visa_types,id', 'applicants' => 'required|integer|min:1|max:20', 'name' => 'required|string|max:100',
            'phone' => ['required', 'regex:/^(\+?88)?01[3-9]\d{8}$/'], 'passport' => 'nullable|string|max:20']);
        $vt = VisaType::find($d['visa_type_id']);
        $app = VisaApplication::create(['ref' => 'VA-'.now()->format('y').'-'.strtoupper(Str::random(5)), 'visa_type_id' => $vt->id, 'visa_type' => $vt->getTranslations('name')['en'] ?? '', 'country' => $vt->country,
            'applicant_name' => $d['name'], 'phone' => $d['phone'], 'passport_enc' => $d['passport'] ?? null, 'applicants' => $d['applicants'], 'provider' => $vt->provider, 'status' => 'submitted',
            'status_history' => [['status' => 'submitted', 'at' => now()->toDateString()]]]);

        return redirect()->route('visa.track', ['ref' => $app->ref])->with('ok', t3('Application received. Your ID is ', 'আবেদন গৃহীত। আপনার আইডি ', 'تم استلام الطلب. رقمك ').$app->ref);
    }

    public function visaTrack(Request $request)
    {
        $app = null;
        if ($ref = trim((string) $request->query('ref'))) {
            $app = VisaApplication::where('ref', strtoupper($ref))->first();
            if (! $app) {
                session()->flash('err', t3('No application found with that ID.', 'এই আইডিতে কোনো আবেদন পাওয়া যায়নি।', 'لا يوجد طلب بهذا الرقم.'));
            }
        }

        return view('travel.visa', ['types' => VisaType::where('is_active', true)->orderBy('sort')->get(), 'tracked' => $app, 'ref' => $ref]);
    }

    public function preRegistration() { return view('travel.prereg'); }

    public function preRegistrationStore(Request $request, HajjPortal $portal)
    {
        $d = $request->validate(['name' => 'required|string|max:100', 'nid' => 'required|digits_between:10,17', 'dob' => 'required|date|before:-18 years',
            'phone' => ['required', 'regex:/^(\+?88)?01[3-9]\d{8}$/'], 'passport' => 'nullable|string|max:20', 'district' => 'required|string|max:40',
            'package_class' => 'required|in:economy,standard,premium,vip', 'pilgrims' => 'required|integer|min:1|max:10', 'agree' => 'accepted']);
        $res = $portal->preRegister($d);
        $pr = PreRegistration::create(['ref' => 'PR-27-'.strtoupper(Str::random(5)), 'name' => $d['name'], 'nid_enc' => $d['nid'], 'dob' => $d['dob'], 'phone' => $d['phone'], 'passport_enc' => $d['passport'] ?? null,
            'district' => $d['district'], 'package_class' => $d['package_class'], 'pilgrims' => $d['pilgrims'], 'govt_tracking_no' => $res['tracking_no'] ?? null, 'status' => 'received', 'user_id' => $request->user()?->id]);

        return redirect()->route('prereg')->with('ok', t3('Pre-registration received. Reference ', 'প্রাক-নিবন্ধন গৃহীত। রেফারেন্স ', 'تم استلام التسجيل. المرجع ').$pr->ref.($pr->govt_tracking_no ? ' · Tracking '.$pr->govt_tracking_no : ''));
    }
}
