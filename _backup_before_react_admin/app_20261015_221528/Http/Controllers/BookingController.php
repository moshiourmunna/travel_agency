<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Package;
use App\Models\Payment;
use App\Services\BookingService;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function create(Request $request)
    {
        $packages = Package::visible()->with('prices')->orderBy('type')->orderBy('price_from')->get();
        abort_if($packages->isEmpty(), 404);
        $selected = $packages->firstWhere('slug', $request->query('package')) ?? $packages->first();

        return view('booking.create', ['packages' => $packages, 'selected' => $selected, 'room' => $request->query('room'), 'pax' => max(1, (int) $request->query('pax', 1))]);
    }

    public function store(Request $request, BookingService $svc, PaymentService $pay)
    {
        $modes = array_keys(array_filter(['full' => true, 'installment' => module_on('installments'), 'pay_later' => true]));
        $d = $request->validate([
            'package' => 'required|exists:packages,slug',
            'room_type' => 'required|string|max:10',
            'adults' => 'required|integer|min:1|max:20', 'children' => 'nullable|integer|min:0|max:10',
            'addons' => 'array', 'addons.*' => 'in:qurbani,insurance', 'wheelchair' => 'nullable|boolean',
            'travellers' => 'required|array|min:1', 'travellers.*.full_name' => 'required|string|max:100', 'travellers.*.gender' => 'required|in:male,female',
            'travellers.*.dob' => 'nullable|date|before:today', 'travellers.*.passport_no' => ['nullable', 'regex:/^[A-Za-z]{1,2}\d{6,8}$/'], 'travellers.*.passport_expiry' => 'nullable|date|after:today',
            'travellers.*.phone' => 'nullable|string|max:20',
            'payment_mode' => ['required', Rule::in($modes)],
            'payment_method' => ['required_unless:payment_mode,pay_later', 'nullable', Rule::in(array_keys(Payment::METHODS))],
            'slip' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', 'notes' => 'nullable|string|max:1000',
        ]);
        $package = Package::visible()->where('slug', $d['package'])->with('prices')->firstOrFail();
        if (count($d['travellers']) < (int) $d['adults'] + (int) ($d['children'] ?? 0)) {
            // only the travellers actually entered are required; the rest can be added later from the dashboard
            $d['travellers'] = array_values($d['travellers']);
        }

        [$booking, $dueNow] = $svc->create($request->user()->customerProfile(), $package, $d);

        if ($dueNow > 0) {
            $inst = $booking->installments()->where('seq', 0)->first();
            $slip = $request->file('slip')?->store('slips');
            [$payment, $redirect] = $pay->start($booking, $d['payment_method'], $dueNow, $inst, $slip);
            if ($redirect) {
                return redirect($redirect);
            }
        }

        return redirect()->route('booking.done', $booking);
    }

    public function done(Request $request, Booking $booking)
    {
        abort_unless($booking->customer->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        return view('booking.done', ['booking' => $booking->load('package', 'installments', 'payments')]);
    }
}
