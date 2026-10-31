<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\Airline;

class AirlineResource extends Resource
{
    public string $model = Airline::class;

    public string $slug = 'airlines';

    public array $label = ['en' => 'Airlines', 'bn' => 'এয়ারলাইন'];

    public array $singular = ['en' => 'Airline', 'bn' => 'এয়ারলাইন'];

    public string $icon = 'plane-takeoff';

    public string $perm = 'catalog';

    public array $search = ['name', 'code'];

    public array $with = ['logo.media'];

    public function columns(): array
    {
        return [Col::image('logo'), Col::make('code', 'Code', 'কোড')->sortable(), Col::make('name', 'Airline', 'এয়ারলাইন')->sortable(), Col::make('color', 'Colour', 'রং', 'color'), Col::bool('is_active', 'Active', 'সক্রিয়')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Airline', 'bn' => 'এয়ারলাইন'], 'fields' => [
            Field::text('code', 'IATA code', 'আয়াটা কোড')->required()->rule('max:3')->quarter()->meta(['unique' => true]),
            Field::text('name', 'Name', 'নাম')->required()->span(6),
            Field::color('color', 'Brand colour', 'ব্র্যান্ড রং')->quarter(),
            Field::image('logo_id', 'Logo', 'লোগো'),
            Field::switch('is_active', 'Active', 'সক্রিয়')->default(true),
        ]]];
    }
}
