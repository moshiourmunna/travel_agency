@extends('admin.layout')
@section('title', 'Integrations')
@section('heading', 'Integrations')
@section('sub', 'Portal & supplier adapters – configured in config/integrations.php / .env')
@section('content')
<div class="grid g3">@foreach([['visa','🛂 Nusuk / Saudi visa','VisaProvider'],['hajj_portal','🇧🇩 hajj.gov.bd portal','HajjPortal'],['flights','✈ GDS flights','FlightProvider'],['hotels','🏨 Hotel suppliers','HotelProvider']] as [$k,$l,$c])<div class="card why"><h4>{{ $l }}</h4><p>Contract: <code>{{ $c }}</code><br>Driver: <b>{{ $drivers[$k] }}</b></p><span class="st {{ $drivers[$k] === 'stub' ? 'pen' : 'ok' }}">{{ $drivers[$k] === 'stub' ? 'Stub (demo data)' : 'Live' }}</span></div>@endforeach
@foreach($drivers['payments'] as $m => $cls)<div class="card why"><h4>💳 {{ \App\Models\Payment::METHODS[$m] ?? $m }}</h4><p>Gateway: <code>{{ class_basename($cls) }}</code></p><span class="st {{ str_contains($cls, 'Simulated') ? 'pen' : 'ok' }}">{{ str_contains($cls, 'Simulated') ? 'Simulated' : 'Live' }}</span></div>@endforeach</div>
<div class="panel" style="margin-top:20px"><h4>Recent integration calls</h4><div class="tblw"><table class="tbl"><tr><th>Time</th><th>Provider</th><th>Operation</th><th>Status</th><th>ms</th></tr>@forelse($logs as $l)<tr><td>{{ $l->created_at }}</td><td>{{ $l->provider }}</td><td>{{ $l->operation }}</td><td>{{ $l->status }}</td><td>{{ $l->duration_ms }}</td></tr>@empty<tr><td colspan="5">No calls yet.</td></tr>@endforelse</table></div></div>
@endsection
