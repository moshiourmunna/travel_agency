@extends('admin.layout')
@section('title', $t->full_name)
@section('heading', $t->full_name)
@section('sub', __(ucfirst($t->gender)).($t->dob ? ' · '.$t->dob->format('d M Y').' ('.$t->dob->age.')' : '').' · '.__('Account').': '.$t->customer?->user?->name)
@section('top_extra')<div class="hbar"><a class="btn btn-out btn-sm" href="{{ route('admin.pilgrims.edit', $t) }}">✏ {{ __('Edit') }}</a><a class="btn btn-out btn-sm" href="{{ route('admin.customers.show', $t->customer_id) }}">👤 {{ __('Customer') }}</a></div>@endsection
@section('content')
<div class="grid g2 wide"><div class="panel"><h4>📋 {{ __('Bookings') }}</h4>@forelse($t->bookingLinks as $bt)<div class="pcard"><h5><a href="{{ route('admin.bookings.show', $bt->booking) }}">{{ $bt->booking?->ref }}</a><span class="st {{ $bt->booking?->statusClass() }}">{{ __(\App\Models\Booking::STATUSES[$bt->booking?->status] ?? '') }}</span></h5>
<div class="mini">{{ $bt->booking?->package?->title }} · {{ __(ucfirst($bt->room_type ?? '')) }}</div><div class="acts" style="margin-top:8px">@foreach($bt->documents as $d)<span class="st {{ ['verified' => 'ok', 'rejected' => 'no'][$d->status] ?? 'pen' }}">{{ __(ucfirst($d->type)) }}: {{ $d->path ? __(ucfirst($d->status)) : __('Missing') }}</span>@endforeach</div>
@if($bt->visa)<div class="mini" style="margin-top:6px">🛂 {{ $bt->visa->ref }} · {{ __(ucfirst($bt->visa->status)) }}</div>@endif</div>@empty<p class="mini">{{ __('No bookings yet.') }}</p>@endforelse</div>
<div class="panel"><h4>{{ __('Passport & identity') }}</h4><dl class="kv"><dt>{{ __('Passport no.') }}</dt><dd>{{ $t->passport?->number_enc ?? '—' }}</dd><dt>{{ __('Issue date') }}</dt><dd>{{ $t->passport?->issue_date?->format('d M Y') ?? '—' }}</dd>
<dt>{{ __('Expiry date') }}</dt><dd>{{ $t->passport?->expiry_date?->format('d M Y') ?? '—' }} @if($t->passport?->expiry_date?->lt(now()->addMonths(6)))<span class="warn">⚠ {{ __('< 6 months validity') }}</span>@endif</dd><dt>{{ __('Place of issue') }}</dt><dd>{{ $t->passport?->issue_place ?? '—' }}</dd>
<dt>{{ __('Verified') }}</dt><dd>{{ $t->passport?->verified_at?->format('d M Y') ?? __('No') }}</dd><dt>{{ __('NID') }}</dt><dd>{{ $t->nid_enc ? '•••• '.substr($t->nid_enc, -4) : '—' }}</dd><dt>{{ __('Mobile') }}</dt><dd>{{ $t->phone ?? '—' }}</dd>
<dt>{{ __('Relation') }}</dt><dd>{{ __(\App\Models\Traveller::RELATIONS[$t->relation] ?? '—') }}</dd><dt>{{ __('Mahram') }}</dt><dd>{{ $t->mahram?->full_name ?? '—' }}</dd>
<dt>{{ __('Blood group') }}</dt><dd>{{ $t->blood_group ?? '—' }}</dd><dt>{{ __('Wheelchair') }}</dt><dd>{{ $t->needs_wheelchair ? __('Yes') : __('No') }}</dd><dt>{{ __('Medical needs / notes') }}</dt><dd>{{ $t->medical_notes ?? '—' }}</dd></dl></div></div>
@endsection
