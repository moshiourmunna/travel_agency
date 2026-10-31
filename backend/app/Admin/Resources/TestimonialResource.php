<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Testimonial;

class TestimonialResource extends Resource
{
    public string $model = Testimonial::class;

    public string $slug = 'testimonials';

    public array $label = ['en' => 'Testimonials', 'bn' => 'প্রশংসাপত্র'];

    public array $singular = ['en' => 'Testimonial', 'bn' => 'প্রশংসাপত্র'];

    public string $icon = 'quote';

    public string $perm = 'content';

    public array $with = ['avatar.media'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('avatar'),
            Col::tr('name', 'Traveller', 'ভ্রমণকারী')->sortable(),
            Col::tr('trip', 'Trip', 'ট্রিপ')->hideMobile(),
            Col::make('rating', 'Rating', 'রেটিং')->value(fn ($m) => str_repeat('★', (int) $m->rating)),
            Col::bool('is_featured', 'Featured', 'ফিচার্ড')->hideMobile(),
            Col::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function filters(): array
    {
        return [Filter::bool('is_featured', 'Featured', 'ফিচার্ড'), Filter::bool('is_active', 'Visible', 'দৃশ্যমান')];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Testimonial', 'bn' => 'প্রশংসাপত্র'], 'fields' => [
                Field::tr('name', 'Name', 'নাম')->required(),
                Field::tr('city', 'City', 'শহর'),
                Field::tr('trip', 'Trip', 'ট্রিপ'),
                Field::trtext('text', 'What they said', 'তাঁদের কথা')->required(),
                Field::select('rating', 'Rating', 'রেটিং', [5 => '★★★★★', 4 => '★★★★', 3 => '★★★', 2 => '★★', 1 => '★'])->required()->default(5)->third(),
                Field::text('initials', 'Initials', 'আদ্যক্ষর')->rule('max:3')->third(),
                Field::date('travelled_on', 'Travelled', 'ভ্রমণের তারিখ')->third(),
            ]],
            ['title' => ['en' => 'Display', 'bn' => 'প্রদর্শন'], 'aside' => true, 'fields' => [
                Field::image('avatar_id', 'Photo', 'ছবি'),
                Field::switch('is_featured', 'Featured', 'ফিচার্ড'),
                Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true),
                Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0),
            ]],
        ];
    }
}
