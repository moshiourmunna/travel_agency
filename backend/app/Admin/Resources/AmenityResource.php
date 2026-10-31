<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\Amenity;

class AmenityResource extends Resource
{
    public string $model = Amenity::class;

    public string $slug = 'amenities';

    public array $label = ['en' => 'Hotel amenities', 'bn' => 'হোটেলের সুবিধা'];

    public array $singular = ['en' => 'Amenity', 'bn' => 'সুবিধা'];

    public string $icon = 'wifi';

    public string $perm = 'catalog';

    public string $defaultSort = 'id';

    public array $search = ['code'];

    public function columns(): array
    {
        return [Col::tr('name', 'Amenity', 'সুবিধা')->sortable(), Col::make('code', 'Code', 'কোড'), Col::make('icon', 'Icon', 'আইকন', 'icon')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Amenity', 'bn' => 'সুবিধা'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->half()->meta(['unique' => true]),
            Field::icon('icon')->half(),
        ]]];
    }
}
