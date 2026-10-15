@extends('layouts.app')
@section('title', 'Page not found')
@section('content')
<section style="text-align:center;padding:120px 0"><div class="wrap"><img src="{{ asset('assets/icon.svg') }}" style="width:110px;margin:0 auto 20px" alt=""><h1 style="font-size:72px;color:var(--em)">404</h1><p style="color:var(--mut);margin:10px 0 24px">{{ t3('This page has lost its way – let us guide you back.','এই পৃষ্ঠাটি পাওয়া যায়নি।','الصفحة غير موجودة.') }}</p><a href="{{ route('home') }}" class="btn btn-gold">{{ t3('Back to Home','হোমে ফিরুন','العودة للرئيسية') }}</a></div></section>
@endsection
