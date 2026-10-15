@extends('layouts.app')
@php($title = t3('Frequently Asked Questions','সাধারণ জিজ্ঞাসা','الأسئلة الشائعة'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="3"/>
<section><div class="wrap" style="max-width:860px"><div class="chips" style="margin-bottom:22px"><button class="chip on" data-cat="all">{{ t3('All','সব','الكل') }}</button>@foreach(['hajj' => t3('Hajj','হজ্জ','الحج'), 'umrah' => t3('Umrah','উমরাহ','العمرة'), 'payment' => t3('Payment','পেমেন্ট','الدفع'), 'visa' => t3('Visa','ভিসা','التأشيرة'), 'women' => t3('Women','নারী','النساء')] as $k => $v)<button class="chip" data-cat="{{ $k }}">{{ $v }}</button>@endforeach</div>
<x-faq-list :faqs="$faqs"/></div></section>
@include('partials.cta')
@endsection
