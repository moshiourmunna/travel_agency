@extends('layouts.dash')
@section('side_class', 'adm')
@section('menu')
<button type="button" class="mtog" onclick="this.parentNode.classList.toggle('open')" aria-label="Menu">☰ {{ __('Menu') }}</button>
@php($is = fn ($p) => request()->routeIs($p))
<a href="{{ route('admin.dashboard') }}" @class(['on' => $is('admin.dashboard')])>▦ {{ __('Dashboard') }}</a>
<small class="mgrp">{{ __('Operations') }}</small>
<a href="{{ route('admin.bookings.index') }}" @class(['on' => $is('admin.bookings.*')])>📋 {{ __('Bookings') }}</a>
<a href="{{ route('admin.customers.index') }}" @class(['on' => $is('admin.customers.*')])>👤 {{ __('Customers') }}</a>
<a href="{{ route('admin.pilgrims.index') }}" @class(['on' => $is('admin.pilgrims.*')])>🧳 {{ __('Pilgrims') }}</a>
<a href="{{ route('admin.payments.index') }}" @class(['on' => $is('admin.payments.*')])>💳 {{ __('Payments') }}</a>
@module('preregistration')<a href="{{ route('admin.preregs.index') }}" @class(['on' => $is('admin.preregs.*')])>📝 {{ __('Pre-registrations') }}</a>@endmodule
@module('agents')<a href="{{ route('admin.commissions.index') }}" @class(['on' => $is('admin.commissions.*', 'admin.agents.*')])>💼 {{ __('Commissions') }}</a>@endmodule
<a href="{{ route('admin.inbox') }}" @class(['on' => $is('admin.inbox')])>📥 {{ __('Enquiries & Visa desk') }}</a>
<small class="mgrp">{{ __('Catalogue & content') }}</small>
@foreach(\App\Support\AdminResources::all() as $k => $r)<a href="{{ route('admin.res.index', $k) }}" @class(['on' => request()->route('resource') === $k])>{{ $r['icon'] }} {{ __($r['label']) }}</a>@endforeach
<small class="mgrp">{{ __('System') }}</small>
<a href="{{ route('admin.settings') }}" @class(['on' => $is('admin.settings')])>🧩 {{ __('Languages · Modules · Licences') }}</a>
<a href="{{ route('admin.integrations') }}" @class(['on' => $is('admin.integrations')])>🔌 {{ __('Integrations') }}</a>
@if(auth()->user()->isOwner())<a href="{{ route('admin.audit.index') }}" @class(['on' => $is('admin.audit.*')])>🛡 {{ __('Audit log') }}</a>@endif
@endsection
