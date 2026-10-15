@php($labels = ['passport' => 'Passport', 'photo' => 'Photo', 'nid' => 'NID', 'vaccine' => 'Meningitis vaccine', 'mahram' => 'Mahram certificate', 'other' => 'Other'])
@php($docs = $b->travellers->flatMap(fn($bt) => $bt->documents->map(fn($d) => [$bt, $d])))
@forelse($docs as [$bt, $d])
<div class="trow"><span>{{ $labels[$d->type] ?? $d->type }} – {{ \Illuminate\Support\Str::title(strtolower(explode(' ', $bt->traveller->full_name)[1] ?? $bt->traveller->full_name)) }}@if($d->note)<br><small style="color:#B42318">{{ $d->note }}</small>@endif</span>
<span style="display:flex;gap:6px;align-items:center"><span class="st {{ ['verified' => 'ok', 'rejected' => 'no'][$d->status] ?? 'pen' }}">{{ $d->status === 'pending' && !$d->path ? t3('Pending upload','আপলোড বাকি','بانتظار الرفع') : ucfirst($d->status) }}</span>
@if(!$compact && $d->status !== 'verified')<form method="post" enctype="multipart/form-data" action="{{ route('dashboard.upload', $d) }}" style="display:flex;gap:4px">@csrf<input type="file" name="file" accept=".jpg,.jpeg,.png,.pdf" required style="max-width:170px;font-size:12px"><button class="btn btn-out btn-sm">⬆</button></form>@endif</span></div>
@empty<p style="color:var(--mut);font-size:14px">{{ t3('Document checklist will appear once our team reviews your booking.','আমাদের টিম বুকিং যাচাইয়ের পর ডকুমেন্ট তালিকা দেখাবে।','ستظهر قائمة المستندات بعد مراجعة الحجز.') }}</p>@endforelse
@if($compact)<a href="#dc" data-pane="dc" class="btn btn-out btn-sm" style="margin-top:12px">⬆ {{ t3('Upload document','ডকুমেন্ট আপলোড','رفع مستند') }}</a>@endif
