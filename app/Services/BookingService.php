<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Commission;
use App\Models\Customer;
use App\Models\Package;
use App\Models\PackagePrice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    /** Price breakdown. Same maths as the JS calculator in public/assets/app.js. */
    public function quote(Package $package, string $roomType, int $adults, int $children = 0, array $addons = []): array
    {
        $price = $package->prices->firstWhere('room_type', $roomType) ?? $package->cheapestPrice();
        if (! $price) {
            throw ValidationException::withMessages(['room_type' => 'This package has no price yet.']);
        }
        $childPrice = $package->prices->firstWhere('room_type', 'child')?->price ?? (int) round($price->price * 0.75);
        $pax = $adults + $children;

        $lines = [['label' => "{$adults} × ".money($price->price), 'amount' => $price->price * $adults]];
        if ($children) {
            $lines[] = ['label' => "{$children} child × ".money($childPrice), 'amount' => $childPrice * $children];
        }
        if (in_array('qurbani', $addons, true)) {
            $lines[] = ['label' => 'Qurbani × '.$adults, 'amount' => (int) site('qurbani_price') * $adults, 'kind' => 'qurbani'];
        }
        if (in_array('insurance', $addons, true)) {
            $lines[] = ['label' => 'Travel insurance × '.$pax, 'amount' => (int) site('insurance_price') * $pax, 'kind' => 'insurance'];
        }
        $subtotal = array_sum(array_column($lines, 'amount'));
        $discount = ($package->type === 'hajj' && $package->departure_date && $package->departure_date->gt(now()->addDays(120))) ? (int) site('early_bird_discount') * $adults : 0;
        $total = $subtotal - $discount;
        $deposit = min($total, ($price->deposit_amount ?: (int) round($total * 0.2 / max($pax, 1))) * $pax);

        return [
            'price' => $price, 'lines' => $lines, 'subtotal' => $subtotal, 'discount' => $discount, 'total' => $total,
            'deposit' => $deposit, 'schedule' => $this->schedule($price, $total, $deposit),
        ];
    }

    /** Deposit now, balance split over the plan's due dates (rounded to ৳1,000, remainder on the last one). */
    public function schedule(PackagePrice $price, int $total, int $deposit): array
    {
        $dates = $price->installment_plan['due_dates'] ?? [];
        if (! $dates) {
            $dates = [now()->addMonth()->toDateString(), now()->addMonths(2)->toDateString()];
        }
        $rows = [['seq' => 0, 'label' => 'Booking deposit', 'due_date' => now()->toDateString(), 'amount' => $deposit]];
        $balance = $total - $deposit; $n = count($dates);
        $each = (int) (floor($balance / $n / 1000) * 1000);
        foreach ($dates as $i => $d) {
            $amt = $i === $n - 1 ? $balance - $each * ($n - 1) : $each;
            $rows[] = ['seq' => $i + 1, 'label' => $i === $n - 1 ? 'Final payment' : 'Installment '.($i + 1), 'due_date' => $d, 'amount' => $amt];
        }

        return $rows;
    }

    /**
     * Create the booking, travellers, items and payment schedule in one transaction.
     * Returns [Booking, amountDueNow].
     */
    public function create(Customer $customer, Package $package, array $data, ?int $agentId = null, string $source = 'web'): array
    {
        return DB::transaction(function () use ($customer, $package, $data, $agentId, $source) {
            $package = Package::whereKey($package->id)->lockForUpdate()->with('prices')->firstOrFail();
            $adults = (int) $data['adults']; $children = (int) ($data['children'] ?? 0);
            if ($package->seats_total && $package->seatsLeft() < $adults + $children) {
                throw ValidationException::withMessages(['adults' => 'Only '.$package->seatsLeft().' seats are left on this package.']);
            }
            $mode = $data['payment_mode'];
            if ($mode === 'installment' && ! module_on('installments')) {
                $mode = 'full';
            }
            $q = $this->quote($package, $data['room_type'], $adults, $children, $data['addons'] ?? []);

            $booking = Booking::create([
                'ref' => Booking::nextRef($package->type), 'type' => $package->type, 'customer_id' => $customer->id, 'package_id' => $package->id,
                'agent_id' => $agentId ?? $customer->agent_id, 'room_type' => $q['price']->room_type, 'adults' => $adults, 'children' => $children,
                'status' => $mode === 'pay_later' ? 'hold' : 'pending', 'payment_mode' => $mode, 'payment_method' => $mode === 'pay_later' ? null : $data['payment_method'],
                'subtotal' => $q['subtotal'], 'discount' => $q['discount'], 'total' => $q['total'], 'currency' => 'BDT', 'source' => $source,
                'hold_expires_at' => $mode === 'pay_later' ? now()->addHours((int) site('hold_hours', 72)) : null,
                'meta' => ['addons' => $data['addons'] ?? [], 'notes' => $data['notes'] ?? null, 'wheelchair' => ! empty($data['wheelchair'])],
            ]);

            foreach ($data['travellers'] as $i => $t) {
                $tr = $customer->travellers()->create(['full_name' => strtoupper($t['full_name']), 'gender' => $t['gender'], 'dob' => $t['dob'] ?? null, 'phone' => $t['phone'] ?? null, 'relation' => $i === 0 ? 'self' : null]);
                if (! empty($t['passport_no'])) {
                    $tr->passport()->create(['number_enc' => strtoupper($t['passport_no']), 'expiry_date' => $t['passport_expiry'] ?? null]);
                }
                $bt = $booking->travellers()->create(['traveller_id' => $tr->id, 'room_type' => $q['price']->room_type, 'price' => $q['price']->price, 'is_lead' => $i === 0]);
                if (in_array($package->type, ['hajj', 'umrah'], true)) {
                    foreach (['passport', 'photo', 'nid', 'vaccine'] as $doc) {
                        $bt->documents()->create(['type' => $doc, 'status' => 'pending']);
                    }
                }
            }
            foreach ($q['lines'] as $l) {
                if (isset($l['kind'])) {
                    $booking->items()->create(['kind' => $l['kind'], 'label' => $l['label'], 'price' => $l['amount']]);
                }
            }

            $dueNow = match ($mode) { 'full' => $q['total'], 'installment' => $q['deposit'], default => 0 };
            if ($mode === 'installment') {
                foreach ($q['schedule'] as $row) {
                    $booking->installments()->create($row + ['status' => $row['seq'] === 0 ? 'due' : 'upcoming']);
                }
            }
            $package->increment('seats_sold', $adults + $children);

            if ($booking->agent_id && $booking->agent) {
                $amt = (int) round($q['total'] * $booking->agent->commission_percent / 100);
                if ($amt > 0) {
                    Commission::create(['agent_id' => $booking->agent_id, 'booking_id' => $booking->id, 'amount' => $amt]);
                }
            }

            return [$booking, $dueNow];
        });
    }
}
