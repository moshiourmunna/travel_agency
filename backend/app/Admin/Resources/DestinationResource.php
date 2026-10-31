<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Country;
use App\Models\Destination;
use Illuminate\Database\Eloquent\Model;

class DestinationResource extends Resource
{
    public string $model = Destination::class;

    public string $slug = 'destinations';

    public array $label = ['en' => 'Destinations', 'bn' => 'গন্তব্য'];

    public array $singular = ['en' => 'Destination', 'bn' => 'গন্তব্য'];

    public string $icon = 'map-pin';

    public string $perm = 'catalog';

    public array $with = ['image.media'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('name', 'Destination', 'গন্তব্য')->sortable(),
            Col::tr('country_name', 'Country', 'দেশ')->hideMobile(),
            Col::make('region', 'Region', 'অঞ্চল')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
            Col::bool('is_featured', 'Featured', 'ফিচার্ড')->hideMobile(),
            Col::number('sort', 'Order', 'ক্রম')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::status(), Filter::select('region', 'Region', 'অঞ্চল', C::regions()), Filter::bool('is_featured', 'Featured', 'ফিচার্ড')];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Destination', 'bn' => 'গন্তব্য'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('name', 'Name', 'নাম')->required(),
                Field::slug('slug', 'name')->half(),
                Field::select('country_id', 'Country', 'দেশ', self::opts(Country::class, 'name'))->half(),
                Field::tr('country_name', 'Country label', 'দেশের নাম')->half(),
                Field::select('region', 'Region', 'অঞ্চল', C::regions())->required()->quarter()->default('bd'),
                Field::text('currency', 'Currency', 'মুদ্রা')->quarter(),
                Field::tr('tagline', 'Tagline', 'ট্যাগলাইন'),
                Field::trhtml('description', 'Description', 'বিবরণ'),
            ]],
            ['title' => ['en' => 'Travel facts', 'bn' => 'ভ্রমণ তথ্য'], 'tab' => C::T_CONTENT, 'fields' => [
                Field::tr('best_time', 'Best time to visit', 'ভ্রমণের সেরা সময়')->half(),
                Field::tr('flight_time', 'Flight time', 'ফ্লাইটের সময়')->half(),
                Field::trtext('visa_info', 'Visa information', 'ভিসা তথ্য'),
                Field::trlist('things_to_do', 'Things to do', 'যা করবেন'),
                Field::number('lat', 'Latitude', 'অক্ষাংশ')->quarter(),
                Field::number('lng', 'Longitude', 'দ্রাঘিমাংশ')->quarter(),
                Field::number('tours_count_display', 'Tours count shown (optional)', 'দেখানো ট্যুর সংখ্যা')->rule('integer')->half(),
            ]],
            C::media(),
            C::seo(),
            C::publish(true, false),
        ];
    }

    public function canDelete(Model $m): bool
    {
        return ! $m->tours()->exists();
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/destinations/'.$m->slug);
    }
}
