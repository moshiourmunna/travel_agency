<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Tag;

class TagResource extends Resource
{
    public string $model = Tag::class;

    public string $slug = 'tags';

    public array $label = ['en' => 'Tags', 'bn' => 'ট্যাগ'];

    public array $singular = ['en' => 'Tag', 'bn' => 'ট্যাগ'];

    public string $icon = 'hash';

    public string $perm = 'content';

    public function columns(): array
    {
        return [
            Col::tr('name', 'Tag', 'ট্যাগ')->sortable(),
            Col::make('slug', 'Slug', 'স্লাগ'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Tag', 'bn' => 'ট্যাগ'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::slug('slug', 'name'),
        ]]];
    }
}
