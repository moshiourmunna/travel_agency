<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\VisaDocumentSet;

class VisaDocumentSetResource extends Resource
{
    public string $model = VisaDocumentSet::class;

    public string $slug = 'visa-document-sets';

    public array $label = ['en' => 'Visa document checklists', 'bn' => 'ভিসা ডকুমেন্ট তালিকা'];

    public array $singular = ['en' => 'Checklist', 'bn' => 'তালিকা'];

    public string $icon = 'list-checks';

    public string $perm = 'catalog';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [Col::tr('name', 'Checklist', 'তালিকা'), Col::make('code', 'Code', 'কোড'), Col::number('items', 'Items', 'আইটেম')->value(fn ($m) => count((array) $m->items))];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Checklist', 'bn' => 'তালিকা'], 'fields' => [
            Field::tr('name', 'Name (e.g. Job holders)', 'নাম (যেমন চাকরিজীবী)')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->half()->meta(['unique' => true]),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
            Field::trlist('items', 'Documents', 'ডকুমেন্ট'),
        ]]];
    }
}
