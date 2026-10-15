@props(['title', 'sub' => null, 'eyebrow' => null, 'start' => false])
<div class="head" @if($start) style="text-align:start;margin:0 0 24px" @endif>@if($eyebrow)<span class="eyebrow">{{ $eyebrow }}</span>@endif<h2>{{ $title }}</h2><i class="orn"></i>@if($sub)<p>{{ $sub }}</p>@endif</div>
