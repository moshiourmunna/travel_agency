@php
$dir = collect(\App\Support\SiteConfig::enabledLanguages())->firstWhere('code', app()->getLocale())['dir'] ?? 'ltr';
$u = $b->customer?->user; $inv = $kind === 'invoice';
@endphp
<!DOCTYPE html><html lang="{{ app()->getLocale() }}" dir="{{ $dir }}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ $inv ? __('Invoice') : __('Travel voucher') }} {{ $b->ref }}</title>
<style>
*{box-sizing:border-box}body{font:14px/1.5 "Segoe UI",system-ui,"Noto Sans Bengali","Noto Naskh Arabic",sans-serif;color:#1b2333;margin:0;background:#eef0f4}
.page{max-width:820px;margin:24px auto;background:#fff;padding:36px 40px;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.06)}
.hd{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #C9A227;padding-bottom:16px;margin-bottom:20px;flex-wrap:wrap}.hd img{height:48px}
h1{font-size:22px;margin:0;color:#0E2A47}.mut{color:#6b7280;font-size:12.5px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:start;vertical-align:top}
th{background:#f7f5ef;font-size:12px;text-transform:uppercase;color:#6b7280}.r{text-align:end}.tot td{font-weight:700;border-top:2px solid #0E2A47}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.st{display:inline-block;padding:2px 10px;border-radius:99px;background:#E8F5EE;color:#17603D;font-size:12px;font-weight:600}.due{background:#FFF7E6;color:#8A5A00}
.bar{max-width:820px;margin:16px auto 0;display:flex;gap:8px;justify-content:flex-end}.bar button,.bar a{background:#0E2A47;color:#fff;border:0;padding:9px 16px;border-radius:8px;cursor:pointer;font:inherit;text-decoration:none}
@media(max-width:640px){.page{padding:16px;margin:0;border-radius:0}.grid{grid-template-columns:1fr}th,td{padding:6px 4px;font-size:12px;word-break:break-word}h3{font-size:15px}}
@media print{body{background:#fff}.bar{display:none}.page{box-shadow:none;margin:0;max-width:none;padding:0}}
</style></head><body>
<div class="bar"><a href="{{ route('admin.bookings.show', $b) }}">← {{ __('Back') }}</a><button onclick="window.print()">🖨 {{ __('Print / Save PDF') }}</button></div>
<div class="page">
<div class="hd"><div><img src="{{ asset('assets/logo.svg') }}" alt=""><div class="mut">{{ site('address') }} · {{ site('phone') }} · {{ site('email') }}</div>
<div class="mut">@foreach(\App\Support\SiteConfig::load()['licences'] ?? [] as $l){{ $l['label'] ?? '' }} {{ $l['number'] ?? '' }} · @endforeach</div></div>
<div style="text-align:end"><h1>{{ $inv ? __('Invoice') : __('Travel voucher') }}</h1><div><b>{{ $b->ref }}</b></div><div class="mut">{{ __('Date') }}: {{ now()->format('d M Y') }}</div>
@if($inv)<span class="st {{ $b->due() > 0 ? 'due' : '' }}">{{ $b->due() > 0 ? __('Balance due').' '.money($b->due()) : __('Paid in full') }}</span>@else<span class="st">{{ __(\App\Models\Booking::STATUSES[$b->status]) }}</span>@endif</div></div>
<div class="grid"><div class="box"><div class="mut">{{ $inv ? __('Bill to') : __('Lead pilgrim') }}</div><b>{{ $u?->name }}</b><br>{{ $u?->phone }}<br>{{ $u?->email }}<br>{{ $b->customer?->address }}</div>
<div class="box"><div class="mut">{{ __('Package') }}</div><b>{{ $b->package?->title }}</b><br>@if($b->package?->departure_date){{ __('Departure') }}: {{ $b->package->departure_date->format('d M Y') }}<br>@endif @if($b->package?->return_date){{ __('Return') }}: {{ $b->package->return_date->format('d M Y') }}<br>@endif{{ __('Room') }}: {{ __(ucfirst($b->room_type ?? '')) }}</div></div>
<h3>{{ __('Pilgrims') }}</h3><table><tr><th>#</th><th>{{ __('Name') }}</th><th>{{ __('Passport') }}</th><th>{{ __('Expiry') }}</th>@if($inv)<th class="r">{{ __('Price') }}</th>@else<th>{{ __('Visa') }}</th><th>{{ __('Ticket') }}</th>@endif</tr>
@foreach($b->travellers as $i => $bt)<tr><td>{{ $i + 1 }}</td><td>{{ $bt->traveller->full_name }}</td><td>{{ $bt->traveller->passport?->number_enc ?? '—' }}</td><td>{{ $bt->traveller->passport?->expiry_date?->format('d M Y') ?? '—' }}</td>@if($inv)<td class="r">{{ money($bt->price) }}</td>@else<td>{{ $bt->visa ? __(ucfirst($bt->visa->status)).' '.$bt->visa->visa_no : '—' }}</td><td>{{ $bt->ticket_no ?? '—' }}</td>@endif</tr>@endforeach</table>
@if($inv)
<table><tr><th>{{ __('Description') }}</th><th class="r">{{ __('Amount') }}</th></tr>
<tr><td>{{ $b->package?->title }} – {{ $b->adults }} × {{ __(ucfirst($b->room_type ?? '')) }}@if($b->children) + {{ $b->children }} {{ __('children') }}@endif</td><td class="r">{{ money($b->subtotal - $b->items->sum('price')) }}</td></tr>
@foreach($b->items as $it)<tr><td>{{ $it->label }}</td><td class="r">{{ money($it->price) }}</td></tr>@endforeach
@if($b->discount)<tr><td>{{ __('Discount') }}</td><td class="r">−{{ money($b->discount) }}</td></tr>@endif
<tr class="tot"><td>{{ __('Total') }}</td><td class="r">{{ money($b->total) }}</td></tr><tr><td>{{ __('Paid') }}</td><td class="r">{{ money($b->paid) }}</td></tr><tr class="tot"><td>{{ __('Balance due') }}</td><td class="r">{{ money($b->due()) }}</td></tr></table>
@if($b->payments->where('status', '!=', 'failed')->count())<h3>{{ __('Payments received') }}</h3><table><tr><th>{{ __('Date') }}</th><th>{{ __('Method') }}</th><th>{{ __('TrxID') }}</th><th class="r">{{ __('Amount') }}</th></tr>@foreach($b->payments->whereIn('status', ['paid', 'partially_refunded', 'refunded']) as $p)<tr><td>{{ ($p->paid_at ?? $p->created_at)->format('d M Y') }}</td><td>{{ __(\App\Models\Payment::METHODS[$p->method] ?? $p->method) }}</td><td>{{ $p->gateway_txn_id }}</td><td class="r">{{ money($p->amount) }}@if($p->refunded) (−{{ money($p->refunded) }})@endif</td></tr>@endforeach</table>@endif
@if($b->installments->where('status', '!=', 'paid')->count())<h3>{{ __('Upcoming installments') }}</h3><table>@foreach($b->installments->where('status', '!=', 'paid') as $i)<tr><td>{{ __($i->label) }}</td><td>{{ $i->due_date->format('d M Y') }}</td><td class="r">{{ money($i->amount) }}</td></tr>@endforeach</table>@endif
@else
@if($b->package?->hotels?->count())<h3>{{ __('Hotels') }}</h3><table><tr><th>{{ __('Hotel') }}</th><th>{{ __('City') }}</th><th>{{ __('Nights') }}</th><th>{{ __('Meals') }}</th></tr>@foreach($b->package->hotels as $h)<tr><td>{{ $h->name }} {{ str_repeat('★', $h->stars) }}</td><td>{{ ucfirst($h->city) }}</td><td>{{ $h->pivot->nights }}</td><td>{{ $h->pivot->meal_plan }}</td></tr>@endforeach</table>@endif
@if($b->package?->flights?->count())<h3>{{ __('Flights') }}</h3><table><tr><th>{{ __('Flight') }}</th><th>{{ __('Route') }}</th><th>{{ __('Departs') }}</th></tr>@foreach($b->package->flights as $f)<tr><td>{{ $f->airline }} {{ $f->flight_no }}</td><td>{{ $f->from_iata }} → {{ $f->to_iata }}</td><td>{{ $f->depart_at?->format('d M Y H:i') }}</td></tr>@endforeach</table>@endif
<p class="mut">{{ __('Please carry this voucher, your original passport and vaccination card. Report to the airport 4 hours before departure.') }}</p>
@endif
<p class="mut" style="margin-top:24px">{{ __('Computer-generated document – no signature required.') }} {{ site('site_name') }}</p></div></body></html>
