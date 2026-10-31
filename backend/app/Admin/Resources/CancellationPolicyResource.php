<?php

namespace App\Admin\Resources;

use App\Admin\Col;
use App\Admin\Field;
use App\Admin\Resource;
use App\Models\CancellationPolicy;
use Illuminate\Database\Eloquent\Model;

class CancellationPolicyResource extends Resource
{
    public string $model = CancellationPolicy::class;

    public string $slug = 'cancellation-policies';

    public array $label = ['en' => 'Cancellation policies', 'bn' => 'বাতিল নীতি'];

    public array $singular = ['en' => 'Cancellation policy', 'bn' => 'বাতিল নীতি'];

    public string $icon = 'calendar-x';

    public string $perm = 'catalog';

    public function columns(): array
    {
        return [Col::tr('name', 'Policy', 'নীতি'), Col::make('code', 'Code', 'কোড'), Col::badge('kind', 'Badge', 'ব্যাজ', ['free' => ['Free cancellation', 'ফ্রি বাতিল', 'green'], 'partial' => ['Partial refund', 'আংশিক রিফান্ড', 'gold'], 'none' => ['Non-refundable', 'অফেরতযোগ্য', 'red']])];
    }

    public function sections(): array
    {
        return [['title' => ['en' => 'Policy', 'bn' => 'নীতি'], 'fields' => [
            Field::tr('name', 'Name', 'নাম')->required(),
            Field::text('code', 'Code', 'কোড')->required()->rule('alpha_dash')->half()->meta(['unique' => true]),
            Field::select('kind', 'Badge type', 'ব্যাজের ধরন', ['free' => 'Free cancellation', 'partial' => 'Partial refund', 'none' => 'Non-refundable'])->required()->half(),
            Field::trtext('description', 'Description', 'বিবরণ'),
            Field::repeater('rules', 'Refund rules', 'রিফান্ডের নিয়ম', [
                Field::number('hours_before', 'Cancelled at least … hours before travel', 'যাত্রার অন্তত … ঘণ্টা আগে বাতিল')->required()->rule('integer')->rule('min:0')->half(),
                Field::number('refund_pct', 'Refund %', 'রিফান্ড %')->required()->rule('integer')->rule('between:0,100')->half(),
            ])->help('Checked from the top; the first matching rule applies. The service fee in Settings → Commerce is deducted.', 'উপর থেকে মেলানো হয়; প্রথম মিলে যাওয়া নিয়ম প্রযোজ্য। সেটিংসের সার্ভিস ফি কাটা হবে।'),
        ]]];
    }

    public function beforeSave(Model $m, array $data, bool $creating): void
    {
        $rules = (array) $m->rules;
        usort($rules, fn ($a, $b) => ($b['hours_before'] ?? 0) <=> ($a['hours_before'] ?? 0));
        $m->rules = array_map(fn ($r) => ['refund_pct' => (int) $r['refund_pct'], 'hours_before' => (int) $r['hours_before']], $rules);
    }

    public function canDelete(Model $m): bool
    {
        foreach (['tours', 'cruises', 'activities'] as $t) {
            if (\Illuminate\Support\Facades\DB::table($t)->where('cancellation_policy_id', $m->id)->exists()) {
                return false;
            }
        }

        return true;
    }
}
