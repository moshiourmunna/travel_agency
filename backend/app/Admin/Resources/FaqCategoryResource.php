<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\FaqCategory;

class FaqCategoryResource extends Resource
{
    public string $model = FaqCategory::class;

    public string $slug = 'faq-categories';

    public array $label = ['en' => 'FAQ categories', 'bn' => 'প্রশ্নোত্তর ক্যাটাগরি'];

    public array $singular = ['en' => 'FAQ category', 'bn' => 'ক্যাটাগরি'];

    public string $icon = 'folder';

    public string $perm = 'content';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::tr('name', 'Category', 'ক্যাটাগরি'),
            Col::make('slug', 'Slug', 'স্লাগ'),
            Col::make('icon', 'Icon', 'আইকন', 'icon'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'FAQ category', 'bn' => 'ক্যাটাগরি'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::slug('slug', 'name')->half(),
            Field::icon('icon')->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0),
        ]]];
    }

    public function canDelete($m): bool
    {
        return ! \App\Models\Faq::where('faq_category_id', $m->id)->exists();
    }
}
