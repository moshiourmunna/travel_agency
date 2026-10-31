<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Language;

class LanguageResource extends Resource
{
    public string $model = Language::class;

    public string $slug = 'languages';

    public array $label = ['en' => 'Languages', 'bn' => 'ভাষা'];

    public array $singular = ['en' => 'Language', 'bn' => 'ভাষা'];

    public string $icon = 'languages';

    public string $perm = 'settings';

    public array $abilities = ['view' => 'settings.manage'];

    public bool $creatable = false;

    public bool $deletable = false;

    public function columns(): array
    {
        return [
            Col::make('code', 'Code', 'কোড'),
            Col::make('name', 'Language', 'ভাষা'),
            Col::make('native', 'Native name', 'নিজ ভাষায়'),
            Col::bool('is_default', 'Default', 'ডিফল্ট'),
            Col::bool('is_active', 'Active', 'সক্রিয়'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Language', 'bn' => 'ভাষা'], 'fields' => [
            Field::text('name', 'Name', 'নাম')->required()->half(),
            Field::text('native', 'Native name', 'নিজ ভাষায় নাম')->required()->half(),
            Field::switch('is_active', 'Active', 'সক্রিয়')->half()->help('The website is built for English and Bangla.', 'ওয়েবসাইটটি ইংরেজি ও বাংলার জন্য তৈরি।'),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->half(),
        ]]];
    }
}
