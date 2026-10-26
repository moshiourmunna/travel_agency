<?php

namespace App\Http\Presenters;

use App\Models\Booking;
use App\Models\LoyaltyTier;
use App\Models\User;
use App\Support\Img;

/** JSON shapes for the traveller portal (localised for the request locale). */
final class Account
{
    public static function user(User $u): array
    {
        $u->loadMissing('tier');
        $next = LoyaltyTier::where('min_miles', '>', (int) $u->miles)->orderBy('min_miles')->first();

        return [
            'id' => $u->ulid, 'name' => $u->name, 'first_name' => explode(' ', trim($u->name))[0], 'initials' => $u->initials(),
            'email' => $u->email, 'phone' => $u->phone, 'email_verified' => (bool) $u->email_verified_at, 'phone_verified' => (bool) $u->phone_verified_at,
            'locale' => $u->locale, 'city' => $u->city, 'dob' => $u->dob?->toDateString(), 'gender' => $u->gender,
            'miles' => (int) $u->miles, 'wallet' => (int) round((float) $u->wallet_balance), 'referral_code' => $u->referral_code,
            'tier' => $u->tier ? ['code' => $u->tier->code, 'name' => $u->tier->tr('name')] : null,
            'next_tier' => $next ? ['code' => $next->code, 'name' => $next->tr('name'), 'min_miles' => (int) $next->min_miles, 'to_go' => (int) $next->min_miles - (int) $u->miles,
                'progress' => (int) round(100 * ((int) $u->miles - (int) ($u->tier->min_miles ?? 0)) / max(1, (int) $next->min_miles - (int) ($u->tier->min_miles ?? 0)))] : null,
            'member_since' => $u->created_at?->toDateString(), 'avatar' => $u->avatar_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($u->avatar_path) : null, 'preferences' => $u->preferences ?? (object) [],
        ];
    }

    /** Booking row for lists (dashboard, My bookings). Expects items/instalments not loaded; uses columns only. */
    public static function bookingCard(Booking $b): array
    {
        $balance = (int) round(max(0, (float) $b->total - (float) $b->paid));

        return [
            'ref' => $b->ref, 'kind' => $b->kind, 'status' => $b->status, 'payment_status' => $b->payment_status,
            'title' => $b->tr('title'), 'subtitle' => $b->tr('subtitle'), 'image' => Img::key($b->image_key),
            'travel_start' => $b->travel_start?->toDateString(), 'travel_end' => $b->travel_end?->toDateString(), 'pax_count' => $b->pax_count,
            'total' => (int) round((float) $b->total), 'paid' => (int) round((float) $b->paid), 'balance' => $balance,
            'booked_on' => $b->created_at?->toDateString(), 'pnr' => $b->contact['pnr'] ?? null,
            'group' => self::group($b), 'needs_action' => $balance > 0 && ! in_array($b->status, ['cancelled', 'refunded'], true),
        ];
    }

    public static function group(Booking $b): string
    {
        if (in_array($b->status, ['cancelled', 'refunded'], true)) {
            return 'cancelled';
        }
        if ($b->status === 'completed' || ($b->travel_end ?? $b->travel_start)?->lt(today())) {
            return 'completed';
        }

        return 'upcoming';
    }
}
