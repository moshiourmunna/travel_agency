@props(['title', 'img' => 8])
<div class="ph" style="background-image:linear-gradient(rgba(8,40,32,.85),rgba(11,93,75,.75)),url({{ asset('assets/img/img'.$img.'.jpg') }})"><div class="wrap"><h1>{{ $title }}</h1><div class="crumb"><a href="{{ route('home') }}">{{ t3('Home','হোম','الرئيسية') }}</a> / <span>{{ $title }}</span></div>{{ $slot }}</div></div>
