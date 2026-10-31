<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Country;
use App\Models\VisaProduct;
use Illuminate\Database\Eloquent\Model;

class VisaProductResource extends Resource
{
    public string $model = VisaProduct::class;

    public string $slug = 'visa-products';

    public array $label = ['en' => 'Visa services', 'bn' => 'ভিসা সেবা'];

    public array $singular = ['en' => 'Visa service', 'bn' => 'ভিসা সেবা'];

    public string $icon = 'stamp';

    public string $perm = 'catalog';

    public array $abilities = ['view' => 'catalog.view'];

    public array $with = ['image.media'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function columns(): array
    {
        return [
            Col::make('flag', '', '')->value(fn ($m) => $m->flag),
            Col::tr('country_name', 'Country', 'দেশ')->sortable(),
            Col::tr('type', 'Visa type', 'ভিসার ধরন'),
            Col::tr('processing', 'Processing', 'প্রক্রিয়াকরণ')->hideMobile(),
            Col::money('fee', 'Fee', 'ফি')->sortable(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
        ];
    }

    public function filters(): array
    {
        return [Filter::status()];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Visa service', 'bn' => 'ভিসা সেবা'], 'tab' => C::T_DETAILS, 'fields' => [
                Field::tr('country_name', 'Country', 'দেশ')->required(),
                Field::slug('slug', 'country_name')->half(),
                Field::select('country_id', 'Country record', 'দেশ', self::opts(Country::class))->span(4),
                Field::text('flag', 'Flag emoji', 'পতাকা')->span(2),
                Field::tr('type', 'Visa type', 'ভিসার ধরন')->required(),
                Field::tr('processing', 'Processing time', 'প্রক্রিয়াকরণের সময়')->half(),
                Field::tr('validity', 'Validity', 'মেয়াদ')->half(),
                Field::tr('stay', 'Length of stay', 'অবস্থানের সময়')->half(),
                Field::tr('entry', 'Entries', 'প্রবেশ')->half(),
                Field::trhtml('description', 'Description', 'বিবরণ'),
            ]],
            ['title' => ['en' => 'Fee', 'bn' => 'ফি'], 'tab' => C::T_PRICING, 'fields' => [
                Field::money('fee', 'Total fee (BDT)', 'মোট ফি (টাকা)')->required(),
                Field::repeater('fee_breakdown', 'Fee breakdown', 'ফির বিভাজন', [Field::tr('label', 'Item', 'আইটেম')->span(8), Field::money('amount', 'Amount', 'পরিমাণ')->span(4)]),
            ]],
            ['title' => ['en' => 'Documents', 'bn' => 'ডকুমেন্ট'], 'tab' => ['en' => 'Documents', 'bn' => 'ডকুমেন্ট'], 'fields' => [
                Field::children('requirements', 'Required documents (traveller uploads)', 'প্রয়োজনীয় ডকুমেন্ট (ভ্রমণকারী আপলোড করবেন)', [
                    Field::tr('item', 'Document', 'ডকুমেন্ট')->required()->span(10),
                    Field::switch('required', 'Required', 'আবশ্যক')->default(true)->span(2),
                ], 'sort'),
                Field::trlist('extra_documents', 'Extra notes on documents', 'ডকুমেন্ট সম্পর্কে অতিরিক্ত তথ্য'),
            ]],
            C::media(false),
            C::seo(),
            C::publish(),
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/visa/'.$m->slug);
    }
}
