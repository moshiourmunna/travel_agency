<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\BlogCategory;

class BlogCategoryResource extends Resource
{
    public string $model = BlogCategory::class;

    public string $slug = 'blog-categories';

    public array $label = ['en' => 'Blog categories', 'bn' => 'ব্লগ ক্যাটাগরি'];

    public array $singular = ['en' => 'Category', 'bn' => 'ক্যাটাগরি'];

    public string $icon = 'folder';

    public string $perm = 'content';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::tr('name', 'Category', 'ক্যাটাগরি')->sortable(),
            Col::make('slug', 'Slug', 'স্লাগ'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Category', 'bn' => 'ক্যাটাগরি'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::slug('slug', 'name')->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function canDelete($m): bool
    {
        return ! \App\Models\BlogPost::where('blog_category_id', $m->id)->exists();
    }
}
