<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\InsurancePlan;

class InsurancePlanResource extends Resource
{
    public string $model = InsurancePlan::class;

    public string $slug = 'insurance-plans';

    public array $label = ['en' => 'Travel insurance plans', 'bn' => 'ভ্রমণ বিমা প্ল্যান'];

    public array $singular = ['en' => 'Insurance plan', 'bn' => 'বিমা প্ল্যান'];

    public string $icon = 'umbrella';

    public string $perm = 'catalog';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [Col::tr('name', 'Plan', 'প্ল্যান'), Col::make('medical_cover', 'Medical cover', 'চিকিৎসা কভার'), Col::money('price', 'Price', 'মূল্য')->sortable(), Col::bool('is_popular', 'Popular', 'জনপ্রিয়'), Col::bool('is_active', 'Active', 'সক্রিয়')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Plan', 'bn' => 'প্ল্যান'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->third()->meta(['unique' => true]),
            Field::text('medical_cover', 'Medical cover', 'চিকিৎসা কভার')->third(),
            Field::money('price', 'Price (BDT)', 'মূল্য (টাকা)')->required()->third(),
            Field::tr('price_note', 'Price note (e.g. 7 days)', 'মূল্যের নোট (যেমন ৭ দিন)'),
            Field::trlist('coverage', 'What is covered', 'যা কভার করে'),
            Field::switch('is_popular', 'Mark as most popular', 'সবচেয়ে জনপ্রিয় হিসেবে দেখান')->third(),
            Field::switch('is_active', 'Active', 'সক্রিয়')->default(true)->third(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->third(),
        ]]];
    }
}
