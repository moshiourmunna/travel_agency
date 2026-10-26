<?php

namespace App\Services;

use App\Http\Controllers\Api\V1\MeController;
use App\Models\Booking;
use App\Models\Referral;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;

/**
 * Refer & earn: when a referred traveller completes their first trip, the referrer's wallet gets the reward (once).
 * Called when a booking becomes "completed" (nightly job, or staff marking it completed in the admin).
 */
final class ReferralService
{
    public function rewardFor(Booking $b): ?Referral
    {
        if ($b->status !== 'completed' || ! $b->user_id) {
            return null;
        }

        return DB::transaction(function () use ($b) {
            $ref = Referral::where('referred_user_id', $b->user_id)->whereIn('status', ['joined', 'invited', 'pending'])->lockForUpdate()->first();
            $referrer = $ref ? User::find($ref->referrer_id) : null;
            if (! $ref || ! $referrer) {
                return null;
            }
            $amount = (float) ($ref->reward > 0 ? $ref->reward : Settings::get('commerce.referral_reward', 500));
            $ref->update(['status' => 'won', 'reward' => $amount]);
            $first = explode(' ', (string) $ref->referred_name)[0];
            MeController::credit($referrer, $amount, ['en' => "Referral bonus — {$first} travelled", 'bn' => "রেফারেল বোনাস — {$first} ভ্রমণ করেছেন"], 'gift', $ref);

            return $ref;
        });
    }
}
