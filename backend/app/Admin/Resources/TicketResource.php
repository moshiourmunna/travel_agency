<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class TicketResource extends Resource
{
    public string $model = SupportTicket::class;

    public string $slug = 'tickets';

    public array $label = ['en' => 'Support tickets', 'bn' => 'সাপোর্ট টিকিট'];

    public array $singular = ['en' => 'Ticket', 'bn' => 'টিকিট'];

    public string $icon = 'life-buoy';

    public string $perm = 'tickets';

    public array $with = ['user', 'assignee'];

    public array $search = ['ref', 'subject', 'customer_name'];

    public string $defaultSort = '-last_activity_at';

    public bool $creatable = false;

    public bool $editable = false;

    public bool $deletable = false;

    public const STATUS = ['open' => ['Open', 'খোলা', 'accent'], 'awaiting' => ['Awaiting customer', 'গ্রাহকের উত্তরের অপেক্ষায়', 'blue'], 'resolved' => ['Resolved', 'সমাধান হয়েছে', 'green'], 'closed' => ['Closed', 'বন্ধ', 'gray']];

    public const PRIORITY = ['low' => ['Low', 'কম', 'gray'], 'normal' => ['Normal', 'স্বাভাবিক', 'blue'], 'high' => ['High', 'বেশি', 'gold'], 'urgent' => ['Urgent', 'জরুরি', 'red']];

    public function columns(): array
    {
        return [
            Col::make('ref', 'Ticket', 'টিকিট')->sortable(),
            Col::tr('subject', 'Subject', 'বিষয়'),
            Col::make('customer', 'Customer', 'গ্রাহক')->value(fn ($m) => $m->user?->name ?? $m->customer_name)->hideMobile(),
            Col::badge('priority', 'Priority', 'অগ্রাধিকার', self::PRIORITY)->sortable(),
            Col::make('assignee', 'Assigned to', 'দায়িত্বপ্রাপ্ত')->value(fn ($m) => $m->assignee?->name ?? '—')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS),
            Col::datetime('last_activity_at', 'Last activity', 'শেষ কার্যকলাপ')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)),
            Filter::select('priority', 'Priority', 'অগ্রাধিকার', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::PRIORITY)),
            Filter::select('assignee_id', 'Assigned to', 'দায়িত্বপ্রাপ্ত', ['me' => ['en' => 'Me', 'bn' => 'আমি'], 'none' => ['en' => 'Unassigned', 'bn' => 'অনির্ধারিত']] + User::where('type', 'staff')->orderBy('name')->pluck('name', 'id')->all())
                ->apply(fn ($q, $v) => $v === 'me' ? $q->where('assignee_id', auth()->id()) : ($v === 'none' ? $q->whereNull('assignee_id') : $q->where('assignee_id', $v))),
        ];
    }

    public function sections(): array
    {
        return [];
    }

    public function link(Model $m): ?string
    {
        return route('admin.tickets.show', $m->id, false);
    }
}
