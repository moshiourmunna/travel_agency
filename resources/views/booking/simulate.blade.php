@extends('layouts.app')
@section('title', 'Payment')
@section('content')
@php($names = ['bkash' => ['bKash', '#E2136E'], 'nagad' => ['Nagad', '#F6921E'], 'sslcommerz' => ['SSLCommerz', '#1A4D8F']])
@php([$gname, $color] = $names[$payment->method])
<section><div class="wrap" style="max-width:480px"><div class="panel" style="text-align:center;border-top:6px solid {{ $color }}"><h2 style="color:{{ $color }}">{{ $gname }}</h2><p style="color:var(--mut);font-size:13px">Demo payment page – shown because no live merchant keys are configured.</p>
<div class="trow"><span>Merchant</span><b>{{ site('site_name') }}</b></div><div class="trow"><span>Invoice</span><b>{{ $payment->booking->ref }}</b></div><div class="trow"><span>Amount</span><b style="font-size:20px">{{ money($payment->amount) }}</b></div>
<form method="post" action="{{ route('payment.callback', $payment) }}" style="display:flex;gap:10px;margin-top:18px">@csrf<button name="status" value="success" class="btn btn-em btn-block">Pay {{ money($payment->amount) }}</button><button name="status" value="failed" class="btn btn-out btn-block">Cancel</button></form></div></div></section>
@endsection
