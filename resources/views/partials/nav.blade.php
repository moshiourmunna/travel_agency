@php($nav = [
  ['home', t3('Home','হোম','الرئيسية'), null], ['hajj', t3('Hajj','হজ্জ','الحج'), ['hajj']], ['umrah', t3('Umrah','উমরাহ','العمرة'), ['umrah']],
  ['flights', t3('Flights','ফ্লাইট','الطيران'), ['flights']], ['hotels', t3('Hotels','হোটেল','الفنادق'), ['hotels']], ['visa', t3('Visa','ভিসা','التأشيرة'), ['visa']],
  ['tours', t3('Tours & Ziyarah','ট্যুর ও যিয়ারাহ','الجولات والزيارة'), ['tours','ziyarah']], ['guide', t3('Hajj Guide','হজ্জ গাইড','دليل الحج'), null],
  ['about', t3('About','আমাদের সম্পর্কে','من نحن'), null], ['contact', t3('Contact','যোগাযোগ','اتصل بنا'), null],
])
<header class="nav"><div class="wrap"><a class="logo" href="{{ route('home') }}"><img src="{{ asset('assets/logo.svg') }}" alt="{{ site('site_name') }}"></a>
<nav class="menu">@foreach($nav as [$r, $label, $mods])@if(!$mods || collect($mods)->contains(fn($m) => module_on($m)))<a href="{{ route($r) }}" @class(['act' => request()->routeIs($r)])>{{ $label }}</a>@endif @endforeach</nav>
<div class="nav-cta">@auth<a href="{{ route('dashboard') }}" class="btn btn-out btn-sm">{{ t3('My account','আমার অ্যাকাউন্ট','حسابي') }}</a>@else<a href="{{ route('login') }}" class="btn btn-out btn-sm">{{ t3('Login','লগইন','دخول') }}</a>@endauth
<a href="{{ route('booking.create') }}" class="btn btn-gold btn-sm">{{ t3('Book Now','বুক করুন','احجز الآن') }}</a><button class="burger" aria-label="menu">☰</button></div></div></header>
