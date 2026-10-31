<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaApplicationEvent;
use App\Models\VisaProduct;
use App\Services\Notify\Notifier;
use Illuminate\Database\Eloquent\Model;

class VisaApplicationResource extends Resource
{
    public string $model = VisaApplication::class;

    public string $slug = 'visa-applications';

    public array $label = ['en' => 'Visa applications', 'bn' => 'ভিসা আবেদন'];

    public array $singular = ['en' => 'Visa application', 'bn' => 'ভিসা আবেদন'];

    public string $icon = 'book-user';

    public string $perm = 'visa';

    public array $with = ['product', 'assignee', 'user'];

    public array $search = ['ref', 'applicant_name'];

    public bool $creatable = false;

    public const STAGES = [
        'submitted' => ['Submitted', 'জমা হয়েছে', 'blue', 1], 'docs' => ['Documents needed', 'ডকুমেন্ট প্রয়োজন', 'accent', 2], 'verified' => ['Documents verified', 'ডকুমেন্ট যাচাই', 'brand', 2],
        'embassy' => ['At embassy', 'দূতাবাসে', 'purple', 3], 'decision' => ['Decision due', 'সিদ্ধান্ত আসন্ন', 'gold', 4], 'approved' => ['Approved', 'অনুমোদিত', 'green', 5],
        'rejected' => ['Rejected', 'প্রত্যাখ্যাত', 'red', 5], 'delivered' => ['Passport delivered', 'পাসপোর্ট হস্তান্তর', 'green', 5],
    ];

    private bool $stageChanged = false;

    public function columns(): array
    {
        return [
            Col::make('ref', 'Ref', 'রেফ')->sortable(),
            Col::make('applicant_name', 'Applicant', 'আবেদনকারী')->sortable(),
            Col::make('product', 'Visa', 'ভিসা')->value(fn ($m) => trim(($m->product?->flag ?? '').' '.($m->product?->tr('country_name') ?? '')))->hideMobile(),
            Col::badge('stage', 'Stage', 'ধাপ', self::STAGES)->sortable(),
            Col::date('eta', 'ETA', 'সম্ভাব্য তারিখ')->sortable()->hideMobile(),
            Col::make('assignee', 'Officer', 'অফিসার')->value(fn ($m) => $m->assignee?->name)->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('stage', 'Stage', 'ধাপ', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STAGES)),
            Filter::select('visa_product_id', 'Visa', 'ভিসা', self::opts(VisaProduct::class, 'country_name')),
            Filter::select('assignee_id', 'Officer', 'অফিসার', self::staffOptions()),
        ];
    }

    public static function staffOptions(): array
    {
        return User::where('type', 'staff')->orderBy('name')->pluck('name', 'id')->all();
    }

    public function sections(): array
    {
        $states = ['done' => ['en' => 'Done', 'bn' => 'সম্পন্ন'], 'current' => ['en' => 'Current', 'bn' => 'চলমান'], 'todo' => ['en' => 'To do', 'bn' => 'বাকি']];

        return [
            ['title' => ['en' => 'Application', 'bn' => 'আবেদন'], 'fields' => [
                Field::text('applicant_name', 'Applicant', 'আবেদনকারী')->required()->half(),
                Field::select('visa_product_id', 'Visa', 'ভিসা', self::opts(VisaProduct::class, 'country_name'))->required()->half(),
                Field::select('stage', 'Stage', 'ধাপ', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STAGES))->required()->half()
                    ->help('Changing the stage adds a timeline step and sends the traveller an SMS + email.', 'ধাপ বদলালে টাইমলাইনে যোগ হবে এবং ভ্রমণকারীকে এসএমএস ও ইমেইল যাবে।'),
                Field::date('eta', 'Expected decision', 'সম্ভাব্য সিদ্ধান্তের তারিখ')->quarter(),
                Field::select('assignee_id', 'Visa officer', 'ভিসা অফিসার', self::staffOptions())->quarter(),
                Field::textarea('notes', 'Internal notes', 'অভ্যন্তরীণ নোট'),
            ]],
            ['title' => ['en' => 'Timeline (shown to the traveller)', 'bn' => 'টাইমলাইন (ভ্রমণকারী দেখবেন)'], 'fields' => [
                Field::children('events', 'Steps', 'ধাপ', [
                    Field::tr('label', 'Step', 'ধাপ')->required()->span(6),
                    Field::select('state', 'State', 'অবস্থা', $states)->required()->default('todo')->span(3),
                    Field::date('happened_on', 'Date', 'তারিখ')->span(3),
                ]),
            ]],
        ];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        $this->stageChanged = $m->isDirty('stage');
        if ($this->stageChanged) {
            $m->stage_no = self::STAGES[$m->stage][3] ?? $m->stage_no;
        }
    }

    public function afterSave(Model $m, array $data, bool $creating): void
    {
        if (! $this->stageChanged) {
            return;
        }
        $s = self::STAGES[$m->stage];
        VisaApplicationEvent::create(['visa_application_id' => $m->id, 'label' => ['en' => $s[0], 'bn' => $s[1]], 'state' => in_array($m->stage, ['approved', 'rejected', 'delivered'], true) ? 'done' : 'current', 'happened_on' => today(), 'user_id' => auth()->id()]);
        $u = $m->user_id ? User::find($m->user_id) : null;
        if ($u) {
            $loc = $u->locale ?: 'en';
            app(Notifier::class)->send('visa_stage', ['ref' => $m->ref, 'stage' => $loc === 'bn' ? $s[1] : $s[0], 'eta' => $m->eta?->toDateString() ?? '—'],
                ['email' => $u->email, 'phone' => $u->phone, 'name' => $u->name], $loc, $u, [], config('musafir.frontend_url')."/{$loc}/account/visa");
        }
    }

    public function detail(Model $m): ?array
    {
        $docs = $m->documents()->get();

        return [
            ['label' => tr_pick(['en' => 'Traveller account', 'bn' => 'ভ্রমণকারীর অ্যাকাউন্ট']), 'value' => $m->user ? $m->user->name.' · '.$m->user->email : '—', 'href' => $m->user_id ? route('admin.resource.edit', ['customers', $m->user_id], false) : null],
            ['label' => tr_pick(['en' => 'Booking', 'bn' => 'বুকিং']), 'value' => $m->booking_id ? \App\Models\Booking::whereKey($m->booking_id)->value('ref') : '—', 'href' => $m->booking_id ? route('admin.bookings.show', $m->booking_id, false) : null],
            ['label' => tr_pick(['en' => 'Documents', 'bn' => 'ডকুমেন্ট']), 'type' => 'list', 'value' => $docs->map(fn ($d) => ['text' => $d->label.' — '.$d->status, 'href' => route('admin.files.document', $d->id, false), 'badge' => $d->status])->all(),
                'more' => ['label' => tr_pick(['en' => 'Verify documents', 'bn' => 'ডকুমেন্ট যাচাই']), 'href' => route('admin.resource.index', ['documents', 'f[application]' => $m->id], false)]],
        ];
    }
}
