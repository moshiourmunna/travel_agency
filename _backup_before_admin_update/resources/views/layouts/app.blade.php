<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ $dir }}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>@yield('title', t3('Hajj & Umrah from Bangladesh', 'বাংলাদেশ থেকে হজ্জ ও উমরাহ', 'الحج والعمرة من بنغلاديش')) | {{ site('site_name') }}</title>
<meta name="description" content="@yield('description', site('site_name').' – '.t3('government-licensed Hajj & Umrah from Bangladesh.', 'সরকার অনুমোদিত হজ্জ ও উমরাহ এজেন্সি।', 'وكالة حج وعمرة مرخصة.').' '.site('tagline'))">
<link rel="icon" href="{{ asset('assets/icon.svg') }}"><link rel="stylesheet" href="{{ asset('assets/style.css') }}?v=2">
@if($dir === 'rtl')<style>body{font-family:'Noto Naskh Arabic','Poppins',sans-serif}</style>@endif
@stack('head')
</head>
<body class="@yield('body_class')">
@include('partials.topbar')
@include('partials.nav')
@include('partials.flash')
@yield('content')
@include('partials.footer')
<script>window.SITE = {!! json_encode(\App\Support\SiteConfig::public(), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS) !!};</script>
<script src="{{ asset('assets/app.js') }}?v=2"></script>
@stack('scripts')
</body>
</html>
