@props(['b'])
@php($ps = $b->paymentStatus())
<span class="st {{ ['paid' => 'ok', 'overdue' => 'no', 'partial' => 'inf', 'unpaid' => 'pen'][$ps] }}">{{ __(\App\Models\Booking::PAYMENT_STATUSES[$ps]) }}</span>
