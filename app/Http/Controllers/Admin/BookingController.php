<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Integrations\Contracts\VisaProvider;
use App\Models\Agent;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\BookingTraveller;
use App\Models\Customer;
use App\Models\Document;
use App\Models\LedgerEntry;
use App\Models\Package;
use App\Models\PackagePrice;
use App\Models\Payment;
use App\Models\PreRegistration;
use App\Models\Traveller;
use App\Models\VisaApplication;
use App\Services\BookingAdminService;
use App\Services\PaymentService;
use App\Support\Csv;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Support\AdminUi;
use Inertia\Inertia;

class BookingController extends Controller
{
    public const VISA_STATUSES = ['draft' => 'Draft', 'submitted' => 'Submitted', 'processing' => 'Processing', 'approved' => 'Approved', 'issued' => 'Issued', 'rejected' => 'Rejected'];

    public function __construct(private BookingAdminService $svc) {}

    private function filtered(Request $r)
    {
        $q = Booking::with('customer.user', 'package', 'agent', 'installments')->latest('id');
        if ($r->query('trashed') === 'only') $q->onlyTrashed();
        if ($s = trim((string) $r->query('q'))) {
            $q->where(fn ($w) => $w->where('ref', 'like', "%{$s}%")
                ->orWhereHas('customer.user', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"))
                ->orWhereHas('travellers.traveller', fn ($t) => $t->where('full_name', 'like', "%{$s}%")));
        }
        foreach (['status', 'payment_mode', 'type', 'package_id', 'agent_id'] as $f) {
            if ($v = $r->query($f)) $q->where($f, $v);
        }
        if ($v = $r->query('payment_status')) $q->paymentStatus($v);
        if ($v = $r->query('from')) $q->whereDate('created_at', '>=', $v);
        if ($v = $r->query('to')) $q->whereDate('created_at', '<=', $v);

        return $q;
    }

    public function index(Request $request)
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date', 'payment_status' => ['nullable', Rule::in(array_keys(Booking::PAYMENT_STATUSES))]]);
        $base = $this->filtered($request);
        $totals = (clone $base)->reorder()->selectRaw('count(*) n, coalesce(sum(total),0) t, coalesce(sum(paid),0) p')->first();

        AdminUi::sort($base, $request, ['ref' => 'ref', 'created' => 'created_at', 'total' => 'total', 'paid' => 'paid', 'status' => 'status', 'pax' => 'adults']);
        $page = $base->paginate((int) min(100, max(10, (int) $request->query('per', 20))))->withQueryString();

        return Inertia::render('admin/bookings/index', [
            'bookings' => AdminUi::page($page, fn (Booking $b) => AdminUi::bookingRow($b)),
            'totals' => ['n' => (int) $totals->n, 'value' => (int) $totals->t, 'collected' => (int) $totals->p],
            'filters' => AdminUi::filters($request, ['q', 'status', 'package_id', 'payment_status', 'payment_mode', 'type', 'agent_id', 'from', 'to', 'trashed', 'sort', 'dir']),
            'options' => [
                'statuses' => AdminUi::options(Booking::STATUSES), 'payment_statuses' => AdminUi::options(Booking::PAYMENT_STATUSES), 'modes' => AdminUi::options(Booking::MODES),
                'types' => AdminUi::options(Package::TYPES), 'packages' => Package::orderBy('type')->get()->map(fn ($p) => ['value' => (string) $p->id, 'label' => (string) $p->title])->values(),
                'agents' => Agent::orderBy('code')->get()->map(fn ($a) => ['value' => (string) $a->id, 'label' => $a->code])->values(),
            ],
            'trashedCount' => Booking::onlyTrashed()->count(),
        ]);
    }

    public function export(Request $request)
    {
        $rows = $this->filtered($request)->with('travellers')->get()->map(fn (Booking $b) => [
            $b->ref, $b->type, $b->customer?->user?->name, $b->customer?->user?->phone, $b->package?->getTranslations('title')['en'] ?? '', $b->room_type,
            $b->travellers->count(), Booking::STATUSES[$b->status] ?? $b->status, Booking::MODES[$b->payment_mode] ?? $b->payment_mode,
            Booking::PAYMENT_STATUSES[$b->paymentStatus()], $b->subtotal, $b->discount, $b->total, $b->paid, $b->due(), $b->agent?->code, $b->source, $b->created_at->format('Y-m-d H:i'), $b->deleted_at ? 'trashed' : '',
        ]);
        AuditLog::record('booking.export', 'bookings', null, ['rows' => $rows->count(), 'filters' => $request->query()]);

        return Csv::download('bookings-'.now()->format('Ymd-His').'.csv',
            ['Ref', 'Type', 'Customer', 'Phone', 'Package', 'Room', 'Pilgrims', 'Status', 'Payment plan', 'Payment status', 'Subtotal', 'Discount', 'Total', 'Paid', 'Due', 'Agent', 'Source', 'Created', 'Trashed'], $rows);
    }

    private function formData(): array
    {
        $packages = Package::with('prices')->whereIn('status', ['published', 'closed'])->orderBy('type')->get();
        $modes = Booking::MODES;
        if (! module_on('installments')) unset($modes['installment']);

        return [
            'packages' => $packages->map(fn ($p) => ['id' => $p->id, 'title' => (string) $p->title, 'type' => $p->type, 'type_label' => Package::TYPES[$p->type] ?? $p->type,
                'seats' => $p->seats_total ? $p->seatsLeft() : null, 'departure' => $p->departure_date?->format('d M Y'),
                'prices' => $p->prices->map(fn ($pr) => ['room_type' => $pr->room_type, 'label' => PackagePrice::ROOM_TYPES[$pr->room_type] ?? $pr->room_type, 'price' => (int) $pr->price, 'deposit' => (int) $pr->deposit_amount])->values()])->values(),
            'agents' => Agent::where('status', 'active')->orderBy('code')->get()->map(fn ($a) => ['id' => $a->id, 'code' => $a->code, 'company' => $a->company_name, 'percent' => (float) $a->commission_percent])->values(),
            'customers' => Customer::with('user')->get()->sortBy(fn ($c) => $c->user?->name)->map(fn ($c) => ['id' => $c->id, 'name' => $c->user?->name, 'phone' => $c->user?->phone])->values(),
            'options' => ['modes' => AdminUi::options($modes), 'methods' => AdminUi::options(Payment::METHODS), 'relations' => AdminUi::options(Traveller::RELATIONS),
                'blood' => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']],
        ];
    }

    /** One pilgrim row for the React form. */
    public static function travellerForm(?BookingTraveller $bt, ?Traveller $t = null): array
    {
        $t ??= $bt?->traveller;

        return ['id' => $bt?->id, 'full_name' => $t?->full_name ?? '', 'gender' => $t?->gender ?? 'male', 'dob' => $t?->dob?->toDateString() ?? '', 'relation' => $t?->relation ?? '',
            'phone' => $t?->phone ?? '', 'passport_no' => $t?->passport?->number_enc ?? '', 'passport_issue' => $t?->passport?->issue_date?->toDateString() ?? '',
            'passport_expiry' => $t?->passport?->expiry_date?->toDateString() ?? '', 'passport_place' => $t?->passport?->issue_place ?? '', 'nid' => '',
            'blood_group' => $t?->blood_group ?? '', 'medical_notes' => $t?->medical_notes ?? '', 'needs_wheelchair' => (bool) $t?->needs_wheelchair,
            'ticket_no' => $bt?->ticket_no ?? '', 'seat' => $bt?->seat ?? '', 'govt_tracking_no' => $bt?->govt_tracking_no ?? ''];
    }

    public function create
(Request $request)
    {
        $prefill = ['customer_id' => $request->query('customer'), 'package_id' => $request->query('package'), 'travellers' => [[]]];
        if ($pr = PreRegistration::find($request->query('prereg'))) {
            $prefill['prereg'] = $pr;
            $prefill['travellers'] = [['full_name' => $pr->name, 'dob' => $pr->dob?->toDateString(), 'passport_no' => $pr->passport_enc, 'nid' => $pr->nid_enc, 'phone' => $pr->phone]];
            $prefill['package_id'] ??= Package::where('type', 'hajj')->where('class', $pr->package_class)->value('id');
        }

        $pr = $prefill['prereg'] ?? null;

        return Inertia::render('admin/bookings/form', $this->formData() + ['booking' => null, 'prefill' => [
            'customer_id' => $prefill['customer_id'] ? (string) $prefill['customer_id'] : '', 'package_id' => $prefill['package_id'] ? (string) $prefill['package_id'] : '',
            'prereg' => $pr ? ['id' => $pr->id, 'ref' => $pr->ref] : null,
            'travellers' => collect($prefill['travellers'])->map(fn ($t) => array_merge(self::travellerForm(null), array_filter($t ?? [], fn ($v) => $v !== null)))->values(),
        ]]);

    }

    public static function travellerRules(string $p = 'travellers.*.'): array
    {
        return [
            $p.'full_name' => 'required|string|max:120', $p.'gender' => 'required|in:male,female', $p.'dob' => 'nullable|date|before:today',
            $p.'phone' => 'nullable|string|max:20', $p.'passport_no' => ['nullable', 'regex:/^[A-Za-z0-9]{6,12}$/'], $p.'passport_issue' => 'nullable|date|before_or_equal:today',
            $p.'passport_expiry' => 'nullable|date|after:today', $p.'passport_place' => 'nullable|string|max:60', $p.'relation' => ['nullable', Rule::in(array_keys(Traveller::RELATIONS))],
            $p.'blood_group' => 'nullable|in:A+,A-,B+,B-,AB+,AB-,O+,O-', $p.'medical_notes' => 'nullable|string|max:500', $p.'needs_wheelchair' => 'nullable|boolean', $p.'nid' => 'nullable|digits_between:10,17',
        ];
    }

    public function store(Request $request)
    {
        $d = $request->validate([
            'customer_mode' => 'required|in:existing,new',
            'customer_id' => 'required_if:customer_mode,existing|nullable|exists:customers,id',
            'new_name' => 'required_if:customer_mode,new|nullable|string|max:120',
            'new_phone' => ['required_if:customer_mode,new', 'nullable', 'regex:/^(\+?88)?01[3-9]\d{8}$/', 'unique:users,phone'],
            'new_email' => 'nullable|email|unique:users,email', 'new_address' => 'nullable|string|max:255', 'new_district' => 'nullable|string|max:60',
            'package_id' => 'required|exists:packages,id', 'room_type' => ['required', Rule::in(array_keys(PackagePrice::ROOM_TYPES))],
            'children' => 'nullable|integer|min:0|max:20', 'travellers' => 'required|array|min:1|max:49',
            'payment_mode' => ['required', Rule::in(array_keys(Booking::MODES))],
            'payment_method' => ['required_unless:payment_mode,pay_later', 'nullable', Rule::in(array_keys(Payment::METHODS))],
            'discount' => 'nullable|integer|min:0', 'agent_id' => 'nullable|exists:agents,id', 'notes' => 'nullable|string|max:2000',
            'addons' => 'nullable|array', 'addons.*' => 'in:qurbani,insurance', 'wheelchair' => 'nullable|boolean',
            'initial_payment' => 'nullable|integer|min:0', 'initial_txn' => 'nullable|string|max:60', 'prereg_id' => 'nullable|exists:pre_registrations,id',
        ] + self::travellerRules());
        if ($d['customer_mode'] === 'existing') unset($d['new_name'], $d['new_phone']); else $d['customer_id'] = null;
        $d['travellers'] = array_values($d['travellers']);
        $b = $this->svc->create($d);

        return redirect()->route('admin.bookings.show', $b)->with('ok', __('Booking :ref created.', ['ref' => $b->ref]));
    }

    public function show(Booking $booking)
    {
        $booking->load('customer.user', 'package', 'agent', 'installments', 'payments.refunds', 'payments.recorder', 'items', 'commissions.agent',
            'travellers.traveller.passport', 'travellers.traveller.mahram', 'travellers.documents', 'travellers.visa', 'activities.user', 'preRegistration');
        $ledger = LedgerEntry::where('account_type', 'booking')->where('account_id', $booking->id)->orderBy('id')->get();

        $b = $booking;
        $dep = $b->package?->return_date ?? $b->package?->departure_date;
        $openInst = $b->installments->where('status', '!=', 'paid');
        $visaOn = module_on('visa');

        return Inertia::render('admin/bookings/show', [
            'booking' => AdminUi::bookingRow($b) + [
                'subtotal' => (int) $b->subtotal, 'discount' => (int) $b->discount, 'adults' => (int) $b->adults, 'children' => (int) $b->children,
                'payment_method' => $b->payment_method, 'payment_method_label' => $b->payment_method ? (Payment::METHODS[$b->payment_method] ?? $b->payment_method) : null,
                'customer' => ['id' => $b->customer_id, 'name' => $b->customer?->user?->name, 'phone' => $b->customer?->user?->phone, 'email' => $b->customer?->user?->email],
                'package_departure' => $b->package?->departure_date?->format('d M Y'),
                'agent_info' => $b->agent ? ['id' => $b->agent->id, 'code' => $b->agent->code, 'company' => $b->agent->company_name] : null, 'agent_id' => $b->agent_id,
                'source' => strtoupper((string) $b->source), 'created_at' => $b->created_at?->format('d M Y H:i'), 'deleted_at' => $b->deleted_at?->format('d M Y H:i'),
                'hold_expires_at' => $b->hold_expires_at?->format('d M Y H:i'),
                'items' => $b->items->map(fn ($i) => ['label' => $i->label, 'price' => (int) $i->price])->values(),
                'wheelchair' => ! empty($b->meta['wheelchair']), 'notes' => $b->meta['notes'] ?? null, 'admin_note' => $b->meta['admin_note'] ?? null,
                'prereg' => $b->preRegistration?->ref,
                'docs_total' => $b->travellers->sum(fn ($t) => $t->documents->count()), 'docs_ok' => $b->travellers->sum(fn ($t) => $t->documents->where('status', 'verified')->count()),
            ],
            'pilgrims' => $b->travellers->map(function ($bt) use ($dep, $visaOn) {
                $t = $bt->traveller; $pp = $t->passport;

                return ['id' => $bt->id, 'traveller_id' => $t->id, 'name' => $t->full_name, 'lead' => (bool) $bt->is_lead, 'gender' => $t->gender, 'age' => $t->dob?->age,
                    'passport' => $pp?->number_enc, 'passport_expiry' => $pp?->expiry_date?->format('d M Y'), 'passport_verified' => (bool) $pp?->verified_at,
                    'passport_warn' => $pp?->expiry_date && $dep ? $pp->expiry_date->lt(\Carbon\Carbon::parse($dep)->addMonths(6)) : false,
                    'needs_mahram' => $t->gender === 'female' && (! $t->dob || $t->dob->age < 45), 'mahram' => $t->mahram?->full_name,
                    'room_type' => $bt->room_type, 'price' => (int) $bt->price, 'ticket_no' => $bt->ticket_no, 'govt_tracking_no' => $bt->govt_tracking_no,
                    'blood_group' => $t->blood_group, 'wheelchair' => (bool) $t->needs_wheelchair, 'medical_notes' => $t->medical_notes,
                    'documents' => $bt->documents->map(fn ($d) => ['id' => $d->id, 'type' => $d->type, 'status' => $d->status, 'has_file' => (bool) $d->path, 'note' => $d->note])->values(),
                    'visa' => $visaOn && $bt->visa ? ['id' => $bt->visa->id, 'ref' => $bt->visa->ref, 'status' => $bt->visa->status, 'visa_no' => $bt->visa->visa_no, 'provider_ref' => $bt->visa->provider_ref] : null];
            })->values(),
            'installments' => $b->installments->map(fn ($i) => ['id' => $i->id, 'label' => $i->label, 'due' => $i->due_date->format('d M Y'), 'due_short' => $i->due_date->format('d M'), 'amount' => (int) $i->amount,
                'status' => $i->status, 'late' => $i->status !== 'paid' && $i->due_date->lt(today())])->values(),
            'open_installments' => $openInst->map(fn ($i) => ['id' => $i->id, 'label' => $i->label, 'amount' => (int) $i->amount, 'due' => $i->due_date->format('d M')])->values(),
            'payments' => $b->payments->map(fn ($p) => AdminUi::paymentRow($p) + ['refundable' => $p->refundable(),
                'refunds' => $p->refunds->map(fn ($r) => ['id' => $r->id, 'amount' => (int) $r->amount, 'reason' => $r->reason, 'status' => $r->status, 'date' => $r->processed_at?->format('d M Y')])->values()])->values(),
            'ledger' => $ledger->map(fn ($e) => ['id' => $e->id, 'date' => $e->created_at?->format('d M Y'), 'type' => $e->ref_type, 'note' => $e->note, 'debit' => (int) $e->debit, 'credit' => (int) $e->credit, 'balance' => (int) $e->balance_after])->values(),
            'commissions' => $b->commissions->map(fn ($c) => ['id' => $c->id, 'agent' => $c->agent?->code, 'status' => $c->status, 'amount' => (int) $c->amount])->values(),
            'timeline' => $b->activities->map(fn ($a) => ['id' => $a->id, 'type' => $a->type, 'icon' => \App\Models\BookingActivity::ICONS[$a->type] ?? '•', 'from' => $a->from_status ? (Booking::STATUSES[$a->from_status] ?? $a->from_status) : null,
                'to' => $a->to_status ? (Booking::STATUSES[$a->to_status] ?? $a->to_status) : null, 'message' => $a->message, 'at' => $a->created_at?->format('d M Y H:i'), 'user' => $a->user?->name])->values(),
            'agents' => Agent::orderBy('code')->get()->map(fn ($a) => ['id' => $a->id, 'code' => $a->code, 'company' => $a->company_name])->values(),
            'options' => ['statuses' => AdminUi::options(Booking::STATUSES), 'methods' => AdminUi::options(Payment::METHODS), 'visa_statuses' => AdminUi::options(self::VISA_STATUSES)],
            'defaults' => ['first_due' => today()->addMonth()->toDateString(), 'last_due' => ($b->package?->departure_date ?? today()->addMonths(4))->copy()->subDays(45)->max(today()->addMonth())->toDateString(),
                'now' => now()->format('Y-m-d\TH:i')],
        ]);

    }

    public function edit(Booking $booking)
    {
        $booking->load('travellers.traveller.passport', 'customer.user', 'package');

        return Inertia::render('admin/bookings/form', $this->formData() + ['prefill' => null, 'booking' => [
            'ref' => $booking->ref, 'customer' => $booking->customer?->user?->name, 'package_id' => (string) $booking->package_id, 'package' => (string) $booking->package?->title,
            'room_type' => $booking->room_type, 'children' => (int) $booking->children, 'payment_mode' => $booking->payment_mode, 'payment_method' => $booking->payment_method ?? '',
            'discount' => (int) ($booking->meta['manual_discount'] ?? 0), 'agent_id' => $booking->agent_id ? (string) $booking->agent_id : '', 'notes' => $booking->meta['notes'] ?? '',
            'admin_note' => $booking->meta['admin_note'] ?? '', 'wheelchair' => (bool) ($booking->meta['wheelchair'] ?? false), 'hold_expires_at' => $booking->hold_expires_at?->format('Y-m-d\TH:i') ?? '',
            'travellers' => $booking->travellers->map(fn ($bt) => self::travellerForm($bt))->values(),
        ]]);

    }

    public function update(Request $request, Booking $booking)
    {
        // Legacy quick-update (status/discount/note) from older screens.
        if (! $request->has('room_type')) {
            $d = $request->validate(['status' => ['required', Rule::in(array_keys(Booking::STATUSES))], 'discount' => 'nullable|integer|min:0', 'note' => 'nullable|string|max:500']);
            if (isset($d['discount'])) $this->svc->applyManualDiscount($booking, (int) $d['discount'] - ((int) $booking->discount - (int) ($booking->meta['manual_discount'] ?? 0)));
            $this->svc->changeStatus($booking, $d['status'], $d['note'] ?? null);
            if (! empty($d['note'])) $booking->update(['meta' => array_merge($booking->meta ?? [], ['admin_note' => $d['note']])]);

            return back()->with('ok', __('Booking updated.'));
        }
        $d = $request->validate([
            'room_type' => ['required', Rule::in(array_keys(PackagePrice::ROOM_TYPES))], 'children' => 'nullable|integer|min:0|max:20',
            'payment_mode' => ['required', Rule::in(array_keys(Booking::MODES))], 'payment_method' => ['nullable', Rule::in(array_keys(Payment::METHODS))],
            'discount' => 'nullable|integer|min:0', 'agent_id' => 'nullable|exists:agents,id', 'notes' => 'nullable|string|max:2000', 'admin_note' => 'nullable|string|max:2000',
            'wheelchair' => 'nullable|boolean', 'hold_expires_at' => 'nullable|date',
            'travellers' => 'nullable|array', 'travellers.*.id' => 'required|integer', 'remove' => 'nullable|array', 'remove.*' => 'integer',
            'new_travellers' => 'nullable|array|max:20', 'travellers.*.ticket_no' => 'nullable|string|max:30', 'travellers.*.seat' => 'nullable|string|max:10', 'travellers.*.govt_tracking_no' => 'nullable|string|max:40',
        ] + self::travellerRules() + self::travellerRules('new_travellers.*.'));
        if (! $booking->package?->prices()->where('room_type', $d['room_type'])->exists()) {
            return back()->withErrors(['room_type' => __('This package has no price for that room type.')])->withInput();
        }
        $before = $booking->only('room_type', 'adults', 'children', 'total', 'agent_id', 'payment_mode');
        DB::transaction(function () use ($booking, $d) {
            $pax0 = $booking->adults + $booking->children;
            foreach ($d['travellers'] ?? [] as $row) {
                $bt = $booking->travellers()->with('traveller.passport')->find($row['id']);
                if (! $bt) continue;
                $this->saveTraveller($bt->traveller, $row);
                $bt->update(['ticket_no' => $row['ticket_no'] ?? $bt->ticket_no, 'seat' => $row['seat'] ?? $bt->seat, 'govt_tracking_no' => $row['govt_tracking_no'] ?? $bt->govt_tracking_no]);
            }
            $remove = collect($d['remove'] ?? [])->all();
            if ($remove && $booking->travellers()->whereNotIn('id', $remove)->count() + count($d['new_travellers'] ?? []) < 1) {
                abort(back()->withErrors(['remove' => __('A booking needs at least one pilgrim.')]));
            }
            foreach ($booking->travellers()->whereIn('id', $remove)->with('traveller')->get() as $bt) {
                $booking->log('edit', 'Pilgrim removed: '.$bt->traveller->full_name); $bt->delete();
            }
            foreach ($d['new_travellers'] ?? [] as $row) {
                if (empty($row['full_name'])) continue;
                $tr = $booking->customer->travellers()->create(['full_name' => strtoupper($row['full_name']), 'gender' => $row['gender']]);
                $this->saveTraveller($tr, $row);
                $bt = $booking->travellers()->create(['traveller_id' => $tr->id, 'room_type' => $d['room_type']]);
                if (in_array($booking->type, ['hajj', 'umrah'], true)) foreach (['passport', 'photo', 'nid', 'vaccine'] as $doc) $bt->documents()->create(['type' => $doc]);
                $booking->log('edit', 'Pilgrim added: '.$tr->full_name);
            }
            $meta = $booking->meta ?? [];
            $meta['notes'] = $d['notes'] ?? null; $meta['admin_note'] = $d['admin_note'] ?? ($meta['admin_note'] ?? null); $meta['wheelchair'] = ! empty($d['wheelchair']);
            $meta['manual_discount'] = (int) ($d['discount'] ?? 0);
            $booking->update(['room_type' => $d['room_type'], 'children' => (int) ($d['children'] ?? 0), 'payment_mode' => $d['payment_mode'], 'payment_method' => $d['payment_method'] ?? $booking->payment_method,
                'agent_id' => $d['agent_id'] ?? null, 'meta' => $meta, 'hold_expires_at' => $d['payment_mode'] === 'pay_later' ? ($d['hold_expires_at'] ?? $booking->hold_expires_at) : null]);
            $this->svc->reprice($booking->fresh());
            $booking->refresh();
            $delta = ($booking->adults + $booking->children) - $pax0;
            if ($delta && $booking->status !== 'cancelled') $delta > 0 ? $booking->package?->increment('seats_sold', $delta) : $booking->package?->decrement('seats_sold', min(-$delta, $booking->package->seats_sold));
        });
        $booking->refresh();
        $booking->log('edit', 'Booking details updated', ['before' => $before, 'after' => $booking->only(array_keys($before))]);
        AuditLog::record('booking.update', $booking, $before, $booking->only(array_keys($before)));

        return redirect()->route('admin.bookings.show', $booking)->with('ok', __('Booking updated.'));
    }

    private function saveTraveller(Traveller $tr, array $row): void
    {
        $tr->update(array_filter(['full_name' => isset($row['full_name']) ? strtoupper($row['full_name']) : null, 'gender' => $row['gender'] ?? null, 'dob' => $row['dob'] ?? null, 'phone' => $row['phone'] ?? null,
            'relation' => $row['relation'] ?? null, 'blood_group' => $row['blood_group'] ?? null, 'medical_notes' => $row['medical_notes'] ?? null, 'nid_enc' => $row['nid'] ?? null], fn ($v) => $v !== null && $v !== '')
            + ['needs_wheelchair' => ! empty($row['needs_wheelchair'])]);
        if (! empty($row['passport_no'])) {
            $tr->passport()->updateOrCreate([], ['number_enc' => strtoupper($row['passport_no']), 'issue_date' => $row['passport_issue'] ?? null, 'expiry_date' => $row['passport_expiry'] ?? null, 'issue_place' => $row['passport_place'] ?? null]);
        }
    }

    public function destroy(Request $request, Booking $booking)
    {
        $request->validate(['reason' => 'nullable|string|max:255', 'confirm' => 'accepted']);
        $this->svc->delete($booking, $request->reason);

        return redirect()->route('admin.bookings.index')->with('ok', __('Booking :ref moved to trash.', ['ref' => $booking->ref]));
    }

    public function restore(Booking $booking)
    {
        abort_unless($booking->trashed(), 404);
        $this->svc->restore($booking);

        return redirect()->route('admin.bookings.show', $booking)->with('ok', __('Booking :ref restored.', ['ref' => $booking->ref]));
    }

    public function status(Request $request, Booking $booking)
    {
        $d = $request->validate(['status' => ['required', Rule::in(array_keys(Booking::STATUSES))], 'note' => 'nullable|string|max:500']);
        $this->svc->changeStatus($booking, $d['status'], $d['note'] ?? null);

        return back()->with('ok', __('Status changed to :s.', ['s' => __(Booking::STATUSES[$d['status']])]));
    }

    public function note(Request $request, Booking $booking)
    {
        $d = $request->validate(['message' => 'required|string|max:1000']);
        $booking->log('note', $d['message']);

        return back()->with('ok', __('Note added.'));
    }

    public function assignAgent(Request $request, Booking $booking)
    {
        $d = $request->validate(['agent_id' => 'nullable|exists:agents,id']);
        $old = $booking->agent?->code;
        $booking->update(['agent_id' => $d['agent_id'] ?? null]);
        $this->svc->syncCommission($booking);
        $booking->log('edit', 'Agent changed: '.($old ?? '—').' → '.($booking->fresh()->agent?->code ?? '—'));
        AuditLog::record('booking.agent', $booking, ['agent' => $old], ['agent_id' => $d['agent_id'] ?? null]);

        return back()->with('ok', __('Agent assignment saved.'));
    }

    public function payment(Request $request, Booking $booking)
    {
        $d = $request->validate([
            'amount' => 'required|integer|min:1', 'method' => ['required', Rule::in(array_keys(Payment::METHODS))], 'txn' => 'nullable|string|max:60|unique:payments,gateway_txn_id',
            'installment_id' => ['nullable', Rule::exists('installments', 'id')->where('booking_id', $booking->id)], 'paid_at' => 'nullable|date|before_or_equal:now',
            'note' => 'nullable|string|max:255', 'slip' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);
        if ($request->hasFile('slip')) $d['slip_path'] = $request->file('slip')->store('slips');
        $this->svc->recordPayment($booking, $d);

        return back()->with('ok', __('Payment of :a recorded.', ['a' => money($d['amount'])]));
    }

    public function refund(Request $request, Payment $payment)
    {
        $d = $request->validate(['amount' => 'required|integer|min:1', 'reason' => 'required|string|max:255', 'method' => ['nullable', Rule::in(array_keys(Payment::METHODS))]]);
        $this->svc->refund($payment, (int) $d['amount'], $d['reason'], $d['method'] ?? null);

        return back()->with('ok', __('Refund of :a recorded.', ['a' => money($d['amount'])]));
    }

    public function schedule(Request $request, Booking $booking)
    {
        $d = $request->validate(['count' => 'required|integer|min:1|max:24', 'first_due' => 'required|date', 'last_due' => 'required|date|after_or_equal:first_due', 'deposit' => 'nullable|integer|min:0']);
        if ($booking->due() <= 0) return back()->withErrors(['count' => __('Nothing left to schedule – booking is fully paid.')]);
        $this->svc->generateSchedule($booking, (int) $d['count'], $d['first_due'], $d['last_due'], isset($d['deposit']) ? (int) $d['deposit'] : null);

        return back()->with('ok', __('Installment schedule generated.'));
    }

    public function documentUpload(Request $request, Document $document)
    {
        $request->validate(['file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $this->svc->uploadDocument($document, $request->file('file'));

        return back()->with('ok', __('Document uploaded.'));
    }

    public function documentReview(Request $request, Document $document)
    {
        $d = $request->validate(['status' => 'required|in:verified,rejected,pending', 'note' => 'nullable|required_if:status,rejected|string|max:255']);
        if ($d['status'] === 'verified' && ! $document->path) return back()->withErrors(['status' => __('Upload the file before verifying it.')]);
        $this->svc->reviewDocument($document, $d['status'], $d['note'] ?? null);

        return back()->with('ok', __('Document marked :s.', ['s' => __($d['status'])]));
    }

    public function documentFile(Document $document)
    {
        abort_unless($document->path && Storage::exists($document->path), 404);

        return Storage::response($document->path);
    }

    public function visa(Request $request, BookingTraveller $bt)
    {
        $d = $request->validate(['status' => ['required', Rule::in(array_keys(self::VISA_STATUSES))], 'visa_no' => 'nullable|string|max:40', 'provider_ref' => 'nullable|string|max:40']);
        $this->svc->updateVisa($bt, $d);

        return back()->with('ok', __('Visa status updated.'));
    }

    public function invoice(Booking $booking)
    {
        return view('admin.bookings.print', ['b' => $booking->load('customer.user', 'package', 'items', 'travellers.traveller.passport', 'installments', 'payments.refunds', 'agent'), 'kind' => 'invoice']);
    }

    public function voucher(Booking $booking)
    {
        return view('admin.bookings.print', ['b' => $booking->load('customer.user', 'package.hotels', 'package.flights', 'travellers.traveller.passport', 'travellers.visa'), 'kind' => 'voucher']);
    }

    public function verifyPayment(Request $request, Payment $payment, PaymentService $svc)
    {
        $request->validate(['action' => 'required|in:approve,reject']);
        $request->action === 'approve' ? $svc->markPaid($payment, $payment->gateway_txn_id ?? 'MAN-'.$payment->id, ['verified' => true], $request->user()->id) : $svc->markFailed($payment, ['rejected_by' => $request->user()->id]);
        if ($request->action === 'reject') $payment->booking->log('payment', 'Payment #'.$payment->id.' rejected');
        AuditLog::record('payment.'.$request->action, $payment);

        return back()->with('ok', $request->action === 'approve' ? __('Payment verified.') : __('Payment rejected.'));
    }

    /** Push a visa application to Nusuk through the VisaProvider adapter (stub by default). */
    public function submitVisa(Request $request, VisaApplication $visa, VisaProvider $provider)
    {
        $res = $provider->submit(['ref' => $visa->ref, 'name' => $visa->applicant_name, 'type' => $visa->visa_type]);
        $hist = $visa->status_history ?? []; $hist[] = ['status' => $res['status'], 'at' => now()->toDateString()];
        $visa->update(['provider_ref' => $res['provider_ref'], 'status' => $res['status'], 'status_history' => $hist]);
        $visa->bookingTraveller?->booking?->log('visa', "Visa {$visa->ref} submitted to Nusuk – {$res['provider_ref']}");
        AuditLog::record('visa.submit', $visa, null, $res);

        return back()->with('ok', __('Submitted to Nusuk – reference :r.', ['r' => $res['provider_ref']]));
    }
}
