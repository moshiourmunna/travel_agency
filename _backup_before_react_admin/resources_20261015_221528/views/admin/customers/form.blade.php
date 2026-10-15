@extends('admin.layout')
@section('title', $c ? __('Edit customer') : __('New customer'))
@section('heading', $c ? __('Edit customer') : __('New customer'))
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ $c ? route('admin.customers.show', $c) : route('admin.customers.index') }}">← {{ __('Back') }}</a>@endsection
@section('content')
<form method="post" action="{{ $c ? route('admin.customers.update', $c) : route('admin.customers.store') }}" class="panel" style="max-width:860px">@csrf @if($c) @method('PUT') @endif
<h4>{{ __('Account') }}</h4><div class="fgrid">
<div><label class="f">{{ __('Full name') }} *</label><input class="inp" name="name" value="{{ old('name', $c?->user?->name) }}" required></div>
<div><label class="f">{{ __('Mobile') }} *</label><input class="inp" name="phone" value="{{ old('phone', $c?->user?->phone) }}" required placeholder="01XXXXXXXXX"></div>
<div><label class="f">{{ __('Email') }}</label><input class="inp" type="email" name="email" value="{{ old('email', $c?->user?->email) }}"></div>
<div><label class="f">{{ $c ? __('New password (optional)') : __('Password (optional)') }}</label><input class="inp" type="password" name="password" autocomplete="new-password"></div>
<div><label class="f">{{ __('Language') }}</label><select class="inp" name="locale">@foreach(['bn' => 'বাংলা', 'en' => 'English', 'ar' => 'العربية'] as $k => $l)<option value="{{ $k }}" @selected(old('locale', $c?->user?->locale) === $k)>{{ $l }}</option>@endforeach</select></div>
<div><label class="f">{{ __('Status') }}</label><select class="inp" name="status">@foreach(['active' => __('Active'), 'blocked' => __('Blocked')] as $k => $l)<option value="{{ $k }}" @selected(old('status', $c?->user?->status) === $k)>{{ $l }}</option>@endforeach</select></div></div>
<h4 style="margin-top:20px">{{ __('Profile') }}</h4><div class="fgrid">
<div><label class="f">{{ __('Gender') }}</label><select class="inp" name="gender"><option value="">—</option>@foreach(['male' => __('Male'), 'female' => __('Female')] as $k => $l)<option value="{{ $k }}" @selected(old('gender', $c?->gender) === $k)>{{ $l }}</option>@endforeach</select></div>
<div><label class="f">{{ __('Date of birth') }}</label><input class="inp" type="date" name="dob" value="{{ old('dob', $c?->dob?->toDateString()) }}"></div>
<div><label class="f">{{ __('NID') }}</label><input class="inp" name="nid" value="{{ old('nid') }}" placeholder="{{ $c?->nid_enc ? '•••• '.substr($c->nid_enc, -4) : '' }}"></div>
<div><label class="f">{{ __('District') }}</label><input class="inp" name="district" value="{{ old('district', $c?->district) }}"></div>
<div class="full"><label class="f">{{ __('Address') }}</label><input class="inp" name="address" value="{{ old('address', $c?->address) }}"></div>
<div><label class="f">{{ __('Emergency contact') }}</label><input class="inp" name="emergency_contact" value="{{ old('emergency_contact', $c?->emergency_contact) }}"></div>
@module('agents')<div><label class="f">{{ __('Agent') }}</label><select class="inp" name="agent_id"><option value="">{{ __('Direct (no agent)') }}</option>@foreach($agents as $a)<option value="{{ $a->id }}" @selected(old('agent_id', $c?->agent_id) == $a->id)>{{ $a->code }} · {{ $a->company_name }}</option>@endforeach</select></div>@endmodule
</div><button class="btn btn-gold" style="margin-top:16px">{{ __('Save') }}</button></form>
@endsection
