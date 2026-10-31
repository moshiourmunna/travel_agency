<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Partner;

class PartnerResource extends Resource
{
    public string $model = Partner::class;

    public string $slug = 'partners';

    public array $label = ['en' => 'Partners & logos', 'bn' => 'পার্টনার ও লোগো'];

    public array $singular = ['en' => 'Partner', 'bn' => 'পার্টনার'];

    public string $icon = 'handshake';

    public string $perm = 'content';

    public array $with = ['logo.media'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::image('logo'),
            Col::make('name', 'Name', 'নাম')->sortable(),
            Col::make('kind', 'Type', 'ধরন'),
            Col::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Partner', 'bn' => 'পার্টনার'], 'fields' => [
            Field::text('name', 'Name', 'নাম')->required()->half(),
            Field::select('kind', 'Type', 'ধরন', ['airline' => 'Airline', 'hotel' => 'Hotel', 'payment' => 'Payment', 'association' => 'Association / licence'])->required()->half(),
            Field::text('code', 'Short code', 'সংক্ষিপ্ত কোড')->third(),
            Field::color('color', 'Colour', 'রং')->third(),
            Field::url('url', 'Website', 'ওয়েবসাইট')->third(),
            Field::image('logo_id', 'Logo', 'লোগো'),
            Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true)->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function filters(): array
    {
        return [Filter::select('kind', 'Type', 'ধরন', ['airline' => 'Airline', 'hotel' => 'Hotel', 'payment' => 'Payment', 'association' => 'Association'])];
    }
}
