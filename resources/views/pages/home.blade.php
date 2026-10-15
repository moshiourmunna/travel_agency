@extends('layouts.app')
@section('content')
<section class="hero" style="background-image:url({{ asset('assets/img/img1.jpg') }});padding:0"><div class="wrap"><div class="ayah">وَأَذِّن فِي النَّاسِ بِالْحَجِّ</div>
<span class="eyebrow">{{ t3('Govt. Licensed Hajj & Umrah Agency','সরকার অনুমোদিত হজ্জ ও উমরাহ এজেন্সি','وكالة حج وعمرة مرخصة') }}</span>
<h1>{{ site('tagline') }}</h1>
<p class="lead">{{ t3('Hajj, Umrah, flights, hotels and visas from Bangladesh, with scholar-led groups, hotels close to the Haram and easy installments.','বাংলাদেশ থেকে হজ্জ, উমরাহ, ফ্লাইট, হোটেল ও ভিসা — আলেম পরিচালিত গ্রুপ, হারামের কাছে হোটেল এবং সহজ কিস্তিতে।','الحج والعمرة والطيران والفنادق والتأشيرات من بنغلاديش بإشراف العلماء وبالتقسيط.') }}</p>
<div style="display:flex;gap:12px;flex-wrap:wrap">@module('hajj')<a href="{{ route('hajj') }}" class="btn btn-gold">{{ t3('Explore Hajj 2027','হজ্জ ২০২৭ দেখুন','باقات حج 2027') }}</a>@endmodule @module('umrah')<a href="{{ route('umrah') }}" class="btn btn-out">{{ t3('Umrah Packages','উমরাহ প্যাকেজ','باقات العمرة') }}</a>@endmodule</div>
@php($tabs = array_filter(['hajj' => ['🕋', t3('Hajj','হজ্জ','الحج'), route('hajj')], 'umrah' => ['☪', t3('Umrah','উমরাহ','العمرة'), route('umrah')], 'flights' => ['✈', t3('Flight','ফ্লাইট','طيران'), route('flights')], 'hotels' => ['🏨', t3('Hotel','হোটেল','فندق'), route('hotels')], 'visa' => ['🛂', t3('Visa','ভিসা','تأشيرة'), route('visa')]], fn($v, $k) => module_on($k), ARRAY_FILTER_USE_BOTH))
@if($tabs)
<form class="search" id="home-search" method="get" action="{{ reset($tabs)[2] }}"><div class="tabs">@foreach($tabs as $k => [$ic, $label, $url])<button type="button" @class(['on' => $loop->first]) data-action="{{ $url }}" data-kind="{{ $k }}">{{ $ic }} {{ $label }}</button>@endforeach</div>
<div class="sform"><div><label class="f">{{ t3('Package type','প্যাকেজের ধরন','نوع الباقة') }}</label><select class="inp" name="class"><option value="">{{ t3('All','সব','الكل') }}</option>@foreach(\App\Models\Package::CLASSES as $k => $v)<option value="{{ $k }}">{{ $v }}</option>@endforeach</select></div>
<div><label class="f">{{ t3('Departure from','যাত্রা স্থান','المغادرة من') }}</label><select class="inp" name="from"><option value="DAC">Dhaka (DAC)</option><option value="CGP">Chattogram (CGP)</option><option value="ZYL">Sylhet (ZYL)</option></select></div>
<div><label class="f">{{ t3('Travellers','যাত্রী','المسافرون') }}</label><select class="inp" name="pax"><option value="2">2 {{ t3('Adults','জন','بالغين') }}</option><option value="1">1 {{ t3('Adult','জন','بالغ') }}</option><option value="4">{{ t3('Family (4)','পরিবার (৪)','عائلة (4)') }}</option></select></div>
<button class="btn btn-em" style="height:46px">🔍 {{ t3('Search','খুঁজুন','بحث') }}</button></div></form>
@endif
</div></section>
<div style="background:var(--iv);border-bottom:1px solid var(--line)"><div class="wrap grid g4 keep2" style="padding:24px 20px;text-align:center">
@foreach([['15,000+', t3('Pilgrims served','সেবা পেয়েছেন','حاج خدمناهم')], ['16', t3('Years experience','বছরের অভিজ্ঞতা','سنوات خبرة')], ['4.9★', t3('Google rating','গুগল রেটিং','تقييم جوجل')], ['24/7', t3('Saudi support','সৌদি সাপোর্ট','دعم في السعودية')]] as [$n, $l])<div><b style="font-size:28px;color:var(--em)">{{ $n }}</b><br><small>{{ $l }}</small></div>@endforeach</div></div>

@if($packages->count())
<section><div class="wrap"><x-section-head :title="t3('Featured Packages','বৈশিষ্ট্যপূর্ণ প্যাকেজ','باقات مميزة')" :sub="t3('Transparent prices with hotel distance to the Haram shown upfront.','হারাম থেকে হোটেলের দূরত্বসহ স্বচ্ছ মূল্য।','أسعار شفافة مع مسافة الفندق من الحرم.')"/>
<div class="chips" style="justify-content:center;margin-bottom:26px"><button class="chip on" data-cat="all">{{ t3('All','সব','الكل') }}</button>@foreach(\App\Models\Package::CLASSES as $v)<button class="chip" data-cat="{{ $v }}">{{ $v }}</button>@endforeach</div>
<div class="grid g3 swipe">@foreach($packages as $p)<x-package-card :p="$p"/>@endforeach</div></div></section>
@endif

@module('hajj','preregistration')
<section class="sec-dark"><div class="wrap" style="text-align:center"><span class="eyebrow">{{ t3('Hajj 1448 AH','হজ্জ ১৪৪৮ হিজরি','حج 1448 هـ') }}</span><h2>{{ t3('Countdown to Hajj 2027','হজ্জ ২০২৭ এর কাউন্টডাউন','العد التنازلي لحج 2027') }}</h2>
<div class="count" id="countdown"><div><b>00</b>{{ t3('Days','দিন','يوم') }}</div><div><b>00</b>{{ t3('Hours','ঘণ্টা','ساعة') }}</div><div><b>00</b>{{ t3('Minutes','মিনিট','دقيقة') }}</div><div><b>00</b>{{ t3('Seconds','সেকেন্ড','ثانية') }}</div></div>
<p style="color:#cfe3dc;max-width:600px;margin:0 auto 22px">{{ t3('Government quota is limited. Pre-register now with only your NID and passport, and we will complete the hajj.gov.bd registration for you.','সরকারি কোটা সীমিত। শুধু NID ও পাসপোর্ট দিয়ে এখনই প্রাক-নিবন্ধন করুন।','الحصة محدودة. سجل مسبقاً الآن بالهوية وجواز السفر.') }}</p>
@module('preregistration')<a href="{{ route('prereg') }}" class="btn btn-gold">{{ t3('Pre-register for Hajj 2027','হজ্জ ২০২৭ প্রাক-নিবন্ধন','التسجيل المسبق لحج 2027') }}</a>@endmodule</div></section>
@endmodule

<section class="sec-alt"><div class="wrap"><x-section-head :title="t3('Why Choose Blessing','কেন ব্লেসিং বেছে নেবেন','لماذا بركة')" :sub="t3('Trusted care for every step of your sacred journey.','আপনার পবিত্র যাত্রার প্রতিটি ধাপে বিশ্বস্ত যত্ন।','رعاية أمينة في كل خطوة.')"/><div class="grid g3">
@foreach([['🕋', t3('Government Licensed','সরকার অনুমোদিত','مرخصة حكومياً'), 'MoRA Hajj licence & HAAB member – your money and visa are safe.'], ['🧕', t3('Scholar-led Groups','আলেম পরিচালিত গ্রুপ','مجموعات بإشراف العلماء'), 'Every group travels with a qualified Mufti/guide and pre-Hajj training.'], ['🏨', t3('Hotels Near Haram','হারামের কাছে হোটেল','فنادق قريبة من الحرم'), 'Verified hotels with real walking distance published for every package.'], ['💳', t3('Easy Installments','সহজ কিস্তি','تقسيط ميسر'), 'Pay deposit online and the rest in installments via bKash, Nagad or bank.'], ['📱', t3('Live Tracking','লাইভ ট্র্যাকিং','تتبع مباشر'), 'Track visa, tickets and documents from your personal dashboard.'], ['🤝', t3('24/7 Saudi Support','২৪/৭ সৌদি সাপোর্ট','دعم 24/7 في السعودية'), 'Our own Makkah & Madinah team, Bangla-speaking, round the clock.']] as [$i, $h, $d])
@continue($i === '💳' && !module_on('installments'))<div class="card why"><div class="ic">{{ $i }}</div><h4>{{ $h }}</h4><p>{{ $d }}</p></div>@endforeach</div></div></section>

<section><div class="wrap"><x-section-head :title="t3('How It Works','কীভাবে কাজ করে','كيف نعمل')"/><div class="grid steps" style="grid-template-columns:repeat(5,1fr)" id="stepg">
@foreach([t3('Choose Package','প্যাকেজ বাছাই','اختر الباقة'), t3('Register & Pay Deposit','নিবন্ধন ও জমা','سجل وادفع العربون'), t3('Submit Documents','ডকুমেন্ট জমা','قدّم المستندات'), t3('Visa & Training','ভিসা ও প্রশিক্ষণ','التأشيرة والتدريب'), t3('Fly to the Haramain','হারামাইনে যাত্রা','السفر إلى الحرمين')] as $s)<div class="card step"><h4>{{ $s }}</h4></div>@endforeach</div></div></section>

<section class="sec-alt"><div class="wrap"><x-section-head :title="t3('Pilgrims Speak','হাজীদের কথা','آراء الحجاج')"/>
<div class="grid g2" style="align-items:center;margin-bottom:24px"><div style="border-radius:18px;height:300px;background:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)),url({{ asset('assets/img/img4.jpg') }}) center/cover;display:grid;place-items:center"><span style="width:76px;height:76px;border-radius:50%;background:var(--gold);display:grid;place-items:center;font-size:28px">▶</span></div>
<div><span class="eyebrow">VIDEO</span><h3 style="font-size:28px">{{ t3('Hajj 2025 journey with our group','আমাদের গ্রুপের সাথে হজ্জ ২০২৫','رحلة حج 2025') }}</h3><p style="color:var(--mut);margin-top:10px">Watch 340 pilgrims from Bangladesh complete the rites in Mina, Arafat and Muzdalifah with our scholars.</p></div></div>
<div class="grid g3 swipe">@foreach($reviews as $r)<div class="card testi"><div class="stars">{{ str_repeat('★', $r->rating) }}</div><p>“{{ $r->body }}”</p><div class="who"><div class="av">{{ mb_substr($r->name, 0, 1) }}</div><div><b>{{ $r->name }}</b><br><small style="color:var(--mut)">{{ $r->city }} · {{ $r->trip }}</small></div></div></div>@endforeach</div></div></section>

@if($guides->count())
<section><div class="wrap"><x-section-head :title="t3('Our Guides & Scholars','আমাদের গাইড ও আলেম','مرشدونا وعلماؤنا')"/><div class="grid g4 swipe">@foreach($guides as $g)<div class="card" style="text-align:center;padding:24px"><div class="av" style="width:90px;height:90px;margin:0 auto 12px;font-size:30px;background:linear-gradient(135deg,var(--em),var(--gold))">{{ mb_substr(explode(' ', $g->getTranslations('name')['en'])[1] ?? $g->name, 0, 1) }}</div><b>{{ $g->name }}</b><div style="color:var(--mut);font-size:13px">{{ $g->role }}</div></div>@endforeach</div></div></section>
@endif

@module('gallery')
<section class="sec-alt"><div class="wrap"><x-section-head :title="t3('Gallery','গ্যালারি','المعرض')"/><div class="gal">@foreach($gallery as $g)<div @class(['big' => $loop->first]) style="background-image:url({{ img($g->path) }})" title="{{ $g->caption }}"></div>@endforeach</div><div style="text-align:center;margin-top:20px"><a class="btn btn-out btn-sm" href="{{ route('gallery') }}">{{ t3('View gallery','গ্যালারি দেখুন','عرض المعرض') }}</a></div></div></section>
@endmodule

<section><div class="wrap grid g2" style="align-items:start"><div><x-section-head :start="true" :title="t3('Frequently Asked','সাধারণ জিজ্ঞাসা','الأسئلة الشائعة')"/><x-faq-list :faqs="$faqs"/><a href="{{ route('faq') }}" class="btn btn-out btn-sm">{{ t3('All FAQs','সব প্রশ্ন','كل الأسئلة') }}</a></div>
@if($posts->count())<div><div class="head" style="text-align:start;margin:0 0 24px"><h2>{{ t3('Latest from the Blog','সর্বশেষ ব্লগ','أحدث المقالات') }}</h2></div><div class="grid" style="gap:14px">@foreach($posts as $post)<a href="{{ route('blog.show', $post) }}" class="card hotel"><div class="hi" style="background-image:url({{ img($post->image) }});width:110px;min-height:80px"></div><div><b>{{ $post->title }}</b><br><small style="color:var(--mut)">{{ $post->published_at->format('M Y') }} · {{ $post->read_minutes }} min read</small></div></a>@endforeach</div></div>@endif
</div></section>

@if(count(\App\Support\SiteConfig::load()['licences']))
<section class="sec-alt"><div class="wrap"><x-section-head :title="t3('Licences & Accreditations','লাইসেন্স ও স্বীকৃতি','التراخيص والاعتمادات')" :sub="t3('Verified by the Government of Bangladesh and industry bodies.','বাংলাদেশ সরকার ও সংশ্লিষ্ট সংস্থা কর্তৃক যাচাইকৃত।','معتمدة من حكومة بنغلاديش.')"/><x-licence-badges variant="card"/>
<div class="partners" style="margin-top:30px"><span>Saudia</span><span>Biman Bangladesh</span><span>US-Bangla</span><span>Emirates</span><span>Nusuk</span><span>Hilton Makkah</span><span>Pullman Zamzam</span></div></div></section>
@endif

@include('partials.cta')
<style>@media(max-width:960px){#stepg{grid-template-columns:1fr 1fr!important}}@media(max-width:640px){#stepg{grid-template-columns:1fr!important}}</style>
@endsection
