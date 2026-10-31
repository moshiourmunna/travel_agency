<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Http\Controllers\Api\V1\MeController;
use App\Models\Booking;
use App\Models\LoyaltyTier;
use App\Models\MilesTransaction;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CustomerResource extends Resource
{
    public string $model = User::class;

    public string $slug = 'customers';

    public array $label = ['en' => 'Customers', 'bn' => 'গ্রাহক'];

    public array $singular = ['en' => 'Customer', 'bn' => 'গ্রাহক'];

    public string $icon = 'users';

    public string $perm = 'customers';

    public array $with = ['tier'];

    public array $search = ['name', 'email', 'phone', 'code', 'city'];

    public function query(): Builder
    {
        return User::query()->with($this->with)->where('type', 'customer');
    }

    public function columns(): array
    {
        return [
            Col::make('code', 'ID', 'আইডি')->sortable(),
            Col::make('name', 'Customer', 'গ্রাহক')->sortable(),
            Col::make('contact', 'Contact', 'যোগাযোগ')->value(fn ($m) => trim($m->email.' · '.$m->phone, ' ·'))->hideMobile(),
            Col::make('tier', 'Tier', 'টিয়ার')->value(fn ($m) => $m->tier?->tr('name'))->hideMobile(),
            Col::number('miles', 'Miles', 'মাইলস')->sortable()->hideMobile(),
            Col::money('wallet_balance', 'Wallet', 'ওয়ালেট')->sortable()->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', ['active' => ['Active', 'সক্রিয়', 'green'], 'suspended' => ['Suspended', 'স্থগিত', 'red'], 'inactive' => ['Inactive', 'নিষ্ক্রিয়', 'gray'], 'vip' => ['VIP', 'ভিআইপি', 'gold']]),
            Col::datetime('created_at', 'Joined', 'যোগদান')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('tier_id', 'Tier', 'টিয়ার', self::opts(LoyaltyTier::class)),
            Filter::select('status', 'Status', 'অবস্থা', ['active' => 'Active', 'suspended' => 'Suspended', 'inactive' => 'Inactive', 'vip' => 'VIP']),
        ];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Profile', 'bn' => 'প্রোফাইল'], 'fields' => [
                Field::text('name', 'Full name', 'পূর্ণ নাম')->required()->half(),
                Field::text('code', 'Customer ID', 'গ্রাহক আইডি')->readonly()->half(),
                Field::email('email', 'Email', 'ইমেইল')->required()->half()->meta(['unique' => true]),
                Field::text('phone', 'Mobile', 'মোবাইল')->half()->meta(['unique' => true]),
                Field::text('city', 'City', 'শহর')->third(),
                Field::select('gender', 'Gender', 'লিঙ্গ', ['female' => 'Female', 'male' => 'Male', 'other' => 'Other'])->third(),
                Field::date('dob', 'Date of birth', 'জন্মতারিখ')->third(),
                Field::text('segment', 'Segment', 'সেগমেন্ট')->third(),
                Field::select('locale', 'Language', 'ভাষা', ['en' => 'English', 'bn' => 'বাংলা'])->third(),
                Field::select('tier_id', 'Loyalty tier', 'লয়্যালটি টিয়ার', self::opts(LoyaltyTier::class))->third(),
                Field::select('status', 'Account status', 'অ্যাকাউন্টের অবস্থা', ['active' => 'Active', 'vip' => 'VIP', 'inactive' => 'Inactive', 'suspended' => 'Suspended'])->required()->default('active')
                    ->help('Suspended customers cannot sign in.', 'স্থগিত গ্রাহক সাইন ইন করতে পারবেন না।'),
            ]],
            ['title' => ['en' => 'Password', 'bn' => 'পাসওয়ার্ড'], 'aside' => true, 'fields' => [
                Field::password('password', 'Set a new password', 'নতুন পাসওয়ার্ড দিন')->required()->help('Leave empty to keep the current one.', 'বর্তমানটি রাখতে খালি রাখুন।'),
            ]],
        ];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        if ($creating) {
            $m->forceFill(['type' => 'customer', 'code' => 'CU-'.random_int(20000, 99999), 'referral_code' => Str::upper(Str::before($m->name, ' ')).random_int(100, 999)]);
            if (! $m->password) {
                $m->password = Str::password(16);
            }
        }
    }

    public function afterSave(Model $m, array $data, bool $creating): void
    {
        if ($creating) {
            $m->syncRoles(['traveller']);
        }
        if ($m->status === 'suspended') {
            $m->tokens()->delete(); // sign out everywhere
        }
    }

    public function rules(?Model $m): array
    {
        $r = parent::rules($m);
        $r['phone'] = ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($m?->id)];
        $r['email'] = ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($m?->id)];

        return $r;
    }

    public function detail(Model $m): ?array
    {
        $bookings = Booking::where('user_id', $m->id)->latest()->limit(8)->get();
        $spend = (float) Booking::where('user_id', $m->id)->whereNotIn('status', ['cancelled', 'refunded'])->sum('paid');
        $tickets = SupportTicket::where('user_id', $m->id)->latest()->limit(5)->get();

        return [
            ['label' => tr_pick(['en' => 'Lifetime spend', 'bn' => 'মোট খরচ']), 'value' => $spend, 'type' => 'money'],
            ['label' => tr_pick(['en' => 'Wallet balance', 'bn' => 'ওয়ালেট ব্যালান্স']), 'value' => (float) $m->wallet_balance, 'type' => 'money'],
            ['label' => tr_pick(['en' => 'Miles', 'bn' => 'মাইলস']), 'value' => number_format((int) $m->miles)],
            ['label' => tr_pick(['en' => 'Referral code', 'bn' => 'রেফারেল কোড']), 'value' => $m->referral_code],
            ['label' => tr_pick(['en' => 'Last sign-in', 'bn' => 'শেষ সাইন-ইন']), 'value' => $m->last_login_at?->timezone(config('app.timezone'))->format('Y-m-d H:i') ?? '—'],
            ['label' => tr_pick(['en' => 'Recent bookings', 'bn' => 'সাম্প্রতিক বুকিং']), 'type' => 'list', 'value' => $bookings->map(fn ($b) => ['text' => $b->ref.' · '.$b->tr('title').' · ৳'.number_format((float) $b->total), 'href' => route('admin.bookings.show', $b->id, false), 'badge' => $b->status])->all()],
            ['label' => tr_pick(['en' => 'Support tickets', 'bn' => 'সাপোর্ট টিকিট']), 'type' => 'list', 'value' => $tickets->map(fn ($t) => ['text' => $t->ref.' · '.$t->tr('subject'), 'href' => route('admin.tickets.show', $t->id, false), 'badge' => $t->status])->all()],
        ];
    }

    public function canDelete(Model $m): bool
    {
        return ! Booking::where('user_id', $m->id)->exists();
    }

    public function actions(): array
    {
        return [
            Action::make('wallet', 'Adjust wallet', 'ওয়ালেট সমন্বয়')->permission('customers.adjust')->icon('wallet')
                ->fields([
                    Field::money('amount', 'Amount (BDT, use minus to deduct)', 'পরিমাণ (টাকা, কাটতে মাইনাস দিন)')->required()->rule('not_in:0')->rule('between:-500000,500000')->meta(['allowNegative' => true]),
                    Field::text('reason', 'Reason (shown to the customer)', 'কারণ (গ্রাহক দেখবেন)')->required()->rule('max:160'),
                ])
                ->handle(function ($m, $d) {
                    $amount = (float) $d['amount'];
                    if ((float) $m->wallet_balance + $amount < 0) {
                        \App\Admin\Action::fail('The wallet cannot go below zero.');
                    }
                    MeController::credit($m, $amount, ['en' => $d['reason'], 'bn' => $d['reason']], $amount >= 0 ? 'plus' : 'minus');

                    return app()->getLocale() === 'bn' ? 'ওয়ালেট আপডেট হয়েছে।' : 'Wallet updated.';
                }),
            Action::make('miles', 'Adjust Miles', 'মাইলস সমন্বয়')->permission('customers.adjust')->icon('award')
                ->fields([
                    Field::number('miles', 'Miles (use minus to deduct)', 'মাইলস (কাটতে মাইনাস দিন)')->required()->rule('integer')->rule('not_in:0')->rule('between:-1000000,1000000')->meta(['allowNegative' => true]),
                    Field::text('reason', 'Reason (shown to the customer)', 'কারণ (গ্রাহক দেখবেন)')->required()->rule('max:160'),
                ])
                ->handle(function ($m, $d) {
                    $miles = (int) $d['miles'];
                    if ((int) $m->miles + $miles < 0) {
                        \App\Admin\Action::fail('Miles cannot go below zero.');
                    }
                    MilesTransaction::create(['user_id' => $m->id, 'miles' => $miles, 'description' => ['en' => $d['reason'], 'bn' => $d['reason']], 'created_by' => auth()->id()]);
                    User::whereKey($m->id)->increment('miles', $miles);

                    return app()->getLocale() === 'bn' ? 'মাইলস আপডেট হয়েছে।' : 'Miles updated.';
                }),
        ];
    }
}
