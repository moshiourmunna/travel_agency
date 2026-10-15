@extends('layouts.app')
@php($title = t3('Blog & Guides','ব্লগ ও গাইড','المدونة'))
@section('title', $title)
@section('content')
<x-page-header :title="$title" :img="7"/>
<section><div class="wrap side r"><div><div class="grid g2">@forelse($posts as $post)<a class="card pkg" href="{{ route('blog.show', $post) }}"><div class="im" style="background-image:url({{ img($post->image) }})"></div><div class="bd"><small style="color:var(--gold)">{{ strtoupper($post->category) }} · {{ $post->read_minutes }} min</small><h3>{{ $post->title }}</h3><p style="color:var(--mut);font-size:14px">{{ \Illuminate\Support\Str::limit($post->excerpt, 110) }}</p></div></a>@empty<div class="panel empty">{{ t3('No articles found.','কোনো লেখা পাওয়া যায়নি।','لا توجد مقالات.') }}</div>@endforelse</div>{{ $posts->links('partials.pager') }}</div>
<aside class="panel sticky"><form method="get"><input class="inp" name="q" value="{{ request('q') }}" placeholder="{{ t3('Search articles','লেখা খুঁজুন','ابحث في المقالات') }}"></form><h4>{{ t3('Categories','বিভাগ','التصنيفات') }}</h4><div class="trow"><a href="{{ route('blog') }}">{{ t3('All','সব','الكل') }}</a><span>{{ $categories->sum() }}</span></div>@foreach($categories as $c => $n)<div class="trow"><a href="{{ route('blog', ['category' => $c]) }}">{{ ucfirst($c) }}</a><span>{{ $n }}</span></div>@endforeach</aside></div></section>
@endsection
