<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PreRegistration;
use App\Models\User;
use App\Support\Csv;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PreRegistrationController extends Controller
{
    private function filtered(Request $r)
    {
        $q = PreRegistration::with('booking')->latest('id');
        if ($s = trim((string) $r->query('q'))) $q->where(fn ($w) => $w->where('ref', 'like', "%{$s}%")->orWhere('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")->orWhere('govt_tracking_no', 'like', "%{$s}%"));
        foreach (['status', 'package_class', 'district'] as $f) if ($v = $r->query($f)) $q->where($f, $v);

        return $q;
    }

    public function index(Request $request)
    {
        $q = $this->filtered($request);
        AdminUi::sort($q, $request, ['ref' => 'ref', 'name' => 'name', 'created' => 'created_at', 'pilgrims' => 'pilgrims', 'status' => 'status']);
        $counts = PreRegistration::selectRaw('status, count(*) n')->groupBy('status')->pluck('n', 'status');

        return Inertia::render('admin/preregs/index', [
            'preregs' => AdminUi::page($q->paginate(25)->withQueryString(), fn ($p) => ['id' => $p->id, 'ref' => $p->ref, 'date' => $p->created_at?->format('d M Y'), 'name' => $p->name, 'phone' => $p->phone,
                'district' => $p->district, 'class' => \App\Models\Package::CLASSES[$p->package_class] ?? ucfirst((string) $p->package_class), 'pilgrims' => (int) $p->pilgrims, 'status' => $p->status,
                'status_label' => PreRegistration::STATUSES[$p->status] ?? $p->status, 'booking' => $p->booking?->ref]),
            'filters' => AdminUi::filters($request, ['q', 'status', 'package_class', 'district', 'sort', 'dir']),
            'districts' => PreRegistration::distinct()->orderBy('district')->pluck('district')->filter()->values(),
            'counts' => $counts, 'options' => ['statuses' => AdminUi::options(PreRegistration::STATUSES), 'classes' => AdminUi::options(\App\Models\Package::CLASSES)]]);
    }

    public function export(Request $request)
    {
        $rows = $this->filtered($request)->get()->map(fn ($p) => [$p->ref, $p->name, $p->phone, $p->dob?->toDateString(), $p->nid_enc, $p->passport_enc, $p->district, $p->package_class, $p->pilgrims, $p->govt_tracking_no, $p->status, $p->booking?->ref, $p->created_at->toDateString()]);
        AuditLog::record('prereg.export', 'pre_registrations', null, ['rows' => $rows->count()]);

        return Csv::download('pre-registrations-'.now()->format('Ymd').'.csv', ['Ref', 'Name', 'Phone', 'DOB', 'NID', 'Passport', 'District', 'Class', 'Pilgrims', 'Govt tracking', 'Status', 'Booking', 'Date'], $rows);
    }

    public function show(PreRegistration $prereg)
    {
        $p = $prereg->load('booking', 'user');

        return Inertia::render('admin/preregs/show', ['prereg' => ['id' => $p->id, 'ref' => $p->ref, 'name' => $p->name, 'phone' => $p->phone, 'dob' => $p->dob?->format('d M Y'), 'nid' => $p->nid_enc,
            'passport' => $p->passport_enc, 'district' => $p->district, 'class' => \App\Models\Package::CLASSES[$p->package_class] ?? ucfirst((string) $p->package_class), 'pilgrims' => (int) $p->pilgrims,
            'received' => $p->created_at?->format('d M Y H:i'), 'booking' => $p->booking?->ref, 'converted_at' => $p->converted_at?->format('d M Y'), 'status' => $p->status,
            'govt_tracking_no' => $p->govt_tracking_no ?? '', 'notes' => $p->notes ?? ''], 'options' => ['statuses' => AdminUi::options(PreRegistration::STATUSES)]]);
    }

    public function update(Request $request, PreRegistration $prereg)
    {
        $d = $request->validate(['status' => ['required', Rule::in(array_keys(PreRegistration::STATUSES))], 'govt_tracking_no' => 'nullable|string|max:40', 'notes' => 'nullable|string|max:2000', 'pilgrims' => 'nullable|integer|min:1|max:20']);
        $before = $prereg->only('status', 'govt_tracking_no');
        $prereg->update(array_filter($d, fn ($v) => $v !== null) + ['notes' => $d['notes'] ?? null]);
        AuditLog::record('prereg.update', $prereg, $before, $prereg->only('status', 'govt_tracking_no'));

        return back()->with('ok', __('Pre-registration updated.'));
    }

    public function destroy(Request $request, PreRegistration $prereg)
    {
        $request->validate(['confirm' => 'accepted']);
        AuditLog::record('prereg.delete', $prereg, $prereg->only('ref', 'name', 'phone', 'status'));
        $prereg->delete();

        return redirect()->route('admin.preregs.index')->with('ok', __('Pre-registration deleted.'));
    }

    /** Find/create the customer account for the applicant, then open the booking form prefilled. */
    public function convert(PreRegistration $prereg)
    {
        if ($prereg->booking_id) return redirect()->route('admin.bookings.show', $prereg->booking)->with('ok', __('Already converted.'));
        $phone = preg_replace('/^\+?88/', '', $prereg->phone);
        $user = $prereg->user ?? User::where('phone', $phone)->first()
            ?? User::create(['name' => $prereg->name, 'phone' => $phone, 'password' => Str::random(16), 'role' => 'customer', 'locale' => 'bn']);
        $customer = $user->customerProfile();
        if (! $customer->district) $customer->update(['district' => $prereg->district, 'dob' => $prereg->dob]);
        $prereg->update(['user_id' => $user->id, 'status' => $prereg->status === 'received' ? 'contacted' : $prereg->status]);
        AuditLog::record('prereg.convert_start', $prereg, null, ['customer_id' => $customer->id]);

        return redirect()->route('admin.bookings.create', ['customer' => $customer->id, 'prereg' => $prereg->id]);
    }
}
