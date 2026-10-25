<?php

namespace App\Services\Checkout;

use App\Models\Booking;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/** Coupon rules: status + validity window, product kinds, minimum spend, global and per-user caps, first-booking only. */
final class CouponService
{
    /** @return array{coupon: Coupon, discount: int} */
    public function evaluate(string $code, string $kind, int $subtotal, ?User $user = null, ?string $email = null): array
    {
        $code = strtoupper(trim($code));
        $c = Coupon::where('code', $code)->first();
        $fail = fn (string $m) => throw ValidationException::withMessages(['coupon' => $m]);
        if (! $c || $c->status === 'disabled') {
            $fail(__('This promo code is not valid.'));
        }
        $now = now();
        if (($c->valid_from && $now->lt($c->valid_from)) || $c->status === 'scheduled') {
            $fail(__('This promo code is not active yet.'));
        }
        if (($c->valid_to && $now->gt($c->valid_to)) || $c->status === 'expired') {
            $fail(__('This promo code has expired.'));
        }
        if ($c->max_uses !== null && $c->used >= $c->max_uses) {
            $fail(__('This promo code has been fully used.'));
        }
        $scope = (array) ($c->scope ?? []);
        if (! empty($scope['kinds']) && ! in_array($kind, $scope['kinds'], true)) {
            $fail(__('This promo code does not apply to this booking.'));
        }
        if ($c->min_spend !== null && $subtotal < (float) $c->min_spend) {
            $fail(__('Spend at least ৳ :min to use this code.', ['min' => number_format((float) $c->min_spend)]));
        }
        if (! empty($scope['first_booking'])) {
            $previous = Booking::query()->whereNotIn('status', ['cancelled'])->where('payment_status', '!=', 'unpaid')
                ->where(fn ($q) => $q->when($user, fn ($q) => $q->orWhere('user_id', $user->id))->when($email, fn ($q) => $q->orWhere('contact->email', $email)))
                ->when(! $user && ! $email, fn ($q) => $q->whereRaw('1=0'))
                ->exists();
            if ($previous) {
                $fail(__('This promo code is for your first booking only.'));
            }
        }
        if ($user && $c->max_uses_per_user !== null && CouponRedemption::where('coupon_id', $c->id)->where('user_id', $user->id)->count() >= $c->max_uses_per_user) {
            $fail(__('You have already used this promo code.'));
        }
        $discount = $c->type === 'fixed' ? (float) $c->value : $subtotal * (float) $c->value / 100;
        if ($c->max_discount !== null) {
            $discount = min($discount, (float) $c->max_discount);
        }

        return ['coupon' => $c, 'discount' => (int) round(min($discount, $subtotal))];
    }
}
