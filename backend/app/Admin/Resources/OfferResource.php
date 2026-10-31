<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Offer;
use Illuminate\Database\Eloquent\Model;

class OfferResource extends Resource
{
    public string $model = Offer::class;

    public string $slug = 'offers';

    public array $label = ['en' => 'Deals & offers', 'bn' => 'ডিল ও অফার'];

    public array $singular = ['en' => 'Offer', 'bn' => 'অফার'];

    public string $icon = 'flame';

    public string $perm = 'coupons';

    public array $abilities = ['view' => 'coupons.view', 'manage' => 'offers.manage'];

    public array $with = ['image.media'];

    public array $search = ['code', 'title'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public const KINDS = ['holiday' => ['en' => 'Holidays', 'bn' => 'হলিডে'], 'cruise' => ['en' => 'Cruises', 'bn' => 'ক্রুজ'], 'flight' => ['en' => 'Flights', 'bn' => 'ফ্লাইট'], 'bank' => ['en' => 'Bank & card offers', 'bn' => 'ব্যাংক ও কার্ড অফার']];

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('title', 'Offer', 'অফার')->sortable(),
            Col::tr('discount_text', 'Discount', 'ছাড়')->hideMobile(),
            Col::make('kind', 'Type', 'ধরন')->value(fn ($m) => tr_pick(self::KINDS[$m->kind] ?? $m->kind))->hideMobile(),
            Col::datetime('ends_at', 'Ends', 'শেষ')->sortable()->hideMobile(),
            Col::bool('is_flash', 'Flash deal', 'ফ্ল্যাশ ডিল'),
            Col::bool('is_active', 'Active', 'সক্রিয়'),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('kind', 'Type', 'ধরন', self::KINDS), Filter::bool('is_active', 'Active', 'সক্রিয়'), Filter::bool('is_flash', 'Flash deal', 'ফ্ল্যাশ ডিল')];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Offer', 'bn' => 'অফার'], 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::trtext('description', 'Description', 'বিবরণ'),
                Field::tr('discount_text', 'Discount line (e.g. Up to 20% off)', 'ছাড়ের লেখা')->half(),
                Field::tr('tag', 'Tag', 'ট্যাগ')->half(),
                Field::text('code', 'Coupon code to show', 'দেখানোর কুপন কোড')->third(),
                Field::select('kind', 'Shown under', 'যে বিভাগে দেখাবে', self::KINDS)->required()->default('holiday')->third(),
                Field::text('link', 'Link (e.g. /tours/maldives-honeymoon)', 'লিংক')->third(),
                Field::datetime('starts_at', 'Starts', 'শুরু')->half(),
                Field::datetime('ends_at', 'Ends (countdown)', 'শেষ (কাউন্টডাউন)')->half(),
            ]],
            ['title' => ['en' => 'Display', 'bn' => 'প্রদর্শন'], 'aside' => true, 'fields' => [
                Field::image('image_id', 'Photo', 'ছবি'),
                Field::switch('is_flash', 'Flash deal (home page)', 'ফ্ল্যাশ ডিল (হোম পেজ)'),
                Field::switch('is_active', 'Active', 'সক্রিয়')->default(true),
                Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0),
            ]],
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/offers');
    }
}
