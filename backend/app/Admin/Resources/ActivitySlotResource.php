<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Activity;
use App\Models\ActivitySlot;
use Illuminate\Database\Eloquent\Model;

class ActivitySlotResource extends Resource
{
    public string $model = ActivitySlot::class;

    public string $slug = 'activity-slots';

    public array $label = ['en' => 'Activity time slots', 'bn' => 'অ্যাক্টিভিটি টাইম স্লট'];

    public array $singular = ['en' => 'Time slot', 'bn' => 'টাইম স্লট'];

    public string $icon = 'calendar-clock';

    public string $perm = 'catalog';

    public array $with = ['activity'];

    public string $defaultSort = 'starts_at';

    public int $perPage = 50;

    public function columns(): array
    {
        return [
            Col::make('activity', 'Activity', 'অ্যাক্টিভিটি')->value(fn ($m) => $m->activity?->tr('title')),
            Col::datetime('starts_at', 'Starts', 'শুরু')->sortable(),
            Col::number('capacity', 'Capacity', 'আসন'),
            Col::number('booked', 'Booked', 'বুকড')->sortable(),
            Col::money('price', 'Price override', 'আলাদা মূল্য')->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('activity_id', 'Activity', 'অ্যাক্টিভিটি', self::opts(Activity::class, 'title')),
            Filter::select('when', 'When', 'কখন', ['upcoming' => ['en' => 'Upcoming', 'bn' => 'আসন্ন'], 'past' => ['en' => 'Past', 'bn' => 'অতীত']])
                ->apply(fn ($q, $v) => $v === 'past' ? $q->where('starts_at', '<', now()) : $q->where('starts_at', '>=', now())),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Time slot', 'bn' => 'টাইম স্লট'], 'fields' => [
            Field::select('activity_id', 'Activity', 'অ্যাক্টিভিটি', self::opts(Activity::class, 'title'))->required(),
            Field::datetime('starts_at', 'Starts at', 'শুরুর সময়')->required()->half(),
            Field::number('capacity', 'Capacity', 'আসন')->required()->rule('integer')->rule('min:0')->quarter(),
            Field::number('booked', 'Booked', 'বুকড')->readonly()->quarter(),
            Field::money('price', 'Price override (empty = activity price)', 'আলাদা মূল্য (খালি = অ্যাক্টিভিটির মূল্য)'),
        ]]];
    }

    public function canDelete(Model $m): bool
    {
        return (int) $m->booked === 0;
    }
}
