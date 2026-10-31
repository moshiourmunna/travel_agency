<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Agent;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AgentResource extends Resource
{
    public string $model = Agent::class;

    public string $slug = 'agents';

    public array $label = ['en' => 'B2B agents', 'bn' => 'বিটুবি এজেন্ট'];

    public array $singular = ['en' => 'Agent', 'bn' => 'এজেন্ট'];

    public string $icon = 'building-2';

    public string $perm = 'agents';

    public array $search = ['code', 'company', 'contact_name', 'email', 'phone'];

    public const STATUS = ['active' => ['Active', 'সক্রিয়', 'green'], 'review' => ['Under review', 'যাচাই চলছে', 'accent'], 'suspended' => ['Suspended', 'স্থগিত', 'red']];

    public function query(): Builder
    {
        return Agent::query()->withCount('bookings');
    }

    public function columns(): array
    {
        return [
            Col::make('code', 'Code', 'কোড')->sortable(),
            Col::tr('company', 'Agency', 'এজেন্সি')->sortable(),
            Col::tr('city', 'City', 'শহর')->hideMobile(),
            Col::make('commission_pct', 'Commission', 'কমিশন')->value(fn ($m) => rtrim(rtrim((string) $m->commission_pct, '0'), '.').'%'),
            Col::money('balance', 'Balance', 'ব্যালান্স')->hideMobile(),
            Col::number('bookings_count', 'Bookings', 'বুকিং')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Agency', 'bn' => 'এজেন্সি'], 'fields' => [
                Field::text('code', 'Agent code', 'এজেন্ট কোড')->required()->rule('max:20')->third()->meta(['unique' => true]),
                Field::tr('company', 'Company', 'কোম্পানি')->required()->span(8),
                Field::tr('city', 'City', 'শহর'),
                Field::text('licence_no', 'Trade / ATAB licence', 'ট্রেড / আটাব লাইসেন্স')->half(),
                Field::text('contact_name', 'Contact person', 'যোগাযোগকারী')->half(),
                Field::email('email', 'Email', 'ইমেইল')->half(),
                Field::text('phone', 'Phone', 'ফোন')->half(),
            ]],
            ['title' => ['en' => 'Commercial terms', 'bn' => 'বাণিজ্যিক শর্ত'], 'aside' => true, 'fields' => [
                Field::number('commission_pct', 'Commission %', 'কমিশন %')->required()->rule('between:0,50')->default(7),
                Field::money('credit_limit', 'Credit limit', 'ক্রেডিট সীমা')->default(0),
                Field::money('balance', 'Current balance', 'বর্তমান ব্যালান্স')->readonly(),
                Field::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))->required()->default('review'),
            ]],
        ];
    }

    public function canDelete(Model $m): bool
    {
        return ! Booking::where('agent_id', $m->id)->exists();
    }
}
