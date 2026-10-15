@props(['variant' => 'top'])
@php($lics = \App\Support\SiteConfig::load()['licences'])
{{-- Renders nothing when no licence number is filled in admin. --}}
@if(count($lics))
@if($variant === 'top')<div class="badges">@foreach($lics as $l)<span class="lic-badge">✦ {{ $l['label'] }} <b>{{ $l['number'] }}</b></span>@endforeach</div>
@elseif($variant === 'foot')<div class="fbadges">@foreach($lics as $l)<span>{{ $l['label'] }}: {{ $l['number'] }}</span>@endforeach</div>
@else<div class="grid g4 lic-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">@foreach($lics as $l)<div class="card lc"><div class="seal">{{ strtoupper($l['type']) }}</div><b>{{ $l['label'] }}</b><div class="stars">{{ $l['number'] }}</div>@if($l['issuer'])<small style="color:var(--mut)">{{ $l['issuer'] }}</small>@endif</div>@endforeach</div>
@endif
@endif
