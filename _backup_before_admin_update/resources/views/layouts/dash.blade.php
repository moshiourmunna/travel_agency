<!DOCTYPE html><html lang="{{ app()->getLocale() }}" dir="{{ $dir }}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}">
<title>@yield('title') | {{ site('site_name') }}</title><link rel="icon" href="{{ asset('assets/icon.svg') }}"><link rel="stylesheet" href="{{ asset('assets/style.css') }}?v=2"></head><body>
<div class="dash"><aside class="dside @yield('side_class')"><a href="{{ route('home') }}" style="padding:0"><img src="{{ asset('assets/logo-white.svg') }}" alt=""></a>
@yield('menu')
<a href="{{ route('home') }}">↩ {{ t3('Back to site','সাইটে ফিরুন','العودة للموقع') }}</a><form method="post" action="{{ route('logout') }}">@csrf<button style="background:none;border:0;color:inherit;font:inherit;padding:10px 14px;cursor:pointer;opacity:.85">⎋ {{ t3('Logout','লগআউট','خروج') }}</button></form></aside>
<main class="dmain"><div class="dtop"><div><h2 style="font-size:26px">@yield('heading')</h2><small style="color:var(--mut)">@yield('sub')</small></div><div style="display:flex;gap:10px;align-items:center">@include('partials.langsw')@yield('top_extra')<div class="av">{{ auth()->user()->initials() }}</div></div></div>
@foreach(['ok' => '#E8F5EE;color:#17603D', 'err' => '#FDECEC;color:#9B1C1C'] as $k => $style)@if(session($k))<div class="panel flash" style="background:{{ $style }};padding:12px 16px;margin-bottom:16px">{{ session($k) }}</div>@endif @endforeach
@if($errors->any())<div class="panel" style="background:#FDECEC;color:#9B1C1C;padding:12px 16px;margin-bottom:16px">{{ $errors->first() }}</div>@endif
@yield('content')</main></div>
<script>window.SITE = {!! json_encode(\App\Support\SiteConfig::public(), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS) !!};</script><script src="{{ asset('assets/app.js') }}?v=2"></script>@stack('scripts')</body></html>
