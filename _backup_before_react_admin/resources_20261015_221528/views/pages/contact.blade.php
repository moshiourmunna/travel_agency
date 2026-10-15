@extends('layouts.app')
@php($title = t3('Contact Us','যোগাযোগ','اتصل بنا'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="8"/>
@php($pre = request('package') ? 'Package: '.request('package') : (request('flight') ? 'Flight: '.request('flight') : (request('hotel') ? 'Hotel: '.request('hotel') : '')))
<section><div class="wrap"><div class="grid g4">@foreach($branches as $b)<div class="card why"><div class="ic">📍</div><h4>{{ $b->name }}</h4><p>{{ $b->address }}</p><p style="margin-top:6px"><b>{{ $b->phone }}</b></p></div>@endforeach</div>
<div class="grid g2" style="margin-top:40px"><form class="panel" method="post" action="{{ route('contact.store') }}">@csrf<h3>{{ t3('Send us a message','বার্তা পাঠান','أرسل رسالة') }}</h3><input type="hidden" name="package" value="{{ request('package') }}"><div class="fg" style="margin-top:14px">
<div><label class="f">{{ t3('Name','নাম','الاسم') }}</label><input class="inp" name="name" value="{{ old('name', auth()->user()?->name) }}" required>@error('name')<span class="err">{{ $message }}</span>@enderror</div>
<div><label class="f">{{ t3('Mobile','মোবাইল','الجوال') }}</label><input class="inp" name="phone" value="{{ old('phone', auth()->user()?->phone) }}" placeholder="01XXXXXXXXX" required>@error('phone')<span class="err">{{ $message }}</span>@enderror</div>
<div class="full"><label class="f">{{ t3('Interested in','আগ্রহ','مهتم بـ') }}</label><select class="inp" name="interest">@foreach(['Hajj 2027','Umrah','Air ticket','Hotel','Visa','Tour / Ziyarah'] as $o)<option @selected(old('interest') === $o)>{{ $o }}</option>@endforeach</select></div>
<div class="full"><label class="f">{{ t3('Message','বার্তা','الرسالة') }}</label><textarea class="inp" name="message" rows="4" required>{{ old('message', $pre) }}</textarea>@error('message')<span class="err">{{ $message }}</span>@enderror</div>
<div class="full"><button class="btn btn-gold btn-block">{{ t3('Send message','বার্তা পাঠান','إرسال') }}</button></div></div></form>
<iframe title="map" style="width:100%;min-height:420px;border:0;border-radius:14px" loading="lazy" src="https://maps.google.com/maps?q=Naya%20Paltan%20Dhaka&z=15&output=embed"></iframe></div></div></section>
@endsection
