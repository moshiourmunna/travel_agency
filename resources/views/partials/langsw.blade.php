@php($langs = \App\Support\SiteConfig::enabledLanguages())
@if(count($langs) > 1)
<div class="langsw" {{ $attributes ?? '' }}>@foreach($langs as $l)<a href="{{ route('lang', $l['code']) }}" title="{{ $l['native_name'] }}" @class(['on' => app()->getLocale() === $l['code']]) hreflang="{{ $l['code'] }}">{{ $l['label'] }}</a>@endforeach</div>
@endif
