@extends('admin.layout')
@section('title', 'Settings')
@section('heading', 'Languages · Modules · Licences')
@section('sub', 'Changes apply to the public site immediately')
@section('content')
<form method="post" action="{{ route('admin.settings.update') }}">@csrf @method('PUT')
<div class="grid g2"><div class="panel" id="langs"><h4>🌐 Languages <small style="color:var(--mut);font-weight:400">(switcher shows enabled only; Arabic renders right-to-left)</small></h4>
@foreach($languages as $l)<div class="trow"><span>{{ $l->native_name }} <small style="color:var(--mut)">{{ $l->code }} · {{ strtoupper($l->dir) }}</small> <label style="font-size:12px;margin-inline-start:8px"><input type="radio" name="default_language" value="{{ $l->code }}" @checked($l->is_default)> default</label></span><label class="toggle"><input type="hidden" name="languages[{{ $l->code }}]" value="0"><input type="checkbox" name="languages[{{ $l->code }}]" value="1" @checked($l->enabled)><span></span></label></div>@endforeach</div>
<div class="panel" id="lics"><h4>🪪 Licence display <small style="color:var(--mut);font-weight:400">(empty number or unticked = hidden everywhere)</small></h4>
@foreach($licences as $l)<div class="fg" style="grid-template-columns:2fr 1.2fr auto;align-items:end;margin-bottom:8px"><div><label class="f">{{ $l->label }}</label><input class="inp" name="licences[{{ $l->type }}][number]" value="{{ $l->number }}" placeholder="Not set – hidden"></div><div><label class="f">Valid until</label><input class="inp" type="date" name="licences[{{ $l->type }}][valid_until]" value="{{ $l->valid_until?->format('Y-m-d') }}"></div><label class="chk"><input type="hidden" name="licences[{{ $l->type }}][show]" value="0"><input type="checkbox" name="licences[{{ $l->type }}][show]" value="1" @checked($l->show_on_site)> show</label></div>@endforeach</div></div>
<div class="panel" style="margin-top:20px" id="mods"><h4>🧩 Modules / feature flags <small style="color:var(--mut);font-weight:400">– switching off hides menus, home sections, search tabs and returns 404 on the routes</small></h4><div class="grid g3" style="gap:0 30px">
@foreach($modules as $m)<div class="trow"><span>{{ $m->label }}</span><label class="toggle"><input type="hidden" name="modules[{{ $m->key }}]" value="0"><input type="checkbox" name="modules[{{ $m->key }}]" value="1" @checked($m->enabled)><span></span></label></div>@endforeach</div></div>
<div class="panel" style="margin-top:20px"><h4>☎ Contact & booking settings</h4><div class="fg" style="grid-template-columns:repeat(3,1fr)">
@php($addr = \App\Models\Setting::where('key', 'address')->first()?->value ?? [])
@foreach([['phone','Phone'],['whatsapp','WhatsApp (digits, e.g. 8801800000000)'],['email','Email'],['hours','Office hours'],['hajj_date','Hajj countdown date (ISO)'],['bank_details','Bank transfer details']] as [$k,$l])<div><label class="f">{{ $l }}</label><input class="inp" name="s[{{ $k }}]" value="{{ old('s.'.$k, is_array($settings[$k] ?? '') ? '' : ($settings[$k] ?? '')) }}"></div>@endforeach
@foreach(['en' => 'Address (English)', 'bn' => 'Address (বাংলা)', 'ar' => 'Address (العربية)'] as $c => $l)<div><label class="f">{{ $l }}</label><input class="inp" name="s[address_{{ $c }}]" value="{{ $addr[$c] ?? '' }}"></div>@endforeach
@foreach([['qurbani_price','Qurbani price ৳'],['insurance_price','Insurance price ৳'],['early_bird_discount','Early-bird discount ৳ / adult (Hajj, 120+ days ahead)'],['hold_hours','Pay-later hold (hours)']] as [$k,$l])<div><label class="f">{{ $l }}</label><input class="inp" type="number" name="s[{{ $k }}]" value="{{ $settings[$k] }}"></div>@endforeach</div></div>
<button class="btn btn-gold" style="margin-top:20px">Save settings</button></form>
@endsection
