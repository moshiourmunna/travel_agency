<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\JobApplication;
use App\Models\JobPost;
use Illuminate\Database\Eloquent\Model;

class JobApplicationResource extends Resource
{
    public string $model = JobApplication::class;

    public string $slug = 'job-applications';

    public array $label = ['en' => 'Job applications', 'bn' => 'চাকরির আবেদন'];

    public array $singular = ['en' => 'Application', 'bn' => 'আবেদন'];

    public string $icon = 'file-user';

    public string $perm = 'content';

    public array $abilities = ['view' => 'staff.manage', 'manage' => 'staff.manage', 'delete' => 'staff.manage'];

    public bool $creatable = false;

    public array $with = ['job'];

    public array $search = ['name', 'email', 'phone'];

    public const STATUS = ['new' => ['New', 'নতুন', 'accent'], 'shortlisted' => ['Shortlisted', 'শর্টলিস্টেড', 'blue'], 'interview' => ['Interview', 'সাক্ষাৎকার', 'violet'], 'hired' => ['Hired', 'নিয়োগপ্রাপ্ত', 'green'], 'rejected' => ['Not selected', 'নির্বাচিত হয়নি', 'gray']];

    public function columns(): array
    {
        return [
            Col::make('name', 'Applicant', 'আবেদনকারী')->sortable(),
            Col::make('job', 'Role', 'পদ')->value(fn ($m) => $m->job?->tr('title')),
            Col::make('email', 'Email', 'ইমেইল')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS),
            Col::datetime('created_at', 'Applied', 'আবেদন')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('job_post_id', 'Role', 'পদ', self::opts(JobPost::class, 'title')),
            Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Application', 'bn' => 'আবেদন'], 'fields' => [
            Field::text('name', 'Name', 'নাম')->readonly()->half(),
            Field::text('phone', 'Phone', 'ফোন')->readonly()->half(),
            Field::email('email', 'Email', 'ইমেইল')->readonly()->half(),
            Field::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))->required()->half(),
            Field::textarea('cover_letter', 'Cover letter', 'কভার লেটার')->readonly(),
        ]]];
    }

    public function detail(Model $m): ?array
    {
        return [
            ['label' => tr_pick(['en' => 'Role', 'bn' => 'পদ']), 'value' => $m->job?->tr('title')],
            ['label' => tr_pick(['en' => 'CV', 'bn' => 'সিভি']), 'type' => 'link', 'value' => $m->cv_path ? route('admin.files.cv', $m->id, false) : null, 'text' => tr_pick(['en' => 'Download CV', 'bn' => 'সিভি ডাউনলোড'])],
        ];
    }
}
