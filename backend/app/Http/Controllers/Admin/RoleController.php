<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Staff roles and the permission matrix. */
class RoleController extends Controller
{
    /** Roles used by the website itself (customers, B2B agents): never shown or edited here. */
    public const SYSTEM = ['traveller', 'b2b_agent'];

    public const PERM_LABELS = [
        'admin.access' => ['Sign in to the admin', 'অ্যাডমিনে সাইন ইন'],
        'bookings.view' => ['View bookings', 'বুকিং দেখা'], 'bookings.create' => ['Create bookings', 'বুকিং তৈরি'], 'bookings.update' => ['Update bookings', 'বুকিং হালনাগাদ'], 'bookings.cancel' => ['Cancel bookings', 'বুকিং বাতিল'],
        'leads.view' => ['View enquiries & leads', 'জিজ্ঞাসা ও লিড দেখা'], 'leads.manage' => ['Manage enquiries & leads', 'জিজ্ঞাসা ও লিড পরিচালনা'], 'tickets.view' => ['View support tickets', 'সাপোর্ট টিকিট দেখা'], 'tickets.manage' => ['Answer support tickets', 'সাপোর্ট টিকিটের উত্তর'],
        'payments.view' => ['View payments', 'পেমেন্ট দেখা'], 'payments.record' => ['Record offline payments', 'অফলাইন পেমেন্ট রেকর্ড'], 'payments.refund' => ['Issue refunds', 'রিফান্ড প্রদান'], 'payments.reconcile' => ['Verify bank transfers', 'ব্যাংক ট্রান্সফার যাচাই'],
        'catalog.view' => ['View catalog', 'ক্যাটালগ দেখা'], 'catalog.manage' => ['Edit catalog', 'ক্যাটালগ সম্পাদনা'], 'catalog.publish' => ['Publish catalog items', 'ক্যাটালগ প্রকাশ'], 'catalog.delete' => ['Delete catalog items', 'ক্যাটালগ মোছা'],
        'visa.view' => ['View visa files', 'ভিসা ফাইল দেখা'], 'visa.manage' => ['Update visa files', 'ভিসা ফাইল হালনাগাদ'], 'visa.documents' => ['Check visa documents', 'ভিসা ডকুমেন্ট যাচাই'],
        'customers.view' => ['View customers', 'গ্রাহক দেখা'], 'customers.manage' => ['Edit customers', 'গ্রাহক সম্পাদনা'], 'customers.export' => ['Export customer data', 'গ্রাহকের তথ্য এক্সপোর্ট'], 'customers.adjust' => ['Adjust wallet & Miles', 'ওয়ালেট ও মাইলস সমন্বয়'],
        'agents.view' => ['View B2B agents', 'বিটুবি এজেন্ট দেখা'], 'agents.manage' => ['Manage B2B agents', 'বিটুবি এজেন্ট পরিচালনা'],
        'content.view' => ['View content', 'কনটেন্ট দেখা'], 'content.manage' => ['Edit content', 'কনটেন্ট সম্পাদনা'], 'media.manage' => ['Upload & manage media', 'মিডিয়া আপলোড ও পরিচালনা'], 'reviews.moderate' => ['Moderate reviews', 'রিভিউ মডারেশন'],
        'seo.manage' => ['SEO & redirects', 'এসইও ও রিডাইরেক্ট'], 'menus.manage' => ['Edit menus', 'মেনু সম্পাদনা'], 'translations.manage' => ['Edit UI translations', 'ইউআই অনুবাদ সম্পাদনা'],
        'coupons.view' => ['View coupons', 'কুপন দেখা'], 'coupons.manage' => ['Manage coupons & gift cards', 'কুপন ও গিফট কার্ড পরিচালনা'], 'offers.manage' => ['Manage deals & offers', 'ডিল ও অফার পরিচালনা'],
        'reports.view' => ['View reports', 'রিপোর্ট দেখা'], 'reports.export' => ['Export reports', 'রিপোর্ট এক্সপোর্ট'], 'dashboard.finance' => ['See revenue figures', 'আয়ের হিসাব দেখা'],
        'staff.manage' => ['Manage staff accounts', 'স্টাফ অ্যাকাউন্ট পরিচালনা'], 'roles.manage' => ['Edit roles & permissions', 'রোল ও অনুমতি সম্পাদনা'], 'settings.manage' => ['Edit settings', 'সেটিংস সম্পাদনা'],
        'settings.payments' => ['Edit payment settings', 'পেমেন্ট সেটিংস সম্পাদনা'], 'notifications.manage' => ['Edit email & SMS templates', 'ইমেইল ও এসএমএস টেমপ্লেট'], 'logs.view' => ['View the activity log', 'কার্যকলাপ লগ দেখা'],
    ];

    private function guard(Request $r): void
    {
        abort_unless($r->user()->can('roles.manage'), 403);
    }

    public function index(Request $r): Response
    {
        $this->guard($r);
        $roles = Role::with('permissions')->withCount('users')->whereNotIn('name', self::SYSTEM)->orderBy('id')->get();

        return Inertia::render('Roles', [
            'roles' => $roles->map(fn ($role) => [
                'id' => $role->id, 'name' => $role->name, 'label' => tr_pick(Permissions::ROLES[$role->name]['label'] ?? ['en' => ucfirst(str_replace('_', ' ', $role->name)), 'bn' => $role->name]),
                'users' => $role->users_count, 'permissions' => $role->permissions->pluck('name')->values(), 'locked' => $role->name === 'owner', 'builtin' => isset(Permissions::ROLES[$role->name]),
            ]),
            'groups' => collect(Permissions::GROUPS)->map(fn ($g, $k) => ['key' => $k, 'label' => tr_pick($g['label']), 'perms' => collect($g['perms'])->map(fn ($p) => ['name' => $p, 'label' => tr_pick(['en' => self::PERM_LABELS[$p][0] ?? $p, 'bn' => self::PERM_LABELS[$p][1] ?? $p])])->values()])->values(),
        ]);
    }

    public function store(Request $r): RedirectResponse
    {
        $this->guard($r);
        $d = $r->validate([
            'name' => ['required', 'string', 'max:40', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('roles', 'name')->where('guard_name', 'web')],
            'copy' => ['nullable', 'integer', 'exists:roles,id'],
        ]);
        $role = Role::create(['name' => $d['name'], 'guard_name' => 'web']);
        $perms = ! empty($d['copy']) ? Role::findById((int) $d['copy'], 'web')->permissions->pluck('name')->all() : ['admin.access'];
        $role->syncPermissions(array_values(array_diff($perms, ['roles.manage'])));
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        activity('admin')->causedBy($r->user())->performedOn($role)->event('created')->withProperties(['resource' => 'roles', 'title' => $role->name])->log('created');

        return back()->with('success', __('admin.created', ['name' => $role->name]));
    }

    public function update(Request $r, Role $role): RedirectResponse
    {
        $this->guard($r);
        abort_if(in_array($role->name, self::SYSTEM, true), 404);
        if ($role->name === 'owner') {
            return back()->with('error', app()->getLocale() === 'bn' ? 'মালিক রোল সবসময় সব অনুমতি রাখে।' : 'The owner role always keeps every permission.');
        }
        $d = $r->validate(['permissions' => ['present', 'array'], 'permissions.*' => [Rule::in(Permissions::all())]]);
        $perms = array_values(array_unique(array_merge(['admin.access'], $d['permissions'])));
        if ($r->user()->hasRole($role->name) && ! in_array('roles.manage', $perms, true)) {
            return back()->with('error', app()->getLocale() === 'bn' ? 'নিজের রোল থেকে "রোল সম্পাদনা" অনুমতি সরানো যাবে না।' : 'You cannot remove “Edit roles” from your own role.');
        }
        $old = $role->permissions->pluck('name')->sort()->values()->all();
        DB::transaction(fn () => $role->syncPermissions($perms));
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        sort($perms);
        activity('admin')->causedBy($r->user())->performedOn($role)->event('updated')
            ->withProperties(['resource' => 'roles', 'title' => $role->name, 'old' => ['permissions' => array_values(array_diff($old, $perms))], 'attributes' => ['permissions' => array_values(array_diff($perms, $old))]])->log('updated');
        \Illuminate\Support\Facades\Cache::forget('admin.badges');

        return back()->with('success', __('admin.saved', ['name' => $role->name]));
    }

    public function destroy(Request $r, Role $role): RedirectResponse
    {
        $this->guard($r);
        if (isset(Permissions::ROLES[$role->name]) || in_array($role->name, self::SYSTEM, true) || $role->users()->exists()) {
            return back()->with('error', __('admin.cannot_delete'));
        }
        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        activity('admin')->causedBy($r->user())->event('deleted')->withProperties(['resource' => 'roles', 'title' => $role->name])->log('deleted');

        return back()->with('success', __('admin.deleted', ['name' => $role->name]));
    }
}
