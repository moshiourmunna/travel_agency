<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\Category;

class CategoryResource extends Resource
{
    public string $model = Category::class;

    public string $slug = 'categories';

    public array $label = ['en' => 'Trip categories', 'bn' => 'ভ্রমণ ক্যাটাগরি'];

    public array $singular = ['en' => 'Category', 'bn' => 'ক্যাটাগরি'];

    public string $icon = 'tags';

    public string $perm = 'catalog';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [Col::tr('name', 'Category', 'ক্যাটাগরি')->sortable(), Col::make('slug', 'Slug', 'স্লাগ'), Col::make('icon', 'Icon', 'আইকন', 'icon'), Col::bool('is_active', 'Active', 'সক্রিয়')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Category', 'bn' => 'ক্যাটাগরি'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(), Field::slug('slug', 'name')->half(), Field::icon('icon')->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(), Field::switch('is_active', 'Active', 'সক্রিয়')->default(true)->half(),
        ]]];
    }
}
