@extends('admin.layout')
@section('title', __('Commissions'))
@section('heading', __('Agent commissions'))
@section('sub', __('Earned').' '.money($agents->sum('earned')).' · '.__('Paid out').' '.money($agents->sum('paid_out')))
@section('top_extra')<a class="btn btn-out btn-sm" href="{{ route('admin.commissions.export', request()->query()) }}">⬇ CSV</a>@endsection
@section('content')
<div class="panel" style="margin-bottom:20px"><h4>🤝 {{ __('Agents') }}</h4><div class="tblw"><table class="tbl sm"><tr><th>{{ __('Agent') }}</th><th>{{ __('Tier') }}</th><th>{{ __('Rate') }}</th><th>{{ __('Bookings') }}</th><th>{{ __('Earned') }}</th><th>{{ __('Paid out') }}</th><th>{{ __('Payable') }}</th><th></th></tr>
@foreach($agents as $a)<tr><td><b>{{ $a->code }}</b><br><small class="mini">{{ $a->company_name }}</small></td><td>{{ __(\App\Models\Agent::TIERS[$a->tier] ?? $a->tier) }}</td><td class="num">{{ (float) $a->commission_percent }}%</td><td class="num">{{ $a->bookings_count }}</td><td class="num">{{ money($a->earned ?? 0) }}</td><td class="num">{{ money($a->paid_out ?? 0) }}</td><td class="num"><b>{{ money(($a->earned ?? 0) - ($a->paid_out ?? 0)) }}</b></td><td><a class="btn btn-out btn-sm" href="{{ route('admin.agents.statement', $a) }}">{{ __('Statement') }}</a></td></tr>@endforeach</table></div></div>
<div class="panel"><form method="get" class="tb"><select class="inp" name="agent_id"><option value="">{{ __('Any agent') }}</option>@foreach($agents as $a)<option value="{{ $a->id }}" @selected(request('agent_id') == $a->id)>{{ $a->code }}</option>@endforeach</select>
<select class="inp" name="status"><option value="">{{ __('All statuses') }}</option>@foreach(\App\Models\Commission::STATUSES as $k => $v)<option value="{{ $k }}" @selected(request('status') === $k)>{{ __($v) }}</option>@endforeach</select><button class="btn btn-em btn-sm">{{ __('Filter') }}</button></form>
@include('admin.commissions._table', ['rows' => $commissions])
{{ $commissions->links('partials.pager') }}</div>
@endsection
