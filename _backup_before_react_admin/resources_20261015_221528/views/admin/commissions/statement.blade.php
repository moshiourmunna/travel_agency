@extends('admin.layout')
@section('title', $agent->code)
@section('heading', __('Agent statement').' · '.$agent->code)
@section('sub', $agent->company_name.' · '.(float) $agent->commission_percent.'%')
@section('top_extra')<div class="hbar"><button class="btn btn-out btn-sm" onclick="print()">🖨 {{ __('Print') }}</button><a class="btn btn-out btn-sm" href="{{ route('admin.commissions.index') }}">← {{ __('Back') }}</a></div>@endsection
@section('content')
@php($earned = $rows->where('status', '!=', 'void')->sum('amount')) @php($paid = $rows->where('status', 'paid')->sum('amount'))
<div class="grid g4" style="margin-bottom:20px"><div class="card stat"><small>{{ __('Bookings') }}</small><b>{{ $bookings->count() }}</b></div><div class="card stat"><small>{{ __('Sales') }}</small><b>{{ money($bookings->where('status', '!=', 'cancelled')->sum('total')) }}</b></div><div class="card stat"><small>{{ __('Earned') }}</small><b>{{ money($earned) }}</b></div><div class="card stat"><small>{{ __('Payable') }}</small><b>{{ money($earned - $paid) }}</b></div></div>
<div class="panel">@include('admin.commissions._table', ['rows' => $rows])</div>
@endsection
