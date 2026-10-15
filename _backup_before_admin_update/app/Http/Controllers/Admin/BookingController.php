<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Integrations\Contracts\VisaProvider;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\VisaApplication;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $q = Booking::with('customer.user', 'package', 'agent')->latest('id');
        if ($s = $request->query('q')) {
            $q->where(fn ($w) => $w->where('ref', 'like', "%{$s}%")->orWhereHas('customer.user', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")));
        }
        foreach (['status', 'payment_mode', 'type'] as $f) {
            if ($v = $request->query($f)) $q->where($f, $v);
        }

        return view('admin.bookings.index', ['bookings' => $q->paginate(20)->withQueryString()]);
    }

    public function show(Booking $booking)
    {
        return view('admin.bookings.show', ['b' => $booking->load('customer.user', 'package', 'agent', 'installments', 'payments', 'items', 'travellers.traveller.passport', 'travellers.documents', 'travellers.visa')]);
    }

    public function update(Request $request, Booking $booking)
    {
        $d = $request->validate(['status' => ['required', Rule::in(array_keys(Booking::STATUSES))], 'discount' => 'nullable|integer|min:0', 'note' => 'nullable|string|max:500']);
        $before = $booking->only('status', 'discount', 'total');
        if (isset($d['discount']) && (int) $d['discount'] !== (int) $booking->discount) {
            $booking->total = $booking->subtotal - (int) $d['discount']; $booking->discount = (int) $d['discount'];
        }
        $booking->status = $d['status'];
        $booking->meta = array_merge($booking->meta ?? [], $d['note'] ? ['admin_note' => $d['note']] : []);
        $booking->save();
        AuditLog::create(['user_id' => $request->user()->id, 'action' => 'booking.update', 'auditable_type' => Booking::class, 'auditable_id' => $booking->id, 'before' => $before, 'after' => $booking->only('status', 'discount', 'total'), 'ip' => $request->ip()]);

        return back()->with('ok', 'Booking updated.');
    }

    public function verifyPayment(Request $request, Payment $payment, PaymentService $svc)
    {
        $request->validate(['action' => 'required|in:approve,reject']);
        $request->action === 'approve' ? $svc->markPaid($payment, $payment->gateway_txn_id ?? 'MAN-'.$payment->id, ['verified' => true], $request->user()->id) : $svc->markFailed($payment, ['rejected_by' => $request->user()->id]);
        AuditLog::create(['user_id' => $request->user()->id, 'action' => 'payment.'.$request->action, 'auditable_type' => Payment::class, 'auditable_id' => $payment->id, 'ip' => $request->ip()]);

        return back()->with('ok', 'Payment '.($request->action === 'approve' ? 'verified' : 'rejected').'.');
    }

    /** Push a visa application to Nusuk through the VisaProvider adapter (stub by default). */
    public function submitVisa(Request $request, VisaApplication $visa, VisaProvider $provider)
    {
        $res = $provider->submit(['ref' => $visa->ref, 'name' => $visa->applicant_name, 'type' => $visa->visa_type]);
        $hist = $visa->status_history ?? []; $hist[] = ['status' => $res['status'], 'at' => now()->toDateString()];
        $visa->update(['provider_ref' => $res['provider_ref'], 'status' => $res['status'], 'status_history' => $hist]);

        return back()->with('ok', "Submitted to Nusuk – reference {$res['provider_ref']}.");
    }
}
