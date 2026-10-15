@extends('admin.layout')
@section('title', __('Pilgrims'))
@section('heading', __('Pilgrims'))
@section('sub', __(':n pilgrims', ['n' => number_format($pilgrims->total())]))
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ route('admin.pilgrims.export', request()->query()) }}">⬇ {{ __('Manifest CSV') }}</a>@endsection
@section('content')
<div class="panel"><div class="chips"><a href="{{ route('admin.pilgrims.index') }}" @class(['on' => !request()->hasAny(['passport', 'mahram'])])>{{ __('All') }}</a>
@foreach(['missing' => __('No passport'), 'expiring' => __('Passport < 6 months'), 'unverified' => __('Passport unverified')] as $k => $l)<a href="{{ route('admin.pilgrims.index', ['passport' => $k]) }}" @class(['on' => request('passport') === $k])>{{ $l }}</a>@endforeach
<a href="{{ route('admin.pilgrims.index', ['mahram' => 'needed']) }}" @class(['on' => request('mahram') === 'needed'])>⚠ {{ __('Mahram needed') }}</a></div>
<form method="get" class="tb"><input class="inp grow" name="q" value="{{ request('q') }}" placeholder="{{ __('Name or phone') }}">
<select class="inp" name="package_id"><option value="">{{ __('All packages') }}</option>@foreach($packages as $p)<option value="{{ $p->id }}" @selected(request('package_id') == $p->id)>{{ $p->title }}</option>@endforeach</select>
<select class="inp" name="gender"><option value="">{{ __('Any gender') }}</option><option value="male" @selected(request('gender') === 'male')>{{ __('Male') }}</option><option value="female" @selected(request('gender') === 'female')>{{ __('Female') }}</option></select>
@foreach(['passport', 'mahram'] as $k)@if(request($k))<input type="hidden" name="{{ $k }}" value="{{ request($k) }}">@endif @endforeach<button class="btn btn-em btn-sm">{{ __('Filter') }}</button></form>
<div class="tblw"><table class="tbl"><tr><th>{{ __('Name') }}</th><th>{{ __('Passport') }}</th><th>{{ __('Expiry') }}</th><th>{{ __('Booking') }}</th><th>{{ __('Visa') }}</th><th>{{ __('Account') }}</th><th></th></tr>
@forelse($pilgrims as $t)@php($bt = $t->bookingLinks->sortByDesc('id')->first())
<tr><td><a href="{{ route('admin.pilgrims.show', $t) }}" style="color:var(--em);font-weight:600">{{ $t->full_name }}</a><br><small class="mini">{{ __(ucfirst($t->gender)) }}{{ $t->dob ? ' · '.$t->dob->age : '' }}{{ $t->needs_wheelchair ? ' · ♿' : '' }}</small></td>
<td>{{ $t->passport?->number_enc ?? '—' }} @if($t->passport?->verified_at)<span class="st ok">✓</span>@endif</td>
<td class="nowrap">@if($t->passport?->expiry_date)<span @class(['warn' => $t->passport->expiry_date->lt(now()->addMonths(6))])>{{ $t->passport->expiry_date->format('d M Y') }}</span>@else — @endif</td>
<td>@if($bt?->booking)<a href="{{ route('admin.bookings.show', $bt->booking) }}">{{ $bt->booking->ref }}</a>@else — @endif</td><td>{{ $bt?->visa ? __(ucfirst($bt->visa->status)) : '—' }}</td><td>{{ $t->customer?->user?->name }}</td>
<td><a class="btn btn-out btn-sm" href="{{ route('admin.pilgrims.edit', $t) }}">✏</a></td></tr>
@empty<tr><td colspan="7" class="empty">{{ __('No pilgrims found.') }}</td></tr>@endforelse</table></div>{{ $pilgrims->links('partials.pager') }}</div>
@endsection
