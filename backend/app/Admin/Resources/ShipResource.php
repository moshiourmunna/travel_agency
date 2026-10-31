<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\CruiseLine;
use App\Models\Ship;
use Illuminate\Database\Eloquent\Model;

class ShipResource extends Resource
{
    public string $model = Ship::class;

    public string $slug = 'ships';

    public array $label = ['en' => 'Ships', 'bn' => 'জাহাজ'];

    public array $singular = ['en' => 'Ship', 'bn' => 'জাহাজ'];

    public string $icon = 'sailboat';

    public string $perm = 'catalog';

    public array $with = ['line'];

    public array $search = ['name'];

    public function columns(): array
    {
        return [Col::make('name', 'Ship', 'জাহাজ')->sortable(), Col::make('line', 'Cruise line', 'ক্রুজ লাইন')->value(fn ($m) => $m->line?->name)];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Ship', 'bn' => 'জাহাজ'], 'fields' => [
            Field::text('name', 'Name', 'নাম')->required()->half(), Field::slug('slug', 'name')->half(),
            Field::select('cruise_line_id', 'Cruise line', 'ক্রুজ লাইন', self::opts(CruiseLine::class))->required(),
            Field::repeater('facts', 'Ship facts', 'জাহাজের তথ্য', [Field::tr('label', 'Label', 'লেবেল')->half(), Field::tr('value', 'Value', 'মান')->half()]),
        ]]];
    }

    public function canDelete(Model $m): bool
    {
        return ! $m->cruises()->exists();
    }
}
