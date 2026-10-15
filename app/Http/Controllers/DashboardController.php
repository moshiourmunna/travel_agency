<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Document;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $u = $request->user();
        if ($u->isAdmin()) return redirect()->route('admin.dashboard');
        if ($u->isAgent()) return redirect()->route('agent.index');
        $c = $u->customerProfile();
        $bookings = $c->bookings()->with(['package', 'installments', 'payments', 'travellers.traveller', 'travellers.documents', 'travellers.visa'])->latest('id')->get();
        $sel = $bookings->firstWhere('ref', $request->query('b')) ?? $bookings->where('status', '!=', 'cancelled')->sortByDesc('total')->first() ?? $bookings->first();

        return view('dashboard.index', ['bookings' => $bookings, 'b' => $sel, 'tab' => $request->query('tab', 'overview')]);
    }

    /** Pay an installment, the balance, or a pay-later booking. */
    public function pay(Request $request, Booking $booking, PaymentService $pay)
    {
        abort_unless($booking->customer->user_id === $request->user()->id, 403);
        abort_if($booking->status === 'cancelled' || $booking->due() <= 0, 422);
        $d = $request->validate(['installment_id' => 'nullable|integer', 'method' => ['required', Rule::in(array_keys(Payment::METHODS))], 'slip' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $inst = isset($d['installment_id']) ? $booking->installments()->whereKey($d['installment_id'])->where('status', '!=', 'paid')->firstOrFail() : null;
        $amount = $inst?->amount ?? $booking->due();
        [$payment, $redirect] = $pay->start($booking, $d['method'], $amount, $inst, $request->file('slip')?->store('slips'));

        return $redirect ? redirect($redirect) : back()->with('ok', t3('Payment recorded – our accounts team will verify it.', 'পেমেন্ট রেকর্ড হয়েছে – অ্যাকাউন্টস টিম যাচাই করবে।', 'تم تسجيل الدفع وسيتم التحقق منه.'));
    }

    public function upload(Request $request, Document $document)
    {
        abort_unless($document->bookingTraveller->booking->customer->user_id === $request->user()->id, 403);
        $request->validate(['file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $f = $request->file('file');
        $document->update(['path' => $f->store('documents'), 'mime' => $f->getMimeType(), 'size' => $f->getSize(), 'status' => 'pending', 'note' => null]);

        return back()->with('ok', t3('Document uploaded – we will verify it soon.', 'ডকুমেন্ট আপলোড হয়েছে।', 'تم رفع المستند.'));
    }

    public function profile(Request $request)
    {
        $u = $request->user();
        $d = $request->validate(['name' => 'required|string|max:100', 'email' => ['nullable', 'email', Rule::unique('users')->ignore($u->id)], 'district' => 'nullable|string|max:40', 'address' => 'nullable|string|max:255']);
        $u->update(['name' => $d['name'], 'email' => $d['email']]);
        $u->customerProfile()->update(['district' => $d['district'] ?? null, 'address' => $d['address'] ?? null]);

        return back()->with('ok', t3('Profile saved.', 'প্রোফাইল সংরক্ষিত।', 'تم الحفظ.'));
    }
}
