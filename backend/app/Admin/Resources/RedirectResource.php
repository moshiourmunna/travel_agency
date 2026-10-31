<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Redirect;

class RedirectResource extends Resource
{
    public string $model = Redirect::class;

    public string $slug = 'redirects';

    public array $label = ['en' => 'Redirects', 'bn' => 'রিডাইরেক্ট'];

    public array $singular = ['en' => 'Redirect', 'bn' => 'রিডাইরেক্ট'];

    public string $icon = 'corner-up-right';

    public string $perm = 'content';

    public array $abilities = ['view' => 'seo.manage', 'manage' => 'seo.manage'];

    public array $search = ['from_path', 'to_path'];

    public function columns(): array
    {
        return [
            Col::make('from_path', 'From', 'থেকে')->sortable(),
            Col::make('to_path', 'To', 'যেখানে'),
            Col::make('code', 'Type', 'ধরন'),
            Col::number('hits', 'Hits', 'হিট')->sortable(),
            Col::bool('is_active', 'Active', 'সক্রিয়'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Redirect', 'bn' => 'রিডাইরেক্ট'], 'fields' => [
            Field::text('from_path', 'Old path (e.g. /old-maldives-offer)', 'পুরনো পাথ')->required()->rule('regex:/^\\/[^\\s]*$/')->half()->meta(['unique' => true])->help('Without /en or /bn — both languages are redirected.', '/en বা /bn ছাড়া — দুই ভাষাই রিডাইরেক্ট হবে।'),
            Field::text('to_path', 'New path or full URL', 'নতুন পাথ বা পূর্ণ ইউআরএল')->required()->half(),
            Field::select('code', 'Type', 'ধরন', ['301' => '301 — permanent', '302' => '302 — temporary'])->required()->default('301')->half(),
            Field::switch('is_active', 'Active', 'সক্রিয়')->default(true)->half(),
        ]]];
    }
}
