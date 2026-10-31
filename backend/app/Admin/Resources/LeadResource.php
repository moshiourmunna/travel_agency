<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class LeadResource extends Resource
{
    public string $model = Lead::class;

    public string $slug = 'leads';

    public array $label = ['en' => 'Sales leads', 'bn' => 'সেলস লিড'];

    public array $singular = ['en' => 'Lead', 'bn' => 'লিড'];

    public string $icon = 'target';

    public string $perm = 'leads';

    public array $with = ['owner'];

    public array $search = ['code', 'name', 'phone', 'email', 'need'];

    public const STAGES = ['new' => ['New', 'নতুন', 'accent'], 'contacted' => ['Contacted', 'যোগাযোগ হয়েছে', 'blue'], 'quoted' => ['Quoted', 'কোটেশন দেওয়া', 'purple'],
        'negotiating' => ['Negotiating', 'আলোচনা চলছে', 'gold'], 'won' => ['Won', 'সফল', 'green'], 'lost' => ['Lost', 'হাতছাড়া', 'gray']];

    public function columns(): array
    {
        return [
            Col::make('code', 'Lead', 'লিড')->sortable(),
            Col::make('name', 'Name', 'নাম')->sortable(),
            Col::tr('need', 'Looking for', 'চাহিদা')->hideMobile(),
            Col::money('value', 'Value', 'মূল্য')->sortable(),
            Col::badge('stage', 'Stage', 'ধাপ', self::STAGES)->sortable(),
            Col::make('owner', 'Owner', 'দায়িত্বপ্রাপ্ত')->value(fn ($m) => $m->owner?->name)->hideMobile(),
            Col::datetime('created_at', 'Created', 'তৈরি')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('stage', 'Stage', 'ধাপ', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STAGES)), Filter::select('owner_id', 'Owner', 'দায়িত্বপ্রাপ্ত', VisaApplicationResource::staffOptions())];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Lead', 'bn' => 'লিড'], 'fields' => [
                Field::text('code', 'Code', 'কোড')->required()->quarter()->meta(['unique' => true])->default('LD-'.random_int(4000, 99999)),
                Field::text('name', 'Name', 'নাম')->required()->span(9),
                Field::text('phone', 'Phone', 'ফোন')->half(),
                Field::email('email', 'Email', 'ইমেইল')->half(),
                Field::tr('need', 'Looking for', 'চাহিদা')->required(),
                Field::tr('source', 'Source', 'উৎস'),
                Field::money('value', 'Estimated value (BDT)', 'আনুমানিক মূল্য (টাকা)')->third(),
                Field::select('stage', 'Stage', 'ধাপ', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STAGES))->required()->default('new')->third(),
                Field::select('owner_id', 'Owner', 'দায়িত্বপ্রাপ্ত', VisaApplicationResource::staffOptions())->third(),
            ]],
            ['title' => ['en' => 'Activity', 'bn' => 'কার্যক্রম'], 'fields' => [
                Field::children('activities', 'Calls, emails & notes', 'কল, ইমেইল ও নোট', [
                    Field::select('type', 'Type', 'ধরন', ['note' => 'Note', 'call' => 'Call', 'email' => 'Email', 'meeting' => 'Meeting', 'stage' => 'Stage change'])->required()->default('note')->quarter(),
                    Field::textarea('body', 'Details', 'বিস্তারিত')->required()->span(9),
                ]),
            ]],
        ];
    }

    public function afterSave(Model $m, array $data, bool $creating): void
    {
        LeadActivity::where('lead_id', $m->id)->whereNull('user_id')->update(['user_id' => auth()->id()]);
        if (! $creating && $m->wasChanged('stage')) {
            LeadActivity::create(['lead_id' => $m->id, 'user_id' => auth()->id(), 'type' => 'stage', 'body' => 'Stage → '.self::STAGES[$m->stage][0]]);
        }
    }
}
