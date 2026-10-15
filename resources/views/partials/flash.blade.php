@foreach(['ok' => '#E8F5EE;color:#17603D', 'err' => '#FDECEC;color:#9B1C1C'] as $k => $style)
@if(session($k))<div class="wrap" style="margin-top:16px"><div class="panel flash" style="background:{{ $style }};padding:14px 18px" role="status">{{ session($k) }}</div></div>@endif
@endforeach
