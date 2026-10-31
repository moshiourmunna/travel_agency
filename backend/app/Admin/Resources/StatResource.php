<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Stat;

class StatResource extends Resource
{
    public string $model = Stat::class;

    public string $slug = 'stats';

    public array $label = ['en' => 'Stats (numbers)', 'bn' => 'পরিসংখ্যান'];

    public array $singular = ['en' => 'Stat', 'bn' => 'পরিসংখ্যান'];

    public string $icon = 'bar-chart-3';

    public string $perm = 'content';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::make('value', 'Number', 'সংখ্যা')->value(fn ($m) => number_format((int) $m->value).$m->suffix),
            Col::tr('label', 'Label', 'লেবেল'),
            Col::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Stat', 'bn' => 'পরিসংখ্যান'], 'fields' => [
            Field::number('value', 'Number', 'সংখ্যা')->required()->rule('integer')->third(),
            Field::text('suffix', 'Suffix (e.g. +, %)', 'প্রত্যয়')->third(),
            Field::icon('icon')->third(),
            Field::tr('label', 'Label', 'লেবেল')->required(),
            Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true)->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }
}
