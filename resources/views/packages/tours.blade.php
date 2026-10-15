@extends('layouts.app')
@php($title = t3('Tours & Ziyarah','ট্যুর ও যিয়ারাহ','الجولات والزيارة'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="6"/>
<section><div class="wrap"><div class="chips" style="justify-content:center;margin-bottom:26px"><button class="chip on" data-cat="all">{{ t3('All','সব','الكل') }}</button>@module('ziyarah')<button class="chip" data-cat="ziyarah">{{ t3('Ziyarah','যিয়ারাহ','الزيارة') }}</button>@endmodule @module('tours')<button class="chip" data-cat="tour">{{ t3('Islamic Tours','ইসলামিক ট্যুর','جولات إسلامية') }}</button>@endmodule</div>
<div class="grid g3">@forelse($packages as $p)<div class="card pkg" data-cat-item="{{ $p->type }}"><div class="im" style="background-image:url({{ img($p->image) }})"><span class="tag">{{ $p->type === 'ziyarah' ? t3('Ziyarah','যিয়ারাহ','زيارة') : t3('Tour','ট্যুর','جولة') }}</span></div><div class="bd"><h3>{{ $p->title }}</h3><p style="color:var(--mut);font-size:14px">{{ $p->summary }}</p><div class="meta"><span>🗓 {{ $p->duration_days }} {{ t3('days','দিন','يوماً') }}</span></div><div class="price"><div><small>{{ t3('per person','প্রতি জন','للشخص') }}</small><b>{{ money($p->cheapestPrice()?->price ?? $p->price_from) }}</b></div><a href="{{ route('packages.show', $p) }}" class="btn btn-em btn-sm">{{ t3('Book','বুক','احجز') }}</a></div></div></div>@empty<div class="panel empty">—</div>@endforelse</div></div></section>
@endsection
