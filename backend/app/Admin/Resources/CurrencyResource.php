<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Currency;

class CurrencyResource extends Resource
{
    public string $model = Currency::class;

    public string $slug = 'currencies';

    public array $label = ['en' => 'Currencies & rates', 'bn' => 'মুদ্রা ও বিনিময় হার'];

    public array $singular = ['en' => 'Currency', 'bn' => 'মুদ্রা'];

    public string $icon = 'coins';

    public string $perm = 'settings';

    public array $abilities = ['view' => 'settings.manage'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::make('code', 'Code', 'কোড'),
            Col::make('symbol', 'Symbol', 'চিহ্ন'),
            Col::number('rate_to_bdt', '1 unit = BDT', '১ একক = টাকা'),
            Col::bool('is_active', 'Active', 'সক্রিয়'),
            Col::datetime('updated_at', 'Updated', 'আপডেট'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Currency', 'bn' => 'মুদ্রা'], 'fields' => [
            Field::text('code', 'Code', 'কোড')->required()->rule('size:3')->third()->meta(['unique' => true]),
            Field::text('symbol', 'Symbol', 'চিহ্ন')->required()->third(),
            Field::number('rate_to_bdt', 'Rate (1 unit in BDT)', 'হার (১ একক = টাকা)')->required()->rule('gt:0')->third()->help('Display only — all payments settle in BDT.', 'শুধু দেখানোর জন্য — সব পেমেন্ট টাকায় হয়।'),
            Field::switch('is_active', 'Offered in the currency switcher', 'মুদ্রা বাছাইয়ে দেখাবে')->default(true)->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function canDelete($m): bool
    {
        return $m->code !== 'BDT';
    }
}
