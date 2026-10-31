<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\GiftCard;
use App\Models\GiftCardDesign;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GiftCardResource extends Resource
{
    public string $model = GiftCard::class;

    public string $slug = 'gift-cards';

    public array $label = ['en' => 'Gift cards issued', 'bn' => 'ইস্যুকৃত গিফট কার্ড'];

    public array $singular = ['en' => 'Gift card', 'bn' => 'গিফট কার্ড'];

    public string $icon = 'gift';

    public string $perm = 'coupons';

    public array $search = ['code', 'recipient_name', 'recipient_email'];

    public const STATUS = ['active' => ['Active', 'সক্রিয়', 'green'], 'redeemed' => ['Used up', 'ব্যবহৃত', 'gray'], 'expired' => ['Expired', 'মেয়াদোত্তীর্ণ', 'red'], 'void' => ['Void', 'বাতিল', 'red']];

    public function columns(): array
    {
        return [
            Col::make('code', 'Code', 'কোড')->sortable(),
            Col::make('recipient_name', 'Recipient', 'প্রাপক'),
            Col::money('amount', 'Value', 'মূল্য')->sortable(),
            Col::money('balance', 'Balance', 'অবশিষ্ট')->sortable(),
            Col::date('expires_at', 'Expires', 'মেয়াদ')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Gift card', 'bn' => 'গিফট কার্ড'], 'fields' => [
            Field::text('code', 'Code', 'কোড')->createOnly()->half()->meta(['unique' => true])->help('Leave empty to generate one.', 'খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে।'),
            Field::select('gift_card_design_id', 'Design', 'ডিজাইন', self::opts(GiftCardDesign::class))->half(),
            Field::money('amount', 'Value', 'মূল্য')->required()->half(),
            Field::money('balance', 'Balance', 'অবশিষ্ট')->required()->half(),
            Field::text('recipient_name', 'Recipient', 'প্রাপক')->half(),
            Field::email('recipient_email', 'Recipient email', 'প্রাপকের ইমেইল')->half(),
            Field::textarea('message', 'Message', 'বার্তা'),
            Field::date('expires_at', 'Expires on', 'মেয়াদ শেষ')->half(),
            Field::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))->required()->default('active')->half(),
        ]]];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        if ($creating && ! $m->code) {
            $m->code = 'MSF-'.Str::upper(Str::random(4)).'-'.Str::upper(Str::random(4));
        }
        if ((float) $m->balance > (float) $m->amount) {
            $m->balance = $m->amount;
        }
    }
}
