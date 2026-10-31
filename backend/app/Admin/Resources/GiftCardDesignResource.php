<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\GiftCardDesign;

class GiftCardDesignResource extends Resource
{
    public string $model = GiftCardDesign::class;

    public string $slug = 'gift-card-designs';

    public array $label = ['en' => 'Gift card designs', 'bn' => 'গিফট কার্ড ডিজাইন'];

    public array $singular = ['en' => 'Gift card design', 'bn' => 'গিফট কার্ড ডিজাইন'];

    public string $icon = 'gift';

    public string $perm = 'catalog';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public array $with = ['image.media'];

    public function columns(): array
    {
        return [Col::image('image'), Col::tr('name', 'Design', 'ডিজাইন'), Col::make('amounts', 'Amounts', 'পরিমাণ')->value(fn ($m) => implode(', ', array_map(fn ($a) => '৳'.number_format($a), (array) $m->amounts))), Col::bool('is_active', 'Active', 'সক্রিয়')];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Design', 'bn' => 'ডিজাইন'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->half()->meta(['unique' => true]),
            Field::text('gradient', 'Colour gradient (Tailwind classes)', 'রঙের গ্রেডিয়েন্ট')->half(),
            Field::image('image_id', 'Card photo', 'কার্ডের ছবি'),
            Field::list('amounts', 'Preset amounts (BDT)', 'নির্ধারিত পরিমাণ (টাকা)')->meta(['numeric' => true]),
            Field::switch('is_active', 'Active', 'সক্রিয়')->default(true)->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function beforeSave($m, array $data, bool $creating): void
    {
        $m->amounts = array_values(array_map('intval', array_filter((array) $m->amounts, 'is_numeric')));
    }
}
