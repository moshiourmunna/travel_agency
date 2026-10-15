<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Payment;
use App\Support\Csv;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    private function filtered(Request $r)
    {
        $q = Customer::with('user', 'agent')->withCount('bookings', 'travellers')->latest('id');
        if ($r->query('trashed') === 'only') $q->onlyTrashed();
        if ($s = trim((string) $r->query('q'))) {
            $q->where(fn ($w) => $w->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"))->orWhere('district', 'like', "%{$s}%"));
        }
        if ($v = $r->query('agent_id')) $q->where('agent_id', $v);
        if ($v = $r->query('district')) $q->where('district', $v);

        return $q;
    }

    public function index(Request $request)
    {
        return view('admin.customers.index', ['customers' => $this->filtered($request)->paginate(20)->withQueryString(), 'agents' => Agent::orderBy('code')->get(),
            'districts' => Customer::whereNotNull('district')->distinct()->orderBy('district')->pluck('district'), 'trashedCount' => Customer::onlyTrashed()->count()]);
    }

    public function export(Request $request)
    {
        $rows = $this->filtered($request)->get()->map(fn ($c) => [$c->id, $c->user?->name, $c->user?->phone, $c->user?->email, $c->gender, $c->dob?->toDateString(), $c->district, $c->address, $c->agent?->code, $c->bookings_count, $c->travellers_count, $c->created_at->toDateString()]);
        AuditLog::record('customer.export', 'customers', null, ['rows' => $rows->count()]);

        return Csv::download('customers-'.now()->format('Ymd').'.csv', ['ID', 'Name', 'Phone', 'Email', 'Gender', 'DOB', 'District', 'Address', 'Agent', 'Bookings', 'Pilgrims', 'Since'], $rows);
    }

    private function rules(?Customer $c = null): array
    {
        $uid = $c?->user_id;

        return [
            'name' => 'required|string|max:120', 'phone' => ['required', 'regex:/^(\+?88)?01[3-9]\d{8}$/', Rule::unique('users', 'phone')->ignore($uid)],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($uid)], 'password' => 'nullable|string|min:8',
            'gender' => 'nullable|in:male,female', 'dob' => 'nullable|date|before:today', 'nid' => 'nullable|digits_between:10,17',
            'address' => 'nullable|string|max:255', 'district' => 'nullable|string|max:60', 'emergency_contact' => 'nullable|string|max:120',
            'agent_id' => 'nullable|exists:agents,id', 'locale' => 'nullable|in:en,bn,ar', 'status' => 'nullable|in:active,blocked',
        ];
    }

    public function create()
    {
        return view('admin.customers.form', ['c' => null, 'agents' => Agent::orderBy('code')->get()]);
    }

    public function store(Request $request)
    {
        $d = $request->validate($this->rules());
        $c = DB::transaction(function () use ($d) {
            $u = \App\Models\User::create(['name' => $d['name'], 'phone' => $d['phone'], 'email' => $d['email'] ?? null, 'password' => $d['password'] ?? Str::random(16), 'role' => 'customer', 'locale' => $d['locale'] ?? 'bn', 'status' => $d['status'] ?? 'active']);

            return $u->customer()->create($this->profile($d));
        });
        AuditLog::record('customer.create', $c, null, ['name' => $d['name']]);

        return redirect()->route('admin.customers.show', $c)->with('ok', __('Customer created.'));
    }

    private function profile(array $d): array
    {
        return ['gender' => $d['gender'] ?? null, 'dob' => $d['dob'] ?? null, 'address' => $d['address'] ?? null, 'district' => $d['district'] ?? null,
            'emergency_contact' => $d['emergency_contact'] ?? null, 'agent_id' => $d['agent_id'] ?? null] + (! empty($d['nid']) ? ['nid_enc' => $d['nid']] : []);
    }

    public function show(Customer $customer)
    {
        $customer->load('user', 'agent', 'travellers.passport', 'bookings.package');

        return view('admin.customers.show', ['c' => $customer, 'payments' => Payment::whereIn('booking_id', $customer->bookings()->withTrashed()->pluck('id'))->with('booking')->latest('id')->get()]);
    }

    public function edit(Customer $customer)
    {
        return view('admin.customers.form', ['c' => $customer->load('user'), 'agents' => Agent::orderBy('code')->get()]);
    }

    public function update(Request $request, Customer $customer)
    {
        $d = $request->validate($this->rules($customer));
        $before = ['name' => $customer->user->name, 'phone' => $customer->user->phone, 'district' => $customer->district];
        $customer->user->update(array_filter(['name' => $d['name'], 'phone' => $d['phone'], 'email' => $d['email'] ?? null, 'locale' => $d['locale'] ?? null, 'status' => $d['status'] ?? null, 'password' => $d['password'] ?? null], fn ($v) => $v !== null) + ['email' => $d['email'] ?? null]);
        $customer->update($this->profile($d));
        AuditLog::record('customer.update', $customer, $before, ['name' => $d['name'], 'phone' => $d['phone'], 'district' => $d['district'] ?? null]);

        return redirect()->route('admin.customers.show', $customer)->with('ok', __('Customer updated.'));
    }

    public function destroy(Request $request, Customer $customer)
    {
        $request->validate(['confirm' => 'accepted']);
        if ($customer->bookings()->whereNotIn('status', ['cancelled', 'completed'])->exists()) {
            return back()->withErrors(['confirm' => __('This customer has active bookings. Cancel or complete them first.')]);
        }
        $customer->delete(); $customer->user?->update(['status' => 'blocked']);
        AuditLog::record('customer.delete', $customer);

        return redirect()->route('admin.customers.index')->with('ok', __('Customer moved to trash.'));
    }

    public function restore(Customer $customer)
    {
        $customer->restore(); $customer->user?->update(['status' => 'active']);
        AuditLog::record('customer.restore', $customer);

        return redirect()->route('admin.customers.show', $customer)->with('ok', __('Customer restored.'));
    }
}
