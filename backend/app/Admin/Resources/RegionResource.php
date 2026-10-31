<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\Region;

class RegionResource extends Resource
{
    public string $model = Region::class;

    public string $slug = 'regions';

    public array $label = ['en' => 'Regions', 'bn' => 'অঞ্চল'];

    public array $singular = ['en' => 'Region', 'bn' => 'অঞ্চল'];

    public string $icon = 'globe';

    public string $perm = 'catalog';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [Col::tr('name', 'Region', 'অঞ্চল'), Col::make('code', 'Code', 'কোড')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Region', 'bn' => 'অঞ্চল'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->half()->meta(['unique' => true])->help('Used by tours, cruises and filters (e.g. bd, intl).', 'ট্যুর, ক্রুজ ও ফিল্টারে ব্যবহৃত (যেমন bd, intl)।'),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function canDelete($m): bool
    {
        return ! \App\Models\Country::where('region_id', $m->id)->exists() && ! \App\Models\Tour::where('region', $m->code)->exists();
    }
}
