@props(['p'])
@php($cp = $p->cheapestPrice())
<div class="card pkg" data-cat-item="{{ $p->classLabel() }}" data-class="{{ $p->class }}" data-price="{{ $cp?->price ?? $p->price_from }}" data-duration="{{ $p->duration_days }}" data-dist="{{ $p->makkah_distance_m ?? 99999 }}" data-airline="{{ $p->airline }}" data-date="{{ $p->departure_date?->format('Y-m-d') }}" data-month="{{ $p->departure_date?->format('Y-m') }}">
<div class="im" style="background-image:url({{ img($p->image) }})"><span @class(['tag', 'em' => in_array($p->class, ['premium','vip'])])>{{ $p->classLabel() }}</span></div><div class="bd">
<div class="stars">★★★★★ <span style="color:var(--mut)">{{ $p->rating }} ({{ $p->reviews_count }}+)</span></div><h3>{{ $p->title }}</h3>
<div class="meta"><span>🗓 {{ $p->duration_days }} {{ t3('days','দিন','يوماً') }}</span>@if($p->airline)<span>✈ {{ \Illuminate\Support\Str::before($p->airline, ' (') }}</span>@endif @if($p->departure_date)<span>🛫 {{ $p->departure_date->format('d M Y') }}</span>@endif</div>
@if($p->makkah_distance_m !== null)
<ul class="feat"><li>{{ t3('Makkah hotel','মক্কা হোটেল','فندق مكة') }} – <span class="dist">{{ \App\Models\Package::distanceLabel($p->makkah_distance_m) }}</span></li><li>{{ t3('Madinah hotel','মদিনা হোটেল','فندق المدينة') }} – <span class="dist">{{ \App\Models\Package::distanceLabel($p->madinah_distance_m) }}</span></li><li>{{ t3('Visa, flights, meals, Ziyarah','ভিসা, ফ্লাইট, খাবার, যিয়ারাহ','تأشيرة، طيران، وجبات، زيارة') }}</li></ul>
@else<p style="color:var(--mut);font-size:14px">{{ $p->summary }}</p>@endif
<div class="price"><div><small>{{ $p->makkah_distance_m !== null ? t3('per person (quad)','প্রতি জন (কোয়াড)','للشخص (رباعي)') : t3('per person','প্রতি জন','للشخص') }}</small><b>{{ money($cp?->price ?? $p->price_from) }}</b></div><a href="{{ route('packages.show', $p) }}" class="btn btn-em btn-sm">{{ t3('View Details','বিস্তারিত','التفاصيل') }}</a></div></div></div>
