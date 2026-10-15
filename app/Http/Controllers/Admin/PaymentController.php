<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\Refund;
use App\Support\Csv;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    private function filtered(Request $r)
    {
        $q = Payment::with('booking.customer.user', 'recorder')->latest('id');
        if ($s = trim((string) $r->query('q'))) $q->where(fn ($w) => $w->where('gateway_txn_id', 'like', "%{$s}%")->orWhereHas('booking', fn ($b) => $b->withTrashed()->where('ref', 'like', "%{$s}%")));
        foreach (['status', 'method'] as $f) if ($v = $r->query($f)) $q->where($f, $v);
        if ($v = $r->query('from')) $q->whereDate('created_at', '>=', $v);
        if ($v = $r->query('to')) $q->whereDate('created_at', '<=', $v);

        return $q;
    }

    public function index(Request $request)
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $sum = (clone $this->filtered($request))->reorder()->where('status', '!=', 'failed')->selectRaw('coalesce(sum(amount),0) a, coalesce(sum(refunded),0) r')->first();

        $q = $this->filtered($request);
        AdminUi::sort($q, $request, ['id' => 'id', 'amount' => 'amount', 'date' => 'created_at', 'status' => 'status']);

        return Inertia::render('admin/payments/index', [
            'payments' => AdminUi::page($q->paginate(25)->withQueryString(), fn ($p) => AdminUi::paymentRow($p)),
            'sum' => ['amount' => (int) $sum->a, 'refunded' => (int) $sum->r],
            'filters' => AdminUi::filters($request, ['q', 'status', 'method', 'from', 'to', 'sort', 'dir']),
            'options' => ['statuses' => AdminUi::options(Payment::STATUSES), 'methods' => AdminUi::options(Payment::METHODS)],
            'overdue' => Installment::with('booking.customer.user')->whereNot('status', 'paid')->whereDate('due_date', '<', today())->whereHas('booking', fn ($b) => $b->whereNot('status', 'cancelled'))->orderBy('due_date')->take(15)->get()
                ->map(fn ($i) => ['id' => $i->id, 'ref' => $i->booking->ref, 'customer' => $i->booking->customer?->user?->name, 'label' => $i->label, 'due' => $i->due_date->format('d M Y'), 'ago' => $i->due_date->diffForHumans(), 'amount' => (int) $i->amount])->values(),
            'refunds' => Refund::with('payment.booking', 'processor')->latest('id')->take(10)->get()
                ->map(fn ($r) => ['id' => $r->id, 'ref' => $r->payment?->booking?->ref, 'reason' => $r->reason, 'date' => $r->processed_at?->format('d M Y'), 'by' => $r->processor?->name, 'amount' => (int) $r->amount])->values(),
        ]);
    }

    public function export(Request $request)
    {
        $rows = $this->filtered($request)->get()->map(fn ($p) => [$p->id, $p->booking?->ref, $p->booking?->customer?->user?->name, Payment::METHODS[$p->method] ?? $p->method, $p->gateway_txn_id, $p->amount, $p->refunded, $p->status, $p->paid_at?->format('Y-m-d H:i'), $p->recorder?->name, $p->note, $p->created_at->format('Y-m-d H:i')]);
        AuditLog::record('payment.export', 'payments', null, ['rows' => $rows->count()]);

        return Csv::download('payments-'.now()->format('Ymd').'.csv', ['#', 'Booking', 'Customer', 'Method', 'TrxID', 'Amount', 'Refunded', 'Status', 'Paid at', 'Recorded by', 'Note', 'Created'], $rows);
    }

    public function slip(Payment $payment)
    {
        abort_unless($payment->slip_path && Storage::exists($payment->slip_path), 404);

        return Storage::response($payment->slip_path);
    }
}
