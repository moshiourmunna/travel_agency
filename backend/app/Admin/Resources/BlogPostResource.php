<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Filter;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\BlogCategory;
use App\Models\BlogPost;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Model;

class BlogPostResource extends Resource
{
    public string $model = BlogPost::class;

    public string $slug = 'blog-posts';

    public array $label = ['en' => 'Blog posts', 'bn' => 'ব্লগ পোস্ট'];

    public array $singular = ['en' => 'Blog post', 'bn' => 'ব্লগ পোস্ট'];

    public string $icon = 'newspaper';

    public string $perm = 'content';

    public array $with = ['image.media', 'category'];

    public string $defaultSort = '-published_at';

    public function columns(): array
    {
        return [
            Col::image('image'),
            Col::tr('title', 'Title', 'শিরোনাম')->sortable(),
            Col::make('category', 'Category', 'ক্যাটাগরি')->value(fn ($m) => $m->category?->tr('name'))->hideMobile(),
            Col::badge('status', 'Status', 'অবস্থা', self::statusBadges()),
            Col::datetime('published_at', 'Published', 'প্রকাশ')->sortable()->hideMobile(),
        ];
    }

    public function filters(): array
    {
        return [Filter::status(), Filter::select('blog_category_id', 'Category', 'ক্যাটাগরি', self::opts(BlogCategory::class))];
    }

    public function sections(): array
    {
        return [
            ['title' => ['en' => 'Post', 'bn' => 'পোস্ট'], 'tab' => C::T_CONTENT, 'fields' => [
                Field::tr('title', 'Title', 'শিরোনাম')->required(),
                Field::slug('slug', 'title')->half(),
                Field::select('blog_category_id', 'Category', 'ক্যাটাগরি', self::opts(BlogCategory::class))->required()->half(),
                Field::trtext('excerpt', 'Excerpt', 'সারাংশ')->required(),
                Field::trhtml('body', 'Article', 'নিবন্ধ')->required()->help('Headings (H2) build the table of contents.', 'হেডিং (H2) দিয়ে সূচিপত্র তৈরি হয়।'),
                Field::tr('author_name', 'Author name', 'লেখকের নাম')->half(),
                Field::number('reading_mins', 'Reading time (min)', 'পড়ার সময় (মিনিট)')->rule('integer')->quarter(),
                Field::multi('tags', 'Tags', 'ট্যাগ', self::opts(Tag::class))->span(12),
            ]],
            ['title' => ['en' => 'Cover', 'bn' => 'কভার'], 'tab' => C::T_MEDIA, 'fields' => [Field::image('image_id', 'Cover photo', 'কভার ছবি')]],
            C::seo(),
            C::publish(true, true, false),
        ];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        if (! $m->reading_mins) {
            $words = str_word_count(strip_tags((string) ($m->getTranslations('body')['en'] ?? '')));
            $m->reading_mins = max(1, (int) round($words / 200));
        }
        if ($creating && ! $m->author_id) {
            $m->author_id = auth()->id();
        }
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/blog/'.$m->slug);
    }
}
