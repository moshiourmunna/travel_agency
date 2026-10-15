@extends('admin.layout')
@section('title', 'Bookings')
@section('heading', 'Bookings')
@section('sub', $bookings->total().' bookings')
@section('content')
<div class="panel"><form method="get" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><input class="inp" name="q" value="{{ request('q') }}" placeholder="Ref, name or phone" style="max-width:240px">
<select class="inp" name="status" style="width:auto"><option value="">All statuses</option>@foreach(\App\Models\Booking::STATUSES as $k => $v)<option value="{{ $k }}" @selected(request('status') === $k)>{{ $v }}</option>@endforeach</select>
<select class="inp" name="payment_mode" style="width:auto"><option value="">All payment modes</option>@foreach(\App\Models\Booking::MODES as $k => $v)<option value="{{ $k }}" @selected(request('payment_mode') === $k)>{{ $v }}</option>@endforeach</select>
<select class="inp" name="type" style="width:auto"><option value="">All types</option>@foreach(\App\Models\Package::TYPES as $k => $v)<option value="{{ $k }}" @selected(request('type') === $k)>{{ $v }}</option>@endforeach</select><button class="btn btn-out btn-sm">Filter</button></form>
<div class="tblw"><table class="tbl"><tr><th>Ref</th><th>Customer</th><th>Package</th><th>Agent</th><th>Mode</th><th>Total</th><th>Paid</th><th>Status</th><th>Date</th></tr>
@forelse($bookings as $b)<tr><td><a href="{{ route('admin.bookings.show', $b) }}" style="color:var(--em);font-weight:600">{{ $b->ref }}</a></td><td>{{ $b->customer?->user?->name }}<br><small>{{ $b->customer?->user?->phone }}</small></td><td>{{ $b->package?->title }}</td><td>{{ $b->agent?->code ?? '—' }}</td><td>{{ \App\Models\Booking::MODES[$b->payment_mode] }}</td><td>{{ money($b->total) }}</td><td>{{ money($b->paid) }}</td><td><span class="st {{ $b->statusClass() }}">{{ \App\Models\Booking::STATUSES[$b->status] }}</span></td><td>{{ $b->created_at->format('d M Y') }}</td></tr>@empty<tr><td colspan="9" class="empty">No bookings.</td></tr>@endforelse</table></div>{{ $bookings->links('partials.pager') }}</div>
@endsection
