<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\Airport;
use App\Models\Country;

class AirportResource extends Resource
{
    public string $model = Airport::class;

    public string $slug = 'airports';

    public array $label = ['en' => 'Airports', 'bn' => 'এয়ারপোর্ট'];

    public array $singular = ['en' => 'Airport', 'bn' => 'এয়ারপোর্ট'];

    public string $icon = 'plane-landing';

    public string $perm = 'catalog';

    public array $search = ['iata', 'name', 'city'];

    public string $defaultSort = 'iata';

    public function columns(): array
    {
        return [Col::make('iata', 'Code', 'কোড')->sortable(), Col::tr('city', 'City', 'শহর')->sortable(), Col::tr('name', 'Airport', 'এয়ারপোর্ট')->hideMobile(), Col::bool('is_popular', 'Popular', 'জনপ্রিয়')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Airport', 'bn' => 'এয়ারপোর্ট'], 'fields' => [
            Field::text('iata', 'IATA code', 'আয়াটা কোড')->required()->rule('size:3')->rule('alpha')->quarter()->meta(['unique' => true]),
            Field::select('country_id', 'Country', 'দেশ', self::opts(Country::class))->span(9),
            Field::tr('city', 'City', 'শহর')->required(),
            Field::tr('name', 'Airport name', 'এয়ারপোর্টের নাম')->required(),
            Field::switch('is_popular', 'Show in popular airports', 'জনপ্রিয় তালিকায় দেখান'),
        ]]];
    }

    public function beforeSave($m, array $data, bool $creating): void
    {
        $m->iata = strtoupper((string) $m->iata);
    }
}
