@extends('admin.layout')
@section('title', $cfg['label'])
@section('heading', $cfg['label'])
@section('sub', $items->total().' records')
@section('top_extra')<a class="btn btn-gold btn-sm" href="{{ route('admin.res.create', $resource) }}">+ Add</a>@endsection
@section('content')
<div class="panel">@if(isset($cfg['search']))<form method="get" style="display:flex;gap:8px;margin-bottom:14px"><input class="inp" name="q" value="{{ request('q') }}" placeholder="Search…" style="max-width:300px"><button class="btn btn-out btn-sm">Search</button></form>@endif
<div class="tblw"><table class="tbl"><tr>@foreach($cfg['columns'] as $c => $l)<th>{{ $l }}</th>@endforeach<th></th></tr>
@forelse($items as $it)<tr>@foreach($cfg['columns'] as $c => $l)@php($v = data_get($it, $c))<td>@if(is_bool($v) || in_array($c, ['is_active','is_featured']))<span class="st {{ $v ? 'ok' : 'no' }}">{{ $v ? 'Yes' : 'No' }}</span>@elseif($v instanceof \Carbon\Carbon){{ $v->format('d M Y H:i') }}@elseif(is_array($v)){{ \Illuminate\Support\Str::limit(implode(', ', \Illuminate\Support\Arr::flatten($v)), 40) }}@elseif(is_numeric($v) && (str_contains($l, '৳'))){{ money($v) }}@else{{ \Illuminate\Support\Str::limit((string) $v, 60) }}@endif</td>@endforeach
<td style="white-space:nowrap"><a class="btn btn-out btn-sm" href="{{ route('admin.res.edit', [$resource, $it->id]) }}">Edit</a><form method="post" action="{{ route('admin.res.destroy', [$resource, $it->id]) }}" style="display:inline" onsubmit="return confirm('Delete this record?')">@csrf @method('DELETE')<button class="btn btn-out btn-sm" style="color:#B42318">Delete</button></form></td></tr>
@empty<tr><td colspan="99" class="empty">No records.</td></tr>@endforelse</table></div>{{ $items->links('partials.pager') }}</div>
@endsection
