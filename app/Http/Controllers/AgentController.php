<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Package;
use App\Models\User;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentController extends Controller
{
    public function index(Request $request)
    {
        $agent = $request->user()->agent->load('children');
        $ids = $agent->children->pluck('id')->push($agent->id);

        return view('agent.index', [
            'agent' => $agent,
            'packages' => Package::visible()->whereIn('type', ['hajj', 'umrah'])->with('prices')->orderBy('price_from')->get(),
            'bookings' => \App\Models\Booking::whereIn('agent_id', $ids)->with('customer.user', 'package', 'travellers.traveller')->latest('id')->take(15)->get(),
            'stats' => [
                'bookings' => \App\Models\Booking::whereIn('agent_id', $ids)->where('status', '!=', 'cancelled')->count(),
                'commission' => $agent->commissions()->sum('amount'),
                'pending' => $agent->commissions()->where('status', 'pending')->sum('amount'),
            ],
            'subStats' => \App\Models\Booking::whereIn('agent_id', $agent->children->pluck('id'))->selectRaw('agent_id, count(*) n')->groupBy('agent_id')->pluck('n', 'agent_id'),
        ]);
    }

    /** Book on behalf of a pilgrim (pay later from wallet / office). */
    public function book(Request $request, BookingService $svc)
    {
        $agent = $request->user()->agent;
        abort_unless($agent->status === 'active', 403);
        $d = $request->validate(['package' => 'required|exists:packages,slug', 'room_type' => 'required|string', 'adults' => 'required|integer|min:1|max:20',
            'name' => 'required|string|max:100', 'phone' => ['required', 'regex:/^01[3-9]\d{8}$/'], 'gender' => 'required|in:male,female', 'passport_no' => 'nullable|string|max:12']);
        $user = User::firstOrCreate(['phone' => $d['phone']], ['name' => $d['name'], 'role' => 'customer', 'password' => Str::random(16)]);
        $customer = $user->customerProfile();
        $customer->update(['agent_id' => $customer->agent_id ?? $agent->id]);
        $package = Package::visible()->where('slug', $d['package'])->with('prices')->firstOrFail();
        $trav = [['full_name' => $d['name'], 'gender' => $d['gender'], 'passport_no' => $d['passport_no'] ?? null]];
        for ($i = 1; $i < $d['adults']; $i++) { $trav[] = ['full_name' => $d['name'].' (companion '.$i.')', 'gender' => 'male']; }
        [$booking] = $svc->create($customer, $package, ['room_type' => $d['room_type'], 'adults' => $d['adults'], 'payment_mode' => 'pay_later', 'payment_method' => null, 'travellers' => $trav], $agent->id, 'agent');

        return back()->with('ok', 'Booking '.$booking->ref.' created and held. Collect payment and record it with accounts.');
    }
}
