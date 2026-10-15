@extends('admin.layout')
@section('title', __('Edit pilgrim'))
@section('heading', __('Edit pilgrim'))
@section('sub', $t->full_name)
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ route('admin.pilgrims.show', $t) }}">← {{ __('Back') }}</a>@endsection
@section('content')
<form method="post" action="{{ route('admin.pilgrims.update', $t) }}" class="panel" style="max-width:960px">@csrf @method('PUT')
@include('admin.bookings._traveller', ['n' => '', 't' => ['full_name' => $t->full_name, 'gender' => $t->gender, 'dob' => $t->dob?->toDateString(), 'relation' => $t->relation, 'phone' => $t->phone, 'passport_no' => $t->passport?->number_enc,
  'passport_issue' => $t->passport?->issue_date?->toDateString(), 'passport_expiry' => $t->passport?->expiry_date?->toDateString(), 'passport_place' => $t->passport?->issue_place, 'blood_group' => $t->blood_group, 'medical_notes' => $t->medical_notes, 'needs_wheelchair' => $t->needs_wheelchair],
  'label' => __('Pilgrim details'), 'extra' => ''])
<div class="fgrid"><div><label class="f">{{ __('Mahram') }}</label><select class="inp" name="mahram_traveller_id"><option value="">—</option>@foreach($mahrams as $m)<option value="{{ $m->id }}" @selected(old('mahram_traveller_id', $t->mahram_traveller_id) == $m->id)>{{ $m->full_name }} ({{ __(\App\Models\Traveller::RELATIONS[$m->relation] ?? '—') }})</option>@endforeach</select></div>
<div style="display:flex;align-items:end"><label style="display:flex;gap:6px"><input type="checkbox" name="passport_verified" value="1" @checked($t->passport?->verified_at)> {{ __('Passport verified') }}</label></div></div>
<button class="btn btn-gold" style="margin-top:16px">{{ __('Save') }}</button></form>
@endsection
