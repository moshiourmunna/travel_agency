@extends('layouts.dash')
@section('menu')
<a href="{{ route('admin.dashboard') }}" @class(['on' => request()->routeIs('admin.dashboard')])>▦ Dashboard</a>
<a href="{{ route('admin.bookings.index') }}" @class(['on' => request()->routeIs('admin.bookings.*')])>📋 Bookings</a>
<a href="{{ route('admin.inbox') }}" @class(['on' => request()->routeIs('admin.inbox')])>📥 Enquiries & Visa desk</a>
@foreach(\App\Support\AdminResources::all() as $k => $r)<a href="{{ route('admin.res.index', $k) }}" @class(['on' => request()->route('resource') === $k])>{{ $r['icon'] }} {{ $r['label'] }}</a>@endforeach
<a href="{{ route('admin.settings') }}" @class(['on' => request()->routeIs('admin.settings')])>🧩 Languages · Modules · Licences</a>
<a href="{{ route('admin.integrations') }}" @class(['on' => request()->routeIs('admin.integrations')])>🔌 Integrations</a>
@endsection
