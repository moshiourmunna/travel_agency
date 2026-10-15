@extends('layouts.dash')
@section('title', t3('My Dashboard','আমার ড্যাশবোর্ড','لوحتي'))
@section('heading', t3('Assalamu Alaikum','আসসালামু আলাইকুম','السلام عليكم').', '.auth()->user()->name)
@section('sub'){{ $b ? $b->ref.' · '.$b->package?->title : t3('No bookings yet','এখনো কোনো বুকিং নেই','لا توجد حجوزات') }}@endsection
@section('menu')
@foreach([['ov','▦',t3('Overview','সংক্ষেপ','نظرة عامة'),null],['bk','🕋',t3('My Bookings','আমার বুকিং','حجوزاتي'),null],['in','🗓',t3('Installments','কিস্তি','الأقساط'),'installments'],['dc','📄',t3('Documents','ডকুমেন্ট','المستندات'),null],['vs','🛂',t3('Visa Status','ভিসা স্ট্যাটাস','حالة التأشيرة'),'visa'],['py','💳',t3('Payments','পেমেন্ট','المدفوعات'),null],['pf','⚙',t3('Profile','প্রোফাইল','الملف الشخصي'),null]] as [$k,$ic,$n,$m])
@if(!$m || module_on($m))<a href="#{{ $k }}" data-pane="{{ $k }}" @class(['on' => $loop->first])>{{ $ic }} {{ $n }}</a>@endif @endforeach
@endsection
@section('content')
@php($methods = \App\Models\Payment::METHODS)
@if(!$b)
<div class="panel empty"><p>{{ t3('You have no bookings yet.','আপনার এখনো কোনো বুকিং নেই।','ليس لديك حجوزات بعد.') }}</p><a class="btn btn-gold" href="{{ route('booking.create') }}">{{ t3('Book a package','প্যাকেজ বুক করুন','احجز باقة') }}</a></div>
@else
@if($bookings->count() > 1)<form method="get" style="margin-bottom:16px;display:flex;gap:8px;align-items:center"><label class="f" style="margin:0">{{ t3('Booking','বুকিং','الحجز') }}</label><select class="inp" name="b" style="width:auto;max-width:100%;min-width:0;flex:1" onchange="this.form.submit()">@foreach($bookings as $x)<option value="{{ $x->ref }}" @selected($x->id === $b->id)>{{ $x->ref }} – {{ $x->package?->title }}</option>@endforeach</select></form>@endif
@php($next = $b->installments->firstWhere('status', '!=', 'paid'))
<div class="grid g4" style="margin-bottom:24px">
<div class="card stat"><small>{{ t3('Total package','মোট প্যাকেজ','إجمالي الباقة') }}</small><b>{{ money($b->total) }}</b><span class="up">{{ $b->travellers->count() }} {{ t3('travellers','যাত্রী','مسافرين') }}</span></div>
<div class="card stat"><small>{{ t3('Paid so far','এ পর্যন্ত পরিশোধ','المدفوع') }}</small><b>{{ money($b->paid) }}</b><span class="up">{{ $b->progress() }}% {{ t3('complete','সম্পন্ন','مكتمل') }}</span></div>
<div class="card stat"><small>{{ $next ? t3('Next installment','পরবর্তী কিস্তি','القسط التالي') : t3('Balance due','বাকি','المتبقي') }}</small><b>{{ money($next?->amount ?? $b->due()) }}</b><span class="up">{{ $next ? t3('Due','নির্ধারিত','مستحق').' '.$next->due_date->format('d M Y') : ($b->hold_expires_at ? t3('Hold until','সংরক্ষিত','محجوز حتى').' '.$b->hold_expires_at->format('d M, h:i A') : '—') }}</span></div>
<div class="card stat"><small>{{ t3('Days to departure','যাত্রার বাকি দিন','أيام حتى المغادرة') }}</small><b>{{ $b->package?->departure_date ? max(0, (int) now()->startOfDay()->diffInDays($b->package->departure_date, false)) : '—' }}</b><span class="up">{{ $b->package?->departure_date?->format('d M Y') }}</span></div></div>

@php($steps = ['booked' => 'Booked', 'docs' => 'Documents', 'govt' => 'Govt. reg.', 'visa' => 'Nusuk visa', 'ticket' => 'Ticket', 'departed' => 'Departed'])
@php($pos = ['pending' => 0, 'hold' => 0, 'confirmed' => 1, 'docs_pending' => 1, 'visa' => 3, 'ticketed' => 4, 'completed' => 5, 'cancelled' => 0][$b->status] ?? 0)
<div data-pane-id="ov"><div class="grid g2 wide"><div class="panel"><h4>🛂 {{ t3('Journey status','যাত্রার অবস্থা','حالة الرحلة') }} – {{ $b->package?->title }} <span class="st {{ $b->statusClass() }}">{{ \App\Models\Booking::STATUSES[$b->status] }}</span></h4>
<div class="track">@foreach(array_values($steps) as $i => $s)<div @class(['ok' => $i < $pos, 'cur' => $i === $pos])>{{ $s }}</div>@endforeach</div>
@if($t = $b->travellers->firstWhere('govt_tracking_no'))<p style="font-size:13px;color:var(--mut)">Government registration submitted on hajj.gov.bd · Tracking no. {{ $t->govt_tracking_no }}</p>@endif
@include('dashboard._installments')</div>
<div><div class="panel"><h4>📄 {{ t3('Documents','ডকুমেন্ট','المستندات') }}</h4>@include('dashboard._documents', ['compact' => true])</div>
<div class="panel" style="margin-top:20px"><h4>💳 {{ t3('Recent payments','সাম্প্রতিক পেমেন্ট','آخر المدفوعات') }}</h4>@forelse($b->payments->take(4) as $p)<div class="trow"><span>{{ $methods[$p->method] ?? $p->method }}@if($p->gateway_txn_id) · TrxID {{ $p->gateway_txn_id }}@endif <span class="st {{ $p->status === 'paid' ? 'ok' : ($p->status === 'failed' ? 'no' : 'pen') }}">{{ ucfirst($p->status) }}</span></span><b>{{ money($p->amount) }}</b></div>@empty<p style="color:var(--mut);font-size:14px">—</p>@endforelse</div></div></div></div>

<div data-pane-id="bk" hidden><div class="panel"><h4>{{ t3('My bookings','আমার বুকিং','حجوزاتي') }}</h4><div class="tblw"><table class="tbl"><tr><th>ID</th><th>{{ t3('Package','প্যাকেজ','الباقة') }}</th><th>{{ t3('Travellers','যাত্রী','المسافرون') }}</th><th>{{ t3('Total','মোট','الإجمالي') }}</th><th>{{ t3('Paid','পরিশোধিত','المدفوع') }}</th><th>{{ t3('Status','অবস্থা','الحالة') }}</th></tr>
@foreach($bookings as $x)<tr><td><a href="?b={{ $x->ref }}" style="color:var(--em)">{{ $x->ref }}</a></td><td>{{ $x->package?->title }}</td><td>{{ $x->travellers->count() }}</td><td>{{ money($x->total) }}</td><td>{{ $x->progress() }}%</td><td><span class="st {{ $x->statusClass() }}">{{ \App\Models\Booking::STATUSES[$x->status] }}</span></td></tr>@endforeach</table></div>
<a class="btn btn-gold btn-sm" style="margin-top:14px" href="{{ route('booking.create') }}">+ {{ t3('New booking','নতুন বুকিং','حجز جديد') }}</a></div></div>

<div data-pane-id="in" hidden><div class="panel">@include('dashboard._installments')</div></div>
<div data-pane-id="dc" hidden><div class="panel"><h4>📄 {{ t3('Documents per traveller','যাত্রী অনুযায়ী ডকুমেন্ট','المستندات لكل مسافر') }}</h4>@include('dashboard._documents', ['compact' => false])</div></div>
<div data-pane-id="vs" hidden><div class="panel"><h4>🛂 {{ t3('Visa status','ভিসা স্ট্যাটাস','حالة التأشيرة') }}</h4>@foreach($b->travellers as $bt)<div class="trow"><span>{{ $bt->traveller->full_name }}</span>@if($bt->visa)<span><span class="st inf">{{ \App\Models\VisaApplication::STEPS[$bt->visa->status] ?? ucfirst($bt->visa->status) }}</span> <small>{{ $bt->visa->ref }}</small></span>@else<span class="st pen">{{ t3('Not started','শুরু হয়নি','لم تبدأ') }}</span>@endif</div>@endforeach</div></div>
<div data-pane-id="py" hidden><div class="panel"><h4>💳 {{ t3('All payments','সকল পেমেন্ট','كل المدفوعات') }}</h4><div class="tblw"><table class="tbl"><tr><th>{{ t3('Date','তারিখ','التاريخ') }}</th><th>{{ t3('Method','মাধ্যম','الطريقة') }}</th><th>TrxID</th><th>{{ t3('Amount','পরিমাণ','المبلغ') }}</th><th>{{ t3('Status','অবস্থা','الحالة') }}</th></tr>@foreach($b->payments as $p)<tr><td>{{ ($p->paid_at ?? $p->created_at)->format('d M Y') }}</td><td>{{ $methods[$p->method] ?? $p->method }}</td><td>{{ $p->gateway_txn_id ?? '—' }}</td><td>{{ money($p->amount) }}</td><td><span class="st {{ $p->status === 'paid' ? 'ok' : ($p->status === 'failed' ? 'no' : 'pen') }}">{{ ucfirst($p->status) }}</span></td></tr>@endforeach</table></div></div></div>
@endif
<div data-pane-id="pf" hidden><form class="panel" method="post" action="{{ route('dashboard.profile') }}" style="max-width:560px">@csrf @method('PUT')<h4>⚙ {{ t3('Profile','প্রোফাইল','الملف الشخصي') }}</h4><div class="fg">
<div class="full"><label class="f">{{ t3('Name','নাম','الاسم') }}</label><input class="inp" name="name" value="{{ auth()->user()->name }}"></div><div><label class="f">{{ t3('Mobile','মোবাইল','الجوال') }}</label><input class="inp" value="{{ auth()->user()->phone }}" disabled></div><div><label class="f">Email</label><input class="inp" name="email" value="{{ auth()->user()->email }}"></div>
<div><label class="f">{{ t3('District','জেলা','المنطقة') }}</label><input class="inp" name="district" value="{{ auth()->user()->customer?->district }}"></div><div><label class="f">{{ t3('Address','ঠিকানা','العنوان') }}</label><input class="inp" name="address" value="{{ auth()->user()->customer?->address }}"></div></div><button class="btn btn-em" style="margin-top:14px">{{ t3('Save','সংরক্ষণ','حفظ') }}</button></form></div>
@endsection
