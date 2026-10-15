@extends('layouts.app')
@php($isHajj = $page === 'hajj')
@php($title = $isHajj ? t3('Hajj Packages 2027','হজ্জ প্যাকেজ ২০২৭','باقات الحج 2027') : t3('Umrah Packages','উমরাহ প্যাকেজ','باقات العمرة'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="$isHajj ? 3 : 8"/>
<section><div class="wrap side"><div>
<aside class="panel sticky" id="filters" data-filter-target="#pkg-grid"><h4>{{ t3('Package class','প্যাকেজ শ্রেণি','الفئة') }}</h4>
@foreach(\App\Models\Package::CLASSES as $k => $v)<label class="chk"><input type="checkbox" name="class" value="{{ $k }}" @checked(!request('class') || request('class') === $k)> {{ $v }}</label>@endforeach
<h4>{{ t3('Duration','সময়কাল','المدة') }}</h4>
@foreach(($isHajj ? ['15-21' => '15–21 days', '22-30' => '22–30 days', '31-40' => '31–40 days', '40+' => '40+ days'] : ['7-10' => '7–10 days', '11-15' => '11–15 days', '15-21' => '16–21 days']) as $k => $v)<label class="chk"><input type="checkbox" name="duration" value="{{ $k }}"> {{ $v }}</label>@endforeach
<h4>{{ t3('Makkah hotel distance','মক্কা হোটেলের দূরত্ব','المسافة من الحرم') }}</h4>
@foreach(['' => t3('Any','যেকোনো','أي'), 100 => 'Up to 100 m (Clock Tower)', 500 => 'Up to 500 m', 1000 => 'Up to 1 km', 99999 => 'Shuttle (Aziziyah)'] as $k => $v)<label class="chk"><input type="radio" name="dist" value="{{ $k }}" @checked($k === '')> {{ $v }}</label>@endforeach
<h4>{{ t3('Max price','সর্বোচ্চ মূল্য','السعر الأقصى') }}</h4><input type="range" id="range" name="max" min="50000" max="{{ $maxPrice }}" step="10000" value="{{ $maxPrice }}" style="width:100%;accent-color:var(--em)"><div id="range-v" style="font-weight:600;color:var(--em)">{{ money($maxPrice) }}</div>
@if($airlines->count())<h4>{{ t3('Airline','এয়ারলাইন','الطيران') }}</h4>@foreach($airlines as $a)<label class="chk"><input type="checkbox" name="airline" value="{{ $a }}" checked> {{ $a }}</label>@endforeach @endif
<button type="button" class="btn btn-out btn-block btn-sm" style="margin-top:16px" data-filter-reset>{{ t3('Reset filters','ফিল্টার মুছুন','إعادة تعيين') }}</button></aside></div>
<div><div class="toolbar"><b><span data-filter-count>{{ $packages->count() }}</span> {{ t3('packages found','প্যাকেজ পাওয়া গেছে','باقة') }}</b><div style="display:flex;gap:10px"><select class="inp" style="width:auto" data-sort="#pkg-grid"><option value="">{{ t3('Sort: Recommended','সাজান: প্রস্তাবিত','ترتيب: موصى به') }}</option><option value="price">{{ t3('Price low → high','মূল্য কম → বেশি','السعر') }}</option><option value="dist">{{ t3('Closest to Haram','হারামের সবচেয়ে কাছে','الأقرب إلى الحرم') }}</option><option value="date">{{ t3('Departure date','যাত্রার তারিখ','تاريخ المغادرة') }}</option></select></div></div>
<div class="grid g2" id="pkg-grid">@forelse($packages as $p)<x-package-card :p="$p"/>@empty<div class="panel empty">{{ t3('No packages published yet.','এখনো কোনো প্যাকেজ নেই।','لا توجد باقات بعد.') }}</div>@endforelse</div>
<div class="panel empty" data-filter-empty hidden>{{ t3('No package matches these filters.','এই ফিল্টারে কোনো প্যাকেজ নেই।','لا توجد باقة مطابقة.') }}</div>
</div></div></section>
@endsection
