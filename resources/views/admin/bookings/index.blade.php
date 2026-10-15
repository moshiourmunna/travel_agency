@extends('admin.layout')
@section('title', __('Bookings'))
@section('heading', __('Bookings'))
@section('sub', __(':n bookings', ['n' => number_format($totals->n)]).' · '.__('Value').' '.money($totals->t).' · '.__('Collected').' '.money($totals->p))
@section('top_extra')<div class="hbar"><a class="btn btn-out btn-sm" href="{{ route('admin.bookings.export', request()->query()) }}">⬇ CSV</a><a class="btn btn-gold btn-sm" href="{{ route('admin.bookings.create') }}">＋ {{ __('New booking') }}</a></div>@endsection
@section('content')
<div class="panel">
<div class="chips"><a href="{{ route('admin.bookings.index') }}" @class(['on' => !request()->hasAny(['status', 'payment_status', 'trashed'])])>{{ __('All') }}</a>
@foreach(['pending', 'hold', 'confirmed', 'docs_pending', 'visa', 'cancelled'] as $s)<a href="{{ route('admin.bookings.index', ['status' => $s]) }}" @class(['on' => request('status') === $s])>{{ __(\App\Models\Booking::STATUSES[$s]) }}</a>@endforeach
<a href="{{ route('admin.bookings.index', ['payment_status' => 'overdue']) }}" @class(['on' => request('payment_status') === 'overdue'])>⚠ {{ __('Overdue installment') }}</a>
@if(auth()->user()->isOwner() && $trashedCount)<a href="{{ route('admin.bookings.index', ['trashed' => 'only']) }}" @class(['on' => request('trashed') === 'only'])>🗑 {{ __('Trash') }} ({{ $trashedCount }})</a>@endif</div>
<form method="get" class="tb">
<input class="inp grow" name="q" value="{{ request('q') }}" placeholder="{{ __('Ref, customer, phone, email or pilgrim') }}">
<select class="inp" name="status"><option value="">{{ __('All statuses') }}</option>@foreach(\App\Models\Booking::STATUSES as $k => $v)<option value="{{ $k }}" @selected(request('status') === $k)>{{ __($v) }}</option>@endforeach</select>
<select class="inp" name="package_id"><option value="">{{ __('All packages') }}</option>@foreach($packages as $p)<option value="{{ $p->id }}" @selected(request('package_id') == $p->id)>{{ $p->title }}</option>@endforeach</select>
<select class="inp" name="payment_status"><option value="">{{ __('Any payment status') }}</option>@foreach(\App\Models\Booking::PAYMENT_STATUSES as $k => $v)<option value="{{ $k }}" @selected(request('payment_status') === $k)>{{ __($v) }}</option>@endforeach</select>
<select class="inp" name="payment_mode"><option value="">{{ __('Any payment plan') }}</option>@foreach(\App\Models\Booking::MODES as $k => $v)<option value="{{ $k }}" @selected(request('payment_mode') === $k)>{{ __($v) }}</option>@endforeach</select>
<select class="inp" name="type"><option value="">{{ __('All types') }}</option>@foreach(\App\Models\Package::TYPES as $k => $v)<option value="{{ $k }}" @selected(request('type') === $k)>{{ __($v) }}</option>@endforeach</select>
@module('agents')<select class="inp" name="agent_id"><option value="">{{ __('Any agent') }}</option>@foreach($agents as $a)<option value="{{ $a->id }}" @selected(request('agent_id') == $a->id)>{{ $a->code }}</option>@endforeach</select>@endmodule
<input class="inp" type="date" name="from" value="{{ request('from') }}" title="{{ __('From') }}" aria-label="{{ __('From') }}"><input class="inp" type="date" name="to" value="{{ request('to') }}" title="{{ __('To') }}" aria-label="{{ __('To') }}">
@if(request('trashed'))<input type="hidden" name="trashed" value="{{ request('trashed') }}">@endif
<button class="btn btn-em btn-sm">{{ __('Filter') }}</button>@if(request()->query())<a class="btn btn-out btn-sm" href="{{ route('admin.bookings.index') }}">{{ __('Reset') }}</a>@endif</form>
<div class="tblw"><table class="tbl"><tr><th>{{ __('Ref') }}</th><th>{{ __('Customer') }}</th><th>{{ __('Package') }}</th><th>{{ __('Pax') }}</th><th>{{ __('Total') }}</th><th>{{ __('Paid') }}</th><th>{{ __('Payment') }}</th><th>{{ __('Status') }}</th><th>{{ __('Date') }}</th><th></th></tr>
@forelse($bookings as $b)<tr>
<td><a href="{{ route('admin.bookings.show', $b) }}" style="color:var(--em);font-weight:600">{{ $b->ref }}</a>@if($b->agent)<br><small class="badge">{{ $b->agent->code }}</small>@endif</td>
<td>{{ $b->customer?->user?->name }}<br><small class="mini">{{ $b->customer?->user?->phone }}</small></td>
<td>{{ \Illuminate\Support\Str::limit($b->package?->title, 34) }}<br><small class="mini">{{ __(ucfirst($b->room_type ?? '')) }}</small></td>
<td class="num">{{ $b->adults + $b->children }}</td><td class="num nowrap">{{ money($b->total) }}</td><td class="num nowrap">{{ money($b->paid) }}</td>
<td><x-admin.pay-status :b="$b" /><br><small class="mini">{{ __(\App\Models\Booking::MODES[$b->payment_mode]) }}</small></td>
<td><span class="st {{ $b->statusClass() }}">{{ __(\App\Models\Booking::STATUSES[$b->status]) }}</span>@if($b->trashed())<br><span class="badge">{{ __('Trashed') }}</span>@endif</td>
<td class="nowrap">{{ $b->created_at->format('d M Y') }}</td>
<td class="nowrap">@if($b->trashed())<form method="post" action="{{ route('admin.bookings.restore', $b) }}">@csrf<button class="btn btn-out btn-sm">♻ {{ __('Restore') }}</button></form>@else<a class="btn btn-out btn-sm" href="{{ route('admin.bookings.edit', $b) }}" title="{{ __('Edit') }}">✏</a>@endif</td></tr>
@empty<tr><td colspan="10" class="empty">{{ __('No bookings match these filters.') }}</td></tr>@endforelse</table></div>{{ $bookings->links('partials.pager') }}</div>
@endsection
