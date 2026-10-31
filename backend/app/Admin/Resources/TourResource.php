<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Category;
use App\Models\Tour;
use Illuminate\Database\Eloquent\Model;

class TourResource extends Resource
{
    public string $model = Tour::class;

    public string $slug = 'tours';

    public array $label = ['en' => 'Holiday packages', 'bn' => 'হলিডে প্যাকেজ'];

    public array $singular = ['en' => 'Holiday package', 'bn' => 'হলিডে প্যাকেজ'];

    public string $group = 'catalog';

    public string $icon = 'palmtree';

    public string $perm = 'catalog';

    public array $with = ['image.media', 'destination'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('title', 'Package', 'প্যাকেজ')->sortable(),
            Col::make('destination', 'Destination', 'গন্তব্য')->value(fn ($m) => $m->destination?->tr('name'))->hideMobile(),
            Col::make('days', 'Days', 'দিন')->value(fn ($m) => $m->days.'D / '.$m->nights.'N')->hideMobile(),
            Col::money('price_from', 'From', 'শুরু')->sortable(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges())->sortable(),
            Col::bool('is_featured', 'Featured', 'ফিচার্ড')->hideMobile(),
            Col::datetime('updated_at', 'Updated', 'আপডেট')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::status(),
            Filter::select('destination_id', 'Destination', 'গন্তব্য', C::destinations()),
            Filter::select('region', 'Region', 'অঞ্চল', C::regions()),
            Filter::bool('is_featured', 'Featured', 'ফিচার্ড'),
        ];
    }

    public function sections(): array
    {
        $meals = ['breakfast' => ['en' => 'Breakfast', 'bn' => 'নাশতা'], 'lunch' => ['en' => 'Lunch', 'bn' => 'দুপুরের খাবার'], 'dinner' => ['en' => 'Dinner', 'bn' => 'রাতের খাবার']];

        return [
            ['title' => ['en' => 'Package', 'bn' => 'প্যাকেজ'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::slug('slug', 'title')->half(),
                Field::select('destination_id', 'Destination', 'গন্তব্য', C::destinations())->required()->half(),
                Field::select('region', 'Region', 'অঞ্চল', C::regions())->required()->third()->default('bd'),
                Field::tr('location', 'Location line', 'লোকেশন')->span(8),
                Field::tr('country_name', 'Country', 'দেশ')->half(),
                Field::tr('badge', 'Badge (e.g. Bestseller)', 'ব্যাজ (যেমন সর্বাধিক বিক্রিত)')->half(),
                Field::trtext('summary', 'Short summary', 'সংক্ষিপ্ত বিবরণ')->required(),
                Field::trhtml('description', 'Full description', 'পূর্ণ বিবরণ'),
                Field::multi('categories', 'Trip styles (categories)', 'ভ্রমণের ধরন (ক্যাটাগরি)', self::opts(Category::class, 'name')),
            ]],
            ['title' => ['en' => 'Trip facts', 'bn' => 'ভ্রমণের তথ্য'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::number('days', 'Days', 'দিন')->required()->rule('integer')->rule('min:1')->quarter(),
                Field::number('nights', 'Nights', 'রাত')->required()->rule('integer')->rule('min:0')->quarter(),
                Field::text('group_size', 'Group size', 'দলের আকার')->quarter(),
                Field::number('booked_this_week', 'Booked this week', 'এই সপ্তাহে বুকিং')->rule('integer')->quarter(),
                Field::switch('includes_flight', 'Includes flights', 'ফ্লাইট সহ')->third(),
                Field::switch('includes_visa', 'Includes visa', 'ভিসা সহ')->third(),
                Field::select('cancellation_policy_id', 'Cancellation policy', 'বাতিল নীতি', C::policies())->third(),
                Field::number('rating', 'Rating (shown)', 'রেটিং')->rule('between:0,5')->quarter(),
                Field::number('reviews_count', 'Reviews count', 'রিভিউ সংখ্যা')->rule('integer')->quarter(),
            ]],
            ['title' => ['en' => 'Highlights & inclusions', 'bn' => 'হাইলাইট ও অন্তর্ভুক্তি'], 'tab' => C::T_CONTENT, 'fields' => [
                Field::trlist('highlights', 'Highlights', 'হাইলাইট'),
                Field::trlist('route_stops', 'Route stops', 'রুটের স্টপ'),
                Field::trlist('inclusions', 'Included', 'অন্তর্ভুক্ত')->half(),
                Field::trlist('exclusions', 'Not included', 'অন্তর্ভুক্ত নয়')->half(),
            ]],
            ['title' => ['en' => 'Day-by-day itinerary', 'bn' => 'দিনভিত্তিক ভ্রমণসূচি'], 'tab' => ['en' => 'Itinerary', 'bn' => 'ভ্রমণসূচি'], 'fields' => [
                Field::children('itinerary', 'Days', 'দিন', [
                    Field::tr('title', 'Title', 'শিরোনাম')->required(),
                    Field::trtext('body', 'What happens', 'বিবরণ'),
                    Field::checks('meals', 'Meals', 'খাবার', $meals)->half(),
                    Field::tr('stay', 'Overnight', 'রাত্রিযাপন')->half(),
                ], 'day_no')->meta(['itemLabel' => 'Day', 'numbered' => true]),
            ]],
            ['title' => ['en' => 'Price', 'bn' => 'মূল্য'], 'tab' => C::T_PRICING, 'fields' => [
                Field::money('price_from', 'Price from (per person, BDT)', 'শুরু মূল্য (জনপ্রতি, টাকা)')->required()->half(),
                Field::money('price_was', 'Was (strike-through)', 'আগের মূল্য')->half(),
                Field::children('priceTiers', 'Room / traveller prices', 'রুম / ভ্রমণকারী মূল্য', [
                    Field::select('code', 'Type', 'ধরন', ['twin' => 'Twin sharing', 'triple' => 'Triple sharing', 'single' => 'Single room'])->required()->third(),
                    Field::tr('label', 'Label', 'লেবেল')->span(5),
                    Field::money('price', 'Fixed price', 'নির্দিষ্ট মূল্য')->quarter(),
                    Field::number('factor', 'Factor', 'গুণক')->span(12)->help('Multiplier on the base price when no fixed price is set.', 'নির্দিষ্ট মূল্য না থাকলে মূল মূল্যের গুণক।'),
                ], 'sort'),
                Field::children('departures', 'Departures', 'যাত্রার তারিখ', [
                    Field::date('date', 'Departs', 'যাত্রা')->required()->quarter(),
                    Field::date('return_date', 'Returns', 'ফেরা')->quarter(),
                    Field::money('price', 'Price (empty = from price)', 'মূল্য')->quarter(),
                    Field::select('status', 'Status', 'অবস্থা', ['open' => 'Open', 'guaranteed' => 'Guaranteed', 'closed' => 'Closed', 'cancelled' => 'Cancelled'])->required()->default('open')->quarter(),
                    Field::number('seats_total', 'Seats', 'আসন')->required()->rule('integer')->rule('min:0')->default(20)->quarter(),
                    Field::number('seats_held', 'Booked / held', 'বুকড / হোল্ড')->readonly()->quarter()->default(0),
                ])->meta(['compact' => true]),
                Field::children('addons', 'Optional add-ons', 'ঐচ্ছিক অ্যাড-অন', [
                    Field::text('code', 'Code', 'কোড')->required()->quarter(),
                    Field::tr('label', 'Label', 'লেবেল')->required()->span(5),
                    Field::money('price', 'Price', 'মূল্য')->required()->quarter(),
                    Field::select('per', 'Charged per', 'হিসাব', ['person' => 'Person', 'booking' => 'Booking'])->required()->default('person')->quarter(),
                    Field::switch('is_active', 'Active', 'সক্রিয়')->default(true)->quarter(),
                ]),
            ]],
            C::media(),
            C::seo(),
            C::publish(),
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/tours/'.$m->slug);
    }
}
