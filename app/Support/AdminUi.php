<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/** Small helpers that turn models / paginators into plain arrays for the React (Inertia) admin. */
class AdminUi
{
    /** Laravel paginator → {data, meta} with a mapped row shape. */
    public static function page(LengthAwarePaginator $p, callable $map): array
    {
        return [
            'data' => collect($p->items())->map($map)->values()->all(),
            'meta' => ['current_page' => $p->currentPage(), 'last_page' => $p->lastPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'from' => $p->firstItem(), 'to' => $p->lastItem()],
        ];
    }

    /** Whitelisted server-side sort: ?sort=col&dir=asc|desc. $allowed maps public key → column (or closure). */
    public static function sort(Builder $q, Request $r, array $allowed): Builder
    {
        $key = (string) $r->query('sort');
        if (! isset($allowed[$key])) return $q;
        $dir = $r->query('dir') === 'asc' ? 'asc' : 'desc';
        $q->reorder();
        $col = $allowed[$key];
        $col instanceof \Closure ? $col($q, $dir) : $q->orderBy($col, $dir);

        return $q->orderBy($q->getModel()->getQualifiedKeyName(), $dir);
    }

    /** ['k' => 'Label'] → [{value, label}] (labels are translated on the client). */
    public static function options(array $map): array
    {
        return collect($map)->map(fn ($l, $k) => ['value' => (string) $k, 'label' => (string) $l])->values()->all();
    }

    public static function filters(Request $r, array $keys): array
    {
        return collect($keys)->mapWithKeys(fn ($k) => [$k => (string) $r->query($k, '')])->all();
    }

    public static function date($d, string $fmt = 'd M Y'): ?string
    {
        return $d ? $d->format($fmt) : null;
    }

    public static function statusTone(string $status): string
    {
        return match ($status) { 'confirmed', 'ticketed', 'completed', 'paid', 'verified', 'issued', 'converted', 'active', 'approved_ok' => 'ok',
            'cancelled', 'failed', 'refunded', 'rejected', 'void', 'blocked', 'overdue' => 'no',
            'pending', 'hold', 'docs_pending', 'unpaid', 'received', 'draft' => 'pen', default => 'inf' };
    }

    /** Compact booking row used by lists (bookings, dashboard, customer page, agent statement). */
    public static function bookingRow(Booking $b): array
    {
        $ps = $b->paymentStatus();

        return [
            'id' => $b->id, 'ref' => $b->ref, 'type' => $b->type,
            'customer' => ['id' => $b->customer_id, 'name' => $b->customer?->user?->name, 'phone' => $b->customer?->user?->phone],
            'package' => $b->package?->title, 'room_type' => $b->room_type, 'pax' => (int) $b->adults + (int) $b->children,
            'total' => (int) $b->total, 'paid' => (int) $b->paid, 'due' => $b->due(), 'progress' => $b->progress(),
            'status' => $b->status, 'status_label' => Booking::STATUSES[$b->status] ?? $b->status, 'status_tone' => $b->statusClass(),
            'payment_status' => $ps, 'payment_status_label' => Booking::PAYMENT_STATUSES[$ps], 'payment_mode' => $b->payment_mode, 'payment_mode_label' => Booking::MODES[$b->payment_mode] ?? $b->payment_mode,
            'agent' => $b->relationLoaded('agent') ? $b->agent?->code : null,
            'created' => $b->created_at?->format('d M Y'), 'trashed' => $b->trashed(),
        ];
    }

    public static function paymentTone(string $s): string
    {
        return $s === 'paid' ? 'ok' : (in_array($s, ['failed', 'refunded'], true) ? 'no' : 'pen');
    }

    public static function paymentRow(Payment $p): array
    {
        return [
            'id' => $p->id, 'method' => $p->method, 'method_label' => Payment::METHODS[$p->method] ?? $p->method, 'txn' => $p->gateway_txn_id,
            'amount' => (int) $p->amount, 'refunded' => (int) $p->refunded, 'status' => $p->status, 'status_label' => Payment::STATUSES[$p->status] ?? ucfirst($p->status), 'status_tone' => self::paymentTone($p->status),
            'date' => ($p->paid_at ?? $p->created_at)?->format('d M Y'), 'note' => $p->note, 'has_slip' => (bool) $p->slip_path,
            'booking' => $p->relationLoaded('booking') && $p->booking ? ['ref' => $p->booking->ref, 'customer' => $p->booking->customer?->user?->name] : null,
            'recorder' => $p->relationLoaded('recorder') ? $p->recorder?->name : null,
        ];
    }
}
