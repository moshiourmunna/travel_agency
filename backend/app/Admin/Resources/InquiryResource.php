<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Inquiry;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class InquiryResource extends Resource
{
    public string $model = Inquiry::class;

    public string $slug = 'inquiries';

    public array $label = ['en' => 'Enquiries', 'bn' => 'অনুসন্ধান'];

    public array $singular = ['en' => 'Enquiry', 'bn' => 'অনুসন্ধান'];

    public string $icon = 'inbox';

    public string $perm = 'leads';

    public array $search = ['name', 'email', 'phone', 'payload'];

    public bool $creatable = false;

    public const STATUS = ['new' => ['New', 'নতুন', 'accent'], 'in_progress' => ['In progress', 'চলমান', 'blue'], 'closed' => ['Closed', 'বন্ধ', 'green'], 'spam' => ['Spam', 'স্প্যাম', 'gray']];

    public const TYPES = ['contact' => 'Contact', 'custom-tour' => 'Custom tour', 'group-tour' => 'Group tour', 'insurance' => 'Insurance', 'careers' => 'Careers', 'quote' => 'Quote / booking request', 'visa' => 'Visa', 'hotel' => 'Hotel', 'flight' => 'Flight', 'planner' => 'Trip planner'];

    public function columns(): array
    {
        return [
            Col::datetime('created_at', 'Received', 'প্রাপ্তি')->sortable(),
            Col::make('type', 'Type', 'ধরন')->value(fn ($m) => self::TYPES[$m->type] ?? $m->type),
            Col::make('name', 'Name', 'নাম')->sortable(),
            Col::make('contact', 'Contact', 'যোগাযোগ')->value(fn ($m) => trim($m->phone.' '.$m->email))->hideMobile(),
            Col::make('message', 'Message', 'বার্তা')->value(fn ($m) => Str::limit((string) ($m->payload['message'] ?? $m->payload['notes'] ?? json_encode($m->payload, JSON_UNESCAPED_UNICODE)), 70))->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS)->sortable(),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)), Filter::select('type', 'Type', 'ধরন', self::TYPES)];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Follow-up', 'bn' => 'ফলো-আপ'], 'fields' => [
            Field::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))->required(),
        ]]];
    }

    public function detail(Model $m): ?array
    {
        $rows = [
            ['label' => tr_pick(['en' => 'Type', 'bn' => 'ধরন']), 'value' => self::TYPES[$m->type] ?? $m->type],
            ['label' => tr_pick(['en' => 'Name', 'bn' => 'নাম']), 'value' => $m->name],
            ['label' => tr_pick(['en' => 'Email', 'bn' => 'ইমেইল']), 'value' => $m->email, 'href' => $m->email ? 'mailto:'.$m->email : null],
            ['label' => tr_pick(['en' => 'Phone', 'bn' => 'ফোন']), 'value' => $m->phone, 'href' => $m->phone ? 'tel:'.$m->phone : null],
            ['label' => tr_pick(['en' => 'Language', 'bn' => 'ভাষা']), 'value' => $m->locale],
        ];
        foreach ((array) $m->payload as $k => $v) {
            $rows[] = ['label' => \App\Admin\Field::humanize((string) $k), 'value' => is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : (string) $v, 'type' => is_array($v) ? 'pre' : 'text'];
        }
        if ($m->lead_id) {
            $rows[] = ['label' => tr_pick(['en' => 'Lead', 'bn' => 'লিড']), 'value' => Lead::whereKey($m->lead_id)->value('code'), 'href' => route('admin.resource.edit', ['leads', $m->lead_id], false)];
        }

        return $rows;
    }

    public function actions(): array
    {
        return [
            Action::make('lead', 'Create sales lead', 'সেলস লিড তৈরি')->permission('leads.manage')->icon('user-plus')->primary()
                ->visible(fn ($m) => ! $m->lead_id)
                ->handle(function ($m, $d, $u) {
                    $need = (string) ($m->payload['message'] ?? $m->payload['destination'] ?? self::TYPES[$m->type] ?? $m->type);
                    $lead = Lead::create(['code' => 'LD-'.random_int(4000, 99999), 'name' => $m->name ?: 'Unknown', 'phone' => $m->phone, 'email' => $m->email,
                        'need' => ['en' => Str::limit($need, 180), 'bn' => Str::limit($need, 180)], 'source' => ['en' => 'Website enquiry', 'bn' => 'ওয়েবসাইট অনুসন্ধান'], 'source_key' => 'website-enquiry',
                        'stage' => 'new', 'owner_id' => $u->id, 'value' => 0]);
                    $m->update(['lead_id' => $lead->id, 'status' => 'in_progress']);

                    return app()->getLocale() === 'bn' ? "লিড {$lead->code} তৈরি হয়েছে।" : "Lead {$lead->code} created.";
                }),
            Action::make('close', 'Mark closed', 'বন্ধ করুন')->permission('leads.manage')->icon('check')->bulk()->visible(fn ($m) => $m->status !== 'closed')
                ->handle(fn ($m) => $m->update(['status' => 'closed']) ? null : null),
            Action::make('spam', 'Mark as spam', 'স্প্যাম')->permission('leads.manage')->icon('ban')->danger()->bulk()->visible(fn ($m) => $m->status !== 'spam')
                ->handle(fn ($m) => $m->update(['status' => 'spam']) ? null : null),
        ];
    }
}
