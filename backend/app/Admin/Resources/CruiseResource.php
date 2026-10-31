<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Cruise;
use App\Models\Ship;
use Illuminate\Database\Eloquent\Model;

class CruiseResource extends Resource
{
    public string $model = Cruise::class;

    public string $slug = 'cruises';

    public array $label = ['en' => 'Cruises', 'bn' => 'ক্রুজ'];

    public array $singular = ['en' => 'Cruise', 'bn' => 'ক্রুজ'];

    public string $icon = 'ship';

    public string $perm = 'catalog';

    public array $with = ['image.media', 'ship'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('title', 'Cruise', 'ক্রুজ')->sortable(),
            Col::make('ship', 'Ship', 'জাহাজ')->value(fn ($m) => $m->ship?->name)->hideMobile(),
            Col::number('nights', 'Nights', 'রাত')->sortable()->hideMobile(),
            Col::money('price_from', 'From', 'শুরু')->sortable(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
            Col::bool('is_featured', 'Featured', 'ফিচার্ড')->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::status(), Filter::select('region', 'Region', 'অঞ্চল', C::regions()), Filter::select('ship_id', 'Ship', 'জাহাজ', self::opts(Ship::class))];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Cruise', 'bn' => 'ক্রুজ'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::slug('slug', 'title')->half(),
                Field::select('ship_id', 'Ship', 'জাহাজ', self::opts(Ship::class))->required()->half(),
                Field::select('region', 'Region', 'অঞ্চল', C::regions())->required()->third()->default('asia'),
                Field::number('nights', 'Nights', 'রাত')->required()->rule('integer')->rule('min:1')->third(),
                Field::date('next_departure', 'Next departure', 'পরবর্তী যাত্রা')->third(),
                Field::tr('depart_port', 'Departs from', 'যাত্রা শুরু')->half(),
                Field::tr('cabin_from', 'Cheapest cabin label', 'সবচেয়ে কম দামের কেবিন')->half(),
                Field::tr('badge', 'Badge', 'ব্যাজ')->half(),
                Field::select('cancellation_policy_id', 'Cancellation policy', 'বাতিল নীতি', C::policies())->half(),
                Field::trhtml('description', 'Description', 'বিবরণ'),
                Field::trlist('route', 'Route (ports in order)', 'রুট (ক্রমানুসারে বন্দর)')->half(),
                Field::trlist('highlights', 'Highlights', 'হাইলাইট')->half(),
                Field::number('rating', 'Rating', 'রেটিং')->rule('between:0,5')->quarter(),
                Field::number('reviews_count', 'Reviews', 'রিভিউ')->rule('integer')->quarter(),
            ]],
            ['title' => ['en' => 'Prices, cabins & sailings', 'bn' => 'মূল্য, কেবিন ও যাত্রা'], 'tab' => C::T_PRICING, 'fields' => [
                Field::money('price_from', 'Price from (per person)', 'শুরু মূল্য (জনপ্রতি)')->required()->half(),
                Field::money('price_was', 'Was', 'আগের মূল্য')->half(),
                Field::children('cabins', 'Cabins', 'কেবিন', [
                    Field::select('code', 'Type', 'ধরন', ['inside' => 'Inside', 'ocean' => 'Ocean view', 'balcony' => 'Balcony', 'suite' => 'Suite'])->required()->quarter(),
                    Field::tr('name', 'Name', 'নাম')->required()->span(5),
                    Field::money('price', 'Price', 'মূল্য')->required()->quarter(),
                    Field::trtext('description', 'Description', 'বিবরণ')->span(9),
                    Field::number('capacity', 'Guests', 'অতিথি')->rule('integer')->default(2)->quarter(),
                ], 'sort'),
                Field::children('sailings', 'Sailings', 'যাত্রার তারিখ', [
                    Field::date('date', 'Departs', 'যাত্রা')->required()->quarter(),
                    Field::date('return_date', 'Returns', 'ফেরা')->quarter(),
                    Field::money('price', 'Price', 'মূল্য')->quarter(),
                    Field::select('status', 'Status', 'অবস্থা', ['open' => 'Open', 'guaranteed' => 'Guaranteed', 'closed' => 'Closed', 'cancelled' => 'Cancelled'])->required()->default('open')->quarter(),
                    Field::number('seats_total', 'Cabins available', 'কেবিন উপলব্ধ')->required()->rule('integer')->default(40)->quarter(),
                    Field::number('seats_held', 'Booked / held', 'বুকড / হোল্ড')->readonly()->quarter()->default(0),
                ])->meta(['compact' => true]),
            ]],
            ['title' => ['en' => 'Ports of call', 'bn' => 'যাত্রাবিরতির বন্দর'], 'tab' => ['en' => 'Itinerary', 'bn' => 'ভ্রমণসূচি'], 'fields' => [
                Field::children('portsOfCall', 'Days', 'দিন', [
                    Field::tr('port', 'Port', 'বন্দর')->required()->half(),
                    Field::text('arrive', 'Arrive', 'পৌঁছানো')->quarter(),
                    Field::text('depart', 'Depart', 'ছাড়া')->quarter(),
                    Field::trtext('body', 'Description', 'বিবরণ'),
                ], 'day_no')->meta(['itemLabel' => 'Day', 'numbered' => true]),
            ]],
            C::media(),
            C::seo(),
            C::publish(),
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/cruises/'.$m->slug);
    }
}
