<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\CruiseLine;
use Illuminate\Database\Eloquent\Model;

class CruiseLineResource extends Resource
{
    public string $model = CruiseLine::class;

    public string $slug = 'cruise-lines';

    public array $label = ['en' => 'Cruise lines', 'bn' => 'ক্রুজ লাইন'];

    public array $singular = ['en' => 'Cruise line', 'bn' => 'ক্রুজ লাইন'];

    public string $icon = 'anchor';

    public string $perm = 'catalog';

    public array $search = ['name'];

    public function columns(): array
    {
        return [Col::make('name', 'Name', 'নাম')->sortable(), Col::make('slug', 'Slug', 'স্লাগ')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Cruise line', 'bn' => 'ক্রুজ লাইন'], 'fields' => [Field::text('name', 'Name', 'নাম')->required()->half(), Field::slug('slug', 'name')->half()]]];
    }

    public function canDelete(Model $m): bool
    {
        return ! $m->ships()->exists();
    }
}
