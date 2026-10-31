<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Amenity;
use App\Models\Hotel;
use Illuminate\Database\Eloquent\Model;

class HotelResource extends Resource
{
    public string $model = Hotel::class;

    public string $slug = 'hotels';

    public array $label = ['en' => 'Hotels', 'bn' => 'হোটেল'];

    public array $singular = ['en' => 'Hotel', 'bn' => 'হোটেল'];

    public string $icon = 'hotel';

    public string $perm = 'catalog';

    public array $with = ['image.media', 'destination'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('name', 'Hotel', 'হোটেল')->sortable(),
            Col::tr('city', 'City', 'শহর')->hideMobile(),
            Col::make('stars', 'Stars', 'তারকা')->value(fn ($m) => str_repeat('★', (int) $m->stars))->hideMobile(),
            Col::money('price_from', 'From / night', 'শুরু / রাত')->sortable(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
        ];
    }

    public function filters(): array
    {
        return [Filter::status(), Filter::select('destination_id', 'Destination', 'গন্তব্য', C::destinations()), Filter::select('stars', 'Stars', 'তারকা', ['5' => '5★', '4' => '4★', '3' => '3★', '2' => '2★'])];
    }

    public function sections(): array
    {
        $feature = fn (string $k) => [
            fn ($m) => $m && $m->exists ? ($m->features[$k] ?? null) : null,
            function ($m, $v) use ($k) {
                $f = (array) ($m->features ?? []);
                $f[$k] = $v === '' ? null : (is_numeric($v) ? $v + 0 : $v);
                $m->features = $f;
            },
        ];
        [$occG, $occS] = $feature('occupancy');
        [$leftG, $leftS] = $feature('rooms_left');
        [$imgG, $imgS] = $feature('image');

        return [
            ['title' => ['en' => 'Hotel', 'bn' => 'হোটেল'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('name', 'Name', 'নাম')->required(),
                Field::slug('slug', 'name')->half(),
                Field::select('destination_id', 'Destination', 'গন্তব্য', C::destinations())->half(),
                Field::select('kind', 'Type', 'ধরন', ['hotel' => 'Hotel', 'resort' => 'Resort', 'apartment' => 'Apartment', 'guesthouse' => 'Guest house'])->required()->default('hotel')->quarter(),
                Field::number('stars', 'Stars', 'তারকা')->required()->rule('integer')->rule('between:1,5')->quarter(),
                Field::tr('city', 'City', 'শহর')->half(),
                Field::tr('address', 'Address', 'ঠিকানা'),
                Field::tr('distance_text', 'Distance line (e.g. 2 min to beach)', 'দূরত্ব'),
                Field::trhtml('description', 'Description', 'বিবরণ'),
                Field::checks('amenities', 'Amenities', 'সুবিধা', Amenity::orderBy('id')->get()->mapWithKeys(fn ($a) => [$a->code => $a->getTranslations('name')])->all()),
                Field::switch('refundable', 'Free cancellation', 'ফ্রি বাতিল')->quarter(),
                Field::switch('breakfast', 'Breakfast included', 'নাশতা সহ')->quarter(),
                Field::number('guest_score', 'Guest score (out of 10)', 'অতিথি স্কোর')->rule('between:0,10')->quarter(),
                Field::number('reviews_count', 'Reviews', 'রিভিউ')->rule('integer')->quarter(),
                Field::number('lat', 'Latitude', 'অক্ষাংশ')->quarter(),
                Field::number('lng', 'Longitude', 'দ্রাঘিমাংশ')->quarter(),
                Field::text('supplier', 'Supplier', 'সরবরাহকারী')->quarter(),
                Field::text('supplier_code', 'Supplier code', 'সরবরাহকারী কোড')->quarter(),
                Field::repeater('house_rules', 'House rules', 'হোটেলের নিয়ম', [
                    Field::icon('icon')->quarter(), Field::tr('title', 'Rule', 'নিয়ম')->span(4), Field::tr('text', 'Detail', 'বিস্তারিত')->span(5),
                ])->help('Leave empty to use the default rules from Settings → Catalog.', 'খালি রাখলে সেটিংস → ক্যাটালগের ডিফল্ট নিয়ম দেখাবে।'),
            ]],
            ['title' => ['en' => 'Rooms & rates', 'bn' => 'রুম ও রেট'], 'tab' => C::T_PRICING, 'fields' => [
                Field::money('price_from', 'Price from (per night)', 'শুরু মূল্য (প্রতি রাত)')->required()->half(),
                Field::money('price_was', 'Was', 'আগের মূল্য')->half(),
                Field::children('roomTypes', 'Room types', 'রুমের ধরন', [
                    Field::tr('name', 'Room', 'রুম')->required()->half(),
                    Field::tr('bed', 'Beds', 'বেড')->half(),
                    Field::money('price', 'Price / night', 'মূল্য / রাত')->required()->quarter(),
                    Field::number('size_sqm', 'Size (m²)', 'আয়তন (বর্গমিটার)')->rule('integer')->quarter(),
                    Field::number('max_adults', 'Max adults', 'সর্বোচ্চ প্রাপ্তবয়স্ক')->rule('integer')->default(2)->quarter(),
                    Field::number('max_children', 'Max children', 'সর্বোচ্চ শিশু')->rule('integer')->default(1)->quarter(),
                    Field::number('features_occupancy', 'Sleeps', 'ধারণক্ষমতা')->rule('integer')->get($occG)->set($occS)->quarter(),
                    Field::number('features_rooms_left', 'Rooms left (urgency)', 'বাকি রুম')->rule('integer')->get($leftG)->set($leftS)->quarter(),
                    Field::text('features_image', 'Photo key (media library)', 'ছবির কী (মিডিয়া)')->get($imgG)->set($imgS)->half()->meta(['mediaKey' => true]),
                    Field::switch('breakfast', 'Breakfast', 'নাশতা')->quarter(),
                    Field::switch('refundable', 'Refundable', 'ফেরতযোগ্য')->quarter(),
                    Field::trtext('description', 'Description', 'বিবরণ'),
                ], 'sort'),
            ]],
            C::media(),
            C::seo(),
            C::publish(),
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/hotels/'.$m->slug);
    }
}
