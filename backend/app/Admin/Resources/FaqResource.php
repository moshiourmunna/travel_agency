<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\Faq;
use App\Models\FaqCategory;
use Illuminate\Database\Eloquent\Model;

class FaqResource extends Resource
{
    public string $model = Faq::class;

    public string $slug = 'faqs';

    public array $label = ['en' => 'FAQs', 'bn' => 'প্রশ্নোত্তর'];

    public array $singular = ['en' => 'Question', 'bn' => 'প্রশ্ন'];

    public string $icon = 'circle-help';

    public string $perm = 'content';

    public array $with = ['category'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public const SHOW_ON = ['faq' => ['en' => 'FAQ page', 'bn' => 'প্রশ্নোত্তর পেজ'], 'home' => ['en' => 'Home page', 'bn' => 'হোম পেজ'], 'tour' => ['en' => 'Tour pages', 'bn' => 'ট্যুর পেজ'], 'visa' => ['en' => 'Visa pages', 'bn' => 'ভিসা পেজ']];

    public function columns(): array
    {
        return [
            Col::tr('question', 'Question', 'প্রশ্ন'),
            Col::make('category', 'Category', 'ক্যাটাগরি')->value(fn ($m) => $m->category?->tr('name'))->hideMobile(),
            Col::make('show_on', 'Shown on', 'যেখানে দেখায়')->value(fn ($m) => implode(', ', array_map(fn ($k) => tr_pick(self::SHOW_ON[$k] ?? $k), (array) $m->show_on)))->hideMobile(),
            Col::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::select('faq_category_id', 'Category', 'ক্যাটাগরি', self::opts(FaqCategory::class)),
            Filter::select('show_on', 'Shown on', 'যেখানে দেখায়', self::SHOW_ON)->apply(fn ($q, $v) => $q->whereJsonContains('show_on', $v)),
            Filter::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Question', 'bn' => 'প্রশ্ন'], 'fields' => [
            Field::tr('question', 'Question', 'প্রশ্ন')->required(),
            Field::trtext('answer', 'Answer', 'উত্তর')->required(),
            Field::select('faq_category_id', 'Category', 'ক্যাটাগরি', self::opts(FaqCategory::class))->required()->half(),
            Field::checks('show_on', 'Show on', 'যেখানে দেখাবে', self::SHOW_ON)->half(),
            Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true)->half(),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/faq');
    }
}
