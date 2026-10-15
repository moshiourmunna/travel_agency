@extends('admin.layout')
@php
$owner = auth()->user()->isOwner();
$dep = $b->package?->return_date ?? $b->package?->departure_date;
$docTotal = $b->travellers->sum(fn ($t) => $t->documents->count()); $docOk = $b->travellers->sum(fn ($t) => $t->documents->where('status', 'verified')->count());
$openInst = $b->installments->where('status', '!=', 'paid');
@endphp
@section('title', $b->ref)
@section('heading', __('Booking').' '.$b->ref)
@section('sub', ($b->package?->title).' · '.$b->customer?->user?->name.' · '.$b->customer?->user?->phone)
@section('top_extra')<div class="hbar noprint">
@if($b->trashed())<form method="post" action="{{ route('admin.bookings.restore', $b) }}">@csrf<button class="btn btn-gold btn-sm">♻ {{ __('Restore') }}</button></form>
@else<a class="btn btn-out btn-sm" href="{{ route('admin.bookings.edit', $b) }}">✏ {{ __('Edit') }}</a><a class="btn btn-out btn-sm" target="_blank" href="{{ route('admin.bookings.invoice', $b) }}">🧾 {{ __('Invoice') }}</a><a class="btn btn-out btn-sm" target="_blank" href="{{ route('admin.bookings.voucher', $b) }}">🎫 {{ __('Voucher') }}</a>
@if($owner)<x-admin.confirm-delete :action="route('admin.bookings.destroy', $b)" :reason="true" />@endif @endif
<a class="btn btn-out btn-sm" href="{{ route('admin.bookings.index') }}">← {{ __('All bookings') }}</a></div>@endsection
@section('content')
@if($b->trashed())<div class="panel warn" style="display:block;margin-bottom:16px">🗑 {{ __('This booking is in trash (deleted :d). Restore it to make changes.', ['d' => $b->deleted_at->format('d M Y H:i')]) }}</div>@endif
<div class="grid g4" style="margin-bottom:20px">
<div class="card stat"><small>{{ __('Total') }}</small><b>{{ money($b->total) }}</b><span class="up">{{ __('Subtotal') }} {{ money($b->subtotal) }} − {{ money($b->discount) }}</span></div>
<div class="card stat"><small>{{ __('Paid') }}</small><b>{{ money($b->paid) }}</b><div class="prog" style="margin-top:6px"><i style="width:{{ $b->progress() }}%"></i></div></div>
<div class="card stat"><small>{{ __('Due') }}</small><b>{{ money($b->due()) }}</b><span class="up"><x-admin.pay-status :b="$b" /></span></div>
<div class="card stat"><small>{{ __('Status') }}</small><b style="font-size:17px"><span class="st {{ $b->statusClass() }}">{{ __(\App\Models\Booking::STATUSES[$b->status]) }}</span></b><span class="up">{{ __('Documents') }} {{ $docOk }}/{{ $docTotal }}</span></div></div>
<div class="grid g2 wide"><div>
{{-- Pilgrims --}}
<div class="panel" id="pilgrims"><h4>🧳 {{ __('Pilgrims') }} ({{ $b->travellers->count() }})</h4>
@foreach($b->travellers as $bt)@php($t = $bt->traveller)
<div class="pcard"><h5><span><a href="{{ route('admin.pilgrims.show', $t) }}">{{ $t->full_name }}</a> @if($bt->is_lead)<span class="st inf">{{ __('Lead') }}</span>@endif</span><span class="mini">{{ __(ucfirst($t->gender)) }}{{ $t->dob ? ' · '.$t->dob->age.' '.__('yrs') : '' }}</span></h5>
<dl class="kv"><dt>{{ __('Passport') }}</dt><dd>{{ $t->passport?->number_enc ?? '—' }} @if($t->passport?->expiry_date) · {{ __('exp.') }} {{ $t->passport->expiry_date->format('d M Y') }} @if($dep && $t->passport->expiry_date->lt(\Carbon\Carbon::parse($dep)->addMonths(6)))<span class="warn">⚠ {{ __('< 6 months validity') }}</span>@endif @endif @if($t->passport?->verified_at)<span class="st ok">✓</span>@endif</dd>
@if($t->gender === 'female' && (!$t->dob || $t->dob->age < 45))<dt>{{ __('Mahram') }}</dt><dd>@if($t->mahram){{ $t->mahram->full_name }}@else<span class="warn">⚠ {{ __('Not linked') }}</span>@endif</dd>@endif
<dt>{{ __('Room') }}</dt><dd>{{ __(ucfirst($bt->room_type ?? '')) }} · {{ money($bt->price) }}</dd>
@if($bt->ticket_no || $bt->govt_tracking_no)<dt>{{ __('Ticket / tracking') }}</dt><dd>{{ $bt->ticket_no ?? '—' }} / {{ $bt->govt_tracking_no ?? '—' }}</dd>@endif
@if($t->medical_notes || $t->needs_wheelchair || $t->blood_group)<dt>{{ __('Health') }}</dt><dd>{{ $t->blood_group }} {{ $t->needs_wheelchair ? '♿' : '' }} {{ $t->medical_notes }}</dd>@endif</dl>
@if($bt->documents->count())<div class="docs">
@foreach($bt->documents as $d)<div class="drow"><div class="dname"><b>{{ __(ucfirst($d->type)) }}</b> <span class="st {{ ['verified' => 'ok', 'rejected' => 'no'][$d->status] ?? 'pen' }}">{{ $d->path ? __(ucfirst($d->status)) : __('Missing') }}</span> @if($d->path)<a class="mini" target="_blank" href="{{ route('admin.documents.file', $d) }}">👁 {{ __('view') }}</a>@endif @if($d->note)<small class="mini danger">{{ $d->note }}</small>@endif</div>
@unless($b->trashed())<div class="acts"><form method="post" enctype="multipart/form-data" action="{{ route('admin.documents.upload', $d) }}" class="acts upl">@csrf<label class="btn btn-out btn-sm" title="{{ __('Upload') }}">⬆<input type="file" name="file" accept=".jpg,.jpeg,.png,.pdf" required hidden onchange="this.form.submit()"></label></form>
@if($d->path && $d->status !== 'verified')<form method="post" action="{{ route('admin.documents.review', $d) }}">@csrf<button name="status" value="verified" class="btn btn-em btn-sm" title="{{ __('Verify') }}">✓</button></form>@endif
@if($d->path && $d->status !== 'rejected')<details class="pop"><summary class="btn btn-out btn-sm" title="{{ __('Reject') }}">✕</summary><div><form method="post" action="{{ route('admin.documents.review', $d) }}">@csrf<input type="hidden" name="status" value="rejected"><input class="inp" name="note" required placeholder="{{ __('Reason for rejection') }}"><button class="btn btn-red btn-sm btn-block" style="margin-top:8px">{{ __('Reject') }}</button></form></div></details>@endif</div>@endunless</div>@endforeach</div>@endif
@module('visa')<div class="acts" style="margin-top:10px;font-size:13px">🛂 @if($bt->visa){{ $bt->visa->ref }} · <b>{{ __(ucfirst($bt->visa->status)) }}</b> {{ $bt->visa->visa_no ? '· '.$bt->visa->visa_no : '' }} {{ $bt->visa->provider_ref ? '· '.$bt->visa->provider_ref : '' }}@else {{ __('No visa application') }}@endif
@unless($b->trashed())@if($bt->visa && !$bt->visa->provider_ref)<form method="post" action="{{ route('admin.visa.submit', $bt->visa) }}">@csrf<button class="btn btn-out btn-sm">{{ __('Submit to Nusuk') }}</button></form>@endif
<details class="pop"><summary class="btn btn-out btn-sm">{{ __('Update visa') }}</summary><div><form method="post" action="{{ route('admin.bookings.visa', $bt) }}">@csrf<select class="inp" name="status">@foreach(\App\Http\Controllers\Admin\BookingController::VISA_STATUSES as $k => $v)<option value="{{ $k }}" @selected($bt->visa?->status === $k)>{{ __($v) }}</option>@endforeach</select>
<input class="inp" name="visa_no" placeholder="{{ __('Visa no.') }}" value="{{ $bt->visa?->visa_no }}" style="margin-top:8px"><input class="inp" name="provider_ref" placeholder="{{ __('Nusuk / MOFA ref') }}" value="{{ $bt->visa?->provider_ref }}" style="margin-top:8px"><button class="btn btn-em btn-sm btn-block" style="margin-top:8px">{{ __('Save') }}</button></form></div></details>@endunless</div>@endmodule
</div>@endforeach</div>
{{-- Schedule --}}
<div class="panel" style="margin-top:20px" id="schedule"><h4>🗓 {{ __('Payment schedule') }}</h4>
@if($b->installments->count())<div class="tblw"><table class="tbl sm"><tr><th>{{ __('Stage') }}</th><th>{{ __('Due date') }}</th><th>{{ __('Amount') }}</th><th>{{ __('Status') }}</th></tr>@foreach($b->installments as $i)
<tr><td>{{ __($i->label) }}</td><td class="nowrap">{{ $i->due_date->format('d M Y') }}</td><td class="num">{{ money($i->amount) }}</td><td>@php($late = $i->status !== 'paid' && $i->due_date->lt(today()))<span class="st {{ $i->status === 'paid' ? 'ok' : ($late ? 'no' : 'pen') }}">{{ $late ? __('Overdue') : __(ucfirst($i->status)) }}</span></td></tr>@endforeach</table></div>
@else<p class="mini">{{ __('No installment schedule – :m.', ['m' => __(\App\Models\Booking::MODES[$b->payment_mode])]) }}</p>@endif
@module('installments')@if(!$b->trashed() && $b->due() > 0)<details class="box" style="margin-top:10px"><summary>⚙ {{ $b->installments->count() ? __('Regenerate schedule') : __('Generate installment schedule') }}</summary>
<form method="post" action="{{ route('admin.bookings.schedule', $b) }}" class="fgrid">@csrf<div><label class="f">{{ __('Installments') }}</label><input class="inp" type="number" name="count" min="1" max="24" value="3" required></div>
<div><label class="f">{{ __('First due') }}</label><input class="inp" type="date" name="first_due" value="{{ today()->addMonth()->toDateString() }}" required></div><div><label class="f">{{ __('Last due') }}</label><input class="inp" type="date" name="last_due" value="{{ ($b->package?->departure_date ?? today()->addMonths(4))->copy()->subDays(45)->max(today()->addMonth())->toDateString() }}" required></div>
<div><label class="f">{{ __('Deposit now (৳)') }}</label><input class="inp" type="number" name="deposit" min="0" value="0"></div><div class="full"><p class="mini">{{ __('Paid stages are kept; unpaid ones are replaced. Balance to schedule:') }} <b>{{ money($b->due()) }}</b></p><button class="btn btn-em btn-sm">{{ __('Generate') }}</button></div></form></details>@endif @endmodule</div>
{{-- Payments --}}
<div class="panel" style="margin-top:20px" id="payments"><h4>💳 {{ __('Payments & refunds') }}</h4><div class="tblw"><table class="tbl sm"><tr><th>#</th><th>{{ __('Method') }}</th><th>{{ __('TrxID') }}</th><th>{{ __('Amount') }}</th><th>{{ __('Status') }}</th><th>{{ __('Date') }}</th><th></th></tr>
@forelse($b->payments as $p)<tr><td>{{ $p->id }}</td><td>{{ __(\App\Models\Payment::METHODS[$p->method] ?? $p->method) }}@if($p->slip_path) <a class="mini" target="_blank" href="{{ route('admin.payments.slip', $p) }}">{{ __('slip') }}</a>@endif @if($p->note)<br><small class="mini">{{ $p->note }}</small>@endif</td><td class="mini">{{ $p->gateway_txn_id ?? '—' }}</td>
<td class="num nowrap">{{ money($p->amount) }}@if($p->refunded)<br><small class="danger">−{{ money($p->refunded) }}</small>@endif</td><td><span class="st {{ $p->status === 'paid' ? 'ok' : (in_array($p->status, ['failed', 'refunded']) ? 'no' : 'pen') }}">{{ __(\App\Models\Payment::STATUSES[$p->status] ?? ucfirst($p->status)) }}</span></td><td class="nowrap mini">{{ ($p->paid_at ?? $p->created_at)->format('d M Y') }}<br>{{ $p->recorder?->name }}</td>
<td>@unless($b->trashed())<div class="acts">@if($p->status === 'pending')<form method="post" action="{{ route('admin.payments.verify', $p) }}" class="acts">@csrf<button name="action" value="approve" class="btn btn-em btn-sm">{{ __('Verify') }}</button><button name="action" value="reject" class="btn btn-out btn-sm">{{ __('Reject') }}</button></form>@endif
@if($owner && $p->refundable() > 0)<details class="pop"><summary class="btn btn-out btn-sm">↩ {{ __('Refund') }}</summary><div><form method="post" action="{{ route('admin.payments.refund', $p) }}" data-confirm="{{ __('Record this refund?') }}">@csrf<label class="f">{{ __('Amount (max :m)', ['m' => money($p->refundable())]) }}</label><input class="inp" type="number" name="amount" min="1" max="{{ $p->refundable() }}" value="{{ $p->refundable() }}" required>
<input class="inp" name="reason" required placeholder="{{ __('Reason') }}" style="margin-top:8px"><select class="inp" name="method" style="margin-top:8px">@foreach(\App\Models\Payment::METHODS as $k => $v)<option value="{{ $k }}" @selected($k === $p->method)>{{ __($v) }}</option>@endforeach</select><button class="btn btn-red btn-sm btn-block" style="margin-top:8px">{{ __('Record refund') }}</button></form></div></details>@endif</div>@endunless</td></tr>
@foreach($p->refunds as $r)<tr><td></td><td colspan="2" class="mini">↩ {{ __('Refund') }} · {{ $r->reason }}</td><td class="num danger">−{{ money($r->amount) }}</td><td><span class="st no">{{ __(ucfirst($r->status)) }}</span></td><td class="mini">{{ $r->processed_at?->format('d M Y') }}</td><td></td></tr>@endforeach
@empty<tr><td colspan="7" class="empty">{{ __('No payments yet.') }}</td></tr>@endforelse</table></div></div>
{{-- Ledger --}}
<div class="panel" style="margin-top:20px" id="ledger"><h4>📒 {{ __('Ledger') }}</h4><div class="tblw"><table class="tbl sm"><tr><th>{{ __('Date') }}</th><th>{{ __('Entry') }}</th><th>{{ __('Debit') }}</th><th>{{ __('Credit') }}</th><th>{{ __('Balance due') }}</th></tr>
<tr><td class="nowrap">{{ $b->created_at->format('d M Y') }}</td><td>{{ __('Booking charge') }}{{ $b->discount ? ' ('.__('after discount').' '.money($b->discount).')' : '' }}</td><td class="num">{{ money($b->total) }}</td><td></td><td class="num">{{ money($b->total) }}</td></tr>
@foreach($ledger as $e)<tr><td class="nowrap">{{ $e->created_at->format('d M Y') }}</td><td>{{ $e->ref_type === 'refund' ? '↩ '.__('Refund') : '💳 '.__('Payment') }} <small class="mini">{{ $e->note }}</small></td><td class="num">{{ $e->debit ? money($e->debit) : '' }}</td><td class="num">{{ $e->credit ? money($e->credit) : '' }}</td><td class="num">{{ money($e->balance_after) }}</td></tr>@endforeach
</table></div>@if($ledger->isEmpty() && $b->paid)<p class="mini">{{ __('Older payments were made before the ledger was enabled; see the payments table.') }}</p>@endif</div>
</div>
{{-- Right column --}}
<div>
@unless($b->trashed())
<div class="panel"><h4>⚡ {{ __('Quick actions') }}</h4>
<details class="box" open><summary>🔁 {{ __('Change status') }}</summary><form method="post" action="{{ route('admin.bookings.status', $b) }}">@csrf<select class="inp" name="status">@foreach(\App\Models\Booking::STATUSES as $k => $v)<option value="{{ $k }}" @selected($b->status === $k)>{{ __($v) }}</option>@endforeach</select><input class="inp" name="note" placeholder="{{ __('Note for history (optional)') }}" style="margin-top:8px"><button class="btn btn-em btn-sm btn-block" style="margin-top:8px">{{ __('Update status') }}</button></form></details>
@if($b->due() > 0)<details class="box" style="margin-top:8px" @if($errors->has('amount')) open @endif><summary>💳 {{ __('Record payment') }}</summary><form method="post" enctype="multipart/form-data" action="{{ route('admin.bookings.payment', $b) }}">@csrf
<div class="fgrid"><div><label class="f">{{ __('Amount (৳)') }}</label><input class="inp" type="number" name="amount" min="1" max="{{ $b->due() }}" value="{{ $openInst->first()?->amount ?? $b->due() }}" required></div><div><label class="f">{{ __('Method') }}</label><select class="inp" name="method">@foreach(\App\Models\Payment::METHODS as $k => $v)<option value="{{ $k }}">{{ __($v) }}</option>@endforeach</select></div>
@if($openInst->count())<div class="full"><label class="f">{{ __('Apply to installment') }}</label><select class="inp" name="installment_id"><option value="">{{ __('Auto-allocate') }}</option>@foreach($openInst as $i)<option value="{{ $i->id }}">{{ __($i->label) }} · {{ money($i->amount) }} · {{ $i->due_date->format('d M') }}</option>@endforeach</select></div>@endif
<div><label class="f">{{ __('TrxID / receipt') }}</label><input class="inp" name="txn"></div><div><label class="f">{{ __('Paid on') }}</label><input class="inp" type="datetime-local" name="paid_at" max="{{ now()->format('Y-m-d\TH:i') }}"></div>
<div class="full"><input class="inp" name="note" placeholder="{{ __('Note') }}"></div><div class="full"><label class="f">{{ __('Slip (optional)') }}</label><input type="file" name="slip" accept=".jpg,.jpeg,.png,.pdf"></div></div>
<button class="btn btn-gold btn-sm btn-block" style="margin-top:8px">{{ __('Save payment') }}</button></form></details>@endif
@module('agents')<details class="box" style="margin-top:8px"><summary>🤝 {{ __('Assign agent') }}</summary><form method="post" action="{{ route('admin.bookings.agent', $b) }}">@csrf<select class="inp" name="agent_id"><option value="">{{ __('Direct (no agent)') }}</option>@foreach($agents as $a)<option value="{{ $a->id }}" @selected($b->agent_id === $a->id)>{{ $a->code }} · {{ $a->company_name }}</option>@endforeach</select><button class="btn btn-out btn-sm btn-block" style="margin-top:8px">{{ __('Save') }}</button></form></details>@endmodule
<details class="box" style="margin-top:8px"><summary>📝 {{ __('Add note') }}</summary><form method="post" action="{{ route('admin.bookings.note', $b) }}">@csrf<textarea class="inp" name="message" rows="2" required></textarea><button class="btn btn-out btn-sm btn-block" style="margin-top:8px">{{ __('Add to timeline') }}</button></form></details>
</div>@endunless
<div class="panel" style="margin-top:20px"><h4>{{ __('Details') }}</h4><dl class="kv">
<dt>{{ __('Customer') }}</dt><dd><a href="{{ route('admin.customers.show', $b->customer_id) }}">{{ $b->customer?->user?->name }}</a><br><small class="mini">{{ $b->customer?->user?->phone }} {{ $b->customer?->user?->email }}</small></dd>
<dt>{{ __('Package') }}</dt><dd>{{ $b->package?->title }}@if($b->package?->departure_date)<br><small class="mini">✈ {{ $b->package->departure_date->format('d M Y') }}</small>@endif</dd>
<dt>{{ __('Room') }}</dt><dd>{{ __(ucfirst($b->room_type ?? '')) }} · {{ $b->adults }} {{ __('adults') }} / {{ $b->children }} {{ __('children') }}</dd>
<dt>{{ __('Payment plan') }}</dt><dd>{{ __(\App\Models\Booking::MODES[$b->payment_mode]) }}{{ $b->payment_method ? ' · '.__(\App\Models\Payment::METHODS[$b->payment_method] ?? $b->payment_method) : '' }}</dd>
<dt>{{ __('Agent') }}</dt><dd>@if($b->agent)<a href="{{ module_on('agents') ? route('admin.agents.statement', $b->agent) : '#' }}">{{ $b->agent->code }}</a> · {{ $b->agent->company_name }}@else{{ __('Direct') }}@endif</dd>
<dt>{{ __('Source') }}</dt><dd>{{ strtoupper($b->source) }} · {{ $b->created_at->format('d M Y H:i') }}</dd>
@if($b->hold_expires_at)<dt>{{ __('Hold expires') }}</dt><dd>{{ $b->hold_expires_at->format('d M Y H:i') }}</dd>@endif
@foreach($b->items as $it)<dt>{{ __('Add-on') }}</dt><dd>{{ $it->label }} · {{ money($it->price) }}</dd>@endforeach
@if(!empty($b->meta['wheelchair']))<dt>♿</dt><dd>{{ __('Wheelchair assistance') }}</dd>@endif
@if($b->preRegistration)<dt>{{ __('Pre-registration') }}</dt><dd>{{ $b->preRegistration->ref }}</dd>@endif
@if(!empty($b->meta['notes']))<dt>{{ __('Customer notes') }}</dt><dd>“{{ $b->meta['notes'] }}”</dd>@endif
@if(!empty($b->meta['admin_note']))<dt>{{ __('Internal note') }}</dt><dd>{{ $b->meta['admin_note'] }}</dd>@endif</dl></div>
@if($b->commissions->count())<div class="panel" style="margin-top:20px"><h4>💼 {{ __('Commission') }}</h4>@foreach($b->commissions as $c)<div class="trow"><span>{{ $c->agent?->code }} <span class="st {{ ['paid' => 'ok', 'void' => 'no'][$c->status] ?? 'pen' }}">{{ __(\App\Models\Commission::STATUSES[$c->status] ?? $c->status) }}</span></span><b>{{ money($c->amount) }}</b></div>@endforeach</div>@endif
<div class="panel" style="margin-top:20px" id="timeline"><h4>🕑 {{ __('Timeline') }}</h4><ul class="tl">
@forelse($b->activities as $a)<li><i>{{ \App\Models\BookingActivity::ICONS[$a->type] ?? '•' }}</i><div>@if($a->type === 'status')<b>{{ __(\App\Models\Booking::STATUSES[$a->from_status] ?? (string) $a->from_status) }} → {{ __(\App\Models\Booking::STATUSES[$a->to_status] ?? (string) $a->to_status) }}</b>@if($a->message)<br>@endif @endif{{ $a->message }}<br><small class="mini">{{ $a->created_at->format('d M Y H:i') }} · {{ $a->user?->name ?? __('System') }}</small></div></li>
@empty<li class="mini">{{ __('No activity recorded yet.') }}</li>@endforelse</ul></div>
</div></div>
@endsection
