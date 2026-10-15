@extends('admin.layout')
@section('title', $cfg['label'])
@section('heading', ($item->exists ? 'Edit' : 'Add').' – '.$cfg['label'])
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ route('admin.res.index', $resource) }}">← Back</a>@endsection
@section('content')
@php($langs = \App\Support\SiteConfig::enabledLanguages())
<form class="panel adm-form" method="post" enctype="multipart/form-data" action="{{ $item->exists ? route('admin.res.update', [$resource, $item->id]) : route('admin.res.store', $resource) }}">@csrf @if($item->exists) @method('PUT') @endif
<p style="font-size:13px;color:var(--mut);margin-bottom:12px">🌐 Translatable fields show one box per enabled language. English is the fallback when a language is left empty.</p>
<div class="fg">
@foreach($cfg['fields'] as $name => $f)
@php($key = str_replace('.', '_', $name))
@php($raw = $item->exists ? (str_contains($name, '.') ? data_get($item->{explode('.', $name)[0]}, explode('.', $name, 2)[1]) : (in_array($f[0], ['tr','trtext','trlines']) ? $item->getTranslations($name) : $item->getRawOriginal($name))) : null)
<div @class(['full' => in_array($f[0], ['textarea','lines','tr','trtext','trlines'])])>
<label class="f" for="f-{{ $key }}">{{ $f[1] }} @if(($f[2] ?? null) === 'required')*@endif</label>
@switch($f[0])
@case('tr')<div class="adm-tr">@foreach($langs as $l)<div><small>{{ $l['native_name'] }}</small><input class="inp" name="{{ $key }}[{{ $l['code'] }}]" dir="{{ $l['dir'] }}" value="{{ old($key.'.'.$l['code'], $raw[$l['code']] ?? '') }}"></div>@endforeach</div>@break
@case('trtext')<div class="adm-tr">@foreach($langs as $l)<div><small>{{ $l['native_name'] }}</small><textarea class="inp" rows="{{ $name === 'body' ? 10 : 3 }}" name="{{ $key }}[{{ $l['code'] }}]" dir="{{ $l['dir'] }}">{{ old($key.'.'.$l['code'], $raw[$l['code']] ?? '') }}</textarea></div>@endforeach</div>@break
@case('trlines')<div class="adm-tr">@foreach($langs as $l)<div><small>{{ $l['native_name'] }}</small><textarea class="inp" rows="5" name="{{ $key }}[{{ $l['code'] }}]" dir="{{ $l['dir'] }}">{{ old($key.'.'.$l['code'], implode("\n", (array) ($raw[$l['code']] ?? []))) }}</textarea></div>@endforeach</div>@break
@case('textarea')<textarea class="inp" id="f-{{ $key }}" name="{{ $key }}" rows="4">{{ old($key, $raw) }}</textarea>@break
@case('lines')<textarea class="inp" id="f-{{ $key }}" name="{{ $key }}" rows="4">{{ old($key, implode("\n", (array) (is_string($raw) ? json_decode($raw, true) : $raw))) }}</textarea>@break
@case('number')<input class="inp" id="f-{{ $key }}" type="number" step="any" name="{{ $key }}" value="{{ old($key, $raw) }}">@break
@case('checkbox')<input type="hidden" name="{{ $key }}" value="0"><label class="toggle"><input id="f-{{ $key }}" type="checkbox" name="{{ $key }}" value="1" @checked(old($key, $item->exists ? $raw : true))><span></span></label>@break
@case('select')<select class="inp" id="f-{{ $key }}" name="{{ $key }}">@foreach($f[3] as $k => $v)<option value="{{ $k === 0 && $v === '' ? '' : $k }}" @selected((string) old($key, $raw) === (string) $k)>{{ $v === '' ? '—' : $v }}</option>@endforeach</select>@break
@case('image')@if($raw)<img src="{{ img($raw) }}" style="height:60px;border-radius:8px;margin-bottom:6px;display:block">@endif<input class="inp" id="f-{{ $key }}" type="file" name="{{ $key }}" accept="image/*">@break
@case('date')<input class="inp" id="f-{{ $key }}" type="date" name="{{ $key }}" value="{{ old($key, $raw ? \Carbon\Carbon::parse($raw)->format('Y-m-d') : '') }}">@break
@case('datetime')<input class="inp" id="f-{{ $key }}" type="datetime-local" name="{{ $key }}" value="{{ old($key, $raw ? \Carbon\Carbon::parse($raw)->format('Y-m-d\TH:i') : '') }}">@break
@case('password')<input class="inp" id="f-{{ $key }}" type="password" name="{{ $key }}" autocomplete="new-password">@break
@default<input class="inp" id="f-{{ $key }}" name="{{ $key }}" value="{{ old($key, $raw) }}">
@endswitch
@error($key)<span class="err">{{ $message }}</span>@enderror @error($key.'.en')<span class="err">{{ $message }}</span>@enderror
</div>
@endforeach
</div><button class="btn btn-gold" style="margin-top:18px">Save</button></form>
@endsection
