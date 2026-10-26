<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Presenters\Checkout as P;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\Payment;
use App\Services\Checkout\BookingService;
use App\Services\Checkout\Pricer;
use App\Services\Payments\GatewayManager;
use App\Services\Payments\PaymentException;
use App\Services\Pdf\BookingPdf;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/** Checkout API: server-side quotes, coupons, bookings, payment start, receipts and PDFs. */
class CheckoutController extends Controller
{
    public const PHONE = '/^(?:\+?88)?01[3-9]\d{8}$/';

    public function __construct(private Pricer $pricer, private BookingService $bookings, private GatewayManager $gateways) {}

    private function selection(Request $r): array
    {
        // Room ids / cabin codes may arrive as numbers from JSON clients — normalise to strings before validating.
        foreach (['room', 'cabin', 'time', 'date', 'pax'] as $k) {
            if (is_int($r->input($k)) || is_float($r->input($k))) {
                $r->merge([$k => (string) $r->input($k)]);
            }
        }

        return $r->validate([
            'kind' => ['required', Rule::in(Pricer::KINDS)],
            'slug' => ['nullable', 'string', 'max:160'], 'date' => ['nullable', 'string', 'max:10'], 'time' => ['nullable', 'string', 'max:5'],
            'room' => ['nullable', 'string', 'max:24'], 'cabin' => ['nullable', 'string', 'max:24'], 'option' => ['nullable', 'integer'],
            'in' => ['nullable', 'string', 'max:10'], 'out' => ['nullable', 'string', 'max:10'], 'rooms' => ['nullable', 'integer', 'min:1', 'max:5'],
            'adults' => ['nullable', 'integer', 'min:1', 'max:10'], 'children' => ['nullable', 'integer', 'min:0', 'max:10'], 'infants' => ['nullable', 'integer', 'min:0', 'max:9'],
            'addons' => ['nullable', 'array', 'max:10'], 'addons.*' => ['string', 'max:32'],
            'flight' => ['nullable', 'integer'], 'return' => ['nullable', 'string', 'max:10'], 'pax' => ['nullable', 'string', 'max:4'],
            'gift' => ['nullable', 'string', 'max:24'], 'amount' => ['nullable', 'integer'], 'to' => ['nullable', 'string', 'max:80'], 'email' => ['nullable', 'email', 'max:120'],
            'message' => ['nullable', 'string', 'max:300'], 'send_on' => ['nullable', 'date'],
            'coupon' => ['nullable', 'string', 'max:32'], 'contact.email' => ['nullable', 'email'],
        ]);
    }

    public function quote(Request $r): JsonResponse
    {
        return response()->json(['data' => P::quote($this->pricer->quote($this->selection($r), $r->user('sanctum')))], 200, ['Cache-Control' => 'no-store']);
    }

    /** Coupon check only (the quote endpoint applies it too). */
    public function coupon(Request $r): JsonResponse
    {
        $r->validate(['coupon' => ['required', 'string', 'max:32']]);
        $q = $this->pricer->quote($this->selection($r), $r->user('sanctum'));

        return response()->json(['data' => ['coupon' => $q['coupon'] ? array_diff_key($q['coupon'], ['id' => 1]) : null, 'discount' => $q['discount'], 'total' => $q['total']]], 200, ['Cache-Control' => 'no-store']);
    }

    public function store(Request $r): JsonResponse
    {
        $sel = $this->selection($r);
        $data = $r->validate([
            'contact.first_name' => ['required', 'string', 'max:60'], 'contact.last_name' => ['required', 'string', 'max:60'],
            'contact.email' => ['required', 'email:rfc', 'max:120'], 'contact.phone' => ['required', 'string', 'regex:'.self::PHONE],
            'contact.city' => ['nullable', 'string', 'max:60'], 'contact.passport' => ['nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9]{6,20}$/'], 'contact.dob' => ['nullable', 'date', 'before:today'],
            'travellers' => ['nullable', 'array', 'max:20'], 'travellers.*.name' => ['required', 'string', 'max:120'],
            'travellers.*.relation' => ['nullable', 'string', 'max:24'], 'travellers.*.type' => ['nullable', Rule::in(['adult', 'child', 'infant'])],
            'notes' => ['nullable', 'string', 'max:1000'], 'plan' => ['required', Rule::in(['full', 'deposit', 'instalments'])], 'agree' => ['accepted'],
            'website' => ['nullable', 'max:0'], // honeypot
        ], ['contact.phone.regex' => __('Enter a valid BD mobile number.'), 'website.max' => __('Spam detected.')]);
        $user = $r->user('sanctum');
        $q = $this->pricer->quote($sel + ['contact' => ['email' => $data['contact']['email']]], $user);
        $c = $data['contact'];
        $lead = trim($c['first_name'].' '.$c['last_name']);
        $travellers = [['name' => $lead, 'type' => 'adult']];
        foreach (array_slice($data['travellers'] ?? [], 0, max(0, $q['pax_count'] - 1)) as $t) {
            $travellers[] = ['name' => strip_tags($t['name']), 'type' => $t['type'] ?? 'adult'];
        }
        if (in_array($q['kind'], ['gift_card'], true)) {
            $travellers = [['name' => $lead, 'type' => 'adult']];
        }
        $b = $this->bookings->create($q, ['contact' => array_map(fn ($v) => is_string($v) ? strip_tags($v) : $v, $c), 'travellers' => $travellers,
            'notes' => isset($data['notes']) ? strip_tags($data['notes']) : null, 'plan' => $data['plan'], 'locale' => app()->getLocale()], $user);

        return response()->json(['data' => ['ref' => $b->ref, 'key' => $b->ulid, 'total' => (int) $b->total, 'due_now' => $this->bookings->amountDue($b)['amount'],
            'hold_expires_at' => $b->hold_expires_at?->toIso8601String()]], 201);
    }

    private function find(Request $r, string $ref): Booking
    {
        $b = Booking::where('ref', $ref)->first();
        $key = (string) $r->input('key', $r->query('key', ''));
        $user = $r->user('sanctum');
        abort_unless($b && (hash_equals($b->ulid, $key) || ($user && $b->user_id === $user->id)), 404);

        return $b;
    }

    public function show(Request $r, string $ref): JsonResponse
    {
        return response()->json(['data' => P::booking($this->find($r, $ref))], 200, ['Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex']);
    }

    public function pay(Request $r, string $ref): JsonResponse
    {
        $b = $this->find($r, $ref);
        $v = $r->validate(['gateway' => ['required', 'string', Rule::in($this->gateways->enabled())], 'instalment_id' => ['nullable', 'integer'],
            'slip_ref' => [Rule::requiredIf($r->input('gateway') === 'bank_transfer'), 'nullable', 'string', 'max:64',
                Rule::unique('payments', 'gateway_txn')->where('gateway', 'bank_transfer')], ], ['slip_ref.unique' => __('This transfer reference has already been submitted. Please check it or contact us.')]);
        if (in_array($b->status, ['cancelled', 'refunded', 'completed'], true)) {
            return response()->json(['message' => __('This booking can no longer be paid.')], 409);
        }
        if ($b->hold_expires_at && $b->hold_expires_at->isPast() && (float) $b->paid <= 0) {
            $this->bookings->expire($b);

            return response()->json(['message' => __('The payment window for this booking has expired. Please start again.')], 409);
        }
        $due = $this->bookings->amountDue($b, $v['instalment_id'] ?? null);
        if ($due['amount'] <= 0) {
            return response()->json(['message' => __('Nothing is due on this booking.')], 409);
        }
        $gw = $this->gateways->resolve($v['gateway']);
        $p = Payment::create(['booking_id' => $b->id, 'user_id' => $b->user_id, 'purpose' => $due['instalment'] ? 'instalment' : 'booking', 'gateway' => $v['gateway'],
            'method' => $gw->label(), 'amount' => $due['amount'], 'status' => 'initiated', 'gateway_txn' => $v['gateway'] === 'bank_transfer' ? $v['slip_ref'] : null,
            'raw' => ['instalment_id' => $due['instalment']?->id, 'lang' => app()->getLocale()]]);
        try {
            $res = $gw->initiate($p, $b);
        } catch (PaymentException|ConnectionException $e) {
            Log::warning('payment.init_failed', ['gateway' => $v['gateway'], 'ref' => $b->ref, 'error' => $e->getMessage()]);
            $p->update(['status' => 'failed']);

            return response()->json(['message' => __('The payment gateway is not responding. Please try another method.')], 502);
        }
        // Keep the instalment link after drivers store their own references.
        $p->refresh()->update(['raw' => array_merge((array) $p->raw, ['instalment_id' => $due['instalment']?->id, 'lang' => app()->getLocale()])]);
        if (! empty($res['pending'])) {
            BookingActivity::create(['booking_id' => $b->id, 'type' => 'payment', 'body' => ['en' => 'Bank transfer reported (slip '.$p->gateway_txn.'), awaiting verification', 'bn' => 'ব্যাংক ট্রান্সফার জমা — যাচাই বাকি']]);
        }

        return response()->json(['data' => ['payment' => $p->ulid, 'amount' => $due['amount'], 'gateway' => $v['gateway']] + $res]);
    }

    public function pdf(Request $r, string $ref, string $doc): Response
    {
        $b = $this->find($r, $ref);
        abort_unless(in_array($doc, ['invoice', 'voucher'], true), 404);
        abort_if($doc === 'voucher' && (float) $b->paid <= 0, 404);

        return app(BookingPdf::class)->download($b, $doc);
    }
}
