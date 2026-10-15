@extends('layouts.app')
@php($title = t3('Gallery','গ্যালারি','المعرض'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="8"/>
<section><div class="wrap"><div class="chips" style="justify-content:center;margin-bottom:24px"><button class="chip on" data-cat="all">{{ t3('All','সব','الكل') }}</button>@foreach($items->pluck('album')->unique() as $a)<button class="chip" data-cat="{{ $a }}">{{ ucwords(str_replace('-', ' ', $a)) }}</button>@endforeach</div>
<div class="gal">@foreach($items as $g)@if($g->type === 'video')<a href="{{ $g->url }}" target="_blank" rel="noopener" data-cat-item="{{ $g->album }}" style="background-image:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)),url({{ img($g->path) }});display:grid;place-items:center;color:#fff;font-size:34px" title="{{ $g->caption }}">▶</a>@else<div data-cat-item="{{ $g->album }}" @class(['big' => in_array($loop->index, [0, 5])]) style="background-image:url({{ img($g->path) }})" title="{{ $g->caption }}"></div>@endif @endforeach</div></div></section>
@endsection
