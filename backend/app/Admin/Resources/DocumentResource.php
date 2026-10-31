<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Document;
use App\Models\VisaApplication;
use App\Models\VisaApplicationEvent;
use Illuminate\Database\Eloquent\Model;

class DocumentResource extends Resource
{
    public string $model = Document::class;

    public string $slug = 'documents';

    public array $label = ['en' => 'Visa documents', 'bn' => 'ভিসা ডকুমেন্ট'];

    public array $singular = ['en' => 'Document', 'bn' => 'ডকুমেন্ট'];

    public string $icon = 'file-check';

    public string $perm = 'visa';

    public array $abilities = ['manage' => 'visa.documents'];

    public bool $creatable = false;

    public bool $editable = false;

    public array $search = ['label'];

    public const STATUS = ['pending' => ['Pending check', 'যাচাই বাকি', 'accent'], 'verified' => ['Verified', 'যাচাইকৃত', 'green'], 'rejected' => ['Rejected', 'প্রত্যাখ্যাত', 'red']];

    public function query(): \Illuminate\Database\Eloquent\Builder
    {
        return Document::query()->where('owner_type', VisaApplication::class);
    }

    public function columns(): array
    {
        return [
            Col::make('label', 'Document', 'ডকুমেন্ট'),
            Col::make('application', 'Application', 'আবেদন')->value(fn ($m) => VisaApplication::whereKey($m->owner_id)->value('ref').' · '.VisaApplication::whereKey($m->owner_id)->value('applicant_name')),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS)->sortable(),
            Col::make('rejected_reason', 'Reason', 'কারণ')->hideMobile(),
            Col::datetime('created_at', 'Uploaded', 'আপলোড')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)),
            Filter::select('application', 'Application', 'আবেদন', VisaApplication::orderByDesc('id')->pluck('ref', 'id')->all())->apply(fn ($q, $v) => $q->where('owner_id', (int) $v)),
        ];
    }

    public function detail(Model $m): ?array
    {
        return [
            ['label' => tr_pick(['en' => 'File', 'bn' => 'ফাইল']), 'value' => basename((string) $m->path).' ('.$m->mime.', '.number_format(((int) $m->size) / 1024, 0).' KB)', 'href' => route('admin.files.document', $m->id, false), 'download' => true],
            ['label' => tr_pick(['en' => 'Application', 'bn' => 'আবেদন']), 'value' => VisaApplication::whereKey($m->owner_id)->value('ref'), 'href' => route('admin.resource.edit', ['visa-applications', $m->owner_id], false)],
            ['label' => tr_pick(['en' => 'Status', 'bn' => 'অবস্থা']), 'value' => $m->status.($m->rejected_reason ? ' — '.$m->rejected_reason : '')],
        ];
    }

    public function actions(): array
    {
        $event = function (Document $d, string $en, string $bn) {
            VisaApplicationEvent::create(['visa_application_id' => $d->owner_id, 'label' => ['en' => $en, 'bn' => $bn], 'state' => 'done', 'happened_on' => today(), 'user_id' => auth()->id()]);
        };

        return [
            Action::make('verify', 'Mark verified', 'যাচাইকৃত চিহ্নিত')->permission('visa.documents')->icon('check')->primary()->bulk()
                ->visible(fn ($m) => $m->status !== 'verified')
                ->handle(function ($m) use ($event) {
                    $m->update(['status' => 'verified', 'rejected_reason' => null]);
                    $event($m, 'Document verified: '.$m->label, 'ডকুমেন্ট যাচাইকৃত: '.$m->label);

                    return null;
                }),
            Action::make('reject', 'Reject', 'প্রত্যাখ্যান')->permission('visa.documents')->icon('x')->danger()
                ->visible(fn ($m) => $m->status !== 'rejected')
                ->fields([Field::text('reason', 'Reason shown to the traveller', 'কারণ (ভ্রমণকারী দেখবেন)')->required()->rule('max:180')])
                ->handle(function ($m, $d) use ($event) {
                    $m->update(['status' => 'rejected', 'rejected_reason' => $d['reason']]);
                    $event($m, 'Please re-upload: '.$m->label.' ('.$d['reason'].')', 'আবার আপলোড করুন: '.$m->label.' ('.$d['reason'].')');
                    VisaApplication::whereKey($m->owner_id)->where('stage', '!=', 'docs')->whereNotIn('stage', ['approved', 'rejected', 'delivered'])->update(['stage' => 'docs', 'stage_no' => 2]);

                    return null;
                }),
        ];
    }
}
