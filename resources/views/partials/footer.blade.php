<footer><div class="wrap cols"><div><img src="{{ asset('assets/logo-white.svg') }}" style="height:54px" alt=""><p style="margin-top:14px"><i>{{ site('tagline') }}</i></p>
<p>{{ t3('Government-approved Hajj & Umrah agency serving pilgrims from every district of Bangladesh since 2010.','২০১০ সাল থেকে বাংলাদেশের সকল জেলার হাজীদের সেবায় সরকার অনুমোদিত হজ্জ ও উমরাহ এজেন্সি।','وكالة حج وعمرة معتمدة حكومياً تخدم الحجاج من بنغلاديش منذ 2010.') }}</p>
<x-licence-badges variant="foot"/></div>
<div><h4>{{ t3('Services','সেবাসমূহ','الخدمات') }}</h4>
@module('hajj')<a href="{{ route('hajj') }}">{{ t3('Hajj Packages','হজ্জ প্যাকেজ','باقات الحج') }}</a>@endmodule
@module('umrah')<a href="{{ route('umrah') }}">{{ t3('Umrah Packages','উমরাহ প্যাকেজ','باقات العمرة') }}</a>@endmodule
@module('flights')<a href="{{ route('flights') }}">{{ t3('Air Tickets','এয়ার টিকেট','تذاكر الطيران') }}</a>@endmodule
@module('hotels')<a href="{{ route('hotels') }}">{{ t3('Hotels','হোটেল','الفنادق') }}</a>@endmodule
@module('visa')<a href="{{ route('visa') }}">{{ t3('Visa Processing','ভিসা প্রসেসিং','التأشيرات') }}</a>@endmodule
@module('tours','ziyarah')<a href="{{ route('tours') }}">{{ t3('Tours & Ziyarah','ট্যুর ও যিয়ারাহ','الجولات') }}</a>@endmodule</div>
<div><h4>{{ t3('Quick Links','দ্রুত লিংক','روابط') }}</h4>
@module('preregistration')<a href="{{ route('prereg') }}">{{ t3('Hajj Pre-registration','হজ্জ প্রাক-নিবন্ধন','التسجيل المسبق') }}</a>@endmodule
<a href="{{ route('guide') }}">{{ t3('Hajj & Umrah Guide','হজ্জ ও উমরাহ গাইড','دليل الحج') }}</a><a href="{{ route('faq') }}">FAQ</a>
@module('blog')<a href="{{ route('blog') }}">{{ t3('Blog','ব্লগ','المدونة') }}</a>@endmodule
@module('gallery')<a href="{{ route('gallery') }}">{{ t3('Gallery','গ্যালারি','المعرض') }}</a>@endmodule
@module('agents')<a href="{{ route('agent.index') }}">{{ t3('Agent Portal','এজেন্ট পোর্টাল','بوابة الوكلاء') }}</a>@endmodule</div>
<div><h4>{{ t3('Head Office','প্রধান কার্যালয়','المكتب الرئيسي') }}</h4><p>{{ site('address') }}</p><p>📞 {{ site('phone') }}<br>💬 WhatsApp +{{ site('whatsapp') }}<br>✉ {{ site('email') }}</p><p style="margin-top:8px">🕘 {{ site('hours') }}</p></div></div>
<div class="wrap copy"><span>© {{ date('Y') }} {{ site('site_name') }}. {{ t3('All rights reserved.','সর্বস্বত্ব সংরক্ষিত।','جميع الحقوق محفوظة.') }}</span><span>bKash · Nagad · SSLCommerz · Visa · Mastercard</span></div></footer>
<a class="wa" href="https://wa.me/{{ site('whatsapp') }}" aria-label="WhatsApp">💬</a>
@yield('mcta')
<nav class="mbar"><a href="{{ route('home') }}"><i>⌂</i>{{ t3('Home','হোম','الرئيسية') }}</a>@module('hajj')<a href="{{ route('hajj') }}"><i>🕋</i>{{ t3('Hajj','হজ্জ','الحج') }}</a>@endmodule<a class="book" href="{{ route('booking.create') }}">{{ t3('Book','বুক','احجز') }}</a>@module('umrah')<a href="{{ route('umrah') }}"><i>☪</i>{{ t3('Umrah','উমরাহ','العمرة') }}</a>@endmodule<a href="{{ route('dashboard') }}"><i>👤</i>{{ t3('Account','অ্যাকাউন্ট','حسابي') }}</a></nav>
