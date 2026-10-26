<?php

namespace App\Http\Presenters;

use App\Models\Booking;
use App\Services\Payments\GatewayManager;
use App\Support\Img;
use App\Support\Settings;

/** JSON shapes for checkout quotes and booking receipts (localised for the request locale). */
final class Checkout
{
    public static function quote(array $q): array
    {
        $l = app()->getLocale();

        return [
            'kind' => $q['kind'], 'slug' => $q['product']->slug ?? $q['product']->code ?? (string) $q['product']->getKey(),
            'title' => tr_pick($q['title']), 'subtitle' => tr_pick($q['subtitle']), 'image' => Img::key($q['image_key']),
            'travel_start' => $q['travel_start'], 'travel_end' => $q['travel_end'], 'pax' => $q['pax'], 'pax_count' => $q['pax_count'], 'options' => $q['options'],
            'lines' => array_map(fn ($x) => ['code' => $x['code'], 'label' => tr_pick($x['label'], $l), 'qty' => $x['qty'], 'unit' => $x['unit'], 'total' => $x['total']], $q['lines']),
            'addons' => array_map(fn ($a) => ['code' => $a['code'], 'label' => tr_pick($a['label'], $l), 'price' => (int) $a['price'], 'per' => $a['per'] ?? 'booking'], $q['addons_catalogue'] ?? []),
            'subtotal' => $q['subtotal'], 'discount' => $q['discount'], 'coupon' => $q['coupon'] ? array_diff_key($q['coupon'], ['id' => 1]) : null, 'total' => $q['total'],
            'plans' => array_values($q['plans']),
            'cancellation' => $q['policy'] ? Catalog::policy($q['policy']) : null, 'refundable' => $q['refundable'] ?? null,
            'gateways' => app(GatewayManager::class)->enabled(), 'payment_mode' => config('musafir.payment_mode'),
            'choices' => self::choices($q),
            'needs_passport' => ($q['product']->region ?? null) === 'intl' || in_array($q['kind'], ['flight', 'visa'], true),
        ];
    }

    /** What the traveller can change on step 1 (dates, rooms, cabins…), localised. */
    private static function choices(array $q): array
    {
        $p = $q['product'];

        return match ($q['kind']) {
            'tour' => ['dates' => $p->departures->filter(fn ($d) => $d->date->gte(today()) && $d->status !== 'sold_out' && $d->seatsLeft() > 0)->values()->map(fn ($d) => ['date' => $d->date->toDateString(), 'price' => (int) round((float) $d->price), 'seats_left' => $d->seatsLeft()])->all(),
                'rooms' => $p->priceTiers->map(fn ($t) => ['code' => $t->code, 'label' => $t->tr('label')])->all(), 'max' => 9],
            'cruise' => ['dates' => $p->sailings->filter(fn ($s) => $s->date->gte(today()) && $s->seats_total > $s->seats_held)->values()->map(fn ($s) => ['date' => $s->date->toDateString(), 'price' => (int) round((float) $s->price), 'seats_left' => $s->seats_total - $s->seats_held])->all(),
                'cabins' => $p->cabins->map(fn ($c) => ['code' => $c->code, 'label' => $c->tr('name'), 'price' => (int) round((float) $c->price)])->all(), 'max' => 8],
            'activity' => ['options' => $p->options->map(fn ($o) => ['id' => $o->id, 'label' => $o->tr('name'), 'price' => (int) round((float) $o->price)])->all(), 'max' => 10],
            'hotel' => ['rooms' => $p->roomTypes->map(fn ($r) => ['id' => $r->id, 'label' => $r->tr('name'), 'price' => (int) round((float) $r->price)])->all(), 'max_rooms' => 5],
            'visa' => ['max' => 9],
            default => [],
        };
    }

    public static function booking(Booking $b): array
    {
        $l = app()->getLocale();
        $b->loadMissing(['items', 'travellers', 'payments', 'instalments', 'documents']);
        $c = $b->contact ?? [];

        return [
            'ref' => $b->ref, 'key' => $b->ulid, 'kind' => $b->kind, 'status' => $b->status, 'payment_status' => $b->payment_status, 'payment_plan' => $b->payment_plan,
            'title' => $b->tr('title'), 'subtitle' => $b->tr('subtitle'), 'image' => Img::key($b->image_key),
            'travel_start' => $b->travel_start?->toDateString(), 'travel_end' => $b->travel_end?->toDateString(), 'pax' => $b->pax, 'pax_count' => $b->pax_count,
            'contact' => ['first_name' => $c['first_name'] ?? null, 'last_name' => $c['last_name'] ?? null, 'email' => $c['email'] ?? null, 'phone' => $c['phone'] ?? null, 'pnr' => $c['pnr'] ?? null, 'gift_code' => $c['gift_code'] ?? null],
            'items' => $b->items->map(fn ($i) => ['label' => $i->tr('label'), 'qty' => $i->qty, 'unit' => (int) round((float) $i->unit_price), 'total' => (int) round((float) $i->line_total), 'code' => $i->meta['code'] ?? null])->values(),
            'travellers' => $b->travellers->map(fn ($t) => ['name' => $t->name, 'type' => $t->type, 'ticket_no' => $t->ticket_no, 'seat' => $t->seat])->values(),
            'subtotal' => (int) round((float) $b->subtotal), 'discount' => (int) round((float) $b->discount), 'total' => (int) round((float) $b->total),
            'paid' => (int) round((float) $b->paid), 'balance' => (int) round($b->balance()),
            'payments' => $b->payments->sortByDesc('id')->map(fn ($p) => ['id' => $p->ulid, 'method' => $p->method, 'gateway' => $p->gateway, 'amount' => (int) round((float) $p->amount), 'status' => $p->status, 'txn' => $p->gateway_txn, 'paid_at' => $p->paid_at?->toIso8601String(), 'created_at' => $p->created_at?->toIso8601String()])->values(),
            'instalments' => $b->instalments->map(fn ($i) => ['id' => $i->id, 'seq' => $i->seq, 'due_date' => $i->due_date?->toDateString(), 'amount' => (int) round((float) $i->amount), 'status' => $i->status])->values(),
            'documents' => $b->documents->map(fn ($d) => ['kind' => $d->kind, 'title' => $d->tr('title')])->values(),
            'hold_expires_at' => $b->hold_expires_at?->toIso8601String(), 'created_at' => $b->created_at?->toIso8601String(),
            'invoice_no' => self::invoiceNo($b), 'gateways' => app(GatewayManager::class)->enabled(),
            'bank' => Settings::get('payments.bank_details'), 'cancel_reason' => $b->cancel_reason,
        ];
    }

    public static function invoiceNo(Booking $b): string
    {
        return 'INV-'.($b->created_at?->format('Y') ?? date('Y')).'-'.str_pad((string) $b->id, 6, '0', STR_PAD_LEFT);
    }
}
