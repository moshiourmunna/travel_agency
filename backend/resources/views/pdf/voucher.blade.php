<!doctype html><html><head><meta charset="utf-8">@include('pdf._style')</head><body>
<table><tr>
 <td style="border:0;padding:0"><div class="brand">Musafir</div><div class="muted">{{ $company['name'] }} · {{ $company['hotline'] }}</div></td>
 <td style="border:0;padding:0" class="r"><h2>{{ $b->kind === 'flight' ? 'E-TICKET' : 'E-VOUCHER' }}</h2><div>Booking <b>{{ $b->ref }}</b></div>@if(! empty($b->contact['pnr']))<div>PNR <b>{{ $b->contact['pnr'] }}</b></div>@endif</td>
</tr></table>
<div class="box" style="margin:16px 0">
 <h2>{{ $b->getTranslation('title', 'en') }}</h2>
 <div class="muted">{{ $b->getTranslation('subtitle', 'en') }}</div>
 @if($b->travel_start)<div style="margin-top:6px"><b>Travel:</b> {{ $b->travel_start->format('D, d M Y') }}@if($b->travel_end && ! $b->travel_end->eq($b->travel_start)) – {{ $b->travel_end->format('D, d M Y') }}@endif</div>@endif
 <div><b>Status:</b> {{ ucfirst($b->status) }} · <b>Paid:</b> BDT {{ number_format((float) $b->paid) }} of {{ number_format((float) $b->total) }}</div>
</div>
<table><tr><th>Traveller</th><th>Type</th>@if($b->kind === 'flight')<th>Ticket no.</th><th>Seat</th>@endif</tr>
 @foreach($b->travellers as $t)<tr><td>{{ $t->name }}</td><td>{{ ucfirst($t->type) }}</td>@if($b->kind === 'flight')<td>{{ $t->ticket_no ?? 'Pending' }}</td><td>{{ $t->seat ?? '—' }}</td>@endif</tr>@endforeach
</table>
<table style="margin-top:12px"><tr><th>Included</th><th class="r">Qty</th></tr>
 @foreach($b->items->filter(fn ($i) => (float) $i->line_total > 0) as $i)<tr><td>{{ $i->getTranslation('label', 'en') }}</td><td class="r">{{ $i->qty }}</td></tr>@endforeach
</table>
<p style="margin-top:18px">Show this voucher (printed or on your phone) with a photo ID. For changes call {{ $company['hotline'] }} or e-mail {{ $company['email'] }}, quoting {{ $b->ref }}.</p>
</body></html>
