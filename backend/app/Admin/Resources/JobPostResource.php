<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\JobApplication;
use App\Models\JobPost;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class JobPostResource extends Resource
{
    public string $model = JobPost::class;

    public string $slug = 'jobs';

    public array $label = ['en' => 'Careers (jobs)', 'bn' => 'ক্যারিয়ার (চাকরি)'];

    public array $singular = ['en' => 'Job', 'bn' => 'চাকরি'];

    public string $icon = 'briefcase';

    public string $perm = 'content';

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function query(): Builder
    {
        return JobPost::query()->withCount('applications');
    }

    public function columns(): array
    {
        return [
            Col::tr('title', 'Role', 'পদ')->sortable(),
            Col::tr('department', 'Team', 'টিম')->hideMobile(),
            Col::tr('location', 'Location', 'স্থান')->hideMobile(),
            Col::number('applications_count', 'Applicants', 'আবেদনকারী'),
            Col::date('closes_on', 'Closes', 'শেষ তারিখ')->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', ['published' => ['Open', 'খোলা', 'green'], 'draft' => ['Draft', 'খসড়া', 'gray'], 'closed' => ['Closed', 'বন্ধ', 'red']]),
        ];
    }

    public function filters(): array
    {
        return [Filter::select('status', 'Status', 'অবস্থা', ['published' => 'Open', 'draft' => 'Draft', 'closed' => 'Closed'])];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Job', 'bn' => 'চাকরি'], 'fields' => [
                Field::tr('title', 'Role', 'পদ')->required(),
                Field::slug('slug', 'title')->half(),
                Field::date('closes_on', 'Applications close', 'আবেদনের শেষ তারিখ')->half(),
                Field::tr('department', 'Team', 'টিম'),
                Field::tr('location', 'Location', 'স্থান'),
                Field::tr('employment_type', 'Type (e.g. Full-time)', 'ধরন (যেমন পূর্ণকালীন)'),
                Field::tr('experience', 'Experience', 'অভিজ্ঞতা'),
                Field::trhtml('description', 'Description', 'বিবরণ')->required(),
            ]],
            ['title' => ['en' => 'Publishing', 'bn' => 'প্রকাশ'], 'aside' => true, 'fields' => [
                Field::select('status', 'Status', 'অবস্থা', ['published' => 'Open (on the website)', 'draft' => 'Draft', 'closed' => 'Closed'])->required()->default('draft'),
                Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0),
            ]],
        ];
    }

    public function canDelete(Model $m): bool
    {
        return ! JobApplication::where('job_post_id', $m->id)->exists();
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/careers');
    }
}
