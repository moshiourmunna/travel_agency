<!doctype html><html><head><meta charset="utf-8">@include('pdf._style')</head><body>
<table><tr>
 <td style="border:0;padding:0"><div class="brand">Musafir</div><div><b>{{ $company['name'] }}</b></div><div class="muted">{{ $company['address'] }}</div><div class="muted">{{ $company['licences'] }}</div></td>
 <td style="border:0;padding:0" class="r"><h2>INVOICE</h2><div>#{{ $invoiceNo }}</div>
  @php $ps = $b->payment_status; @endphp
  <div style="margin-top:6px"><span class="badge {{ $ps === 'paid' ? 'paid' : ($ps === 'partial' ? 'partial' : 'unpaid') }}">{{ ['paid' => 'PAID', 'partial' => 'PARTIALLY PAID', 'unpaid' => 'UNPAID', 'refunded' => 'REFUNDED'][$ps] ?? strtoupper($ps) }}</span></div></td>
</tr></table>
<table style="margin:16px 0"><tr>
 <td style="border:0;padding:0;width:50%"><div class="muted">Billed to</div><b>{{ trim(($b->contact['first_name'] ?? '').' '.($b->contact['last_name'] ?? '')) }}</b><div>{{ $b->contact['phone'] ?? '' }}</div><div>{{ $b->contact['email'] ?? '' }}</div></td>
 <td style="border:0;padding:0" class="r"><div><span class="muted">Issued</span> {{ $b->created_at->format('d M Y') }}</div><div><span class="muted">Booking ref.</span> <b>{{ $b->ref }}</b></div>
  @if($b->travel_start)<div><span class="muted">Travel</span> {{ $b->travel_start->format('d M Y') }}@if($b->travel_end && ! $b->travel_end->eq($b->travel_start)) – {{ $b->travel_end->format('d M Y') }}@endif</div>@endif
  @php $next = $b->instalments->first(fn ($i) => $i->status !== 'paid'); @endphp
  @if($next)<div><span class="muted">Next payment due</span> {{ $next->due_date->format('d M Y') }}</div>@endif</td>
</tr></table>
<table>
 <tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
 @foreach($b->items->filter(fn ($i) => (float) $i->line_total >= 0) as $i)
 <tr><td>{{ $i->getTranslation('label', 'en') }}</td><td class="r">{{ $i->qty }}</td><td class="r">BDT {{ number_format((float) $i->unit_price) }}</td><td class="r">BDT {{ number_format((float) $i->line_total) }}</td></tr>
 @endforeach
</table>
<table style="margin-top:8px;width:55%;margin-left:45%">
 <tr class="tot"><td>Subtotal</td><td class="r">BDT {{ number_format((float) $b->subtotal) }}</td></tr>
 @if((float) $b->discount > 0)<tr class="tot"><td>Discounts</td><td class="r">− BDT {{ number_format((float) $b->discount) }}</td></tr>@endif
 <tr class="tot"><td>VAT</td><td class="r">Included</td></tr>
 <tr class="grand"><td>Total</td><td class="r">BDT {{ number_format((float) $b->total) }}</td></tr>
 @foreach($paidPayments as $p)<tr class="tot"><td>Paid ({{ $p->method }}{{ $p->gateway_txn ? ' · '.$p->gateway_txn : '' }})</td><td class="r">− BDT {{ number_format((float) $p->amount) }}</td></tr>@endforeach
 <tr class="tot"><td><b>Balance due</b></td><td class="r"><b>BDT {{ number_format($b->balance()) }}</b></td></tr>
</table>
@if($b->instalments->isNotEmpty())
<h2 style="margin-top:18px;font-size:12px">Payment schedule</h2>
<table><tr><th>#</th><th>Due</th><th class="r">Amount</th><th>Status</th></tr>
 @foreach($b->instalments as $i)<tr><td>{{ $i->seq }}</td><td>{{ $i->due_date->format('d M Y') }}</td><td class="r">BDT {{ number_format((float) $i->amount) }}</td><td>{{ ucfirst($i->status) }}</td></tr>@endforeach
</table>
@endif
<p class="muted" style="margin-top:24px">This is a computer-generated invoice and does not require a signature. Payments are subject to our refund policy. {{ $company['email'] }} · {{ $company['hotline'] }}</p>
</body></html>
