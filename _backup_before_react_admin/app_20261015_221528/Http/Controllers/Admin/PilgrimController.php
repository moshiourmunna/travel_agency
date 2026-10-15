<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Package;
use App\Models\Traveller;
use App\Support\Csv;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Pilgrim (traveller) register: passports, mahram links, medical needs, manifest export. */
class PilgrimController extends Controller
{
    private function filtered(Request $r)
    {
        $q = Traveller::with('customer.user', 'passport', 'mahram', 'bookingLinks.booking.package', 'bookingLinks.visa')->latest('id');
        if ($s = trim((string) $r->query('q'))) $q->where(fn ($w) => $w->where('full_name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"));
        if ($v = $r->query('gender')) $q->where('gender', $v);
        if ($v = $r->query('package_id')) $q->whereHas('bookingLinks.booking', fn ($b) => $b->where('package_id', $v)->whereNot('status', 'cancelled'));
        match ($r->query('passport')) {
            'missing' => $q->doesntHave('passport'),
            'expiring' => $q->whereHas('passport', fn ($p) => $p->whereDate('expiry_date', '<', now()->addMonths(6))),
            'unverified' => $q->whereHas('passport', fn ($p) => $p->whereNull('verified_at')),
            default => null,
        };
        if ($r->query('mahram') === 'needed') $q->where('gender', 'female')->whereNull('mahram_traveller_id')->where(fn ($w) => $w->whereNull('dob')->orWhereDate('dob', '>', now()->subYears(45)));

        return $q;
    }

    public function index(Request $request)
    {
        return view('admin.pilgrims.index', ['pilgrims' => $this->filtered($request)->paginate(25)->withQueryString(), 'packages' => Package::orderBy('type')->get()]);
    }

    public function export(Request $request)
    {
        $rows = $this->filtered($request)->get()->map(function (Traveller $t) {
            $bt = $t->bookingLinks->sortByDesc('id')->first();

            return [$t->full_name, $t->gender, $t->dob?->toDateString(), $t->passport?->number_enc, $t->passport?->issue_date?->toDateString(), $t->passport?->expiry_date?->toDateString(),
                $t->passport?->issue_place, $t->phone, Traveller::RELATIONS[$t->relation] ?? $t->relation, $t->mahram?->full_name, $t->blood_group, $t->needs_wheelchair ? 'yes' : '', $t->medical_notes,
                $bt?->booking?->ref, $bt?->booking?->package?->getTranslations('title')['en'] ?? '', $bt?->room_type, $bt?->govt_tracking_no, $bt?->visa?->status, $t->customer?->user?->name, $t->customer?->user?->phone];
        });
        AuditLog::record('pilgrim.export', 'travellers', null, ['rows' => $rows->count()]);

        return Csv::download('pilgrim-manifest-'.now()->format('Ymd').'.csv', ['Full name', 'Gender', 'DOB', 'Passport', 'Issued', 'Expiry', 'Issue place', 'Phone', 'Relation', 'Mahram', 'Blood', 'Wheelchair', 'Medical', 'Booking', 'Package', 'Room', 'Govt tracking', 'Visa', 'Account holder', 'Account phone'], $rows);
    }

    public function show(Traveller $pilgrim)
    {
        return view('admin.pilgrims.show', ['t' => $pilgrim->load('customer.user', 'passport', 'mahram', 'bookingLinks.booking.package', 'bookingLinks.documents', 'bookingLinks.visa')]);
    }

    public function edit(Traveller $pilgrim)
    {
        return view('admin.pilgrims.form', ['t' => $pilgrim->load('passport', 'customer.travellers'), 'mahrams' => $pilgrim->customer->travellers()->where('id', '!=', $pilgrim->id)->where('gender', 'male')->get()]);
    }

    public function update(Request $request, Traveller $pilgrim)
    {
        $d = $request->validate(BookingController::travellerRules('') + ['mahram_traveller_id' => ['nullable', Rule::exists('travellers', 'id')->where('customer_id', $pilgrim->customer_id)->whereNot('id', $pilgrim->id)], 'passport_verified' => 'nullable|boolean']);
        $before = $pilgrim->only('full_name', 'gender', 'mahram_traveller_id');
        $pilgrim->update(['full_name' => strtoupper($d['full_name']), 'gender' => $d['gender'], 'dob' => $d['dob'] ?? null, 'phone' => $d['phone'] ?? null, 'relation' => $d['relation'] ?? null,
            'mahram_traveller_id' => $d['mahram_traveller_id'] ?? null, 'blood_group' => $d['blood_group'] ?? null, 'medical_notes' => $d['medical_notes'] ?? null, 'needs_wheelchair' => ! empty($d['needs_wheelchair'])]
            + (! empty($d['nid']) ? ['nid_enc' => $d['nid']] : []));
        if (! empty($d['passport_no'])) {
            $pilgrim->passport()->updateOrCreate([], ['number_enc' => strtoupper($d['passport_no']), 'issue_date' => $d['passport_issue'] ?? null, 'expiry_date' => $d['passport_expiry'] ?? null,
                'issue_place' => $d['passport_place'] ?? null, 'verified_at' => ! empty($d['passport_verified']) ? ($pilgrim->passport?->verified_at ?? now()) : null]);
        }
        AuditLog::record('pilgrim.update', $pilgrim, $before, $pilgrim->only('full_name', 'gender', 'mahram_traveller_id'));

        return redirect()->route('admin.pilgrims.show', $pilgrim)->with('ok', __('Pilgrim updated.'));
    }
}
