<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Inquiry;
use App\Models\IntegrationLog;
use App\Models\Package;
use App\Models\Payment;
use App\Models\PreRegistration;
use App\Models\VisaApplication;

class DashboardController extends Controller
{
    public function index()
    {
        $hajj = Package::where('type', 'hajj')->get();
        $months = collect(range(11, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i));
        $byMonth = Booking::where('created_at', '>=', $months->first())->get()->groupBy(fn ($b) => $b->created_at->format('Y-m'));

        return view('admin.dashboard', [
            'stats' => [
                'bookings' => Booking::where('status', '!=', 'cancelled')->count(),
                'collected' => Payment::where('status', 'paid')->sum('amount'),
                'due' => Booking::where('status', '!=', 'cancelled')->get()->sum(fn ($b) => $b->due()),
                'hajj_sold' => $hajj->sum('seats_sold'), 'hajj_total' => $hajj->sum('seats_total'),
                'visa_pending' => VisaApplication::whereNotIn('status', ['issued', 'rejected'])->count(),
                'pending_payments' => Payment::where('status', 'pending')->whereIn('method', ['bank', 'cash'])->count(),
            ],
            'chart' => $months->map(fn ($m) => ['label' => $m->format('M'), 'n' => $byMonth->get($m->format('Y-m'))?->count() ?? 0]),
            'latest' => Booking::with('customer.user', 'package')->latest('id')->take(8)->get(),
            'pendingPayments' => Payment::with('booking')->where('status', 'pending')->whereIn('method', ['bank', 'cash'])->latest('id')->take(6)->get(),
        ]);
    }

    public function inbox()
    {
        return view('admin.inbox', ['inquiries' => Inquiry::latest('id')->paginate(20, ['*'], 'ip'), 'preregs' => PreRegistration::latest('id')->paginate(20, ['*'], 'pp'),
            'visas' => VisaApplication::latest('id')->take(30)->get()]);
    }

    public function integrations()
    {
        return view('admin.integrations', ['logs' => IntegrationLog::latest('id')->take(50)->get(), 'drivers' => config('integrations')]);
    }
}
