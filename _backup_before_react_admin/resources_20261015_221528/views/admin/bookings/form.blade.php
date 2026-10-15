@extends('admin.layout')
@php
$edit = (bool) $b;
$title = $edit ? __('Edit booking :ref', ['ref' => $b->ref]) : __('New booking');
$pre = $prefill ?? [];
$cm = old('customer_mode', 'existing');
$selPkg = old('package_id', $edit ? $b->package_id : ($pre['package_id'] ?? ''));
$travellers = $edit ? $b->travellers->map(fn ($bt) => ['id' => $bt->id, 'full_name' => $bt->traveller->full_name, 'gender' => $bt->traveller->gender, 'dob' => $bt->traveller->dob?->toDateString(), 'relation' => $bt->traveller->relation,
    'phone' => $bt->traveller->phone, 'passport_no' => $bt->traveller->passport?->number_enc, 'passport_issue' => $bt->traveller->passport?->issue_date?->toDateString(), 'passport_expiry' => $bt->traveller->passport?->expiry_date?->toDateString(),
    'passport_place' => $bt->traveller->passport?->issue_place, 'blood_group' => $bt->traveller->blood_group, 'medical_notes' => $bt->traveller->medical_notes, 'needs_wheelchair' => $bt->traveller->needs_wheelchair,
    'ticket_no' => $bt->ticket_no, 'seat' => $bt->seat, 'govt_tracking_no' => $bt->govt_tracking_no])->all() : (old('travellers') ?: ($pre['travellers'] ?? [[]]));
@endphp
@section('title', $title)
@section('heading', $title)
@section('sub', $edit ? $b->customer?->user?->name.' · '.$b->package?->title : __('Walk-in, phone or converted pre-registration'))
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ $edit ? route('admin.bookings.show', $b) : route('admin.bookings.index') }}">← {{ __('Back') }}</a>@endsection
@section('content')
<form method="post" action="{{ $edit ? route('admin.bookings.edit.update', $b) : route('admin.bookings.store') }}" id="bkform" class="grid g2 wide">@csrf @if($edit) @method('PUT') @endif
@if(!empty($pre['prereg']))<input type="hidden" name="prereg_id" value="{{ $pre['prereg']->id }}">@endif
<div>
@unless($edit)
<div class="panel"><h4>1 · {{ __('Customer') }}</h4>
@if(!empty($pre['prereg']))<p class="warn">{{ __('Converting pre-registration :ref', ['ref' => $pre['prereg']->ref]) }}</p>@endif
<div class="acts" style="margin-bottom:10px"><label><input type="radio" name="customer_mode" value="existing" @checked($cm === 'existing')> {{ __('Existing customer') }}</label><label><input type="radio" name="customer_mode" value="new" @checked($cm === 'new')> {{ __('New customer') }}</label></div>
<div data-cm="existing"><select class="inp" name="customer_id"><option value="">{{ __('Select customer…') }}</option>@foreach($customers as $c)<option value="{{ $c->id }}" @selected(old('customer_id', $pre['customer_id'] ?? '') == $c->id)>{{ $c->user?->name }} · {{ $c->user?->phone }}</option>@endforeach</select></div>
<div data-cm="new" class="fgrid"><div><label class="f">{{ __('Name') }} *</label><input class="inp" name="new_name" value="{{ old('new_name') }}"></div><div><label class="f">{{ __('Mobile') }} *</label><input class="inp" name="new_phone" value="{{ old('new_phone') }}" placeholder="01XXXXXXXXX"></div>
<div><label class="f">{{ __('Email') }}</label><input class="inp" type="email" name="new_email" value="{{ old('new_email') }}"></div><div><label class="f">{{ __('District') }}</label><input class="inp" name="new_district" value="{{ old('new_district') }}"></div>
<div class="full"><label class="f">{{ __('Address') }}</label><input class="inp" name="new_address" value="{{ old('new_address') }}"></div></div></div>
@endunless
<div class="panel" @unless($edit) style="margin-top:20px" @endunless><h4>{{ $edit ? '1' : '2' }} · {{ __('Package & room') }}</h4><div class="fgrid">
<div class="full"><label class="f">{{ __('Package') }} *</label>@if($edit)<input class="inp" value="{{ $b->package?->title }}" disabled><input type="hidden" name="package_id" value="{{ $b->package_id }}">@else<select class="inp" name="package_id" required><option value="">{{ __('Select package…') }}</option>@foreach($packages as $p)<option value="{{ $p->id }}" @selected($selPkg == $p->id)>{{ $p->title }} ({{ __(\App\Models\Package::TYPES[$p->type] ?? $p->type) }})</option>@endforeach</select>@endif</div>
<div><label class="f">{{ __('Room type / sharing') }} *</label><select class="inp" name="room_type" data-cur="{{ old('room_type', $b?->room_type) }}" required></select></div>
<div><label class="f">{{ __('Children (of the pilgrims)') }}</label><input class="inp" type="number" name="children" min="0" value="{{ old('children', $b?->children ?? 0) }}"></div>
<div class="full mini" id="pkinfo"></div>
@unless($edit)<div class="full acts">@foreach(['qurbani' => __('Qurbani'), 'insurance' => __('Travel insurance')] as $k => $l)<label><input type="checkbox" name="addons[]" value="{{ $k }}" @checked(in_array($k, old('addons', [])))> {{ $l }}</label>@endforeach</div>@endunless
</div></div>
<div class="panel" style="margin-top:20px"><h4 style="display:flex;justify-content:space-between;align-items:center">{{ $edit ? '2' : '3' }} · {{ __('Pilgrims') }} <button type="button" class="btn btn-out btn-sm" id="addp">＋ {{ __('Add pilgrim') }}</button></h4>
<div id="plist">
@foreach($travellers as $i => $t)
@if($edit)
@include('admin.bookings._traveller', ['n' => "travellers[$i]", 't' => $t, 'label' => __('Pilgrim').' '.($i + 1), 'extra' => '<label class="mini danger"><input type="checkbox" name="remove[]" value="'.$t['id'].'"> '.e(__('Remove')).'</label><input type="hidden" name="travellers['.$i.'][id]" value="'.$t['id'].'">'])
@else
@include('admin.bookings._traveller', ['n' => "travellers[$i]", 't' => $t, 'label' => __('Pilgrim').' '.($i + 1)])
@endif
@endforeach
</div>
<template id="ptpl">@include('admin.bookings._traveller', ['n' => ($edit ? 'new_travellers' : 'travellers').'[__I__]', 't' => [], 'label' => __('New pilgrim')])</template>
<p class="mini">{{ __('Passport must be valid at least 6 months after return. Women under 45 need a mahram link (set on the pilgrim page).') }}</p></div>
</div>
<div><div class="panel" style="position:sticky;top:16px"><h4>{{ $edit ? '3' : '4' }} · {{ __('Payment & assignment') }}</h4>
<label class="f">{{ __('Payment plan') }} *</label><select class="inp" name="payment_mode">@foreach(\App\Models\Booking::MODES as $k => $v)@if($k !== 'installment' || module_on('installments'))<option value="{{ $k }}" @selected(old('payment_mode', $b?->payment_mode) === $k)>{{ __($v) }}</option>@endif @endforeach</select>
<label class="f" style="margin-top:10px">{{ __('Payment method') }}</label><select class="inp" name="payment_method"><option value="">—</option>@foreach(\App\Models\Payment::METHODS as $k => $v)<option value="{{ $k }}" @selected(old('payment_method', $b?->payment_method ?? 'cash') === $k)>{{ __($v) }}</option>@endforeach</select>
<label class="f" style="margin-top:10px">{{ __('Extra discount (৳)') }}</label><input class="inp" type="number" min="0" name="discount" value="{{ old('discount', $b->meta['manual_discount'] ?? 0) }}">
@module('agents')<label class="f" style="margin-top:10px">{{ __('Agent') }}</label><select class="inp" name="agent_id"><option value="">{{ __('Direct (no agent)') }}</option>@foreach($agents as $a)<option value="{{ $a->id }}" @selected(old('agent_id', $b?->agent_id) == $a->id)>{{ $a->code }} · {{ $a->company_name }} ({{ (float) $a->commission_percent }}%)</option>@endforeach</select>@endmodule
@if($edit && $b->payment_mode === 'pay_later')<label class="f" style="margin-top:10px">{{ __('Hold expires') }}</label><input class="inp" type="datetime-local" name="hold_expires_at" value="{{ $b->hold_expires_at?->format('Y-m-d\TH:i') }}">@endif
@unless($edit)<div class="fgrid" style="margin-top:10px"><div><label class="f">{{ __('Received now (৳)') }}</label><input class="inp" type="number" min="0" name="initial_payment" value="{{ old('initial_payment') }}"></div><div><label class="f">{{ __('TrxID / receipt') }}</label><input class="inp" name="initial_txn" value="{{ old('initial_txn') }}"></div></div>@endunless
<label class="f" style="margin-top:10px">{{ __('Customer notes') }}</label><textarea class="inp" name="notes" rows="2">{{ old('notes', $b->meta['notes'] ?? '') }}</textarea>
@if($edit)<label class="f" style="margin-top:10px">{{ __('Internal note') }}</label><textarea class="inp" name="admin_note" rows="2">{{ old('admin_note', $b->meta['admin_note'] ?? '') }}</textarea>@endif
<label style="display:flex;gap:6px;margin-top:10px;font-size:13.5px"><input type="checkbox" name="wheelchair" value="1" @checked(old('wheelchair', $b->meta['wheelchair'] ?? false))> ♿ {{ __('Wheelchair assistance for group') }}</label>
<div class="trow" style="margin-top:14px"><span>{{ __('Estimate') }}</span><b id="est">—</b></div><p class="mini">{{ __('Final price is calculated by the server (early-bird and add-ons included).') }}</p>
<button class="btn btn-gold btn-block" style="margin-top:12px">{{ $edit ? __('Save changes') : __('Create booking') }}</button></div></div>
</form>
@endsection
@push('scripts')
<script>
(function () {
  var PK = {!! json_encode($pkgJson, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS) !!}, f = document.getElementById('bkform'), rt = f.room_type, list = document.getElementById('plist'), n = 1000;
  var pkgId = function () { return f.package_id.value; };
  function rooms() {
    var p = PK[pkgId()], cur = rt.value || rt.dataset.cur; rt.innerHTML = '';
    if (!p) { rt.innerHTML = '<option value="">—</option>'; return calc(); }
    Object.keys(p.prices).forEach(function (k) { var o = new Option(p.prices[k].label + ' – ৳' + Number(p.prices[k].price).toLocaleString('en-IN'), k); if (k === cur) o.selected = true; rt.add(o); });
    document.getElementById('pkinfo').textContent = (p.departure ? '✈ ' + p.departure + '  ' : '') + (p.seats !== null ? '🪑 ' + p.seats + ' {{ __('seats left') }}' : '');
    calc();
  }
  function count() { return list.querySelectorAll('.trow-p').length - list.querySelectorAll('input[name="remove[]"]:checked').length; }
  function calc() {
    var p = PK[pkgId()], pr = p && p.prices[rt.value];
    document.getElementById('est').textContent = pr ? '৳' + Math.max(0, pr.price * count() - (Number(f.discount.value) || 0)).toLocaleString('en-IN') : '—';
    list.querySelectorAll('.trow-p .pn').forEach(function (s, i) { if (!s.dataset.fixed) s.textContent = '{{ __('Pilgrim') }} ' + (i + 1); });
  }
  document.getElementById('addp').onclick = function () {
    var d = document.createElement('div'); d.innerHTML = document.getElementById('ptpl').innerHTML.replace(/__I__/g, n++); list.appendChild(d.firstElementChild); calc();
  };
  list.addEventListener('click', function (e) { if (e.target.classList.contains('rm-p') && count() > 1) { e.target.closest('.trow-p').remove(); calc(); } });
  f.addEventListener('change', function (e) { if (e.target.name === 'package_id') { rt.dataset.cur = ''; rooms(); } else calc(); });
  f.discount.addEventListener('input', calc);
  function cm() { var m = (f.querySelector('[name=customer_mode]:checked') || {}).value; f.querySelectorAll('[data-cm]').forEach(function (el) { el.style.display = el.dataset.cm === m ? '' : 'none'; }); }
  f.querySelectorAll('[name=customer_mode]').forEach(function (r) { r.addEventListener('change', cm); }); cm();
  rooms();
})();
</script>
@endpush
