@extends('layouts.app')
@php($title = t3('Visa Services','ভিসা সেবা','خدمات التأشيرة'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="9"/>
<section><div class="wrap"><div class="grid g3">@foreach($types as $v)<div class="card why"><div class="ic">{{ $v->flag }}</div><h4>{{ $v->name }}</h4><p>⏱ {{ $v->processing_time }}</p><div class="price" style="margin-top:12px"><b>{{ money($v->fee) }}</b><a href="#apply" data-pick-visa="{{ $v->id }}" class="btn btn-em btn-sm">{{ t3('Apply','আবেদন','تقديم') }}</a></div></div>@endforeach</div>
<div class="grid g2" style="margin-top:50px" id="apply"><form class="panel" method="post" action="{{ route('visa.apply') }}">@csrf<h3>{{ t3('Apply for a visa','ভিসার জন্য আবেদন','تقديم طلب تأشيرة') }}</h3><div class="fg" style="margin-top:14px">
<div><label class="f">{{ t3('Visa type','ভিসার ধরন','نوع التأشيرة') }}</label><select class="inp" name="visa_type_id" id="visa-type">@foreach($types as $v)<option value="{{ $v->id }}" @selected(old('visa_type_id') == $v->id)>{{ $v->name }}</option>@endforeach</select></div>
<div><label class="f">{{ t3('Applicants','আবেদনকারী','المتقدمون') }}</label><input class="inp" type="number" name="applicants" min="1" value="{{ old('applicants', 1) }}"></div>
<div><label class="f">{{ t3('Full name','পূর্ণ নাম','الاسم الكامل') }}</label><input class="inp" name="name" value="{{ old('name') }}" required>@error('name')<span class="err">{{ $message }}</span>@enderror</div>
<div><label class="f">{{ t3('Mobile','মোবাইল','الجوال') }}</label><input class="inp" name="phone" value="{{ old('phone') }}" placeholder="01XXXXXXXXX" required>@error('phone')<span class="err">{{ $message }}</span>@enderror</div>
<div class="full"><label class="f">{{ t3('Passport no. (optional)','পাসপোর্ট নং (ঐচ্ছিক)','رقم الجواز (اختياري)') }}</label><input class="inp" name="passport" value="{{ old('passport') }}"></div>
<div class="full"><button class="btn btn-gold btn-block">{{ t3('Submit application','আবেদন জমা দিন','إرسال الطلب') }}</button></div></div></form>
<div class="panel"><h3>{{ t3('Track visa status','ভিসা স্ট্যাটাস দেখুন','تتبع التأشيرة') }}</h3><form method="get" action="{{ route('visa.track') }}" style="display:flex;gap:10px;margin:14px 0"><input class="inp" name="ref" value="{{ $ref ?? '' }}" placeholder="{{ t3('Application ID e.g. VA-26-0981','আবেদন আইডি','رقم الطلب') }}"><button class="btn btn-em">{{ t3('Track','ট্র্যাক','تتبع') }}</button></form>
@if(!empty($tracked))
@php($keys = array_keys(\App\Models\VisaApplication::STEPS))
@php($cur = array_search($tracked->status, $keys))
<p><b>{{ $tracked->ref }}</b> · {{ $tracked->applicant_name }} · {{ $tracked->visa_type }}</p>
<div class="track">@foreach(\App\Models\VisaApplication::STEPS as $k => $label)<div @class(['ok' => $loop->index < $cur || ($tracked->status === 'issued'), 'cur' => $loop->index === $cur && $tracked->status !== 'issued'])>{{ $label }}</div>@endforeach</div>
@if($tracked->visa_no)<p style="color:#17803D">✅ Visa no. {{ $tracked->visa_no }}</p>@endif
@else
<div class="track"><div class="ok">Submitted</div><div class="ok">Documents verified</div><div class="cur">Applied (Nusuk)</div><div>Approved</div><div>Issued</div></div>
@endif
<h4 style="margin-top:20px">{{ t3('Required documents','প্রয়োজনীয় কাগজপত্র','المستندات المطلوبة') }}</h4><ul class="feat"><li>Passport valid 6+ months</li><li>Photo, white background</li><li>Meningitis vaccine (Hajj/Umrah)</li><li>Confirmed return ticket & hotel</li></ul></div></div></div></section>
@endsection
