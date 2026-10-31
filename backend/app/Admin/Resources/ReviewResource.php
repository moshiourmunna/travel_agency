<?php

namespace App\Admin\Resources;

use App\Admin\Action;
use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Database\Eloquent\Model;

class ReviewResource extends Resource
{
    public string $model = Review::class;

    public string $slug = 'reviews';

    public array $label = ['en' => 'Reviews', 'bn' => 'রিভিউ'];

    public array $singular = ['en' => 'Review', 'bn' => 'রিভিউ'];

    public string $icon = 'star';

    public string $perm = 'reviews';

    public array $abilities = ['view' => 'reviews.moderate', 'manage' => 'reviews.moderate', 'delete' => 'reviews.moderate'];

    public bool $creatable = false;

    public array $with = ['reviewable'];

    public const STATUS = ['review' => ['Awaiting moderation', 'মডারেশনের অপেক্ষায়', 'accent'], 'published' => ['Published', 'প্রকাশিত', 'green'], 'hidden' => ['Hidden', 'লুকানো', 'gray']];

    public function columns(): array
    {
        return [
            Col::tr('author_name', 'Traveller', 'ভ্রমণকারী'),
            Col::make('rating', 'Rating', 'রেটিং')->value(fn ($m) => str_repeat('★', (int) $m->rating))->sortable('rating'),
            Col::tr('title', 'Review', 'রিভিউ'),
            Col::make('about', 'About', 'বিষয়')->value(fn ($m) => $m->reviewable ? $m->reviewable->tr(in_array('title', $m->reviewable->translatable ?? [], true) ? 'title' : 'name') : $m->tr('trip_title'))->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::STATUS),
            Col::datetime('created_at', 'Received', 'প্রাপ্তি')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS)),
            Filter::select('rating', 'Rating', 'রেটিং', [5 => '5★', 4 => '4★', 3 => '3★', 2 => '2★', 1 => '1★']),
        ];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Review', 'bn' => 'রিভিউ'], 'fields' => [
                Field::tr('author_name', 'Name shown', 'প্রদর্শিত নাম')->required(),
                Field::tr('author_city', 'City', 'শহর'),
                Field::tr('trip_title', 'Trip', 'ট্রিপ'),
                Field::tr('title', 'Headline', 'শিরোনাম'),
                Field::trtext('body', 'Review', 'রিভিউ')->required(),
                Field::number('rating', 'Rating', 'রেটিং')->readonly()->third(),
                Field::date('travelled_on', 'Travelled', 'ভ্রমণের তারিখ')->third(),
            ]],
            ['title' => ['en' => 'Our reply', 'bn' => 'আমাদের উত্তর'], 'fields' => [
                Field::trtext('reply', 'Public reply from Musafir', 'মুসাফিরের পাবলিক উত্তর'),
            ]],
            ['title' => ['en' => 'Moderation', 'bn' => 'মডারেশন'], 'aside' => true, 'fields' => [
                Field::select('status', 'Status', 'অবস্থা', array_map(fn ($s) => ['en' => $s[0], 'bn' => $s[1]], self::STATUS))->required()
                    ->help('Publishing awards the traveller their review Miles once.', 'প্রকাশ করলে ভ্রমণকারী একবার রিভিউ মাইলস পান।')
                    ->set(fn ($m, $v) => null) // applied through ReviewService after save,
            ]],
        ];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        $tr = $m->getTranslations('reply');
        if ($m->isDirty('reply') && array_filter($tr)) {
            $m->replied_by = auth()->id();
            $m->replied_at = now();
        }
    }

    public function afterSave(Model $m, array $data, bool $creating): void
    {
        if (isset($data['status']) && $data['status'] !== $m->status && isset(self::STATUS[$data['status']])) {
            app(ReviewService::class)->setStatus($m, $data['status']);
        }
    }

    public function actions(): array
    {
        $set = fn (string $s) => function ($m) use ($s) {
            app(ReviewService::class)->setStatus($m, $s);

            return null;
        };

        return [
            Action::make('publish', 'Publish', 'প্রকাশ করুন')->icon('check')->primary()->bulk()->visible(fn ($m) => $m->status !== 'published')->handle($set('published')),
            Action::make('hide', 'Hide', 'লুকান')->icon('eye-off')->bulk()->visible(fn ($m) => $m->status !== 'hidden')->handle($set('hidden')),
        ];
    }
}
