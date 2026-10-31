<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class CouponResource extends Resource
{
    public string $model = Coupon::class;

    public string $slug = 'coupons';

    public array $label = ['en' => 'Coupons', 'bn' => 'কুপন'];

    public array $singular = ['en' => 'Coupon', 'bn' => 'কুপন'];

    public string $icon = 'badge-percent';

    public string $perm = 'coupons';

    public array $search = ['code', 'name'];

    public const STATUS = ['active' => ['Active', 'সক্রিয়', 'green'], 'scheduled' => ['Scheduled', 'নির্ধারিত', 'blue'], 'paused' => ['Paused', 'স্থগিত', 'gray'], 'expired' => ['Expired', 'মেয়াদোত্তীর্ণ', 'red']];

    public function columns(): array
    {
        return [
            Col::make('code', 'Code', 'কোড')->sortable(),
            Col::tr('name', 'Name', 'নাম')->hideMobile(),
            Col::make('value', 'Discount', 'ছাড়')->value(fn ($m) => $m->type === 'percent' ? rtrim(rtrim((string) $m->value, '0'), '.').'%' : '৳'.number_format((float) $m->value)),
            Col::make('used', 'Used', 'ব্যবহৃত')->value(fn ($m) => $m->used.($m->max_uses ? ' / '.$m->max_uses : ''))->sortable('used'),
            Col::datetime('valid_to', 'Valid until', 'মেয়াদ')->sortable()->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))];
    }

    public function sections(): array
    {
        $kinds = BookingResource::KINDS;

        return [
            ['title' => ['en' => 'Coupon', 'bn' => 'কুপন'], 'fields' => [
                Field::text('code', 'Code', 'কোড')->required()->rule('regex:/^[A-Za-z0-9_-]+$/')->rule('max:32')->third()->help('Travellers type this at checkout (not case-sensitive).', 'চেকআউটে ভ্রমণকারী এটি লিখবেন।'),
                Field::tr('name', 'Internal name', 'অভ্যন্তরীণ নাম')->span(8),
                Field::select('type', 'Discount type', 'ছাড়ের ধরন', ['percent' => 'Percentage', 'fixed' => 'Fixed amount (BDT)'])->required()->default('percent')->third(),
                Field::number('value', 'Value', 'মান')->required()->rule('min:0')->third(),
                Field::money('max_discount', 'Max discount (BDT)', 'সর্বোচ্চ ছাড় (টাকা)')->third(),
                Field::money('min_spend', 'Minimum spend', 'ন্যূনতম খরচ')->third(),
                Field::number('max_uses', 'Total uses allowed', 'মোট ব্যবহারের সীমা')->rule('integer')->rule('min:1')->third(),
                Field::number('max_uses_per_user', 'Uses per traveller', 'জনপ্রতি ব্যবহারের সীমা')->rule('integer')->rule('min:1')->third(),
                Field::datetime('valid_from', 'Valid from', 'শুরু')->half(),
                Field::datetime('valid_to', 'Valid until', 'শেষ')->half()->rule('after_or_equal:valid_from'),
                Field::checks('scope_kinds', 'Only for (empty = everything)', 'শুধু যেগুলোর জন্য (খালি = সব)', $kinds)
                    ->get(fn ($m) => $m?->exists ? array_values((array) ($m->scope['kinds'] ?? [])) : [])
                    ->set(function ($m, $v) {
                        $s = (array) ($m->scope ?? []);
                        $v = array_values(array_filter((array) $v));
                        if ($v) {
                            $s['kinds'] = $v;
                        } else {
                            unset($s['kinds']);
                        }
                        $m->scope = $s ?: null;
                    }),
                Field::switch('scope_first', 'First booking only', 'শুধু প্রথম বুকিংয়ে')
                    ->get(fn ($m) => (bool) ($m?->exists ? ($m->scope['first_booking'] ?? false) : false))
                    ->set(function ($m, $v) {
                        $s = (array) ($m->scope ?? []);
                        if ($v) {
                            $s['first_booking'] = true;
                        } else {
                            unset($s['first_booking']);
                        }
                        $m->scope = $s ?: null;
                    }),
                Field::number('used', 'Times used', 'ব্যবহৃত')->readonly()->half(),
                Field::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))->required()->default('active')->half(),
            ]],
        ];
    }

    public function rules(?Model $m): array
    {
        $r = parent::rules($m);
        $r['code'][] = Rule::unique('coupons', 'code')->ignore($m?->id);
        if (request('type') === 'percent') {
            $r['value'][] = 'max:100';
        }

        return $r;
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        $m->code = strtoupper((string) $m->code);
    }
}
