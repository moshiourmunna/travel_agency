<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\AuditLog;
use App\Models\Commission;
use App\Models\LedgerEntry;
use App\Support\Csv;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class CommissionController extends Controller
{
    private function filtered(Request $r)
    {
        $q = Commission::with('agent', 'booking.customer.user')->latest('id');
        foreach (['status', 'agent_id'] as $f) if ($v = $r->query($f)) $q->where($f, $v);

        return $q;
    }

    public function index(Request $request)
    {
        $agents = Agent::withCount('bookings')->withSum(['commissions as earned' => fn ($c) => $c->whereNot('status', 'void')], 'amount')
            ->withSum(['commissions as paid_out' => fn ($c) => $c->where('status', 'paid')], 'amount')->orderBy('code')->get();

        return Inertia::render('admin/commissions/index', [
            'commissions' => AdminUi::page($this->filtered($request)->paginate(25)->withQueryString(), fn ($c) => self::row($c)),
            'agents' => $agents->map(fn ($a) => ['id' => $a->id, 'code' => $a->code, 'company' => $a->company_name, 'tier' => \App\Models\Agent::TIERS[$a->tier] ?? $a->tier, 'rate' => (float) $a->commission_percent,
                'bookings' => (int) $a->bookings_count, 'earned' => (int) ($a->earned ?? 0), 'paid_out' => (int) ($a->paid_out ?? 0), 'payable' => (int) (($a->earned ?? 0) - ($a->paid_out ?? 0))])->values(),
            'filters' => AdminUi::filters($request, ['status', 'agent_id']), 'options' => ['statuses' => AdminUi::options(Commission::STATUSES)]]);
    }

    public static function row(Commission $c): array
    {
        return ['id' => $c->id, 'agent' => $c->agent?->code, 'ref' => $c->booking?->ref, 'customer' => $c->booking?->customer?->user?->name, 'booking_total' => (int) ($c->booking?->total ?? 0),
            'amount' => (int) $c->amount, 'status' => $c->status, 'status_label' => Commission::STATUSES[$c->status] ?? $c->status, 'paid_at' => $c->paid_at?->format('d M Y'), 'note' => $c->note];
    }

    public function export(Request $request)
    {
        $rows = $this->filtered($request)->get()->map(fn ($c) => [$c->id, $c->agent?->code, $c->agent?->company_name, $c->booking?->ref, $c->booking?->total, $c->amount, $c->status, $c->paid_at?->toDateString(), $c->note]);

        return Csv::download('commissions-'.now()->format('Ymd').'.csv', ['#', 'Agent', 'Company', 'Booking', 'Booking total', 'Commission', 'Status', 'Paid', 'Note'], $rows);
    }

    public function update(Request $request, Commission $commission)
    {
        $d = $request->validate(['status' => ['required', Rule::in(array_keys(Commission::STATUSES))], 'amount' => 'nullable|integer|min:0', 'note' => 'nullable|string|max:255']);
        if ($d['status'] === 'paid' && ! $request->user()->isOwner()) abort(403);
        $before = $commission->only('status', 'amount');
        $commission->update(['status' => $d['status'], 'amount' => $d['amount'] ?? $commission->amount, 'note' => $d['note'] ?? $commission->note, 'paid_at' => $d['status'] === 'paid' ? now() : null]);
        if ($d['status'] === 'paid' && $before['status'] !== 'paid') {
            LedgerEntry::create(['account_type' => 'agent', 'account_id' => $commission->agent_id, 'debit' => $commission->amount, 'ref_type' => 'commission', 'ref_id' => $commission->id, 'note' => 'Commission payout '.$commission->booking?->ref]);
        }
        AuditLog::record('commission.'.$d['status'], $commission, $before, $commission->only('status', 'amount'));

        return back()->with('ok', __('Commission updated.'));
    }

    public function statement(Agent $agent)
    {
        $rows = $agent->commissions()->with('booking.customer.user', 'booking.package')->latest('id')->get();
        $bookings = $agent->bookings()->with('package', 'customer.user')->latest('id')->take(50)->get();
        $earned = $rows->where('status', '!=', 'void')->sum('amount'); $paid = $rows->where('status', 'paid')->sum('amount');

        return Inertia::render('admin/commissions/statement', ['agent' => ['id' => $agent->id, 'code' => $agent->code, 'company' => $agent->company_name, 'rate' => (float) $agent->commission_percent],
            'stats' => ['bookings' => $bookings->count(), 'sales' => (int) $bookings->where('status', '!=', 'cancelled')->sum('total'), 'earned' => (int) $earned, 'payable' => (int) ($earned - $paid)],
            'commissions' => $rows->map(fn ($c) => self::row($c))->values(), 'bookings' => $bookings->map(fn ($b) => AdminUi::bookingRow($b))->values()]);
    }
}
