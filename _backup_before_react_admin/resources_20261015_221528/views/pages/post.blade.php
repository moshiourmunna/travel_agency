@extends('layouts.app')
@section('title', $post->title)
@section('description', $post->excerpt)
@section('content')
<section style="padding-top:40px"><div class="wrap" style="max-width:820px"><small style="color:var(--gold)">{{ strtoupper($post->category) }} · {{ $post->published_at->format('d M Y') }} · {{ $post->read_minutes }} min read</small><h1 style="font-size:40px;margin:10px 0 20px">{{ $post->title }}</h1><div style="height:380px;border-radius:18px;background:url({{ img($post->image) }}) center/cover;margin-bottom:24px"></div>
<div class="prose">{!! $post->body !!}</div>
@module('preregistration')<div class="panel" style="margin-top:30px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>{{ t3('Ready to register?','নিবন্ধনের জন্য প্রস্তুত?','هل أنت مستعد للتسجيل؟') }}</b><a class="btn btn-gold" href="{{ route('prereg') }}">{{ t3('Pre-register now','এখনই প্রাক-নিবন্ধন','سجل الآن') }}</a></div>@endmodule
@if($more->count())<h3 style="margin:36px 0 14px">{{ t3('More articles','আরও লেখা','مقالات أخرى') }}</h3><div class="grid" style="gap:14px">@foreach($more as $m)<a href="{{ route('blog.show', $m) }}" class="card hotel"><div class="hi" style="background-image:url({{ img($m->image) }});width:110px;min-height:80px"></div><div><b>{{ $m->title }}</b><br><small style="color:var(--mut)">{{ $m->published_at->format('M Y') }}</small></div></a>@endforeach</div>@endif
</div></section>
@endsection
