<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class StaffResource extends Resource
{
    public string $model = User::class;

    public string $slug = 'staff';

    public array $label = ['en' => 'Staff accounts', 'bn' => 'স্টাফ অ্যাকাউন্ট'];

    public array $singular = ['en' => 'Staff member', 'bn' => 'স্টাফ সদস্য'];

    public string $icon = 'user-cog';

    public string $perm = 'staff';

    public array $abilities = ['view' => 'staff.manage', 'manage' => 'staff.manage', 'delete' => 'staff.manage'];

    public array $with = ['roles'];

    public array $search = ['name', 'email', 'phone', 'title'];

    public const STAFF_ROLES = ['owner', 'manager', 'agent', 'visa', 'support', 'finance', 'editor'];

    public function query(): Builder
    {
        return User::query()->with($this->with)->where('type', 'staff');
    }

    public static function roleOptions(): array
    {
        $labels = ['owner' => 'Owner (everything)', 'manager' => 'Manager', 'agent' => 'Reservations agent', 'visa' => 'Visa officer', 'support' => 'Customer support', 'finance' => 'Finance & accounts', 'editor' => 'Content editor'];

        return Role::where('guard_name', 'web')->whereNotIn('name', ['traveller', 'b2b_agent'])->orderBy('id')->pluck('name')
            ->mapWithKeys(fn ($n) => [$n => $labels[$n] ?? ucfirst(str_replace('_', ' ', $n))])->all();
    }

    public function columns(): array
    {
        return [
            Col::make('name', 'Name', 'নাম')->sortable(),
            Col::make('email', 'Email', 'ইমেইল')->hideMobile(),
            Col::make('role', 'Role', 'ভূমিকা')->value(fn ($m) => $m->roles->pluck('name')->implode(', ')),
            Col::make('title', 'Title', 'পদবি')->hideMobile(),
            Col::datetime('last_login_at', 'Last sign-in', 'শেষ সাইন-ইন')->sortable()->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', ['active' => ['Active', 'সক্রিয়', 'green'], 'suspended' => ['Suspended', 'স্থগিত', 'red']]),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('role', 'Role', 'ভূমিকা', self::roleOptions())->apply(fn ($q, $v) => $q->role($v))];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Staff member', 'bn' => 'স্টাফ সদস্য'], 'fields' => [
                Field::text('name', 'Full name', 'পূর্ণ নাম')->required()->half(),
                Field::email('email', 'Work email (sign-in)', 'অফিস ইমেইল (সাইন-ইন)')->required()->half(),
                Field::text('phone', 'Mobile', 'মোবাইল')->half(),
                Field::text('title', 'Job title', 'পদবি')->half(),
                Field::text('branch', 'Branch', 'শাখা')->half(),
                Field::select('locale', 'Admin language', 'অ্যাডমিনের ভাষা', ['en' => 'English', 'bn' => 'বাংলা'])->default('en')->half(),
                Field::select('role', 'Role', 'ভূমিকা', self::roleOptions())->required()
                    ->help('Roles decide what this person can see and change (Roles & permissions).', 'ভূমিকা অনুযায়ী তিনি কী দেখবেন ও বদলাবেন তা ঠিক হয়।')
                    ->get(fn ($m) => $m?->exists ? $m->roles->first()?->name : null)
                    ->set(fn () => null)
                    ->after(function ($m, $v) {
                        if ($v && $m->id === auth()->id() && ! in_array($v, $m->getRoleNames()->all(), true)) {
                            Action::fail(app()->getLocale() === 'bn' ? 'নিজের ভূমিকা বদলানো যাবে না।' : 'You cannot change your own role.');
                        }
                        if ($v) {
                            $m->syncRoles([$v]);
                        }
                    }),
                Field::select('status', 'Status', 'অবস্থা', ['active' => 'Active', 'suspended' => 'Suspended (cannot sign in)'])->required()->default('active')->half(),
            ]],
            ['title' => ['en' => 'Password', 'bn' => 'পাসওয়ার্ড'], 'aside' => true, 'fields' => [
                Field::password('password', 'Password', 'পাসওয়ার্ড')->required()->rule('min:10')->help('At least 10 characters. Leave empty to keep the current one.', 'কমপক্ষে ১০ অক্ষর। বর্তমানটি রাখতে খালি রাখুন।'),
            ]],
        ];
    }

    public function rules(?Model $m): array
    {
        $r = parent::rules($m);
        $r['email'] = ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($m?->id)];
        $r['phone'] = ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($m?->id)];

        return $r;
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        if ($creating) {
            $m->forceFill(['type' => 'staff', 'code' => 'ST-'.random_int(1000, 9999), 'initials' => collect(explode(' ', $m->name))->map(fn ($w) => mb_substr($w, 0, 1))->take(2)->implode('')]);
            $m->email_verified_at = now();
        }
        if ($m->id === auth()->id() && $m->status !== 'active') {
            Action::fail(app()->getLocale() === 'bn' ? 'নিজের অ্যাকাউন্ট স্থগিত করা যাবে না।' : 'You cannot suspend your own account.');
        }
    }

    public function afterSave(Model $m, array $data, bool $creating): void
    {
        if ($m->status === 'suspended') {
            \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $m->id)->delete();
            $m->tokens()->delete();
        }
    }

    public function canDelete(Model $m): bool
    {
        return $m->id !== auth()->id() && ! ($m->hasRole('owner') && User::role('owner')->count() <= 1);
    }

    public function detail(Model $m): ?array
    {
        $logins = \App\Models\LoginActivity::where('user_id', $m->id)->latest()->limit(5)->get();

        return [
            ['label' => tr_pick(['en' => 'Permissions', 'bn' => 'অনুমতি']), 'value' => (string) $m->getAllPermissions()->count()],
            ['label' => tr_pick(['en' => 'Recent sign-ins', 'bn' => 'সাম্প্রতিক সাইন-ইন']), 'type' => 'list', 'value' => $logins->map(fn ($l) => ['text' => $l->created_at->timezone(config('app.timezone'))->format('Y-m-d H:i').' · '.$l->ip.' · '.($l->success ?? true ? 'ok' : 'failed')])->all()],
        ];
    }
}
