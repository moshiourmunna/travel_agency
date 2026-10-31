<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\LoyaltyTier;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class LoyaltyTierResource extends Resource
{
    public string $model = LoyaltyTier::class;

    public string $slug = 'loyalty-tiers';

    public array $label = ['en' => 'Loyalty tiers', 'bn' => 'লয়্যালটি টিয়ার'];

    public array $singular = ['en' => 'Tier', 'bn' => 'টিয়ার'];

    public string $icon = 'award';

    public string $perm = 'settings';

    public array $abilities = ['view' => 'settings.manage'];

    public string $defaultSort = 'sort';

    public ?string $reorder = 'sort';

    public function query(): Builder
    {
        return LoyaltyTier::query()->withCount('users');
    }

    public function columns(): array
    {
        return [
            Col::tr('name', 'Tier', 'টিয়ার'),
            Col::make('code', 'Code', 'কোড'),
            Col::number('min_miles', 'From (Miles)', 'শুরু (মাইলস)')->sortable(),
            Col::make('miles_multiplier', 'Miles earn', 'মাইলস আয়')->value(fn ($m) => '×'.rtrim(rtrim(number_format((float) $m->miles_multiplier, 2), '0'), '.')),
            Col::number('users_count', 'Members', 'সদস্য'),
        ];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Tier', 'bn' => 'টিয়ার'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->third()->meta(['unique' => true]),
            Field::number('min_miles', 'Starts at (Miles)', 'শুরু (মাইলস)')->required()->rule('integer')->rule('min:0')->third(),
            Field::number('miles_multiplier', 'Miles multiplier', 'মাইলস গুণক')->required()->rule('between:0.1,10')->default(1)->third(),
            Field::trlist('perks', 'Perks', 'সুবিধা'),
            Field::number('sort', 'Order', 'ক্রম')->rule('integer')->default(0)->half(),
        ]]];
    }

    public function canDelete(Model $m): bool
    {
        return ! User::where('tier_id', $m->id)->exists();
    }
}
