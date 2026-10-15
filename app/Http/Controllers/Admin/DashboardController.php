<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\Commission;
use App\Models\Document;
use App\Models\Inquiry;
use App\Models\Installment;
use App\Models\IntegrationLog;
use App\Models\Package;
use App\Models\Passport;
use App\Models\Payment;
use App\Models\PreRegistration;
use App\Models\VisaApplication;
use App\Support\AdminUi;
use App\Support\SiteConfig;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $hajj = Package::where('type', 'hajj')->get();
        $months = collect(range(11, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i));
        $byMonth = Booking::where('created_at', '>=', $months->first())->get()->groupBy(fn ($b) => $b->created_at->format('Y-m'));
        $paidByMonth = Payment::where('status', 'paid')->where('paid_at', '>=', $months->first())->get()->groupBy(fn ($p) => $p->paid_at->format('Y-m'));
        $overdue = Installment::whereNot('status', 'paid')->whereDate('due_date', '<', today())->whereHas('booking', fn ($b) => $b->whereNot('status', 'cancelled'));
        $cfg = SiteConfig::load();

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'bookings' => Booking::where('status', '!=', 'cancelled')->count(),
                'collected' => (int) Payment::where('status', 'paid')->sum('amount'),
                'due' => (int) Booking::where('status', '!=', 'cancelled')->get()->sum(fn ($b) => $b->due()),
                'hajj_sold' => (int) $hajj->sum('seats_sold'), 'hajj_total' => (int) $hajj->sum('seats_total'),
                'visa_pending' => VisaApplication::whereNotIn('status', ['issued', 'rejected'])->count(),
                'pending_payments' => Payment::where('status', 'pending')->whereIn('method', ['bank', 'cash'])->count(),
            ],
            'chart' => $months->map(fn ($m) => ['label' => $m->format('M'), 'month' => $m->format('Y-m'), 'bookings' => $byMonth->get($m->format('Y-m'))?->count() ?? 0,
                'collected' => (int) ($paidByMonth->get($m->format('Y-m'))?->sum('amount') ?? 0)])->values(),
            'byStatus' => Booking::selectRaw('status, count(*) n')->groupBy('status')->pluck('n', 'status')->map(fn ($n, $s) => ['status' => $s, 'label' => Booking::STATUSES[$s] ?? $s, 'n' => (int) $n])->values(),
            'latest' => Booking::with('customer.user', 'package', 'installments')->latest('id')->take(8)->get()->map(fn ($b) => AdminUi::bookingRow($b))->values(),
            'attention' => [
                'overdue' => (clone $overdue)->count(), 'overdue_amount' => (int) (clone $overdue)->sum('amount'),
                'today' => (int) Payment::where('status', 'paid')->whereDate('paid_at', today())->sum('amount'),
                'docs' => Document::whereNotNull('path')->where('status', 'pending')->count(),
                'missing_docs' => Document::whereNull('path')->whereHas('bookingTraveller.booking', fn ($b) => $b->whereNotIn('status', ['cancelled', 'completed']))->count(),
                'passports' => Passport::whereDate('expiry_date', '<', now()->addMonths(6))->count(),
                'holds' => Booking::where('status', 'hold')->where('hold_expires_at', '<', now()->addDay())->count(),
                'preregs' => PreRegistration::where('status', 'received')->count(),
                'commissions' => (int) Commission::where('status', 'approved')->sum('amount'),
            ],
            'activity' => BookingActivity::with('booking', 'user')->latest('id')->take(8)->get()->map(fn ($a) => ['id' => $a->id, 'icon' => BookingActivity::ICONS[$a->type] ?? '•', 'type' => $a->type,
                'ref' => $a->booking?->ref, 'from' => $a->from_status ? (Booking::STATUSES[$a->from_status] ?? '') : null, 'to' => $a->to_status ? (Booking::STATUSES[$a->to_status] ?? '') : null,
                'message' => $a->message, 'ago' => $a->created_at?->diffForHumans(), 'user' => $a->user?->name])->values(),
            'pendingPayments' => Payment::with('booking')->where('status', 'pending')->whereIn('method', ['bank', 'cash'])->latest('id')->take(6)->get()
                ->map(fn ($p) => ['id' => $p->id, 'ref' => $p->booking?->ref, 'method' => Payment::METHODS[$p->method] ?? $p->method, 'amount' => (int) $p->amount])->values(),
            'quick' => ['languages' => collect(SiteConfig::enabledLanguages())->pluck('code')->map(fn ($c) => strtoupper($c))->values(),
                'modules_off' => collect($cfg['modules'])->filter(fn ($v) => ! $v)->keys()->values(), 'licences' => count($cfg['licences'])],
            'now' => now()->format('d M Y, h:i A'),
        ]);
    }

    public function inbox()
    {
        $inq = Inquiry::latest('id')->paginate(20, ['*'], 'ip')->withQueryString();
        $pre = PreRegistration::latest('id')->paginate(20, ['*'], 'pp')->withQueryString();

        return Inertia::render('admin/inbox', [
            'inquiries' => AdminUi::page($inq, fn ($i) => ['id' => $i->id, 'date' => $i->created_at?->format('d M H:i'), 'type' => $i->type, 'name' => $i->name, 'phone' => $i->phone,
                'interest' => $i->payload['interest'] ?? '', 'message' => $i->payload['message'] ?? '']),
            'preregs' => AdminUi::page($pre, fn ($p) => ['id' => $p->id, 'ref' => $p->ref, 'name' => $p->name, 'phone' => $p->phone, 'district' => $p->district, 'class' => ucfirst((string) $p->package_class),
                'pilgrims' => (int) $p->pilgrims, 'tracking' => $p->govt_tracking_no, 'status' => $p->status]),
            'visas' => module_on('visa') ? VisaApplication::latest('id')->take(30)->get()->map(fn ($v) => ['id' => $v->id, 'ref' => $v->ref, 'applicant' => $v->applicant_name, 'type' => $v->visa_type,
                'provider' => $v->provider, 'provider_ref' => $v->provider_ref, 'status' => $v->status])->values() : [],
        ]);
    }

    public function integrations()
    {
        $d = config('integrations');
        $cards = collect([['visa', 'Nusuk / Saudi visa', 'VisaProvider'], ['hajj_portal', 'hajj.gov.bd portal', 'HajjPortal'], ['flights', 'GDS flights', 'FlightProvider'], ['hotels', 'Hotel suppliers', 'HotelProvider']])
            ->map(fn ($c) => ['key' => $c[0], 'label' => $c[1], 'contract' => $c[2], 'driver' => $d[$c[0]], 'live' => $d[$c[0]] !== 'stub']);
        foreach ($d['payments'] as $m => $cls) {
            $cards->push(['key' => 'pay-'.$m, 'label' => Payment::METHODS[$m] ?? $m, 'contract' => 'PaymentGateway', 'driver' => class_basename($cls), 'live' => ! str_contains($cls, 'Simulated')]);
        }

        return Inertia::render('admin/integrations', ['cards' => $cards->values(),
            'logs' => IntegrationLog::latest('id')->take(50)->get()->map(fn ($l) => ['id' => $l->id, 'at' => (string) $l->created_at, 'provider' => $l->provider, 'operation' => $l->operation, 'status' => $l->status, 'ms' => $l->duration_ms])->values()]);
    }
}
