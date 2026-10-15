@extends('layouts.app')
@section('title', $booking->ref)
@section('content')
<section><div class="wrap" style="max-width:760px"><div class="panel" style="text-align:center;padding:40px 24px"><div style="font-size:60px">{{ $booking->status === 'confirmed' ? '✅' : '📝' }}</div>
<h2>{{ $booking->status === 'confirmed' ? t3('Booking confirmed!','বুকিং নিশ্চিত!','تم تأكيد الحجز!') : t3('Booking request received!','বুকিং অনুরোধ গৃহীত!','تم استلام الحجز!') }}</h2>
<p style="color:var(--mut)">{{ t3('Booking ID','বুকিং আইডি','رقم الحجز') }} <b>{{ $booking->ref }}</b> · {{ $booking->package?->title }}</p>
<div style="max-width:420px;margin:20px auto;text-align:start"><div class="trow"><span>{{ t3('Total','মোট','الإجمالي') }}</span><b>{{ money($booking->total) }}</b></div><div class="trow"><span>{{ t3('Paid','পরিশোধিত','المدفوع') }}</span><b style="color:#17803D">{{ money($booking->paid) }}</b></div><div class="trow"><span>{{ t3('Balance','বাকি','المتبقي') }}</span><b>{{ money($booking->due()) }}</b></div>
<div class="trow"><span>{{ t3('Payment','পেমেন্ট','الدفع') }}</span><span>{{ \App\Models\Booking::MODES[$booking->payment_mode] }}</span></div>
@if($booking->hold_expires_at)<div class="trow"><span>{{ t3('Held until','সংরক্ষিত','محجوز حتى') }}</span><b>{{ $booking->hold_expires_at->format('d M Y, h:i A') }}</b></div>@endif
@if($p = $booking->payments->firstWhere('status', 'pending'))@if(!$p->isOnline())<p class="calc" style="font-size:13px">{{ $p->method === 'bank' ? site('bank_details') : t3('Please pay at any of our offices; your booking will be confirmed when accounts verify the payment.','যেকোনো অফিসে পেমেন্ট করুন; যাচাইয়ের পর বুকিং নিশ্চিত হবে।','ادفع في أحد مكاتبنا.') }}</p>@endif @endif</div>
<a href="{{ route('dashboard', ['b' => $booking->ref]) }}" class="btn btn-em" style="margin-top:6px">{{ t3('Go to my dashboard','আমার ড্যাশবোর্ডে যান','الذهاب إلى لوحتي') }}</a></div></div></section>
@endsection
