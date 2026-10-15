<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Package;
use App\Models\Traveller;
use App\Support\Csv;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;
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
        $q = $this->filtered($request);
        AdminUi::sort($q, $request, ['name' => 'full_name', 'created' => 'created_at', 'expiry' => fn ($q, $d) => $q->orderBy(\App\Models\Passport::select('expiry_date')->whereColumn('passports.traveller_id', 'travellers.id')->limit(1), $d)]);

        return Inertia::render('admin/pilgrims/index', [
            'pilgrims' => AdminUi::page($q->paginate(25)->withQueryString(), function (Traveller $t) {
                $bt = $t->bookingLinks->sortByDesc('id')->first();

                return ['id' => $t->id, 'name' => $t->full_name, 'gender' => $t->gender, 'age' => $t->dob?->age, 'wheelchair' => (bool) $t->needs_wheelchair,
                    'passport' => $t->passport?->number_enc, 'verified' => (bool) $t->passport?->verified_at, 'expiry' => $t->passport?->expiry_date?->format('d M Y'),
                    'expiry_warn' => (bool) $t->passport?->expiry_date?->lt(now()->addMonths(6)), 'booking' => $bt?->booking?->ref, 'visa' => $bt?->visa?->status, 'account' => $t->customer?->user?->name];
            }),
            'filters' => AdminUi::filters($request, ['q', 'gender', 'package_id', 'passport', 'mahram', 'sort', 'dir']),
            'packages' => Package::orderBy('type')->get()->map(fn ($p) => ['value' => (string) $p->id, 'label' => (string) $p->title])->values()]);
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
        $t = $pilgrim->load('customer.user', 'passport', 'mahram', 'bookingLinks.booking.package', 'bookingLinks.documents', 'bookingLinks.visa');
        $pp = $t->passport;

        return Inertia::render('admin/pilgrims/show', ['pilgrim' => [
            'id' => $t->id, 'name' => $t->full_name, 'gender' => $t->gender, 'dob' => $t->dob?->format('d M Y'), 'age' => $t->dob?->age, 'customer_id' => $t->customer_id, 'account' => $t->customer?->user?->name,
            'passport' => $pp?->number_enc, 'issue' => $pp?->issue_date?->format('d M Y'), 'expiry' => $pp?->expiry_date?->format('d M Y'), 'expiry_warn' => (bool) $pp?->expiry_date?->lt(now()->addMonths(6)),
            'place' => $pp?->issue_place, 'verified' => $pp?->verified_at?->format('d M Y'), 'nid' => $t->nid_enc ? '•••• '.substr($t->nid_enc, -4) : null, 'phone' => $t->phone,
            'relation' => Traveller::RELATIONS[$t->relation] ?? null, 'mahram' => $t->mahram?->full_name, 'blood_group' => $t->blood_group, 'wheelchair' => (bool) $t->needs_wheelchair, 'medical_notes' => $t->medical_notes,
            'bookings' => $t->bookingLinks->filter(fn ($bt) => $bt->booking)->map(fn ($bt) => ['ref' => $bt->booking->ref, 'status' => $bt->booking->status, 'status_label' => \App\Models\Booking::STATUSES[$bt->booking->status] ?? '',
                'tone' => $bt->booking->statusClass(), 'package' => (string) $bt->booking->package?->title, 'room_type' => $bt->room_type,
                'documents' => $bt->documents->map(fn ($d) => ['type' => $d->type, 'status' => $d->status, 'has_file' => (bool) $d->path])->values(),
                'visa' => $bt->visa ? ['ref' => $bt->visa->ref, 'status' => $bt->visa->status] : null])->values(),
        ]]);
    }

    public function edit(Traveller $pilgrim)
    {
        $t = $pilgrim->load('passport');

        return Inertia::render('admin/pilgrims/form', [
            'pilgrim' => ['id' => $t->id] + BookingController::travellerForm(null, $t) + ['mahram_traveller_id' => $t->mahram_traveller_id ? (string) $t->mahram_traveller_id : '', 'passport_verified' => (bool) $t->passport?->verified_at],
            'mahrams' => $pilgrim->customer->travellers()->where('id', '!=', $pilgrim->id)->where('gender', 'male')->get()->map(fn ($m) => ['value' => (string) $m->id, 'label' => $m->full_name.' ('.(Traveller::RELATIONS[$m->relation] ?? '—').')'])->values(),
            'options' => ['relations' => AdminUi::options(Traveller::RELATIONS), 'blood' => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']],
        ]);
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
