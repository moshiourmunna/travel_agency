<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Category;
use App\Models\Theme;
use Illuminate\Database\Eloquent\Model;

class ThemeResource extends Resource
{
    public string $model = Theme::class;

    public string $slug = 'themes';

    public array $label = ['en' => 'Holiday themes', 'bn' => 'হলিডে থিম'];

    public array $singular = ['en' => 'Theme', 'bn' => 'থিম'];

    public string $icon = 'sparkles';

    public string $perm = 'catalog';

    public array $with = ['image.media'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('name', 'Theme', 'থিম')->sortable(),
            Col::make('category_slug', 'Category', 'ক্যাটাগরি')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
            Col::bool('is_featured', 'Featured', 'ফিচার্ড')->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::status()];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Theme', 'bn' => 'থিম'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('name', 'Name', 'নাম')->required(),
                Field::slug('slug', 'name')->half(),
                Field::select('category_slug', 'Tours from category', 'যে ক্যাটাগরির ট্যুর', Category::orderBy('sort')->get()->mapWithKeys(fn ($c) => [$c->slug => $c->getTranslations('name')])->all())->half()
                    ->help('The theme page lists published tours in this category.', 'থিম পেজে এই ক্যাটাগরির প্রকাশিত ট্যুর দেখাবে।'),
                Field::icon('icon')->half(),
                Field::tr('tagline', 'Tagline', 'ট্যাগলাইন'),
                Field::trhtml('description', 'Description', 'বিবরণ'),
                Field::trlist('perks', 'Perks', 'সুবিধা'),
            ]],
            C::media(false),
            C::seo(),
            C::publish(true, false),
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/holidays/'.$m->slug);
    }
}
