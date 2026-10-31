<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\Country;
use App\Models\Region;

class CountryResource extends Resource
{
    public string $model = Country::class;

    public string $slug = 'countries';

    public array $label = ['en' => 'Countries', 'bn' => 'দেশ'];

    public array $singular = ['en' => 'Country', 'bn' => 'দেশ'];

    public string $icon = 'flag';

    public string $perm = 'catalog';

    public array $search = ['iso2', 'name'];

    public string $defaultSort = 'iso2';

    public function columns(): array
    {
        return [Col::make('flag', '', ''), Col::tr('name', 'Country', 'দেশ')->sortable(), Col::make('iso2', 'Code', 'কোড')->sortable(), Col::make('currency', 'Currency', 'মুদ্রা')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Country', 'bn' => 'দেশ'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('iso2', 'ISO code (2 letters)', 'আইএসও কোড')->required()->rule('size:2')->rule('alpha')->quarter()->meta(['unique' => true]),
            Field::text('flag', 'Flag emoji', 'পতাকা')->quarter(),
            Field::text('currency', 'Currency', 'মুদ্রা')->quarter(),
            Field::text('dial_code', 'Dial code', 'ডায়াল কোড')->quarter(),
            Field::select('region_id', 'Region', 'অঞ্চল', self::opts(Region::class)),
            Field::trtext('visa_note', 'Visa note', 'ভিসা নোট'),
        ]]];
    }

    public function beforeSave($m, array $data, bool $creating): void
    {
        $m->iso2 = strtoupper((string) $m->iso2);
    }
}
