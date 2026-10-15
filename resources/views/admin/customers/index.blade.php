@extends('admin.layout')
@section('title', __('Customers'))
@section('heading', __('Customers'))
@section('sub', __(':n customers', ['n' => number_format($customers->total())]))
@section('top_extra')<div class="hbar"><a class="btn btn-out btn-sm" href="{{ route('admin.customers.export', request()->query()) }}">⬇ CSV</a><a class="btn btn-gold btn-sm" href="{{ route('admin.customers.create') }}">＋ {{ __('New customer') }}</a></div>@endsection
@section('content')
<div class="panel">
@if(auth()->user()->isOwner() && $trashedCount)<div class="chips"><a href="{{ route('admin.customers.index') }}" @class(['on' => !request('trashed')])>{{ __('Active') }}</a><a href="{{ route('admin.customers.index', ['trashed' => 'only']) }}" @class(['on' => request('trashed') === 'only'])>🗑 {{ __('Trash') }} ({{ $trashedCount }})</a></div>@endif
<form method="get" class="tb"><input class="inp grow" name="q" value="{{ request('q') }}" placeholder="{{ __('Name, phone, email or district') }}">
<select class="inp" name="district"><option value="">{{ __('All districts') }}</option>@foreach($districts as $d)<option @selected(request('district') === $d)>{{ $d }}</option>@endforeach</select>
@module('agents')<select class="inp" name="agent_id"><option value="">{{ __('Any agent') }}</option>@foreach($agents as $a)<option value="{{ $a->id }}" @selected(request('agent_id') == $a->id)>{{ $a->code }}</option>@endforeach</select>@endmodule
@if(request('trashed'))<input type="hidden" name="trashed" value="only">@endif<button class="btn btn-em btn-sm">{{ __('Filter') }}</button></form>
<div class="tblw"><table class="tbl"><tr><th>{{ __('Name') }}</th><th>{{ __('Phone') }}</th><th>{{ __('Email') }}</th><th>{{ __('District') }}</th><th>{{ __('Bookings') }}</th><th>{{ __('Pilgrims') }}</th><th>{{ __('Since') }}</th><th></th></tr>
@forelse($customers as $c)<tr><td><a href="{{ route('admin.customers.show', $c) }}" style="color:var(--em);font-weight:600">{{ $c->user?->name }}</a>@if($c->agent)<br><small class="badge">{{ $c->agent->code }}</small>@endif</td><td class="nowrap">{{ $c->user?->phone }}</td><td>{{ $c->user?->email ?? '—' }}</td><td>{{ $c->district ?? '—' }}</td><td class="num">{{ $c->bookings_count }}</td><td class="num">{{ $c->travellers_count }}</td><td class="nowrap">{{ $c->created_at->format('d M Y') }}</td>
<td class="nowrap">@if($c->trashed())<form method="post" action="{{ route('admin.customers.restore', $c) }}">@csrf<button class="btn btn-out btn-sm">♻ {{ __('Restore') }}</button></form>@else<a class="btn btn-out btn-sm" href="{{ route('admin.customers.edit', $c) }}">✏</a>@endif</td></tr>
@empty<tr><td colspan="8" class="empty">{{ __('No customers found.') }}</td></tr>@endforelse</table></div>{{ $customers->links('partials.pager') }}</div>
@endsection
