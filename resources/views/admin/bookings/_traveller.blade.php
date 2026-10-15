{{-- One pilgrim row. $n = input name prefix e.g. travellers[0]; $t = values array --}}
@php($nm = fn ($k) => $n === '' ? $k : $n.'['.$k.']')
@php($v = fn ($k) => old($n === '' ? $k : str_replace(['[', ']'], ['.', ''], $n).'.'.$k, $t[$k] ?? ''))
<div class="pcard trow-p"><h5><span>🧳 <span class="pn">{{ $label ?? __('Pilgrim') }}</span></span>{!! $extra ?? '<button type="button" class="btn btn-out btn-sm danger rm-p" aria-label="'.e(__('Remove')).'">✕</button>' !!}</h5>
<div class="fgrid">
<div class="span2"><label class="f">{{ __('Full name (as in passport)') }} *</label><input class="inp" name="{{ $nm('full_name') }}" value="{{ $v('full_name') }}" required maxlength="120"></div>
<div><label class="f">{{ __('Gender') }} *</label><select class="inp" name="{{ $nm('gender') }}">@foreach(['male' => __('Male'), 'female' => __('Female')] as $k => $l)<option value="{{ $k }}" @selected($v('gender') === $k)>{{ $l }}</option>@endforeach</select></div>
<div><label class="f">{{ __('Date of birth') }}</label><input class="inp" type="date" name="{{ $nm('dob') }}" value="{{ $v('dob') }}"></div>
<div><label class="f">{{ __('Relation') }}</label><select class="inp" name="{{ $nm('relation') }}"><option value="">—</option>@foreach(\App\Models\Traveller::RELATIONS as $k => $l)<option value="{{ $k }}" @selected($v('relation') === $k)>{{ __($l) }}</option>@endforeach</select></div>
<div><label class="f">{{ __('Mobile') }}</label><input class="inp" name="{{ $nm('phone') }}" value="{{ $v('phone') }}" inputmode="tel"></div>
<div><label class="f">{{ __('Passport no.') }}</label><input class="inp" name="{{ $nm('passport_no') }}" value="{{ $v('passport_no') }}" pattern="[A-Za-z0-9]{6,12}" style="text-transform:uppercase"></div>
<div><label class="f">{{ __('Issue date') }}</label><input class="inp" type="date" name="{{ $nm('passport_issue') }}" value="{{ $v('passport_issue') }}"></div>
<div><label class="f">{{ __('Expiry date') }}</label><input class="inp" type="date" name="{{ $nm('passport_expiry') }}" value="{{ $v('passport_expiry') }}"></div>
<div><label class="f">{{ __('Place of issue') }}</label><input class="inp" name="{{ $nm('passport_place') }}" value="{{ $v('passport_place') }}"></div>
<div><label class="f">{{ __('NID') }}</label><input class="inp" name="{{ $nm('nid') }}" value="{{ $v('nid') }}" inputmode="numeric"></div>
<div><label class="f">{{ __('Blood group') }}</label><select class="inp" name="{{ $nm('blood_group') }}"><option value="">—</option>@foreach(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as $g)<option @selected($v('blood_group') === $g)>{{ $g }}</option>@endforeach</select></div>
@isset($t['id'])
<div><label class="f">{{ __('Ticket no.') }}</label><input class="inp" name="{{ $nm('ticket_no') }}" value="{{ $v('ticket_no') }}"></div>
<div><label class="f">{{ __('Seat') }}</label><input class="inp" name="{{ $nm('seat') }}" value="{{ $v('seat') }}"></div>
<div><label class="f">{{ __('Govt. tracking no.') }}</label><input class="inp" name="{{ $nm('govt_tracking_no') }}" value="{{ $v('govt_tracking_no') }}"></div>
@endisset
<div class="full" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><input class="inp" name="{{ $nm('medical_notes') }}" value="{{ $v('medical_notes') }}" placeholder="{{ __('Medical needs / notes') }}" style="flex:1 1 240px">
<label style="display:flex;gap:6px;font-size:13.5px"><input type="checkbox" name="{{ $nm('needs_wheelchair') }}" value="1" @checked($v('needs_wheelchair'))> ♿ {{ __('Wheelchair') }}</label></div>
</div></div>
