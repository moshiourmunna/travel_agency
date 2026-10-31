<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Activity;
use App\Models\ActivitySlot;
use App\Support\Settings;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class ActivityResource extends Resource
{
    public string $model = Activity::class;

    public string $slug = 'activities';

    public array $label = ['en' => 'Activities', 'bn' => 'অ্যাক্টিভিটি'];

    public array $singular = ['en' => 'Activity', 'bn' => 'অ্যাক্টিভিটি'];

    public string $icon = 'ticket';

    public string $perm = 'catalog';

    public array $with = ['image.media', 'destination'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public static function categories(): array
    {
        $out = [];
        foreach ((array) Settings::get('catalog.activity_categories', []) as $c) {
            $out[$c['key']] = $c['label'] ?? $c['key'];
        }

        return $out ?: ['tour' => 'Day tours', 'water' => 'Water', 'adventure' => 'Adventure', 'tickets' => 'Tickets', 'food' => 'Food', 'transfer' => 'Transfers'];
    }

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('title', 'Activity', 'অ্যাক্টিভিটি')->sortable(),
            Col::make('destination', 'Destination', 'গন্তব্য')->value(fn ($m) => $m->destination?->tr('name'))->hideMobile(),
            Col::make('category', 'Category', 'ক্যাটাগরি')->value(fn ($m) => tr_pick(self::categories()[$m->category] ?? $m->category))->hideMobile(),
            Col::money('price', 'Price', 'মূল্য')->sortable(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
        ];
    }

    public function filters(): array
    {
        return [Filter::status(), Filter::select('category', 'Category', 'ক্যাটাগরি', self::categories()), Filter::select('destination_id', 'Destination', 'গন্তব্য', C::destinations())];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Activity', 'bn' => 'অ্যাক্টিভিটি'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::slug('slug', 'title')->half(),
                Field::select('destination_id', 'Destination', 'গন্তব্য', C::destinations())->half(),
                Field::select('category', 'Category', 'ক্যাটাগরি', self::categories())->required()->third(),
                Field::select('region', 'Region', 'অঞ্চল', C::regions())->required()->third()->default('bd'),
                Field::tr('city', 'City', 'শহর')->third(),
                Field::tr('duration_text', 'Duration (shown)', 'সময়কাল')->half(),
                Field::number('duration_min', 'Duration (minutes)', 'সময়কাল (মিনিট)')->rule('integer')->half(),
                Field::tr('meeting_point', 'Meeting point', 'মিলনস্থল'),
                Field::checks('languages', 'Guide languages', 'গাইডের ভাষা', ['en' => 'English', 'bn' => 'বাংলা', 'hi' => 'Hindi', 'ar' => 'Arabic', 'zh' => 'Chinese'])->half(),
                Field::tr('badge', 'Badge', 'ব্যাজ')->half(),
                Field::switch('pickup', 'Hotel pickup', 'হোটেল থেকে পিকআপ')->third(),
                Field::switch('instant_confirm', 'Instant confirmation', 'তাৎক্ষণিক নিশ্চিতকরণ')->third(),
                Field::select('cancellation_policy_id', 'Cancellation policy', 'বাতিল নীতি', C::policies())->third(),
                Field::trhtml('description', 'Description', 'বিবরণ'),
                Field::trlist('highlights', 'Highlights', 'হাইলাইট')->half(),
                Field::trlist('inclusions', 'Included', 'অন্তর্ভুক্ত')->half(),
            ]],
            ['title' => ['en' => 'Price & options', 'bn' => 'মূল্য ও অপশন'], 'tab' => C::T_PRICING, 'fields' => [
                Field::money('price', 'Price (adult)', 'মূল্য (প্রাপ্তবয়স্ক)')->required()->third(),
                Field::money('price_was', 'Was', 'আগের মূল্য')->third(),
                Field::number('rating', 'Rating', 'রেটিং')->rule('between:0,5')->third(),
                Field::children('options', 'Options', 'অপশন', [
                    Field::tr('name', 'Option', 'অপশন')->required()->half(),
                    Field::money('price', 'Adult price', 'প্রাপ্তবয়স্ক মূল্য')->required()->quarter(),
                    Field::money('child_price', 'Child price', 'শিশু মূল্য')->quarter(),
                    Field::trtext('description', 'Description', 'বিবরণ'),
                ], 'sort'),
            ]],
            C::media(),
            C::seo(),
            C::publish(),
        ];
    }

    public function actions(): array
    {
        return [
            Action::make('slots', 'Generate time slots', 'টাইম স্লট তৈরি')->permission('catalog.manage')->icon('calendar-plus')
                ->fields([
                    Field::date('from', 'From', 'থেকে')->required()->half(),
                    Field::date('to', 'To', 'পর্যন্ত')->required()->half(),
                    Field::list('times', 'Start times (HH:MM)', 'শুরুর সময় (ঘণ্টা:মিনিট)')->default(['09:00', '14:00'])->help('One slot is created for each day and time; existing slots are kept.', 'প্রতিদিন প্রতিটি সময়ের জন্য একটি স্লট তৈরি হবে; আগের স্লট থাকবে।'),
                    Field::number('capacity', 'Capacity per slot', 'প্রতি স্লটে আসন')->required()->rule('integer')->rule('min:1')->default(20)->half(),
                    Field::money('price', 'Price override (optional)', 'আলাদা মূল্য (ঐচ্ছিক)')->half(),
                ])
                ->handle(function (Model $m, array $d) {
                    $from = Carbon::parse($d['from'])->startOfDay();
                    $to = Carbon::parse($d['to'])->startOfDay();
                    if ($to->lt($from) || $from->diffInDays($to) > 366) {
                        \App\Admin\Action::fail('Choose a range of up to one year.');
                    }
                    $n = 0;
                    for ($day = $from->copy(); $day->lte($to); $day->addDay()) {
                        foreach ((array) ($d['times'] ?? []) as $t) {
                            if (! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $t)) {
                                continue;
                            }
                            $at = Carbon::parse($day->format('Y-m-d').' '.$t, config('app.timezone'));
                            $slot = ActivitySlot::firstOrCreate(['activity_id' => $m->id, 'starts_at' => $at], ['capacity' => (int) $d['capacity'], 'booked' => 0, 'price' => $d['price'] ?? null]);
                            $n += $slot->wasRecentlyCreated ? 1 : 0;
                        }
                    }

                    return app()->getLocale() === 'bn' ? "{$n}টি নতুন স্লট তৈরি হয়েছে।" : "{$n} new slots created.";
                }),
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/activities/'.$m->slug);
    }
}
