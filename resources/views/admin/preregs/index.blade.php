@extends('admin.layout')
@section('title', __('Pre-registrations'))
@section('heading', __('Hajj pre-registrations'))
@section('sub', __(':n applications', ['n' => number_format($preregs->total())]))
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ route('admin.preregs.export', request()->query()) }}">⬇ CSV</a>@endsection
@section('content')
<div class="panel"><div class="chips"><a href="{{ route('admin.preregs.index') }}" @class(['on' => !request('status')])>{{ __('All') }}</a>@foreach(\App\Models\PreRegistration::STATUSES as $k => $v)<a href="{{ route('admin.preregs.index', ['status' => $k]) }}" @class(['on' => request('status') === $k])>{{ __($v) }} ({{ $counts[$k] ?? 0 }})</a>@endforeach</div>
<form method="get" class="tb"><input class="inp grow" name="q" value="{{ request('q') }}" placeholder="{{ __('Ref, name, phone or tracking no.') }}"><select class="inp" name="district"><option value="">{{ __('All districts') }}</option>@foreach($districts as $d)<option @selected(request('district') === $d)>{{ $d }}</option>@endforeach</select>
<select class="inp" name="package_class"><option value="">{{ __('Any class') }}</option>@foreach(\App\Models\Package::CLASSES as $k => $v)<option value="{{ $k }}" @selected(request('package_class') === $k)>{{ __($v) }}</option>@endforeach</select>@if(request('status'))<input type="hidden" name="status" value="{{ request('status') }}">@endif<button class="btn btn-em btn-sm">{{ __('Filter') }}</button></form>
<div class="tblw"><table class="tbl"><tr><th>{{ __('Ref') }}</th><th>{{ __('Name') }}</th><th>{{ __('Phone') }}</th><th>{{ __('District') }}</th><th>{{ __('Class') }}</th><th>{{ __('Pilgrims') }}</th><th>{{ __('Status') }}</th><th></th></tr>
@forelse($preregs as $p)<tr><td><a href="{{ route('admin.preregs.show', $p) }}" style="color:var(--em);font-weight:600">{{ $p->ref }}</a><br><small class="mini">{{ $p->created_at->format('d M Y') }}</small></td><td>{{ $p->name }}</td><td class="nowrap">{{ $p->phone }}</td><td>{{ $p->district }}</td><td>{{ __(\App\Models\Package::CLASSES[$p->package_class] ?? ucfirst($p->package_class)) }}</td><td class="num">{{ $p->pilgrims }}</td>
<td><span class="st {{ ['converted' => 'ok', 'cancelled' => 'no', 'registered' => 'inf'][$p->status] ?? 'pen' }}">{{ __(\App\Models\PreRegistration::STATUSES[$p->status] ?? $p->status) }}</span></td>
<td>@if($p->booking)<a class="btn btn-out btn-sm" href="{{ route('admin.bookings.show', $p->booking) }}">{{ $p->booking->ref }}</a>@elseif($p->status !== 'cancelled')<form method="post" action="{{ route('admin.preregs.convert', $p) }}">@csrf<button class="btn btn-em btn-sm">→ {{ __('Booking') }}</button></form>@endif</td></tr>
@empty<tr><td colspan="8" class="empty">{{ __('No pre-registrations found.') }}</td></tr>@endforelse</table></div>{{ $preregs->links('partials.pager') }}</div>
@endsection
