<?php

namespace App\Services\Checkout;

use App\Models\ActivitySlot;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\BookingDocument;
use App\Models\CouponRedemption;
use App\Models\CruiseSailing;
use App\Models\GiftCard;
use App\Models\Instalment;
use App\Models\MilesTransaction;
use App\Models\Payment;
use App\Models\TourDeparture;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaApplicationEvent;
use App\Services\Notify\Notifier;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Creates bookings from a server-side quote, holds inventory, and settles payments (idempotently). */
final class BookingService
{
    public const HOLD_MODELS = ['TourDeparture' => TourDeparture::class, 'CruiseSailing' => CruiseSailing::class, 'ActivitySlot' => ActivitySlot::class];

    public function __construct(private Notifier $notifier) {}

    public static function newRef(string $prefix = 'MSF'): string
    {
        do {
            $ref = sprintf('%s-%s-%05d', $prefix, now()->format('y'), random_int(10000, 99999));
        } while (Booking::withTrashed()->where('ref', $ref)->exists() || VisaApplication::where('ref', $ref)->exists());

        return $ref;
    }

    /**
     * @param  array<string,mixed>  $quote  from Pricer::quote()
     * @param  array<string,mixed>  $data  contact, travellers, notes, plan, channel, locale
     */
    public function create(array $quote, array $data, ?User $user = null, ?User $staff = null): Booking
    {
        $plan = $quote['plans'][$data['plan'] ?? 'full'] ?? null;
        if (! $plan) {
            throw ValidationException::withMessages(['plan' => __('This payment option is not available for this booking.')]);
        }

        return DB::transaction(function () use ($quote, $data, $plan, $user, $staff) {
            // Re-check and hold inventory under a row lock so two travellers cannot take the last seats.
            if ($quote['hold'] && $quote['seats'] > 0) {
                [$type, $id] = $quote['hold'];
                $row = (self::HOLD_MODELS[$type])::whereKey($id)->lockForUpdate()->first();
                $left = $type === 'ActivitySlot' ? $row->capacity - $row->booked : $row->seats_total - $row->seats_held;
                if ($left < $quote['seats']) {
                    throw ValidationException::withMessages(['date' => __('Sorry, those seats were just taken. Please pick another date.')]);
                }
                $type === 'ActivitySlot' ? $row->increment('booked', $quote['seats']) : $row->increment('seats_held', $quote['seats']);
            }

            $contact = $data['contact'];
            $b = Booking::create([
                'ref' => self::newRef(), 'user_id' => $user?->id, 'agent_id' => $data['agent_id'] ?? null, 'owner_staff_id' => $staff?->id,
                'coupon_id' => $quote['coupon']['id'] ?? null, 'kind' => $quote['kind'],
                'product_type' => $quote['product']->getMorphClass(), 'product_id' => $quote['product']->getKey(),
                'title' => $quote['title'], 'subtitle' => $quote['subtitle'], 'image_key' => $quote['image_key'],
                'status' => 'pending', 'payment_status' => 'unpaid', 'channel' => $data['channel'] ?? 'web',
                'contact' => $contact + ['locale' => $data['locale'] ?? app()->getLocale(), 'options' => $quote['options']],
                'travel_start' => $quote['travel_start'], 'travel_end' => $quote['travel_end'], 'pax' => $quote['pax'], 'pax_count' => max(1, $quote['pax_count']),
                'subtotal' => $quote['subtotal'], 'discount' => $quote['discount'] + $plan['discount'], 'tax' => 0, 'total' => $plan['total'], 'paid' => 0,
                'payment_plan' => $plan['code'], 'notes' => $data['notes'] ?? null,
                'hold_expires_at' => $quote['hold'] ? now()->addMinutes((int) Settings::get('commerce.hold_minutes', 30)) : null,
            ]);
            foreach ($quote['lines'] as $i => $l) {
                [$bt, $bid] = $l['bookable'] ?? [null, null];
                $b->items()->create([
                    'bookable_type' => $bt ? 'App\\Models\\'.$bt : null, 'bookable_id' => $bid, 'label' => $l['label'], 'qty' => $l['qty'],
                    'unit_price' => $l['unit'], 'line_total' => $l['total'],
                    'meta' => ['code' => $l['code']] + ($i === 0 && $quote['hold'] ? ['hold' => $quote['hold'], 'seats' => $quote['seats']] : []),
                ]);
            }
            if ($plan['discount'] > 0) {
                $b->items()->create(['label' => ['en' => 'Pay-in-full discount', 'bn' => 'পূর্ণ পরিশোধ ছাড়'], 'qty' => 1, 'unit_price' => -$plan['discount'], 'line_total' => -$plan['discount'], 'meta' => ['code' => 'discount:full']]);
            }
            if (! empty($quote['coupon']) && $quote['coupon']['discount'] > 0) {
                $cd = $quote['coupon']['discount'];
                $b->items()->create(['label' => ['en' => 'Promo '.$quote['coupon']['code'], 'bn' => 'প্রোমো '.$quote['coupon']['code']], 'qty' => 1, 'unit_price' => -$cd, 'line_total' => -$cd, 'meta' => ['code' => 'discount:coupon']]);
            }
            if (! empty($quote['referral'])) {
                $rd = $quote['referral']['discount'];
                $b->items()->create(['label' => ['en' => 'Friend referral discount', 'bn' => 'বন্ধুর রেফারেল ছাড়'], 'qty' => 1, 'unit_price' => -$rd, 'line_total' => -$rd, 'meta' => ['code' => 'discount:referral']]);
            }
            foreach ($data['travellers'] ?? [] as $t) {
                $b->travellers()->create(['name' => $t['name'], 'type' => $t['type'] ?? 'adult', 'traveller_id' => $t['traveller_id'] ?? null]);
            }
            foreach ($plan['schedule'] as $s) {
                $b->instalments()->create(['seq' => $s['seq'], 'due_date' => $s['due_date'], 'amount' => $s['amount'], 'status' => $s['seq'] === 1 ? 'due' : 'upcoming']);
            }
            BookingActivity::create(['booking_id' => $b->id, 'user_id' => $staff?->id ?? $user?->id, 'type' => 'created',
                'body' => ['en' => 'Booking created ('.($data['channel'] ?? 'web').')', 'bn' => 'বুকিং তৈরি হয়েছে'], 'internal' => false]);

            return $b;
        });
    }

    /** Amount the traveller should pay next (the plan's first part, the next instalment, or the balance). */
    public function amountDue(Booking $b, ?int $instalmentId = null): array
    {
        $b->loadMissing('instalments');
        if ($b->instalments->isNotEmpty()) {
            $next = $instalmentId ? $b->instalments->firstWhere('id', $instalmentId) : $b->instalments->first(fn ($i) => $i->status !== 'paid');
            if ($next && $next->status !== 'paid') {
                return ['amount' => (int) round((float) $next->amount), 'instalment' => $next];
            }
        }

        return ['amount' => (int) round($b->balance()), 'instalment' => null];
    }

    /** Mark a payment successful and update the booking. Safe to call twice (IPN + browser return). */
    public function settle(Payment $p, array $raw = []): Payment
    {
        return DB::transaction(function () use ($p, $raw) {
            $p = Payment::whereKey($p->id)->lockForUpdate()->first();
            if ($p->status === 'success') {
                return $p;
            }
            $p->update(['status' => 'success', 'paid_at' => now(), 'raw' => array_merge((array) $p->raw, $raw)]);
            if ($p->purpose === 'wallet_topup') { // money into the traveller's wallet, no booking involved
                if ($p->user_id && ($u = \App\Models\User::find($p->user_id))) {
                    \App\Http\Controllers\Api\V1\MeController::credit($u, (float) $p->amount, ['en' => 'Wallet top-up via '.$p->method, 'bn' => $p->method.' দিয়ে ওয়ালেট টপ-আপ'], 'plus', $p);
                }

                return $p->fresh();
            }
            $b = Booking::whereKey($p->booking_id)->lockForUpdate()->first();
            if (! $b) {
                return $p;
            }
            $first = (float) $b->paid <= 0;
            $paid = min((float) $b->total, (float) $b->paid + (float) $p->amount);
            $full = $paid >= (float) $b->total - 0.5;
            $b->update([
                'paid' => $paid, 'payment_status' => $full ? 'paid' : 'partial',
                'status' => in_array($b->status, ['pending', 'partial'], true) ? ($full ? 'confirmed' : 'partial') : $b->status,
                'hold_expires_at' => null,
            ]);
            // Instalment linked to this payment (or the earliest unpaid one).
            $inst = $p->raw['instalment_id'] ?? null;
            $row = $inst ? Instalment::find($inst) : $b->instalments()->where('status', '!=', 'paid')->orderBy('seq')->first();
            if ($row && abs((float) $row->amount - (float) $p->amount) < 1) {
                $row->update(['status' => 'paid', 'payment_id' => $p->id]);
                $b->instalments()->where('status', 'upcoming')->orderBy('seq')->limit(1)->update(['status' => 'due']);
            } elseif ($full) {
                $b->instalments()->where('status', '!=', 'paid')->update(['status' => 'paid', 'payment_id' => $p->id]);
            }
            BookingActivity::create(['booking_id' => $b->id, 'user_id' => $p->user_id, 'type' => 'payment',
                'body' => ['en' => 'Payment received: ৳ '.number_format((float) $p->amount).' via '.$p->method, 'bn' => 'পেমেন্ট গৃহীত: ৳ '.number_format((float) $p->amount)]]);

            if ($first) {
                $this->onFirstPayment($b);
            }
            $this->notify($b->fresh(), 'payment_received', ['amount' => number_format((float) $p->amount), 'method' => $p->method]);
            if ($first) {
                $this->notify($b->fresh(), 'booking_confirmed');
            }

            return $p->fresh();
        });
    }

    private function onFirstPayment(Booking $b): void
    {
        if ($b->coupon_id) {
            $disc = (float) ($b->items()->get()->first(fn ($i) => ($i->meta['code'] ?? '') === 'discount:coupon')?->line_total ?? 0);
            CouponRedemption::create(['coupon_id' => $b->coupon_id, 'booking_id' => $b->id, 'user_id' => $b->user_id, 'discount' => abs($disc)]);
            $b->coupon()->increment('used');
        }
        foreach (['invoice' => ['Invoice', 'ইনভয়েস'], 'voucher' => [$b->kind === 'flight' ? 'E-ticket' : 'E-voucher', $b->kind === 'flight' ? 'ই-টিকিট' : 'ই-ভাউচার']] as $kind => [$en, $bn]) {
            BookingDocument::firstOrCreate(['booking_id' => $b->id, 'kind' => $kind], ['title' => ['en' => $en, 'bn' => $bn]]);
        }
        if ($b->user_id) {
            $miles = (int) floor((float) $b->total / 100) * (int) Settings::get('commerce.miles_per_100', 1);
            if ($miles > 0) {
                $b->update(['miles_earned' => $miles]);
                MilesTransaction::create(['user_id' => $b->user_id, 'miles' => $miles, 'description' => ['en' => 'Earned on '.$b->ref, 'bn' => $b->ref.' থেকে অর্জিত'], 'source_type' => Booking::class, 'source_id' => $b->id]);
                User::whereKey($b->user_id)->increment('miles', $miles);
            }
        }
        $opts = $b->contact['options'] ?? [];
        if ($b->kind === 'flight') {
            $pnr = strtoupper(Str::random(6));
            foreach ($b->travellers as $k => $t) {
                $t->update(['ticket_no' => '997-'.random_int(1000000000, 9999999999), 'seat' => (10 + $k).chr(65 + $k % 6)]);
            }
            $b->update(['contact' => $b->contact + ['pnr' => $pnr]]);
        }
        if ($b->kind === 'gift_card') {
            $gc = GiftCard::create([
                'code' => 'MSF-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4)), 'gift_card_design_id' => $b->product_id,
                'amount' => $opts['amount'] ?? $b->total, 'balance' => $opts['amount'] ?? $b->total, 'buyer_id' => $b->user_id,
                'recipient_name' => $opts['to'] ?? null, 'recipient_email' => $opts['email'] ?? null, 'message' => $opts['message'] ?? null,
                'expires_at' => now()->addYear()->toDateString(), 'status' => 'active',
            ]);
            $b->update(['contact' => $b->contact + ['gift_code' => $gc->code]]);
        }
        if ($b->kind === 'visa') {
            foreach ($b->travellers as $t) {
                $va = VisaApplication::create(['ref' => self::newRef('VSA'), 'visa_product_id' => $b->product_id, 'user_id' => $b->user_id, 'booking_id' => $b->id,
                    'applicant_name' => $t->name, 'stage' => 'submitted', 'stage_no' => 1, 'eta' => now()->addDays(10)->toDateString()]);
                VisaApplicationEvent::create(['visa_application_id' => $va->id, 'label' => ['en' => 'Application received', 'bn' => 'আবেদন গৃহীত'], 'state' => 'done', 'happened_on' => today()]);
                VisaApplicationEvent::create(['visa_application_id' => $va->id, 'label' => ['en' => 'Upload documents', 'bn' => 'ডকুমেন্ট আপলোড'], 'state' => 'current']);
            }
        }
    }

    /** Release held inventory (expired or cancelled unpaid bookings). */
    public function releaseHold(Booking $b): void
    {
        foreach ($b->items as $i) {
            $hold = $i->meta['hold'] ?? null;
            $seats = (int) ($i->meta['seats'] ?? 0);
            if (! $hold || $seats < 1 || ! empty($i->meta['released'])) {
                continue;
            }
            [$type, $id] = $hold;
            $col = $type === 'ActivitySlot' ? 'booked' : 'seats_held';
            (self::HOLD_MODELS[$type])::whereKey($id)->where($col, '>=', $seats)->decrement($col, $seats);
            $i->update(['meta' => $i->meta + ['released' => true]]);
        }
    }

    public function expire(Booking $b): void
    {
        DB::transaction(function () use ($b) {
            $b->update(['status' => 'cancelled', 'cancelled_at' => now(), 'cancel_reason' => 'Payment window expired', 'hold_expires_at' => null]);
            $this->releaseHold($b);
            BookingActivity::create(['booking_id' => $b->id, 'type' => 'status', 'body' => ['en' => 'Cancelled: payment window expired', 'bn' => 'বাতিল: পেমেন্টের সময় শেষ']]);
        });
    }

    public function notify(Booking $b, string $key, array $extra = []): void
    {
        $c = $b->contact ?? [];
        $locale = $c['locale'] ?? 'en';
        $vars = ['name' => $c['first_name'] ?? $c['name'] ?? '', 'ref' => $b->ref, 'title' => $b->getTranslation('title', $locale, true),
            'total' => number_format((float) $b->total), 'paid' => number_format((float) $b->paid)] + $extra;
        $link = config('musafir.frontend_url')."/{$locale}/booking-confirmed?ref={$b->ref}&key={$b->ulid}";
        $this->notifier->send($key, $vars, ['email' => $c['email'] ?? null, 'phone' => $c['phone'] ?? null, 'name' => trim(($c['first_name'] ?? '').' '.($c['last_name'] ?? ''))], $locale, $b->user, [], $link);
    }
}
