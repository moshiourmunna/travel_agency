@props(['action', 'label' => null, 'reason' => false, 'message' => null])
<details class="pop"><summary class="btn btn-out btn-sm danger">🗑 {{ $label ?? __('Delete') }}</summary><div>
<form method="post" action="{{ $action }}">@csrf @method('DELETE')
<p style="font-size:13.5px;margin:0 0 10px">{{ $message ?? __('This moves the record to trash. It can be restored later.') }}</p>
@if($reason)<input class="inp" name="reason" placeholder="{{ __('Reason (optional)') }}" style="margin-bottom:8px">@endif
<label style="display:flex;gap:6px;font-size:13px;margin-bottom:10px"><input type="checkbox" name="confirm" value="1" required> {{ __('Yes, I understand') }}</label>
<button class="btn btn-red btn-sm btn-block">{{ __('Confirm delete') }}</button></form></div></details>
