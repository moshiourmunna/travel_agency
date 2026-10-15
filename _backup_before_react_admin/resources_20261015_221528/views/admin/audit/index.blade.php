@extends('admin.layout')
@section('title', __('Audit log'))
@section('heading', __('Audit log'))
@section('sub', __('Every admin change, export and login-sensitive action'))
@section('content')
<div class="panel"><form method="get" class="tb"><select class="inp" name="action"><option value="">{{ __('All actions') }}</option>@foreach($groups as $g)<option value="{{ $g }}" @selected(request('action') === $g)>{{ $g }}</option>@endforeach</select>
<select class="inp" name="user_id"><option value="">{{ __('Any user') }}</option>@foreach($users as $u)<option value="{{ $u->id }}" @selected(request('user_id') == $u->id)>{{ $u->name }}</option>@endforeach</select>
<input class="inp" type="date" name="from" value="{{ request('from') }}" aria-label="{{ __('From') }}"><input class="inp" type="date" name="to" value="{{ request('to') }}" aria-label="{{ __('To') }}"><button class="btn btn-em btn-sm">{{ __('Filter') }}</button></form>
<div class="tblw"><table class="tbl sm"><tr><th>{{ __('When') }}</th><th>{{ __('User') }}</th><th>{{ __('Action') }}</th><th>{{ __('Subject') }}</th><th>{{ __('Change') }}</th><th>IP</th></tr>
@forelse($logs as $l)<tr><td class="nowrap">{{ $l->created_at?->format('d M Y H:i') }}</td><td>{{ $l->user?->name ?? __('System') }}</td><td><span class="badge">{{ $l->action }}</span></td><td class="mini">{{ class_basename((string) $l->auditable_type) }}{{ $l->auditable_id ? ' #'.$l->auditable_id : '' }}</td>
<td class="mini" style="max-width:360px;word-break:break-word">@if($l->before)<span class="danger">{{ \Illuminate\Support\Str::limit(json_encode($l->before, JSON_UNESCAPED_UNICODE), 140) }}</span><br>@endif @if($l->after){{ \Illuminate\Support\Str::limit(json_encode($l->after, JSON_UNESCAPED_UNICODE), 140) }}@endif</td><td class="mini">{{ $l->ip }}</td></tr>
@empty<tr><td colspan="6" class="empty">{{ __('No entries.') }}</td></tr>@endforelse</table></div>{{ $logs->links('partials.pager') }}</div>
@endsection
