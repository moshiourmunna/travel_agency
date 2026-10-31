<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\PlannerCost;

class PlannerCostResource extends Resource
{
    public string $model = PlannerCost::class;

    public string $slug = 'planner-costs';

    public array $label = ['en' => 'Trip planner costs', 'bn' => 'ট্রিপ প্ল্যানার খরচ'];

    public array $singular = ['en' => 'Planner cost', 'bn' => 'প্ল্যানার খরচ'];

    public string $icon = 'calculator';

    public string $perm = 'catalog';

    public array $with = ['destination'];

    public function columns(): array
    {
        return [
            Col::make('destination', 'Destination', 'গন্তব্য')->value(fn ($m) => $m->destination?->tr('name')),
            Col::money('cost_per_day_standard', 'Standard / day', 'স্ট্যান্ডার্ড / দিন'),
            Col::money('cost_per_day_premium', 'Premium / day', 'প্রিমিয়াম / দিন'),
            Col::money('flight_estimate', 'Flight estimate', 'ফ্লাইট আনুমানিক'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Costs used by the trip planner', 'bn' => 'ট্রিপ প্ল্যানারের খরচ'], 'fields' => [
            Field::select('destination_id', 'Destination', 'গন্তব্য', C::destinations())->required(),
            Field::money('cost_per_day_standard', 'Standard per person / day', 'স্ট্যান্ডার্ড জনপ্রতি / দিন')->required()->third(),
            Field::money('cost_per_day_premium', 'Premium per person / day', 'প্রিমিয়াম জনপ্রতি / দিন')->required()->third(),
            Field::money('flight_estimate', 'Return flight per person', 'ফ্লাইট জনপ্রতি (আসা-যাওয়া)')->required()->third(),
        ]]];
    }

    public function rules($m): array
    {
        $r = parent::rules($m);
        $r['destination_id'] = ['required', \Illuminate\Validation\Rule::unique('planner_costs', 'destination_id')->ignore($m?->id)];

        return $r;
    }
}
