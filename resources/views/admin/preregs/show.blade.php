@extends('admin.layout')
@section('title', $p->ref)
@section('heading', __('Pre-registration').' '.$p->ref)
@section('sub', $p->name.' · '.$p->phone)
@section('top_extra')<div class="hbar">@if(!$p->booking && $p->status !== 'cancelled')<form method="post" action="{{ route('admin.preregs.convert', $p) }}">@csrf<button class="btn btn-gold btn-sm">→ {{ __('Convert to booking') }}</button></form>@endif
@if(auth()->user()->isOwner())<x-admin.confirm-delete :action="route('admin.preregs.destroy', $p)" :message="__('This permanently deletes the application.')" />@endif<a class="btn btn-out btn-sm" href="{{ route('admin.preregs.index') }}">← {{ __('Back') }}</a></div>@endsection
@section('content')
<div class="grid g2 wide"><div class="panel"><h4>{{ __('Applicant') }}</h4><dl class="kv"><dt>{{ __('Name') }}</dt><dd>{{ $p->name }}</dd><dt>{{ __('Mobile') }}</dt><dd>{{ $p->phone }}</dd><dt>{{ __('Date of birth') }}</dt><dd>{{ $p->dob?->format('d M Y') }}</dd>
<dt>{{ __('NID') }}</dt><dd>{{ $p->nid_enc }}</dd><dt>{{ __('Passport') }}</dt><dd>{{ $p->passport_enc ?? '—' }}</dd><dt>{{ __('District') }}</dt><dd>{{ $p->district }}</dd><dt>{{ __('Class') }}</dt><dd>{{ __(\App\Models\Package::CLASSES[$p->package_class] ?? ucfirst($p->package_class)) }}</dd>
<dt>{{ __('Pilgrims') }}</dt><dd>{{ $p->pilgrims }}</dd><dt>{{ __('Received') }}</dt><dd>{{ $p->created_at->format('d M Y H:i') }}</dd>@if($p->booking)<dt>{{ __('Booking') }}</dt><dd><a href="{{ route('admin.bookings.show', $p->booking) }}">{{ $p->booking->ref }}</a> · {{ $p->converted_at?->format('d M Y') }}</dd>@endif</dl></div>
<form method="post" action="{{ route('admin.preregs.update', $p) }}" class="panel">@csrf @method('PUT')<h4>{{ __('Processing') }}</h4><label class="f">{{ __('Status') }}</label><select class="inp" name="status">@foreach(\App\Models\PreRegistration::STATUSES as $k => $v)<option value="{{ $k }}" @selected($p->status === $k)>{{ __($v) }}</option>@endforeach</select>
<label class="f" style="margin-top:10px">{{ __('Govt. tracking no.') }}</label><input class="inp" name="govt_tracking_no" value="{{ $p->govt_tracking_no }}"><label class="f" style="margin-top:10px">{{ __('Pilgrims') }}</label><input class="inp" type="number" name="pilgrims" min="1" value="{{ $p->pilgrims }}">
<label class="f" style="margin-top:10px">{{ __('Internal note') }}</label><textarea class="inp" name="notes" rows="3">{{ $p->notes }}</textarea><button class="btn btn-em btn-block" style="margin-top:12px">{{ __('Save') }}</button></form></div>
@endsection
