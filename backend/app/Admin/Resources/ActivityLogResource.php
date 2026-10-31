<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Activity;

class ActivityLogResource extends Resource
{
    public string $model = Activity::class;

    public string $slug = 'activity-log';

    public array $label = ['en' => 'Activity log', 'bn' => 'কার্যকলাপ লগ'];

    public array $singular = ['en' => 'Activity', 'bn' => 'কার্যকলাপ'];

    public string $icon = 'history';

    public string $perm = 'logs';

    public array $abilities = ['view' => 'logs.view', 'manage' => 'logs.view'];

    public array $with = ['causer'];

    public array $search = ['description', 'properties'];

    public bool $creatable = false;

    public bool $editable = false;

    public bool $deletable = false;

    public function columns(): array
    {
        return [
            Col::datetime('created_at', 'When', 'কখন')->sortable(),
            Col::make('causer', 'Who', 'কে')->value(fn ($m) => $m->causer?->name ?? 'System'),
            Col::badge('event', 'Action', 'কাজ', ['created' => ['Created', 'তৈরি', 'green'], 'updated' => ['Updated', 'হালনাগাদ', 'blue'], 'deleted' => ['Deleted', 'মোছা', 'red'], 'restored' => ['Restored', 'পুনরুদ্ধার', 'gold']]),
            Col::make('subject', 'Record', 'রেকর্ড')->value(fn ($m) => trim(($m->properties['resource'] ?? class_basename((string) $m->subject_type)).' · '.($m->properties['title'] ?? ('#'.$m->subject_id)), ' ·#')),
            Col::make('description', 'Details', 'বিবরণ')->hideMobile(),
            Col::make('log_name', 'Area', 'ক্ষেত্র')->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('log_name', 'Area', 'ক্ষেত্র', Activity::query()->distinct()->orderBy('log_name')->pluck('log_name', 'log_name')->filter()->all()),
            Filter::select('causer_id', 'Who', 'কে', User::where('type', 'staff')->orderBy('name')->pluck('name', 'id')->all()),
            Filter::select('event', 'Action', 'কাজ', ['created' => 'Created', 'updated' => 'Updated', 'deleted' => 'Deleted', 'restored' => 'Restored']),
        ];
    }

    public function sections(): array
    {
        return [];
    }

    public function applySearch(\Illuminate\Database\Eloquent\Builder $q, string $term): void
    {
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
        $q->where(fn ($w) => $w->where('description', 'like', $like)->orWhere('properties', 'like', $like));
    }

    public function title(Model $m): string
    {
        return '#'.$m->id.' · '.$m->description;
    }

    public function detail(Model $m): ?array
    {
        $p = $m->properties?->toArray() ?? [];
        $old = (array) ($p['old'] ?? []);
        $new = (array) ($p['attributes'] ?? []);
        $rows = [];
        foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $k) {
            $rows[] = ['field' => $k, 'old' => $old[$k] ?? null, 'new' => $new[$k] ?? null];
        }
        $extra = array_diff_key($p, array_flip(['old', 'attributes']));

        return [
            ['label' => tr_pick(['en' => 'When', 'bn' => 'কখন']), 'value' => $m->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i:s')],
            ['label' => tr_pick(['en' => 'Who', 'bn' => 'কে']), 'value' => $m->causer?->name ?? 'System'],
            ['label' => tr_pick(['en' => 'Record', 'bn' => 'রেকর্ড']), 'value' => trim(class_basename((string) $m->subject_type).' #'.$m->subject_id)],
            ['label' => tr_pick(['en' => 'Changes', 'bn' => 'পরিবর্তন']), 'type' => 'diff', 'value' => $rows],
            ['label' => tr_pick(['en' => 'Other details', 'bn' => 'অন্যান্য তথ্য']), 'type' => 'json', 'value' => $extra ?: null],
        ];
    }
}
