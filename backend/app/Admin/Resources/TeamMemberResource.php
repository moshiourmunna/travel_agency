<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Admin\Resources\Concerns\Common as C;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Model;

class TeamMemberResource extends Resource
{
    public string $model = TeamMember::class;

    public string $slug = 'team';

    public array $label = ['en' => 'Team', 'bn' => 'টিম'];

    public array $singular = ['en' => 'Team member', 'bn' => 'টিম সদস্য'];

    public string $icon = 'users';

    public string $perm = 'content';

    public array $with = ['photo.media'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public const SOCIALS = ['linkedin' => 'LinkedIn', 'facebook' => 'Facebook', 'instagram' => 'Instagram', 'x' => 'X (Twitter)', 'email' => 'Email'];

    public function columns(): array
    {
        return [
            Col::image('photo'),
            Col::tr('name', 'Name', 'নাম')->sortable(),
            Col::tr('role', 'Role', 'পদ'),
            Col::number('countries_visited', 'Countries', 'দেশ')->hideMobile(),
            Col::bool('is_active', 'Visible', 'দৃশ্যমান'),
        ];
    }

    public function sections(): array
    {
        $socials = [];
        foreach (self::SOCIALS as $k => $label) {
            $socials[] = Field::text('social_'.$k, $label, $label)->half()->rule('max:255')
                ->get(fn ($m) => $m?->exists ? (($m->socials ?? [])[$k] ?? null) : null)
                ->set(function ($m, $v) use ($k) {
                    $s = (array) ($m->socials ?? []);
                    if ($v) {
                        $s[$k] = $v;
                    } else {
                        unset($s[$k]);
                    }
                    $m->socials = $s ?: null;
                });
        }

        return [
            ['title' => ['en' => 'Profile', 'bn' => 'প্রোফাইল'], 'fields' => [
                Field::tr('name', 'Name', 'নাম')->required(),
                Field::tr('role', 'Role', 'পদ')->required(),
                Field::trtext('bio', 'Short bio', 'সংক্ষিপ্ত পরিচিতি'),
                Field::text('initials', 'Initials', 'আদ্যক্ষর')->rule('max:3')->third(),
                Field::select('gradient', 'Card colour', 'কার্ডের রং', ['brand' => 'Brand', 'teal' => 'Teal', 'gold' => 'Gold', 'rose' => 'Rose', 'violet' => 'Violet', 'sky' => 'Sky'])->third(),
                Field::number('countries_visited', 'Countries visited', 'ভ্রমণকৃত দেশ')->rule('integer')->rule('min:0')->third(),
            ]],
            ['title' => ['en' => 'Social links', 'bn' => 'সোশ্যাল লিংক'], 'fields' => $socials],
            ['title' => ['en' => 'Display', 'bn' => 'প্রদর্শন'], 'aside' => true, 'fields' => [
                Field::image('photo_id', 'Photo', 'ছবি'),
                Field::switch('is_active', 'Visible', 'দৃশ্যমান')->default(true),
                Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0),
            ]],
        ];
    }

    public function publicUrl(Model $m): ?string
    {
        return C::site('/team');
    }
}
