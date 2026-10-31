<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Account as P;
use App\Http\Presenters\Checkout as CP;
use App\Models\Activity;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\Cruise;
use App\Models\Document;
use App\Models\FlightOffer;
use App\Models\GiftCard;
use App\Models\Hotel;
use App\Models\LoginActivity;
use App\Models\LoyaltyTier;
use App\Models\MilesTransaction;
use App\Models\Payment;
use App\Models\Referral;
use App\Models\Review;
use App\Models\SavedPaymentMethod;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Models\Tour;
use App\Models\Traveller;
use App\Models\TripPlan;
use App\Models\User;
use App\Models\VisaApplication;
use App\Models\WalletTransaction;
use App\Models\Wishlist;
use App\Services\Auth\Otp;
use App\Services\Payments\GatewayManager;
use App\Support\Img;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/** Traveller portal API (auth:sanctum, travellers only). Everything is scoped to the signed-in user. */
class MeController extends Controller
{
    private function u(Request $r): User
    {
        return $r->user();
    }

    private function ok(array $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status, ['Cache-Control' => 'no-store, private']);
    }

    private function own(Request $r, string $ref): Booking
    {
        return Booking::where('ref', $ref)->where('user_id', $this->u($r)->id)->firstOrFail();
    }

    private static function bi(string $s): array
    {
        return ['en' => $s, 'bn' => $s];
    }

    /* ───────────── Dashboard ───────────── */

    public function dashboard(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $bookings = Booking::where('user_id', $u->id)->orderBy('travel_start')->get();
        $upcoming = $bookings->filter(fn ($b) => P::group($b) === 'upcoming')->values();
        // "Next trip" = the soonest real trip (visas and gift cards are not trips); a package beats its own flight on the same day.
        $prio = ['tour' => 0, 'cruise' => 1, 'hotel' => 2, 'activity' => 3, 'flight' => 4];
        $trips = $upcoming->filter(fn ($b) => isset($prio[$b->kind]))->sortBy(fn ($b) => [$b->travel_start?->toDateString() ?? '9999', in_array($b->status, ['confirmed', 'partial'], true) ? 0 : 1, $prio[$b->kind]])->values();
        $next = $trips->first(fn ($b) => in_array($b->status, ['confirmed', 'partial'], true)) ?? $trips->first() ?? $upcoming->first();
        $due = DB::table('instalments')->join('bookings', 'bookings.id', '=', 'instalments.booking_id')->where('bookings.user_id', $u->id)
            ->whereIn('instalments.status', ['due', 'overdue'])->whereNotIn('bookings.status', ['cancelled', 'refunded'])->orderBy('instalments.due_date')
            ->select('instalments.id', 'instalments.amount', 'instalments.due_date', 'instalments.seq', 'bookings.ref')->first();
        $visas = VisaApplication::with('product')->where('user_id', $u->id)->whereNotIn('stage', ['approved', 'rejected', 'delivered'])->orderByDesc('id')->get();
        $milesMonth = (int) MilesTransaction::where('user_id', $u->id)->where('created_at', '>=', now()->startOfMonth())->where('miles', '>', 0)->sum('miles');
        // To-do items are data (type + params); the portal words them in the visitor's language.
        $todo = [];
        if ($due) {
            $todo[] = ['key' => 'pay', 'type' => 'pay', 'n' => (int) $due->seq, 'amount' => (int) round((float) $due->amount), 'href' => '/account/payments', 'done' => false];
        }
        foreach ($visas->where('stage', 'docs') as $v) {
            $todo[] = ['key' => 'visa-'.$v->ref, 'type' => 'visa', 'name' => explode(' ', (string) $v->applicant_name)[0], 'href' => '/account/visa', 'done' => false];
        }
        $soon = $next?->travel_start;
        foreach (Traveller::where('user_id', $u->id)->whereNotNull('passport_expiry')->get() as $t) {
            if ($soon && $t->passport_expiry->lt($soon->copy()->addMonths(6))) {
                $todo[] = ['key' => 'pp-'.$t->id, 'type' => 'passport', 'name' => explode(' ', $t->name)[0], 'href' => '/account/travellers', 'done' => false];
            }
        }
        $todo[] = ['key' => 'profile', 'type' => 'profile', 'href' => '/account/profile', 'done' => (bool) ($u->dob && $u->gender && $u->city)];
        $todo[] = ['key' => 'travellers', 'type' => 'travellers', 'href' => '/account/travellers', 'done' => Traveller::where('user_id', $u->id)->count() > 1];
        if ($next && in_array($next->kind, ['tour', 'cruise'], true)) {
            $todo[] = ['key' => 'insurance', 'type' => 'insurance', 'href' => '/insurance', 'done' => collect($next->contact['options']['addons'] ?? [])->contains(fn ($a) => str_contains((string) $a, 'insur'))
                || \App\Models\BookingItem::where('booking_id', $next->id)->where('label->en', 'like', '%insurance%')->exists()];
        }

        return $this->ok([
            'user' => P::user($u),
            'next_trip' => $next ? P::bookingCard($next) + ['starts_at' => $next->travel_start?->setTime(9, 0)->toIso8601String()] : null,
            'stats' => ['upcoming' => $upcoming->count(), 'needs_action' => $upcoming->where(fn ($b) => (float) $b->total > (float) $b->paid)->count(),
                'wallet' => (int) round((float) $u->wallet_balance), 'miles' => (int) $u->miles, 'miles_month' => $milesMonth,
                'next_payment' => $due ? ['amount' => (int) round((float) $due->amount), 'due_date' => $due->due_date, 'ref' => $due->ref] : null],
            'upcoming' => $upcoming->take(5)->map(fn ($b) => P::bookingCard($b))->values(),
            'todo' => $todo,
            'visas' => $visas->take(3)->map(fn ($v) => ['ref' => $v->ref, 'name' => $v->applicant_name, 'country' => $v->product?->tr('country_name'), 'flag' => $v->product?->flag, 'stage' => $v->stage, 'stage_no' => $v->stage_no, 'eta' => $v->eta?->toDateString()])->values(),
            'notifications' => $u->notifications()->latest()->limit(4)->get()->map(fn ($n) => $this->notif($n))->values(),
            'picks' => $this->picks($u, $bookings),
            'counts' => $this->counts($u),
        ]);
    }

    /**
     * "Picked for you": published tours in the regions of the traveller's past tours (most recent first), never one they
     * already booked; topped up with featured tours. based_on names the past trips the picks come from.
     */
    private function picks(User $u, $bookings): array
    {
        $tourIds = $bookings->where('product_type', Tour::class)->pluck('product_id')->filter()->unique();
        $past = Tour::whereIn('id', $bookings->where('product_type', Tour::class)->where('status', 'completed')->sortByDesc('travel_start')->pluck('product_id'))->get();
        $regions = $past->pluck('region')->filter()->unique()->values();
        $q = fn () => Tour::published()->with(['image', 'cancellationPolicy', 'destination', 'categories'])->whereNotIn('id', $tourIds);
        $picks = $regions->isEmpty() ? collect() : $q()->whereIn('region', $regions)->orderByDesc('is_featured')->orderByDesc('rating')->limit(4)->get();
        if ($picks->count() < 4) {
            $picks = $picks->concat($q()->whereNotIn('id', $picks->pluck('id'))->orderByDesc('is_featured')->orderByDesc('rating')->limit(4 - $picks->count())->get());
        }

        return ['based_on' => $past->take(2)->map(fn ($t) => $t->tr('location') ?: $t->tr('title'))->values(),
            'items' => $picks->map(fn ($t) => \App\Http\Presenters\Catalog::tourCard($t))->values()];
    }

    /** Sidebar badges. */
    private function counts(User $u): array
    {
        return [
            'bookings' => Booking::where('user_id', $u->id)->whereIn('status', ['pending', 'confirmed', 'partial'])->where('travel_start', '>=', today())->count(),
            'visa' => VisaApplication::where('user_id', $u->id)->where('stage', 'docs')->count(),
            'payments' => DB::table('instalments')->join('bookings', 'bookings.id', '=', 'instalments.booking_id')->where('bookings.user_id', $u->id)->whereIn('instalments.status', ['due', 'overdue'])->whereNotIn('bookings.status', ['cancelled', 'refunded'])->count(),
            'notifications' => $u->unreadNotifications()->count(),
        ];
    }

    public function summary(Request $r): JsonResponse
    {
        return $this->ok(['user' => P::user($this->u($r)), 'counts' => $this->counts($this->u($r))]);
    }

    /* ───────────── Bookings ───────────── */

    public function bookings(Request $r): JsonResponse
    {
        $all = Booking::with('product')->where('user_id', $this->u($r)->id)->orderByDesc('created_at')->get();
        $q = Str::lower(trim((string) $r->query('q')));
        $group = (string) $r->query('status', 'all');
        $list = $all->filter(fn ($b) => ($group === 'all' || P::group($b) === $group)
            && ($q === '' || str_contains(Str::lower($b->ref.' '.$b->getTranslation('title', 'en').' '.$b->getTranslation('title', 'bn').' '.$b->tr('subtitle')), $q)));

        return $this->ok(['items' => $list->map(fn ($b) => P::bookingCard($b))->values(),
            'counts' => ['all' => $all->count()] + collect(['upcoming', 'completed', 'cancelled'])->mapWithKeys(fn ($g) => [$g => $all->filter(fn ($b) => P::group($b) === $g)->count()])->all()]);
    }

    public function booking(Request $r, string $ref): JsonResponse
    {
        $b = $this->own($r, $ref);
        $data = CP::booking($b) + P::bookingCard($b);
        $itinerary = [];
        if ($b->product_type === Tour::class && ($t = Tour::with('itinerary')->find($b->product_id))) {
            $itinerary = $t->itinerary->sortBy('day_no')->map(fn ($d) => ['day' => $d->day_no, 'date' => $b->travel_start?->copy()->addDays($d->day_no - 1)->toDateString(), 'title' => $d->tr('title'), 'body' => $d->tr('body')])->values();
        }
        $travellers = $b->travellers()->get()->map(fn ($t) => ['name' => $t->name, 'type' => $t->type, 'ticket_no' => $t->ticket_no, 'seat' => $t->seat]);
        $activity = BookingActivity::where('booking_id', $b->id)->where('internal', false)->orderByDesc('id')->limit(20)->get()->map(fn ($a) => ['type' => $a->type, 'text' => is_array($a->body) ? ($a->body[app()->getLocale()] ?? $a->body['en'] ?? '') : $a->body, 'at' => $a->created_at?->toIso8601String()]);
        $canCancel = in_array($b->status, ['pending', 'confirmed', 'partial'], true) && (! $b->travel_start || $b->travel_start->gt(today()));
        $open = SupportTicket::where('booking_id', $b->id)->whereNotIn('status', ['resolved', 'closed'])->orderByDesc('id')->get(['ref', 'subject', 'status']);

        return $this->ok($data + ['itinerary' => $itinerary, 'travellers' => $travellers, 'activity' => $activity, 'can_cancel' => $canCancel,
            'policy' => $this->policy($b), 'agent' => $b->owner_staff_id ? (fn ($s) => $s ? ['name' => $s->name, 'initials' => $s->initials()] : null)(User::find($b->owner_staff_id)) : null,
            'nights' => $b->travel_start && $b->travel_end ? $b->travel_start->diffInDays($b->travel_end) : null,
            'miles_earn' => (int) ($b->miles_earned ?: floor((float) $b->total / 100)),
            'open_requests' => $open->map(fn ($t) => ['ref' => $t->ref, 'subject' => $t->tr('subject'), 'status' => $t->status])->values(),
            // Owner-only: wallet credit can pay a due amount when the wallet "gateway" is switched on in admin.
            'wallet' => ['enabled' => ! empty(((array) \App\Support\Settings::get('payments.gateways', []))['wallet']), 'balance' => (int) round((float) $this->u($r)->wallet_balance)],
            'next_due' => (fn ($i) => $i ? ['id' => $i->id, 'seq' => $i->seq, 'amount' => (int) round((float) $i->amount), 'due_date' => $i->due_date?->toDateString()] : null)(
                $b->instalments()->whereIn('status', ['due', 'overdue', 'upcoming'])->orderBy('seq')->first()),
        ]);
    }

    /**
     * Cancellation windows for this booking (from the product's policy) with calendar dates, and the refund the traveller
     * would get today. Refunds are confirmed by the sales team; this is an estimate shown before they ask.
     */
    private function policy(Booking $b): ?array
    {
        $product = $b->product_type && class_exists($b->product_type) && method_exists($b->product_type, 'cancellationPolicy')
            ? $b->product_type::with('cancellationPolicy')->find($b->product_id) : null;
        $pol = $product?->cancellationPolicy;
        if (! $pol || ! $b->travel_start) {
            return null;
        }
        $start = $b->travel_start->copy()->setTime(9, 0);
        $rules = collect($pol->rules ?? [])->map(fn ($r) => ['pct' => (int) $r['refund_pct'], 'until' => isset($r['hours_before']) ? $start->copy()->subHours((int) $r['hours_before']) : $start->copy()->subDays((int) ($r['days_before'] ?? 0))])
            ->sortBy(fn ($r) => $r['until']->timestamp)->values();
        // [{pct, from, until}] in time order: "until 12 Nov → 100%", "13 Nov – 2 Dec → 50%", "after 2 Dec → 0%".
        $windows = [];
        $from = null;
        foreach ($rules as $n => $r) {
            $last = $n === $rules->count() - 1;
            $windows[] = ['pct' => $r['pct'], 'from' => $from?->copy()->addDay()->toDateString(), 'after' => $last ? $from?->toDateString() : null, 'until' => $last ? null : $r['until']->toDateString(),
                'tone' => $r['pct'] >= 100 ? 'emerald' : ($r['pct'] > 0 ? 'amber' : 'rose')];
            $from = $r['until'];
        }
        // windows: pct applies while now <= until (the first rule whose cut-off is still ahead)
        $nowPct = (int) ($rules->first(fn ($r) => now()->lte($r['until']))['pct'] ?? 0);
        $fee = $nowPct >= 100 ? (float) \App\Support\Settings::get('commerce.cancellation_fee', 2000) : 0;

        return ['name' => $pol->tr('name'), 'code' => $pol->code, 'windows' => $windows, 'refund_pct' => $nowPct, 'fee' => (int) $fee,
            'refund_estimate' => (int) max(0, round((float) $b->paid * $nowPct / 100 - $fee))];
    }

    /** Change / cancellation requests become support tickets for the sales team (cancellations need a human: refunds depend on the policy). */
    public function bookingRequest(Request $r, string $ref): JsonResponse
    {
        $b = $this->own($r, $ref);
        $v = $r->validate(['type' => ['required', 'in:change,cancel'], 'message' => ['required', 'string', 'min:5', 'max:2000'], 'refund_to' => ['nullable', 'in:wallet,original']]);
        if ($v['type'] === 'cancel' && ! empty($v['refund_to'])) {
            $v['message'] .= "\n\nRefund to: ".($v['refund_to'] === 'wallet' ? 'Musafir wallet' : 'original payment method');
        }
        if ($v['type'] === 'cancel' && ! in_array($b->status, ['pending', 'confirmed', 'partial'], true)) {
            return response()->json(['message' => __('This booking cannot be cancelled online.')], 409);
        }
        $subject = ($v['type'] === 'cancel' ? 'Cancellation request — ' : 'Change request — ').$b->ref;
        $t = $this->newTicket($this->u($r), $subject, $v['message'], $b->id, $v['type'] === 'cancel' ? 'high' : 'normal');
        BookingActivity::create(['booking_id' => $b->id, 'type' => 'request', 'body' => ['en' => ucfirst($v['type']).' requested by traveller ('.$t->ref.')', 'bn' => 'যাত্রীর অনুরোধ ('.$t->ref.')']]);

        return $this->ok(['ticket' => $t->ref], 201);
    }

    public function ticket(Request $r, string $ref): JsonResponse
    {
        $b = $this->own($r, $ref);
        abort_unless($b->kind === 'flight' && in_array($b->payment_status, ['paid', 'partial'], true), 404);
        $o = $b->product_type === FlightOffer::class ? FlightOffer::with('airline')->find($b->product_id) : null;
        $dep = $o?->dep_time ? substr((string) $o->dep_time, 0, 5) : null;

        return $this->ok(['ref' => $b->ref, 'pnr' => $b->contact['pnr'] ?? null, 'date' => $b->travel_start?->toDateString(), 'cabin' => $b->contact['options']['cabin'] ?? $o?->cabin ?? 'economy',
            'flight' => $o ? ['no' => $o->flight_no, 'airline' => $o->airline?->name, 'color' => $o->airline?->color, 'from' => $o->origin, 'to' => $o->destination,
                'from_city' => \App\Models\Airport::where('iata', $o->origin)->first()?->tr('city'), 'to_city' => \App\Models\Airport::where('iata', $o->destination)->first()?->tr('city'), 'dep' => $dep, 'arr' => substr((string) $o->arr_time, 0, 5),
                'duration_min' => $o->duration_min, 'stops' => $o->stops, 'baggage' => $o->baggage, 'boarding' => $dep ? now()->setTimeFromTimeString($dep)->subMinutes(40)->format('H:i') : null] : null,
            'passengers' => $b->travellers()->get()->map(fn ($t) => ['name' => $t->name, 'ticket_no' => $t->ticket_no, 'seat' => $t->seat])->values()]);
    }

    /* ───────────── Payments ───────────── */

    public function payments(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $ids = Booking::where('user_id', $u->id)->pluck('id');
        $inst = DB::table('instalments')->join('bookings', 'bookings.id', '=', 'instalments.booking_id')->whereIn('bookings.id', $ids)->whereNotIn('bookings.status', ['cancelled', 'refunded'])
            ->whereIn('instalments.status', ['due', 'overdue', 'upcoming'])->orderBy('instalments.due_date')
            ->get(['instalments.id', 'instalments.seq', 'instalments.amount', 'instalments.due_date', 'instalments.status', 'bookings.ref', 'bookings.title', 'bookings.total', 'bookings.paid', 'bookings.id as booking_id']);
        $counts = DB::table('instalments')->whereIn('booking_id', $ids)->selectRaw('booking_id, count(*) n')->groupBy('booking_id')->pluck('n', 'booking_id');
        $l = app()->getLocale();
        $title = fn ($json) => (json_decode((string) $json, true)[$l] ?? json_decode((string) $json, true)['en'] ?? '');
        // Bookings without a plan but with a balance (e.g. pay-later activities) are also "due".
        $unpaid = Booking::where('user_id', $u->id)->whereIn('status', ['pending', 'confirmed', 'partial'])->whereColumn('paid', '<', 'total')->whereDoesntHave('instalments')->get();

        return $this->ok([
            'due' => $inst->whereIn('status', ['due', 'overdue'])->values()->map(fn ($i) => ['id' => $i->id, 'seq' => $i->seq, 'of' => $counts[$i->booking_id] ?? 1, 'amount' => (int) round((float) $i->amount), 'due_date' => $i->due_date, 'overdue' => $i->status === 'overdue' || $i->due_date < today()->toDateString(),
                'ref' => $i->ref, 'title' => $title($i->title), 'total' => (int) round((float) $i->total), 'paid' => (int) round((float) $i->paid)])
                ->concat($unpaid->map(fn ($b) => ['id' => null, 'seq' => 1, 'of' => 1, 'amount' => (int) round((float) $b->total - (float) $b->paid), 'due_date' => $b->hold_expires_at?->toDateString() ?? $b->travel_start?->toDateString(), 'overdue' => false,
                    'ref' => $b->ref, 'title' => $b->tr('title'), 'total' => (int) round((float) $b->total), 'paid' => (int) round((float) $b->paid)])),
            'upcoming' => $inst->where('status', 'upcoming')->values()->map(fn ($i) => ['id' => $i->id, 'seq' => $i->seq, 'of' => $counts[$i->booking_id] ?? 1, 'amount' => (int) round((float) $i->amount), 'due_date' => $i->due_date, 'ref' => $i->ref, 'title' => $title($i->title)]),
            'history' => Payment::whereIn('booking_id', $ids)->whereIn('status', ['success', 'failed', 'refunded', 'pending'])->with('booking:id,ref,title')->orderByDesc('id')->limit(50)->get()
                ->map(fn ($p) => ['id' => $p->ulid, 'ref' => $p->booking?->ref, 'title' => $p->booking?->tr('title'), 'method' => $p->method, 'gateway' => $p->gateway, 'amount' => (int) round((float) $p->amount), 'status' => $p->status, 'date' => ($p->paid_at ?? $p->created_at)?->toDateString()])->values(),
            'methods' => SavedPaymentMethod::where('user_id', $u->id)->orderByDesc('is_default')->get()->map(fn ($m) => ['id' => $m->id, 'gateway' => $m->gateway, 'label' => $m->label, 'masked' => $m->masked, 'is_default' => (bool) $m->is_default])->values(),
            'gateways' => app(GatewayManager::class)->enabled(), 'wallet' => (int) round((float) $u->wallet_balance),
            'wallet_enabled' => ! empty(((array) \App\Support\Settings::get('payments.gateways', []))['wallet']),
        ]);
    }

    public function deleteMethod(Request $r, int $id): JsonResponse
    {
        SavedPaymentMethod::where('user_id', $this->u($r)->id)->whereKey($id)->firstOrFail()->delete();

        return $this->ok(['ok' => true]);
    }

    /* ───────────── Wallet & Miles ───────────── */

    public function wallet(Request $r): JsonResponse
    {
        $u = $this->u($r);

        return $this->ok([
            'user' => P::user($u), 'balance' => (int) round((float) $u->wallet_balance), 'miles_value' => (int) floor((int) $u->miles / 10),
            'tiers' => LoyaltyTier::orderBy('min_miles')->get()->map(fn ($t) => ['code' => $t->code, 'name' => $t->tr('name'), 'min_miles' => (int) $t->min_miles, 'perks' => collect($t->perks ?? [])->map(fn ($p) => tr_pick($p))->all(), 'current' => $t->id === $u->tier_id])->values(),
            'wallet_tx' => WalletTransaction::where('user_id', $u->id)->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get()->map(fn ($w) => ['amount' => (int) round((float) $w->amount), 'direction' => $w->direction, 'text' => $w->tr('description'), 'icon' => $w->icon, 'date' => $w->created_at?->toDateString()])->values(),
            'miles_tx' => MilesTransaction::where('user_id', $u->id)->orderByDesc('created_at')->limit(50)->get()->map(fn ($m) => ['miles' => (int) $m->miles, 'text' => $m->tr('description'), 'date' => $m->created_at?->toDateString()])->values(),
            'gift_credit' => (int) round((float) WalletTransaction::where('user_id', $u->id)->where('source_type', GiftCard::class)->where('direction', 'credit')->sum('amount')),
            // Online top-up methods (bank transfer is booking-only: it needs a human to match the slip).
            'topup_gateways' => array_values(array_diff(app(GatewayManager::class)->enabled(), ['bank_transfer', 'wallet'])),
        ]);
    }

    /** Redeem a gift card into the wallet (one-shot, the card balance moves to the wallet). */
    public function redeemGift(Request $r): JsonResponse
    {
        $v = $r->validate(['code' => ['required', 'string', 'max:24']]);
        $u = $this->u($r);
        $key = 'gift:'.$u->id;
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($key, 6)) {
            throw ValidationException::withMessages(['code' => __('Too many attempts. Please wait a minute and try again.')]);
        }
        \Illuminate\Support\Facades\RateLimiter::hit($key, 60);

        $amount = DB::transaction(function () use ($v, $u) {
            $g = GiftCard::where('code', strtoupper(trim($v['code'])))->lockForUpdate()->first();
            if (! $g || $g->status !== 'active' || (float) $g->balance <= 0 || ($g->expires_at && $g->expires_at->isPast())) {
                throw ValidationException::withMessages(['code' => __('This gift card code is not valid or has already been used.')]);
            }
            $amt = (float) $g->balance;
            $g->update(['balance' => 0, 'status' => 'redeemed']);
            $this->credit($u, $amt, ['en' => 'Gift card redeemed '.$g->code, 'bn' => 'গিফট কার্ড রিডিম '.$g->code], 'gift', $g);

            return $amt;
        });

        return $this->ok(['amount' => (int) round($amount), 'balance' => (int) round((float) $u->fresh()->wallet_balance)]);
    }

    /** Add money to the wallet through an online gateway (the same drivers and verification as bookings). */
    public function topup(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $gws = array_values(array_diff(app(GatewayManager::class)->enabled(), ['bank_transfer']));
        $v = $r->validate(['amount' => ['required', 'integer', 'min:500', 'max:200000'], 'gateway' => ['required', Rule::in($gws)]]);
        $gw = app(GatewayManager::class)->resolve($v['gateway']);
        $p = Payment::create(['booking_id' => null, 'user_id' => $u->id, 'purpose' => 'wallet_topup', 'gateway' => $v['gateway'], 'method' => $gw->label(),
            'amount' => $v['amount'], 'status' => 'initiated', 'raw' => ['lang' => app()->getLocale()]]);
        // Drivers read the reference/contact/title from a booking; a top-up uses an unsaved stand-in.
        $stand = new Booking(['ref' => 'TOP-'.$p->id, 'title' => ['en' => 'Musafir wallet top-up', 'bn' => 'মুসাফির ওয়ালেট টপ-আপ'], 'total' => $v['amount'],
            'contact' => ['name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'city' => $u->city]]);
        try {
            $res = $gw->initiate($p, $stand);
        } catch (\Throwable $e) {
            report($e);
            $p->update(['status' => 'failed']);

            return response()->json(['message' => __('The payment gateway is not responding. Please try again in a minute.')], 502);
        }

        return $this->ok(['payment' => $p->ulid, 'redirect' => $res['redirect'] ?? null]);
    }

    public static function credit(User $u, float $amount, array $text, string $icon, $source = null): void
    {
        $locked = User::whereKey($u->id)->lockForUpdate()->first();
        $new = (float) $locked->wallet_balance + $amount;
        $locked->forceFill(['wallet_balance' => $new])->save();
        WalletTransaction::create(['user_id' => $u->id, 'direction' => $amount >= 0 ? 'credit' : 'debit', 'amount' => $amount, 'balance_after' => $new, 'description' => $text, 'icon' => $icon,
            'source_type' => $source ? $source::class : null, 'source_id' => $source?->getKey()]);
    }

    /* ───────────── Trips & wishlist ───────────── */

    public function trips(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $types = ['tour' => Tour::class, 'cruise' => Cruise::class, 'activity' => Activity::class, 'hotel' => Hotel::class];
        $wish = Wishlist::where('user_id', $u->id)->orderByDesc('id')->get();
        $items = [];
        foreach ($types as $k => $cls) {
            $ids = $wish->where('wishable_type', $cls)->pluck('wishable_id');
            if ($ids->isEmpty()) {
                continue;
            }
            $saved = $wish->where('wishable_type', $cls)->keyBy('wishable_id');
            foreach ($cls::published()->whereIn('id', $ids)->get() as $m) {
                $price = (int) round((float) ($m->price_from ?? $m->price ?? 0));
                $was = (int) round((float) ($saved[$m->id]->saved_price ?? 0));
                $items[] = ['kind' => $k, 'slug' => $m->slug, 'title' => $m->tr($k === 'hotel' ? 'name' : 'title') ?? $m->tr('name'), 'price' => $price, 'days' => $m->days ?? null,
                    'price_drop' => $was > $price ? $was - $price : 0, 'image' => $m->image_id ? Img::of(\App\Models\MediaAsset::find($m->image_id)) : null, 'order' => $saved[$m->id]->id ?? 0];
            }
        }

        usort($items, fn ($a, $b) => $a['order'] <=> $b['order']);

        $plans = TripPlan::where('user_id', $u->id)->orderByDesc('updated_at')->get();
        $dests = \App\Models\Destination::with('image')->whereIn('slug', $plans->flatMap(fn ($p) => (array) ($p->data['destinations'] ?? []))->unique()->values())->get()->keyBy('slug');

        return $this->ok([
            'plans' => $plans->map(fn ($p) => ['id' => $p->ulid, 'name' => $p->tr('name'), 'estimate' => (int) round((float) $p->estimate), 'days' => $p->data['days'] ?? null,
                'pax' => tr_pick($p->data['pax_label'] ?? null), 'destinations' => $p->data['destinations'] ?? [],
                'places' => collect($p->data['destinations'] ?? [])->map(fn ($s) => isset($dests[$s]) ? ['slug' => $s, 'name' => $dests[$s]->tr('name'), 'image' => Img::of($dests[$s]->image)] : null)->filter()->values(),
                'updated' => $p->updated_at?->toDateString(), 'share' => $p->share_token])->values(),
            'wishlist' => $items,
        ]);
    }

    /** Merge the device wishlist (localStorage) into the account: {items:[{kind,slug}]} → add; {remove:{kind,slug}}. */
    public function wishlist(Request $r): JsonResponse
    {
        $v = $r->validate(['items' => ['nullable', 'array', 'max:100'], 'items.*.kind' => ['required', 'in:tour,cruise,activity,hotel'], 'items.*.slug' => ['required', 'string', 'max:160'],
            'remove' => ['nullable', 'array'], 'remove.kind' => ['required_with:remove', 'in:tour,cruise,activity,hotel'], 'remove.slug' => ['required_with:remove', 'string']]);
        $types = ['tour' => Tour::class, 'cruise' => Cruise::class, 'activity' => Activity::class, 'hotel' => Hotel::class];
        $u = $this->u($r);
        foreach ($v['items'] ?? [] as $it) {
            if ($m = $types[$it['kind']]::where('slug', $it['slug'])->first()) {
                Wishlist::firstOrCreate(['user_id' => $u->id, 'wishable_type' => $m::class, 'wishable_id' => $m->id], ['saved_price' => $m->price_from ?? $m->price ?? null]);
            }
        }
        if (! empty($v['remove']) && ($m = $types[$v['remove']['kind']]::where('slug', $v['remove']['slug'])->first())) {
            Wishlist::where(['user_id' => $u->id, 'wishable_type' => $m::class, 'wishable_id' => $m->id])->delete();
        }

        // Account list as "kind:slug" keys so the device copy (hearts on public pages) can match it.
        $flip = array_flip($types);
        $keys = Wishlist::where('user_id', $u->id)->with('wishable')->orderBy('id')->get()
            ->map(fn ($w) => $w->wishable && isset($flip[$w->wishable_type]) ? $flip[$w->wishable_type].':'.$w->wishable->slug : null)->filter()->values();

        return $this->ok(['count' => $keys->count(), 'keys' => $keys]);
    }

    public function deletePlan(Request $r, string $id): JsonResponse
    {
        TripPlan::where('user_id', $this->u($r)->id)->where('ulid', $id)->firstOrFail()->delete();

        return $this->ok(['ok' => true]);
    }

    /* ───────────── Travellers ───────────── */

    private function travellerShape(Traveller $t): array
    {
        return ['id' => $t->id, 'name' => $t->name, 'relation' => $t->tr('relation'), 'relation_code' => $t->getTranslation('relation', 'en', true), 'dob' => $t->dob?->toDateString(),
            'age' => $t->dob?->age, 'gender' => $t->gender, 'nationality' => $t->nationality, 'passport_masked' => self::maskPassport($t),
            'frequent_flyer' => $t->frequent_flyer ? mb_substr($t->frequent_flyer, 0, 5).'•••'.mb_substr($t->frequent_flyer, -2) : null,
            'passport_expiry' => $t->passport_expiry?->toDateString(), 'expires_soon' => $t->passport_expiry?->lt(today()->addMonths(6)) ?? false,
            'meal_pref' => $t->meal_pref, 'seat_pref' => $t->seat_pref, 'is_self' => (bool) $t->is_self];
    }

    /** "EH0•••••7": first 3 and last character only (the number itself is encrypted at rest). */
    private static function maskPassport(Traveller $t): ?string
    {
        try {
            $pp = (string) $t->passport_no_enc;
        } catch (\Throwable) {
            $pp = '';
        }

        return $pp !== '' ? substr($pp, 0, 3).'•••••'.substr($pp, -1) : ($t->passport_last4 ? '•••••'.$t->passport_last4 : null);
    }

    public function travellers(Request $r): JsonResponse
    {
        return $this->ok(['items' => Traveller::where('user_id', $this->u($r)->id)->orderByDesc('is_self')->orderBy('id')->get()->map(fn ($t) => $this->travellerShape($t))->values()]);
    }

    /** The portal form sends the passport's given name and surname separately; store them as one name. */
    private function travellerInput(Request $r): array
    {
        if ($r->has('given_name') || $r->has('surname')) {
            $r->merge(['name' => trim(preg_replace('/\s+/u', ' ', $r->input('given_name', '').' '.$r->input('surname', '')))]);
        }

        return $r->validate($this->travellerRules() + ['given_name' => ['nullable', 'string', 'max:80'], 'surname' => ['nullable', 'string', 'max:60']]);
    }

    private function travellerRules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'], 'relation' => ['nullable', 'in:Self,Spouse,Child,Parent,Sibling,Friend,Colleague,Other'],
            'dob' => ['nullable', 'date', 'before:today', 'after:1900-01-01'], 'gender' => ['nullable', 'in:male,female,other'], 'nationality' => ['nullable', 'string', 'size:2', 'alpha'],
            'frequent_flyer' => ['nullable', 'string', 'max:32', 'regex:/^[A-Za-z0-9 -]+$/'],
            'passport_no' => ['nullable', 'string', 'regex:/^[A-Z0-9]{6,12}$/i'], 'passport_expiry' => ['nullable', 'date', 'after:today'],
            'meal_pref' => ['nullable', 'in:none,vegetarian,halal,diabetic'], 'seat_pref' => ['nullable', 'in:window,aisle,none'],
        ];
    }

    private function fillTraveller(Traveller $t, array $v): void
    {
        $rel = $v['relation'] ?? 'Other';
        $bn = ['Self' => 'নিজে', 'Spouse' => 'স্বামী/স্ত্রী', 'Child' => 'সন্তান', 'Parent' => 'মা-বাবা', 'Sibling' => 'ভাই-বোন', 'Friend' => 'বন্ধু', 'Colleague' => 'সহকর্মী', 'Other' => 'অন্যান্য'][$rel];
        // A blank frequent-flyer box on edit keeps the saved number (the form only shows it masked).
        $t->fill(collect($v)->only(['name', 'dob', 'gender', 'passport_expiry', 'meal_pref', 'seat_pref', 'frequent_flyer'])->reject(fn ($x, $k) => $k === 'frequent_flyer' && $x === null && $t->exists)->all());
        $t->nationality = strtoupper($v['nationality'] ?? $t->nationality ?? 'BD');
        $t->setTranslations('relation', ['en' => $rel, 'bn' => $bn]);
        $t->is_self = $rel === 'Self';
        if (! empty($v['passport_no'])) {
            $pp = strtoupper($v['passport_no']);
            $t->passport_no_enc = $pp;
            $t->passport_last4 = substr($pp, -4);
        }
    }

    public function storeTraveller(Request $r): JsonResponse
    {
        $v = $this->travellerInput($r);
        abort_if(Traveller::where('user_id', $this->u($r)->id)->count() >= 20, 422, __('You can save up to 20 travellers.'));
        $t = new Traveller(['user_id' => $this->u($r)->id]);
        $this->fillTraveller($t, $v);
        $t->save();

        return $this->ok($this->travellerShape($t), 201);
    }

    public function updateTraveller(Request $r, int $id): JsonResponse
    {
        $t = Traveller::where('user_id', $this->u($r)->id)->findOrFail($id);
        $this->fillTraveller($t, $this->travellerInput($r));
        $t->save();

        return $this->ok($this->travellerShape($t));
    }

    public function deleteTraveller(Request $r, int $id): JsonResponse
    {
        Traveller::where('user_id', $this->u($r)->id)->findOrFail($id)->delete();

        return $this->ok(['ok' => true]);
    }

    /* ───────────── Visa ───────────── */

    public function visas(Request $r): JsonResponse
    {
        $apps = VisaApplication::with(['product.requirements', 'events', 'documents'])->where('user_id', $this->u($r)->id)->orderByDesc('id')->get();

        return $this->ok(['items' => $apps->map(function ($a) {
            // Checklist = the product's required uploads; an item is done once a matching upload isn't rejected (labels match in either language).
            $docs = $a->documents->reject(fn ($d) => $d->status === 'rejected');
            $checklist = ($a->product?->requirements ?? collect())->where('required', true)->sortBy('sort')->map(function ($q) use ($docs) {
                $names = array_filter([$q->getTranslation('item', 'en'), $q->getTranslation('item', 'bn')]);
                $doc = $docs->first(fn ($d) => in_array($d->label, $names, true));

                return ['label' => $q->tr('item'), 'key' => $q->getTranslation('item', 'en'), 'done' => (bool) $doc, 'status' => $doc?->status];
            })->values();
            $needed = $a->stage === 'docs' ? $checklist->where('done', false)->pluck('label')->values()->all() : [];

            return ['ref' => $a->ref, 'name' => $a->applicant_name, 'country' => $a->product?->tr('country_name'), 'flag' => $a->product?->flag, 'type' => $a->product?->tr('type'),
                'stage' => $a->stage, 'stage_no' => $a->stage_no, 'eta' => $a->eta?->toDateString(), 'booking' => $a->booking_id ? Booking::whereKey($a->booking_id)->value('ref') : null,
                'events' => $a->events->sortBy('id')->map(fn ($e) => ['label' => $e->tr('label'), 'state' => $e->state, 'date' => $e->happened_on?->toDateString()])->values(),
                'needed' => $needed, 'checklist' => $checklist, 'documents' => $a->documents->map(fn ($d) => ['label' => $d->label, 'status' => $d->status, 'reason' => $d->rejected_reason, 'at' => $d->created_at?->toDateString()])->values()];
        })->values()]);
    }

    public function uploadVisaDoc(Request $r, string $ref): JsonResponse
    {
        $a = VisaApplication::where('user_id', $this->u($r)->id)->where('ref', $ref)->firstOrFail();
        $v = $r->validate(['label' => ['required', 'string', 'max:160'], 'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240']]);
        $path = $v['file']->store("visa/{$a->ulid}", 'local'); // private disk — never web-accessible
        $d = Document::create(['owner_type' => VisaApplication::class, 'owner_id' => $a->id, 'kind' => 'visa_doc', 'label' => $v['label'], 'disk' => 'local', 'path' => $path,
            'mime' => $v['file']->getMimeType(), 'size' => $v['file']->getSize(), 'status' => 'pending', 'uploaded_by' => $this->u($r)->id]);
        $a->events()->create(['label' => ['en' => 'Document uploaded: '.$v['label'], 'bn' => 'ডকুমেন্ট আপলোড: '.$v['label']], 'state' => 'done', 'happened_on' => today(), 'user_id' => $this->u($r)->id]);

        return $this->ok(['id' => $d->id, 'status' => 'pending'], 201);
    }

    /* ───────────── Reviews ───────────── */

    public function reviews(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $reviewed = Review::where('user_id', $u->id)->pluck('booking_id')->filter()->all();
        $pending = Booking::where('user_id', $u->id)->where('status', 'completed')->whereNotIn('id', $reviewed)->whereIn('kind', ['tour', 'hotel', 'cruise', 'activity'])->orderByDesc('travel_start')->get();

        return $this->ok([
            'miles' => (int) \App\Support\Settings::get('commerce.review_miles', 250),
            'pending' => $pending->map(fn ($b) => ['ref' => $b->ref, 'title' => $b->tr('title'), 'date' => $b->travel_start?->toDateString(), 'kind' => $b->kind, 'image' => Img::key($b->image_key)])->values(),
            'published' => Review::where('user_id', $u->id)->orderByDesc('id')->get()->map(fn ($v) => ['id' => $v->id, 'title' => $v->tr('trip_title'), 'rating' => (int) $v->rating, 'body' => $v->tr('body'), 'status' => $v->status,
                'ref' => $v->booking_id ? Booking::whereKey($v->booking_id)->value('ref') : null, 'date' => ($v->travelled_on ?? $v->created_at)?->toDateString(), 'reply' => $v->tr('reply')])->values(),
        ]);
    }

    public function storeReview(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $v = $r->validate(['ref' => ['required', 'string'], 'rating' => ['required', 'integer', 'between:1,5'], 'scores' => ['nullable', 'array'], 'scores.*' => ['integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'], 'body' => ['required', 'string', 'min:20', 'max:3000']]);
        $b = Booking::where('ref', $v['ref'])->where('user_id', $u->id)->where('status', 'completed')->firstOrFail();
        if (Review::where('user_id', $u->id)->where('booking_id', $b->id)->exists()) {
            throw ValidationException::withMessages(['ref' => __('You have already reviewed this trip.')]);
        }
        $parts = preg_split('/\s+/u', trim($u->name)) ?: [];
        $review = Review::create(['reviewable_type' => $b->product_type, 'reviewable_id' => $b->product_id, 'user_id' => $u->id, 'booking_id' => $b->id,
            'author_name' => self::bi($parts[0].' '.mb_substr(end($parts) ?: '', 0, 1).'.'), 'author_city' => self::bi((string) ($u->city ?? 'Dhaka')), 'initials' => $u->initials(),
            'trip_title' => $b->getTranslations('title'), 'rating' => $v['rating'], 'category_scores' => $v['scores'] ?? null,
            'title' => $v['title'] ? self::bi($v['title']) : null, 'body' => self::bi(strip_tags($v['body'])), 'status' => 'review', 'travelled_on' => $b->travel_start]);

        return $this->ok(['id' => $review->id, 'status' => 'review'], 201);
    }

    /* ───────────── Referrals ───────────── */

    public function referrals(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $refs = Referral::where('referrer_id', $u->id)->orderByDesc('created_at')->get();

        return $this->ok(['reward' => (int) \App\Support\Settings::get('commerce.referral_reward', 500), 'friend_discount' => (int) \App\Support\Settings::get('commerce.referral_friend_discount', 500),
            'min_total' => (int) \App\Support\Settings::get('commerce.referral_min_total', 15000), 'code' => $u->referral_code, 'link' => rtrim((string) config('musafir.frontend_url'), '/').'/'.app()->getLocale().'/register?ref='.$u->referral_code,
            'stats' => ['invited' => $refs->count(), 'travelled' => $refs->where('status', 'won')->count(), 'earned' => (int) round((float) $refs->where('status', 'won')->sum('reward'))],
            'items' => $refs->map(fn ($x) => ['name' => $x->referred_name, 'status' => $x->status, 'reward' => (int) round((float) $x->reward), 'date' => $x->created_at?->toDateString(),
                'initials' => mb_strtoupper(collect(preg_split('/\s+/u', (string) $x->referred_name))->map(fn ($p) => mb_substr($p, 0, 1))->take(2)->join(''))])->values()]);
    }

    /* ───────────── Notifications ───────────── */

    private function notif($n): array
    {
        $d = $n->data;

        return ['id' => $n->id, 'title' => tr_pick($d['title'] ?? ''), 'body' => tr_pick($d['body'] ?? ''), 'icon' => $d['icon'] ?? 'bell', 'kind' => $d['kind'] ?? 'general', 'link' => $d['link'] ?? null,
            'read' => (bool) $n->read_at, 'at' => $n->created_at?->toIso8601String()];
    }

    public function notifications(Request $r): JsonResponse
    {
        $q = $this->u($r)->notifications()->latest();
        $kind = (string) $r->query('kind', 'all');
        $items = $q->limit(100)->get()->map(fn ($n) => $this->notif($n));
        $f = $kind === 'all' ? $items : $items->where('kind', $kind === 'bookings' ? 'booking' : ($kind === 'offers' ? 'offer' : $kind));

        return $this->ok(['items' => $f->values(), 'unread' => $items->where('read', false)->count(), 'counts' => ['all' => $items->count()]]);
    }

    public function readNotifications(Request $r): JsonResponse
    {
        $v = $r->validate(['id' => ['nullable', 'string', 'max:64']]);
        $q = $this->u($r)->unreadNotifications();
        ($v['id'] ?? null) ? $q->where('id', $v['id'])->update(['read_at' => now()]) : $q->update(['read_at' => now()]);

        return $this->ok(['unread' => $this->u($r)->unreadNotifications()->count()]);
    }

    /* ───────────── Profile & settings ───────────── */

    public function profile(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $p = $u->preferences ?? [];
        $travel = ($p['travel'] ?? []) + ['interests' => [], 'seat' => $p['seat'] ?? null, 'meal' => $p['meal'] ?? null, 'room' => null];
        // Ten things make a complete profile; the first missing one becomes the hint under the bar.
        $checks = ['name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'dob' => $u->dob, 'gender' => $u->gender, 'address' => $p['address'] ?? null,
            'nid' => $u->nid_enc, 'interests' => $travel['interests'] ?? [], 'emergency' => ($p['emergency']['name'] ?? null) && ($p['emergency']['phone'] ?? null), 'photo' => $u->avatar_path];
        $missing = collect($checks)->filter(fn ($v) => empty($v))->keys()->values();

        return $this->ok(P::user($u) + ['address' => $p['address'] ?? null, 'nid_masked' => $u->nid_enc ? '•••• '.substr(preg_replace('/\D/', '', (string) $u->nid_enc), -4) : null,
            'emergency' => ($p['emergency'] ?? []) + ['name' => null, 'phone' => null], 'travel' => $travel,
            'completeness' => (int) round(100 * (count($checks) - $missing->count()) / count($checks)), 'missing' => $missing]);
    }

    public function updateProfile(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $r->merge(['phone' => Otp::phone($r->input('phone')) ?? $r->input('phone')]);
        $v = $r->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'], 'dob' => ['nullable', 'date', 'before:-12 years'], 'gender' => ['nullable', 'in:female,male,other'],
            'phone' => ['required', 'regex:/^\+8801[3-9]\d{8}$/', Rule::unique('users', 'phone')->ignore($u->id)], 'email' => ['required', 'email:rfc', 'max:120', Rule::unique('users', 'email')->ignore($u->id)],
            'city' => ['nullable', 'string', 'max:120'], 'address' => ['nullable', 'string', 'max:300'], 'nid' => ['nullable', 'regex:/^(\d{10}|\d{13}|\d{17})$/'],
            'emergency.name' => ['nullable', 'string', 'max:120'], 'emergency.phone' => ['nullable', 'string', 'max:20'],
            'travel.interests' => ['nullable', 'array', 'max:12'], 'travel.interests.*' => ['string', 'in:beaches,mountains,cruises,food,adventure,luxury,budget,family'],
            'travel.seat' => ['nullable', 'in:window,aisle'], 'travel.meal' => ['nullable', 'in:none,vegetarian,halal,diabetic'], 'travel.room' => ['nullable', 'in:king,twin'],
        ], ['phone.regex' => __('Enter a valid BD mobile number.'), 'nid.regex' => __('NID must have 10, 13 or 17 digits.')]);
        if (Str::lower($v['email']) !== Str::lower((string) $u->email)) {
            $u->forceFill(['email_verified_at' => null]);
        }
        if ($v['phone'] !== $u->phone) {
            $u->forceFill(['phone_verified_at' => null]);
        }
        $u->fill(['name' => $v['name'], 'dob' => $v['dob'] ?? null, 'gender' => $v['gender'] ?? null, 'phone' => $v['phone'], 'email' => Str::lower($v['email']), 'city' => $v['city'] ?? null]);
        if (! empty($v['nid'])) {
            $u->nid_enc = $v['nid'];
        }
        // meal / seat also live at the top level, where checkout pre-fills the lead traveller from.
        $u->preferences = array_merge($u->preferences ?? [], ['address' => $v['address'] ?? null, 'emergency' => $v['emergency'] ?? null, 'travel' => $v['travel'] ?? null,
            'meal' => $v['travel']['meal'] ?? null, 'seat' => $v['travel']['seat'] ?? null]);
        $u->forceFill(['initials' => null])->save();

        return $this->profile($r);
    }

    /** Profile photo: square-cropped JPEG/PNG/WebP up to 2 MB on the public disk (old file removed). */
    public function avatar(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $v = $r->validate(['photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=96,min_height=96,max_width=6000,max_height=6000']]);
        $old = $u->avatar_path;
        $path = $v['photo']->store('avatars', 'public');
        $u->forceFill(['avatar_path' => $path])->save();
        if ($old && $old !== $path) {
            Storage::disk('public')->delete($old);
        }

        return $this->ok(P::user($u->fresh()));
    }

    public function deleteAvatar(Request $r): JsonResponse
    {
        $u = $this->u($r);
        if ($u->avatar_path) {
            Storage::disk('public')->delete($u->avatar_path);
            $u->forceFill(['avatar_path' => null])->save();
        }

        return $this->ok(P::user($u));
    }

    public function settings(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $current = $u->currentAccessToken();
        $p = $u->preferences ?? [];

        return $this->ok([
            // The newsletter switch mirrors the subscriber list (the footer form writes there too).
            'notify' => array_merge(['alerts' => true, 'email' => true, 'deals' => false], $p['notify'] ?? [], ['alerts' => true,
                'newsletter' => $u->email ? \App\Models\NewsletterSubscriber::where('email', mb_strtolower($u->email))->where('status', 'subscribed')->exists() : false]),
            'locale' => $u->locale ?? 'en', 'currency' => $p['currency'] ?? 'BDT', 'two_factor' => (bool) ($p['otp_login'] ?? false),
            'password_changed' => $p['password_changed_at'] ?? $u->created_at?->toDateString(),
            'sessions' => $u->tokens()->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->orderByDesc('last_used_at')->get()
                ->map(fn ($t) => ['id' => $t->id, 'name' => self::agent($t->name), 'last_used' => ($t->last_used_at ?? $t->created_at)?->toIso8601String(), 'current' => $current && $t->id === $current->id])->values(),
            'logins' => LoginActivity::where('user_id', $u->id)->orderByDesc('id')->limit(5)->get()->map(fn ($l) => ['ip' => $l->ip, 'agent' => self::agent((string) $l->user_agent), 'success' => $l->success, 'at' => $l->created_at?->toIso8601String()])->values(),
        ]);
    }

    private static function agent(string $ua): string
    {
        $b = str_contains($ua, 'Edg/') ? 'Edge' : (str_contains($ua, 'Chrome') ? 'Chrome' : (str_contains($ua, 'Firefox') ? 'Firefox' : (str_contains($ua, 'Safari') ? 'Safari' : 'Browser')));
        $o = str_contains($ua, 'Windows') ? 'Windows' : (str_contains($ua, 'Android') ? 'Android' : (str_contains($ua, 'iPhone') ? 'iPhone' : (str_contains($ua, 'Mac') ? 'macOS' : (str_contains($ua, 'Linux') ? 'Linux' : ''))));

        return trim("$b · $o", ' ·');
    }

    public function updateSettings(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $v = $r->validate(['notify' => ['nullable', 'array'], 'notify.*' => ['boolean'], 'locale' => ['nullable', 'in:en,bn'], 'currency' => ['nullable', 'string', Rule::exists('currencies', 'code')->where('is_active', true)], 'two_factor' => ['nullable', 'boolean']]);
        $p = $u->preferences ?? [];
        if (isset($v['notify'])) {
            $p['notify'] = array_merge(['alerts' => true, 'email' => true, 'deals' => false], $p['notify'] ?? [], collect($v['notify'])->only(['email', 'deals'])->all(), ['alerts' => true]);
            unset($p['notify']['newsletter']);
            if (array_key_exists('newsletter', $v['notify']) && $u->email) {
                $sub = \App\Models\NewsletterSubscriber::firstOrNew(['email' => mb_strtolower($u->email)]);
                $sub->fill(['locale' => $u->locale ?? 'en', 'status' => $v['notify']['newsletter'] ? 'subscribed' : 'unsubscribed', 'confirmed_at' => $sub->confirmed_at ?? now()])->save();
            }
        }
        if (isset($v['currency'])) {
            $p['currency'] = $v['currency'];
        }
        if (! empty($v['two_factor']) && (! $u->phone || ! $u->phone_verified_at)) {
            throw ValidationException::withMessages(['two_factor' => __('Verify your mobile number first — two-step codes go there.')]);
        }
        if (isset($v['two_factor'])) {
            $p['otp_login'] = $v['two_factor'];
        }
        $u->preferences = $p;
        if (isset($v['locale'])) {
            $u->locale = $v['locale'];
        }
        $u->save();

        return $this->settings($r);
    }

    public function password(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $v = $r->validate(['current' => ['required', 'string'], 'password' => ['required', 'string', 'confirmed', 'different:current', Password::min(8)->letters()->numbers()]]);
        if (! Hash::check($v['current'], (string) $u->password)) {
            throw ValidationException::withMessages(['current' => __('Your current password is not right.')]);
        }
        $u->forceFill(['password' => $v['password'], 'preferences' => array_merge($u->preferences ?? [], ['password_changed_at' => today()->toDateString()])])->save();
        $u->tokens()->where('id', '!=', $u->currentAccessToken()?->id)->delete(); // sign out other devices

        return $this->ok(['ok' => true]);
    }

    public function revokeSession(Request $r, int $id): JsonResponse
    {
        $u = $this->u($r);
        abort_if($u->currentAccessToken()?->id === $id, 422, __('Use Sign out to end this session.'));
        $u->tokens()->whereKey($id)->firstOrFail()->delete();

        return $this->ok(['ok' => true]);
    }

    /** GDPR-style export: everything we hold about the traveller as JSON. */
    public function export(Request $r): JsonResponse
    {
        $u = $this->u($r);

        return response()->json([
            'exported_at' => now()->toIso8601String(), 'profile' => P::user($u),
            'travellers' => Traveller::where('user_id', $u->id)->get()->map(fn ($t) => $this->travellerShape($t)),
            'bookings' => Booking::where('user_id', $u->id)->get()->map(fn ($b) => CP::booking($b)),
            'reviews' => Review::where('user_id', $u->id)->get(['trip_title', 'rating', 'body', 'status', 'created_at']),
            'wallet' => WalletTransaction::where('user_id', $u->id)->get(['direction', 'amount', 'description', 'created_at']),
            'miles' => MilesTransaction::where('user_id', $u->id)->get(['miles', 'description', 'created_at']),
        ], 200, ['Content-Disposition' => 'attachment; filename="musafir-data-'.$u->ulid.'.json"', 'Cache-Control' => 'no-store']);
    }

    public function deleteAccount(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $r->validate(['password' => ['required', 'string']]);
        if (! Hash::check((string) $r->input('password'), (string) $u->password)) {
            throw ValidationException::withMessages(['password' => __('Your current password is not right.')]);
        }
        if (Booking::where('user_id', $u->id)->whereIn('status', ['pending', 'confirmed', 'partial'])->where('travel_start', '>=', today())->exists()) {
            return response()->json(['message' => __('You have active bookings. Please complete or cancel them first.')], 409);
        }
        if ((float) $u->wallet_balance > 0) {
            return response()->json(['message' => __('Your wallet still has a balance. Contact us to have it refunded first.')], 409);
        }
        $u->tokens()->delete();
        Traveller::where('user_id', $u->id)->delete();
        \App\Models\Wishlist::where('user_id', $u->id)->delete();
        \App\Models\TripPlan::where('user_id', $u->id)->delete();
        if ($u->email) {
            \App\Models\NewsletterSubscriber::where('email', mb_strtolower($u->email))->update(['status' => 'unsubscribed']);
        }
        if ($u->avatar_path) {
            Storage::disk('public')->delete($u->avatar_path);
        }
        $u->forceFill(['avatar_path' => null, 'city' => null, 'dob' => null, 'email' => 'deleted+'.$u->ulid.'@invalid', 'phone' => null, 'name' => 'Deleted user', 'status' => 'deleted', 'nid_enc' => null, 'preferences' => null])->save();
        $u->delete();

        return $this->ok(['ok' => true]);
    }

    /* ───────────── Support ───────────── */

    private function newTicket(User $u, string $subject, string $body, ?int $bookingId, string $priority = 'normal'): SupportTicket
    {
        $t = SupportTicket::create(['ref' => 'TKT-'.random_int(10000, 99999), 'user_id' => $u->id, 'booking_id' => $bookingId, 'subject' => self::bi($subject), 'customer_name' => $u->name,
            'priority' => $priority, 'status' => 'open', 'last_activity_at' => now()]);
        TicketMessage::create(['support_ticket_id' => $t->id, 'user_id' => $u->id, 'author_type' => 'customer', 'body' => self::bi(strip_tags($body)), 'internal' => false]);

        return $t;
    }

    public function tickets(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $list = SupportTicket::with('assignee:id,name')->where('user_id', $u->id)->orderByDesc('last_activity_at')->get();
        $open = $r->query('ticket') ? $list->firstWhere('ref', $r->query('ticket')) : $list->first();
        $messages = $open ? TicketMessage::with('user:id,name')->where('support_ticket_id', $open->id)->where('internal', false)->orderBy('id')->get() : collect();

        return $this->ok([
            'items' => $list->map(fn ($t) => ['ref' => $t->ref, 'subject' => $t->tr('subject'), 'status' => $t->status, 'agent' => $t->assignee?->name, 'date' => ($t->last_activity_at ?? $t->created_at)?->toDateString()])->values(),
            'open' => $open ? ['ref' => $open->ref, 'subject' => $open->tr('subject'), 'status' => $open->status, 'agent' => $open->assignee?->name,
                'messages' => $messages->map(fn ($m) => ['id' => $m->id, 'mine' => $m->author_type === 'customer', 'author' => $m->author_type === 'customer' ? null : ($m->user?->name ?? $open->assignee?->name), 'body' => $m->tr('body'), 'at' => $m->created_at?->toIso8601String(),
                    'attachments' => collect($m->attachments ?? [])->map(fn ($a, $i) => ['name' => $a['name'] ?? 'file', 'size' => $a['size'] ?? null, 'url' => isset($a['path']) ? "tickets/{$open->ref}/files/{$m->id}/{$i}" : null])->values()])->values()] : null,
            'bookings' => Booking::where('user_id', $u->id)->whereIn('status', ['pending', 'confirmed', 'partial'])->orderBy('travel_start')->get()->map(fn ($b) => ['ref' => $b->ref, 'title' => $b->tr('title')])->values(),
        ]);
    }

    public function storeTicket(Request $r): JsonResponse
    {
        $u = $this->u($r);
        $v = $r->validate(['booking' => ['nullable', 'string', 'max:20'], 'topic' => ['required', 'in:change,payment,visa,special,complaint,other'], 'message' => ['required', 'string', 'min:10', 'max:3000']]);
        $bid = $v['booking'] ? Booking::where('ref', $v['booking'])->where('user_id', $u->id)->value('id') : null;
        $topics = ['change' => 'Change dates or names', 'payment' => 'Payment or refund', 'visa' => 'Visa documents', 'special' => 'Special request', 'complaint' => 'Complaint', 'other' => 'Question'];
        $t = $this->newTicket($u, $topics[$v['topic']].($v['booking'] ? ' — '.$v['booking'] : ''), $v['message'], $bid, $v['topic'] === 'complaint' ? 'high' : 'normal');

        return $this->ok(['ref' => $t->ref], 201);
    }

    /** Download a ticket attachment (owner only; internal notes never). */
    public function ticketFile(Request $r, string $ref, int $msg, int $i)
    {
        $t = SupportTicket::where('user_id', $this->u($r)->id)->where('ref', $ref)->firstOrFail();
        $m = TicketMessage::where('support_ticket_id', $t->id)->where('internal', false)->findOrFail($msg);
        $a = ($m->attachments ?? [])[$i] ?? abort(404);
        abort_unless(isset($a['path']) && Storage::disk('local')->exists($a['path']), 404);

        return Storage::disk('local')->download($a['path'], $a['name'] ?? 'attachment', ['Cache-Control' => 'no-store, private']);
    }

    public function replyTicket(Request $r, string $ref): JsonResponse
    {
        $u = $this->u($r);
        $t = SupportTicket::where('user_id', $u->id)->where('ref', $ref)->firstOrFail();
        $v = $r->validate(['message' => ['required_without:file', 'nullable', 'string', 'max:3000'], 'file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        $att = [];
        if ($r->hasFile('file')) { // private disk; downloaded through the owner-checked endpoint below
            $f = $r->file('file');
            $att[] = ['name' => Str::limit(preg_replace('/[^\w.\- ]+/u', '_', $f->getClientOriginalName()), 80, ''), 'size' => $f->getSize(), 'mime' => $f->getMimeType(), 'path' => $f->store("tickets/{$t->ref}", 'local')];
        }
        TicketMessage::create(['support_ticket_id' => $t->id, 'user_id' => $u->id, 'author_type' => 'customer', 'body' => self::bi(strip_tags((string) ($v['message'] ?? ''))), 'internal' => false, 'attachments' => $att ?: null]);
        $t->update(['status' => in_array($t->status, ['resolved', 'closed'], true) ? 'open' : ($t->status === 'awaiting' ? 'open' : $t->status), 'last_activity_at' => now()]);

        return $this->ok(['ok' => true], 201);
    }
}
