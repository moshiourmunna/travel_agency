"""Info, content, utility and auth pages."""
import json, os
from core import B, tr, t, digits, img, date, abs_url, BASE_URL, STATE, bdt
import data_public as DP

HOME = B('Home', 'হোম')
KIND = {'WINTER26': 'holiday', 'BKASH1500': 'bank', 'CRUISE-EMI': 'cruise', 'FLYDXB': 'flight', 'HONEY10': 'holiday', 'GROUP15': 'holiday'}
DESC = {'WINTER26': B("Beach resorts, Saint Martin ship tickets and Inani day trips.", 'সৈকত রিসোর্ট, সেন্ট মার্টিনের জাহাজ টিকিট ও ইনানী ডে-ট্রিপ।'),
        'BKASH1500': B('Flat ৳1,500 cashback on bookings above ৳30,000 paid with bKash.', 'বিকাশে ৳৩০,০০০-এর বেশি বুকিংয়ে ফ্ল্যাট ৳১,৫০০ ক্যাশব্যাক।'),
        'CRUISE-EMI': B('0% EMI up to 12 months on any cruise with 14 partner banks.', '১৪টি পার্টনার ব্যাংকে যেকোনো ক্রুজে ১২ মাস পর্যন্ত ০% ইএমআই।'),
        'FLYDXB': B('Dhaka–Dubai return fares from ৳38,900 on select dates.', 'নির্দিষ্ট তারিখে ঢাকা–দুবাই রিটার্ন ভাড়া ৳৩৮,৯০০ থেকে।'),
        'HONEY10': B('10% off honeymoon packages plus a free cake & flower setup.', 'হানিমুন প্যাকেজে ১০% ছাড় ও ফ্রি কেক-ফুল সাজসজ্জা।'),
        'GROUP15': B('15% off for groups of 15+ — retreats, study tours, weddings.', '১৫+ জনের দলে ১৫% ছাড় — রিট্রিট, শিক্ষা সফর, বিয়ে।')}
EXTRA_DEALS = [dict(code='CRUISE10', img='greece', title=B('Early-bird Europe cruises 2027', 'আর্লি-বার্ড ইউরোপ ক্রুজ ২০২৭'), off=B('10% off', '১০% ছাড়'), ends='2026-12-20',
                    tag=B('Cruise', 'ক্রুজ'), link='cruises/greek-isles-turkey.html', kind='cruise', desc=B('Greek Isles & Türkiye sailings — book by 20 Dec.', 'গ্রিক দ্বীপ ও তুরস্ক ক্রুজ — ২০ ডিসেম্বরের মধ্যে বুক করুন।')),
               dict(code=None, img='cappadocia', title=B('Activities flash sale', 'অ্যাক্টিভিটি ফ্ল্যাশ সেল'), off=B('Up to 25% off', 'সর্বোচ্চ ২৫% ছাড়'), ends='2026-11-05',
                    tag=B('Activities', 'অ্যাক্টিভিটি'), link='activities.html', kind='holiday', desc=B('Balloons, desert safaris and island hopping — prices already reduced.', 'বেলুন, মরু সাফারি ও দ্বীপ ভ্রমণ — দাম আগেই কমানো।'))]

def _body(p):
    T = p['title']; c = p['cat']['en']
    return [
        dict(h=t('At a glance', 'এক নজরে'), p=[tr(p['ex']), t('This guide is written by the Musafir team from trips we run every season, with prices checked in October 2026.', 'এই গাইডটি প্রতি মৌসুমে আমাদের পরিচালিত ট্রিপের অভিজ্ঞতা থেকে লেখা; মূল্য অক্টোবর ২০২৬-এ যাচাই করা।')],
             list=[t('Best season: November – March for most routes', 'সেরা মৌসুম: বেশিরভাগ রুটে নভেম্বর – মার্চ'), t('Ideal length: 4–7 days', 'আদর্শ সময়: ৪–৭ দিন'), t('Book 6–8 weeks ahead for the best fares', 'সেরা ভাড়ার জন্য ৬–৮ সপ্তাহ আগে বুক করুন')]),
        dict(h=t('Budget breakdown', 'বাজেট বিভাজন'), p=[t('A mid-range trip for two typically splits into flights (35–45%), hotels (30%), transfers and tours (15%) and food (10%). Paying with bKash or card EMI lets you spread the cost over 3–12 months.', 'দুজনের মাঝারি বাজেটের ট্রিপে সাধারণত ফ্লাইট (৩৫–৪৫%), হোটেল (৩০%), ট্রান্সফার ও ট্যুর (১৫%) এবং খাবার (১০%) খরচ হয়। বিকাশ বা কার্ড ইএমআইতে ৩–১২ মাসে ভাগ করে দিতে পারেন।')]),
        dict(h=t('Documents & visas', 'কাগজপত্র ও ভিসা'), p=[t('Keep a passport valid for six months, bank statements for the last six months, and a printed hotel confirmation. Our visa desk checks every file before submission.', 'ছয় মাস মেয়াদি পাসপোর্ট, গত ছয় মাসের ব্যাংক স্টেটমেন্ট ও হোটেল কনফার্মেশনের প্রিন্ট রাখুন। জমার আগে আমাদের ভিসা ডেস্ক প্রতিটি ফাইল যাচাই করে।')]),
        dict(h=t('Tips from our experts', 'বিশেষজ্ঞদের টিপস'), p=[t('Travel light, carry a power bank and a local SIM or eSIM, and save our 24/7 WhatsApp number before you fly.', 'হালকা লাগেজ নিন, পাওয়ার ব্যাংক ও লোকাল সিম বা ই-সিম রাখুন, আর ওড়ার আগে আমাদের ২৪/৭ হোয়াটসঅ্যাপ নম্বর সেভ করুন।')],
             list=[t('Buy travel insurance with medical cover', 'চিকিৎসা কভারসহ ট্রাভেল ইন্স্যুরেন্স নিন'), t('Choose free-cancellation options when dates may change', 'তারিখ বদলাতে পারে এমন হলে ফ্রি বাতিলের অপশন নিন'), t('Share your itinerary with family via the Musafir app', 'মুসাফির অ্যাপে পরিবারের সাথে ভ্রমণসূচি শেয়ার করুন')])]

LEGAL = {
 'terms': (B('Terms & conditions', 'শর্তাবলি'), [
   (B('Who we are', 'আমরা কারা'), B('Musafir Tours & Travels Ltd. is a Bangladesh-registered travel agency (IATA, ATAB, TOAB, Tourism Board BTB-2214). These terms apply to all bookings made on musafir.com.bd, our app, or at our branches.', 'মুসাফির ট্যুরস অ্যান্ড ট্রাভেলস লিমিটেড বাংলাদেশে নিবন্ধিত একটি ট্রাভেল এজেন্সি (আইএটিএ, আটাব, টোয়াব, ট্যুরিজম বোর্ড BTB-2214)। musafir.com.bd, আমাদের অ্যাপ বা শাখায় করা সব বুকিংয়ে এই শর্তাবলি প্রযোজ্য।')),
   (B('Bookings & payment', 'বুকিং ও পেমেন্ট'), B('A booking is confirmed once the deposit is received and an e-voucher is issued. Balances are due 21 days before departure unless an EMI plan applies. Prices are in BDT and include VAT unless stated.', 'অগ্রিম পাওয়ার পর ই-ভাউচার ইস্যু হলে বুকিং নিশ্চিত হয়। ইএমআই না থাকলে যাত্রার ২১ দিন আগে বাকি টাকা পরিশোধ করতে হবে। উল্লেখ না থাকলে মূল্য ভ্যাটসহ টাকায়।')),
   (B('Changes & cancellations', 'পরিবর্তন ও বাতিল'), B('Each product shows its cancellation badge (e.g. free cancellation up to 24 hours or 30 days). Airline and cruise-line rules apply on top. See the refund policy for timelines.', 'প্রতিটি পণ্যে বাতিলের ব্যাজ দেখানো থাকে (যেমন ২৪ ঘণ্টা বা ৩০ দিন আগে পর্যন্ত ফ্রি বাতিল)। এর সাথে এয়ারলাইন ও ক্রুজ লাইনের নিয়ম প্রযোজ্য। সময়সীমার জন্য রিফান্ড নীতি দেখুন।')),
   (B('Visas & travel documents', 'ভিসা ও ভ্রমণ নথি'), B('Visa decisions are made solely by embassies. Musafir is not liable for refusals, but service fees for files we have not yet submitted are refundable.', 'ভিসার সিদ্ধান্ত কেবল দূতাবাস নেয়। প্রত্যাখ্যানের দায় মুসাফিরের নয়, তবে জমা না হওয়া ফাইলের সার্ভিস ফি ফেরতযোগ্য।')),
   (B('Liability', 'দায়বদ্ধতা'), B('We act as an agent for airlines, hotels, cruise lines and activity operators and select licensed, insured partners. Our liability is limited to the value of the booking.', 'আমরা এয়ারলাইন, হোটেল, ক্রুজ লাইন ও অ্যাক্টিভিটি অপারেটরের এজেন্ট এবং লাইসেন্সপ্রাপ্ত, বিমাকৃত পার্টনার বাছাই করি। আমাদের দায় বুকিং মূল্যের মধ্যে সীমিত।')),
   (B('Governing law', 'প্রযোজ্য আইন'), B('These terms are governed by the laws of Bangladesh; courts of Dhaka have jurisdiction.', 'এই শর্তাবলি বাংলাদেশের আইন দ্বারা নিয়ন্ত্রিত; ঢাকার আদালতের এখতিয়ার রয়েছে।'))]),
 'privacy': (B('Privacy policy', 'গোপনীয়তা নীতি'), [
   (B('Data we collect', 'যে তথ্য সংগ্রহ করি'), B('Name, contact details, passport and visa data you provide, payment references (never full card numbers) and basic usage analytics if you consent.', 'আপনার দেওয়া নাম, যোগাযোগের তথ্য, পাসপোর্ট ও ভিসার তথ্য, পেমেন্ট রেফারেন্স (কখনো পূর্ণ কার্ড নম্বর নয়) এবং সম্মতি দিলে সাধারণ ব্যবহার বিশ্লেষণ।')),
   (B('How we use it', 'যেভাবে ব্যবহার করি'), B('To make and manage bookings, file visas, send tickets and trip alerts, prevent fraud and — only with your opt-in — send offers.', 'বুকিং করা ও পরিচালনা, ভিসা আবেদন, টিকিট ও ট্রিপ অ্যালার্ট পাঠানো, প্রতারণা রোধ এবং — শুধু আপনার সম্মতিতে — অফার পাঠাতে।')),
   (B('Sharing', 'শেয়ার করা'), B('Only with the suppliers and embassies needed for your trip, payment processors (SSLCOMMERZ, bKash, Nagad) and authorities when required by law.', 'শুধু আপনার ট্রিপের জন্য প্রয়োজনীয় সরবরাহকারী ও দূতাবাস, পেমেন্ট প্রসেসর (এসএসএলকমার্জ, বিকাশ, নগদ) এবং আইন অনুযায়ী প্রয়োজনে কর্তৃপক্ষের সাথে।')),
   (B('Cookies', 'কুকি'), B('Essential cookies keep you signed in and remember language, theme and currency. Analytics and marketing cookies are off until you accept them in the cookie banner.', 'প্রয়োজনীয় কুকি আপনাকে সাইন ইন রাখে এবং ভাষা, থিম ও মুদ্রা মনে রাখে। কুকি ব্যানারে সম্মতি না দেওয়া পর্যন্ত বিশ্লেষণ ও মার্কেটিং কুকি বন্ধ থাকে।')),
   (B('Retention & security', 'সংরক্ষণ ও নিরাপত্তা'), B('Passport scans are deleted 90 days after travel. Data is encrypted in transit and at rest, and staff access is role-based and logged.', 'ভ্রমণের ৯০ দিন পর পাসপোর্ট স্ক্যান মুছে ফেলা হয়। তথ্য আদান-প্রদান ও সংরক্ষণে এনক্রিপ্টেড, এবং কর্মীদের অ্যাক্সেস ভূমিকাভিত্তিক ও লগ করা।')),
   (B('Your rights', 'আপনার অধিকার'), B('You can download, correct or delete your data from My account → Settings, or by emailing us.', 'মাই অ্যাকাউন্ট → সেটিংস থেকে বা ইমেইল করে আপনার তথ্য ডাউনলোড, সংশোধন বা মুছে ফেলতে পারেন।'))]),
 'refund-policy': (B('Refund & cancellation policy', 'রিফান্ড ও বাতিল নীতি'), [
   (B('Cancellation badges', 'বাতিলের ব্যাজ'), B('Every tour, cruise, hotel and activity shows its policy: “Free cancellation” (full refund before the stated time), “Partial refund” or “Non-refundable”.', 'প্রতিটি ট্যুর, ক্রুজ, হোটেল ও অ্যাক্টিভিটিতে নীতি দেখানো থাকে: “ফ্রি বাতিল” (নির্ধারিত সময়ের আগে পূর্ণ রিফান্ড), “আংশিক রিফান্ড” বা “অফেরতযোগ্য”।')),
   (B('Holiday packages', 'হলিডে প্যাকেজ'), B('30+ days before departure: full refund minus ৳2,000 service fee. 15–29 days: 50%. Under 15 days: non-refundable except insured reasons.', 'যাত্রার ৩০+ দিন আগে: ৳২,০০০ সার্ভিস ফি বাদে পূর্ণ রিফান্ড। ১৫–২৯ দিন: ৫০%। ১৫ দিনের কম: বিমাকৃত কারণ ছাড়া অফেরতযোগ্য।')),
   (B('Flights & cruises', 'ফ্লাইট ও ক্রুজ'), B('Airline and cruise-line fare rules apply; we pass on every taka the supplier refunds, minus a ৳500 processing fee.', 'এয়ারলাইন ও ক্রুজ লাইনের ভাড়ার নিয়ম প্রযোজ্য; সরবরাহকারী যা ফেরত দেয় তার প্রতিটি টাকা ৳৫০০ প্রসেসিং ফি বাদে ফেরত দিই।')),
   (B('How refunds are paid', 'রিফান্ড যেভাবে দেওয়া হয়'), B('To the original method: bKash/Nagad within 3 working days, cards within 7–10 working days, bank transfer within 5 working days.', 'মূল পদ্ধতিতে: বিকাশ/নগদে ৩ কর্মদিবস, কার্ডে ৭–১০ কর্মদিবস, ব্যাংক ট্রান্সফারে ৫ কর্মদিবসের মধ্যে।')),
   (B('Force majeure', 'অনিবার্য কারণ'), B('If we cancel because of strikes, natural disasters or government advisories, you choose a free date change, a credit note with 10% bonus, or a full refund.', 'হরতাল, প্রাকৃতিক দুর্যোগ বা সরকারি নির্দেশনার কারণে আমরা বাতিল করলে আপনি ফ্রি তারিখ পরিবর্তন, ১০% বোনাসসহ ক্রেডিট নোট বা পূর্ণ রিফান্ড বেছে নিতে পারবেন।'))])}

def build(render, L):
    STATE['lang'] = L
    deals = [dict(o, kind=KIND.get(o['code'], 'holiday'), desc=DESC.get(o['code'], o['off'])) for o in DP.OFFERS] + EXTRA_DEALS
    render('pages/offers.html', 'offers.html', B('Travel deals & offers — coupons, flash sales, EMI', 'ট্রাভেল ডিল ও অফার — কুপন, ফ্ল্যাশ সেল, ইএমআই'),
           B('Live travel deals from Musafir: flash sales with countdowns, coupon codes, bKash cashback and 0% EMI on holidays, cruises and flights.', 'মুসাফিরের চলমান অফার: কাউন্টডাউনসহ ফ্ল্যাশ সেল, কুপন কোড, বিকাশ ক্যাশব্যাক এবং হলিডে, ক্রুজ ও ফ্লাইটে ০% ইএমআই।'),
           lang=L, active='offers', crumbs=[(HOME, 'index.html'), (B('Offers', 'অফার'), 'offers.html')], image='maldives',
           ld=[{"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": {"@type": "Offer", "name": tr(d['title']), "validThrough": d['ends'], "url": abs_url(d['link'].split('?')[0])}} for i, d in enumerate(deals)]}],
           deals=deals)
    cats = []
    for p in DP.BLOG:
        if p['cat'] not in cats: cats.append(p['cat'])
    render('pages/blog.html', 'blog.html', B('Travel blog — guides, budgets & visa tips', 'ট্রাভেল ব্লগ — গাইড, বাজেট ও ভিসা টিপস'),
           B('Practical travel guides for Bangladeshi travellers: budgets in BDT, visa checklists, cruises, honeymoons and family trips.', 'বাংলাদেশি ভ্রমণকারীদের জন্য ব্যবহারিক গাইড: টাকায় বাজেট, ভিসা চেকলিস্ট, ক্রুজ, হানিমুন ও পারিবারিক ট্রিপ।'),
           lang=L, active='blog', crumbs=[(HOME, 'index.html'), (B('Blog', 'ব্লগ'), 'blog.html')], image='santorini', cats=cats,
           ld=[{"@context": "https://schema.org", "@type": "Blog", "name": "Musafir Travel Journal", "blogPost": [{"@type": "BlogPosting", "headline": tr(p['title']), "url": abs_url(f"blog/{p['slug']}.html"), "datePublished": p['date']} for p in DP.BLOG]}])
    for p in DP.BLOG:
        STATE['page'] = f"{L}/blog/{p['slug']}.html"
        body = _body(p)
        rel = [r for r in DP.BLOG if r['slug'] != p['slug']][:3]
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": tr(p['title']), "description": tr(p['ex']), "image": f"{BASE_URL}/assets/img/{p['img']}.jpg",
              "datePublished": p['date'], "dateModified": p['date'], "author": {"@type": "Person", "name": tr(p['author'])}, "publisher": {"@id": BASE_URL + "/#org"},
              "mainEntityOfPage": abs_url(f"blog/{p['slug']}.html"), "inLanguage": L, "wordCount": 650, "articleSection": tr(p['cat'])}
        render('pages/post.html', f"blog/{p['slug']}.html", p['title'], p['ex'], lang=L, active='blog', og_type='article',
               crumbs=[(HOME, 'index.html'), (B('Blog', 'ব্লগ'), 'blog.html'), (p['title'], f"blog/{p['slug']}.html")], image=p['img'], ld=[ld],
               p=p, body=body, related=rel, tags=[tr(p['cat']), 'Bangladesh', t('travel tips', 'ভ্রমণ টিপস')])
    STATE['page'] = f'{L}/gallery.html'
    photos = [(k, tr(d['name']), d['region']) for d in DP.DESTINATIONS for k in [d['img']]] + [(k, n, 'intl') for k, n in [('santorini', 'Santorini'), ('cappadocia', 'Cappadocia'), ('halong', 'Ha Long Bay'), ('greece', 'Mykonos'), ('japan', 'Mt Fuji'), ('swiss', 'Lauterbrunnen'), ('paris', 'Paris'), ('egypt', 'Giza')]] + [(k, n, 'bd') for k, n in [('bandarban', 'Nilgiri, Bandarban'), ('ratargul', 'Ratargul'), ('jaflong', 'Jaflong'), ('kuakata', 'Kuakata'), ('stmartin', "Saint Martin's"), ('rangamati', 'Kaptai Lake')]]
    render('pages/gallery.html', 'gallery.html', B('Travel photo gallery', 'ভ্রমণের ছবির গ্যালারি'), B('Photos from Musafir destinations in Bangladesh and around the world.', 'বাংলাদেশ ও বিশ্বজুড়ে মুসাফিরের গন্তব্যের ছবি।'),
           lang=L, active='gallery', crumbs=[(HOME, 'index.html'), (B('Gallery', 'গ্যালারি'), 'gallery.html')], image='phuket', photos=photos)
    render('pages/about.html', 'about.html', B('About Musafir — Bangladeshi travel agency since 2012', 'মুসাফির সম্পর্কে — ২০১২ সাল থেকে বাংলাদেশি ট্রাভেল এজেন্সি'),
           B('IATA-accredited, ATAB and TOAB member travel company in Dhaka, Chattogram and Sylhet. Our story, values, milestones and licences.', 'ঢাকা, চট্টগ্রাম ও সিলেটে আইএটিএ স্বীকৃত, আটাব ও টোয়াব সদস্য ট্রাভেল কোম্পানি। আমাদের গল্প, মূল্যবোধ, মাইলফলক ও লাইসেন্স।'),
           lang=L, active='about', crumbs=[(HOME, 'index.html'), (B('About', 'আমাদের কথা'), 'about.html')], image='sajek',
           ld=[{"@context": "https://schema.org", "@type": "AboutPage", "mainEntity": {"@id": BASE_URL + "/#org"}}])
    render('pages/team.html', 'team.html', B('Our team of travel experts', 'আমাদের ট্রাভেল বিশেষজ্ঞ টিম'), B('Meet the Musafir travel consultants, cruise and visa specialists.', 'মুসাফিরের ট্রাভেল কনসালট্যান্ট, ক্রুজ ও ভিসা বিশেষজ্ঞদের সাথে পরিচিত হোন।'),
           lang=L, active='about', crumbs=[(HOME, 'index.html'), (B('About', 'আমাদের কথা'), 'about.html'), (B('Team', 'টিম'), 'team.html')], image='nepal')
    render('pages/contact.html', 'contact.html', B('Contact Musafir — hotline, WhatsApp, offices', 'যোগাযোগ — হটলাইন, হোয়াটসঅ্যাপ, অফিস'), B('Call 09612-787878 (24/7), WhatsApp or visit our Banani, Chattogram and Sylhet offices.', '০৯৬১২-৭৮৭৮৭৮ (২৪/৭) নম্বরে কল, হোয়াটসঅ্যাপ বা বনানী, চট্টগ্রাম ও সিলেট অফিসে আসুন।'),
           lang=L, active='contact', crumbs=[(HOME, 'index.html'), (B('Contact', 'যোগাযোগ'), 'contact.html')], image='dhaka',
           ld=[{"@context": "https://schema.org", "@type": "ContactPage", "mainEntity": {"@id": BASE_URL + "/#org"}}])
    render('pages/faq.html', 'faq.html', B('Help centre & FAQ', 'হেল্প সেন্টার ও প্রশ্নোত্তর'), B('Answers about booking, payments, EMI, cancellations, refunds and visas.', 'বুকিং, পেমেন্ট, ইএমআই, বাতিল, রিফান্ড ও ভিসা নিয়ে উত্তর।'),
           lang=L, active='faq', crumbs=[(HOME, 'index.html'), (B('FAQ', 'প্রশ্নোত্তর'), 'faq.html')], image='plane',
           ld=[{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": tr(q), "acceptedAnswer": {"@type": "Answer", "text": tr(a)}} for q, a, c in DP.FAQS]}])
    bdw = ("Cox", 'Sajek', 'Sundarbans', 'Sylhet', 'Bandarban', 'Dhaka', 'Saint')
    revs = [dict(r, reg='bd' if any(w in r['trip']['en'] for w in bdw) else 'intl') for r in DP.REVIEWS]
    render('pages/reviews.html', 'reviews.html', B('Musafir reviews — 4.8/5 from 8,400+ travellers', 'মুসাফির রিভিউ — ৮,৪০০+ ভ্রমণকারীর রেটিং ৪.৮/৫'), B('Verified reviews of Musafir holidays, cruises, visas and support, with rating breakdown.', 'মুসাফিরের হলিডে, ক্রুজ, ভিসা ও সাপোর্ট নিয়ে যাচাইকৃত রিভিউ ও রেটিং বিভাজন।'),
           lang=L, active='reviews', crumbs=[(HOME, 'index.html'), (B('Reviews', 'রিভিউ'), 'reviews.html')], image='bali', revs=revs,
           ld=[{"@context": "https://schema.org", "@type": "TravelAgency", "@id": BASE_URL + "/#org", "name": "Musafir", "aggregateRating": {"@type": "AggregateRating", "ratingValue": 4.8, "reviewCount": 8412, "bestRating": 5}}])
    render('pages/careers.html', 'careers.html', B('Careers at Musafir', 'মুসাফিরে ক্যারিয়ার'), B('Open roles in travel consulting, cruises, visa and engineering in Dhaka.', 'ঢাকায় ট্রাভেল কনসাল্টিং, ক্রুজ, ভিসা ও ইঞ্জিনিয়ারিংয়ে খোলা পদ।'),
           lang=L, active='careers', crumbs=[(HOME, 'index.html'), (B('Careers', 'ক্যারিয়ার'), 'careers.html')], image='swiss',
           ld=[{"@context": "https://schema.org", "@type": "JobPosting", "title": tr(j['title']), "datePosted": "2026-10-10", "validThrough": "2026-12-31", "employmentType": "FULL_TIME",
                "hiringOrganization": {"@type": "Organization", "name": "Musafir Tours & Travels Ltd.", "sameAs": BASE_URL}, "description": tr(j['title']) + " — " + tr(j['dept']),
                "jobLocation": {"@type": "Place", "address": {"@type": "PostalAddress", "addressLocality": "Dhaka", "addressCountry": "BD"}}} for j in DP.CAREERS])
    for slug, (h, secs) in LEGAL.items():
        render('pages/legal.html', f'{slug}.html', h, B(f"{h['en']} for Musafir bookings.", f"মুসাফির বুকিংয়ের {h['bn']}।"), lang=L, active='legal',
               crumbs=[(HOME, 'index.html'), (h, f'{slug}.html')], image='plane', heading=h, sections=secs)
    for tpl, path, ti, de, im in [
        ('custom-tour', 'custom-tour.html', B('Tailor-made trip request', 'কাস্টম ট্রিপের অনুরোধ'), B('Get a free custom itinerary and quote within 24 hours.', '২৪ ঘণ্টার মধ্যে ফ্রি কাস্টম ভ্রমণসূচি ও কোটেশন।'), 'swiss'),
        ('insurance', 'insurance.html', B('Travel insurance from ৳650', 'ট্রাভেল ইন্স্যুরেন্স ৳৬৫০ থেকে'), B('Schengen-approved travel insurance with medical, cancellation and baggage cover.', 'চিকিৎসা, বাতিল ও লাগেজ কভারসহ শেনজেন অনুমোদিত ট্রাভেল ইন্স্যুরেন্স।'), 'plane'),
        ('group-tours', 'group-tours.html', B('Group & corporate travel', 'গ্রুপ ও কর্পোরেট ভ্রমণ'), B('Corporate retreats, incentive trips, study tours and MICE from Bangladesh.', 'বাংলাদেশ থেকে কর্পোরেট রিট্রিট, ইনসেনটিভ ট্রিপ, শিক্ষা সফর ও মাইস।'), 'sajek'),
        ('gift-cards', 'gift-cards.html', B('Travel gift cards', 'ট্রাভেল গিফট কার্ড'), B('Musafir gift cards from ৳5,000, valid for 2 years on any booking.', '৳৫,০০০ থেকে মুসাফির গিফট কার্ড, যেকোনো বুকিংয়ে ২ বছর মেয়াদি।'), 'maldives')]:
        render(f'pages/{tpl}.html', path, ti, de, lang=L, active=tpl, crumbs=[(HOME, 'index.html'), (ti, path)], image=im)
    rows = [(B('Price from', 'শুরুর মূল্য'), {x['slug']: bdt(x['price']) for x in DP.TOURS}),
            (B('Duration', 'সময়কাল'), {x['slug']: f"{digits(x['days'])} {t('days', 'দিন')} / {digits(x['nights'])} {t('nights', 'রাত')}" for x in DP.TOURS}),
            (B('Rating', 'রেটিং'), {x['slug']: f"★ {digits(x['rating'])} ({digits(x['reviews'])})" for x in DP.TOURS}),
            (B('Destination', 'গন্তব্য'), {x['slug']: f"{tr(x['dest'])}, {tr(x['country'])}" for x in DP.TOURS}),
            (B('Group size', 'দলের আকার'), {x['slug']: digits(x['group']) for x in DP.TOURS}),
            (B('Cancellation', 'বাতিল'), {x['slug']: tr(DP.CANCEL[x['cancel']][1]) for x in DP.TOURS}),
            (B('Highlights', 'হাইলাইট'), {x['slug']: ', '.join(tr(h) for h in x['hl'][:3]) for x in DP.TOURS})]
    render('pages/compare.html', 'compare.html', B('Compare tours', 'ট্যুর তুলনা'), B('Compare up to three tours side by side.', 'পাশাপাশি সর্বোচ্চ তিনটি ট্যুর তুলনা করুন।'), lang=L, active='tours',
           crumbs=[(HOME, 'index.html'), (B('Compare', 'তুলনা'), 'compare.html')], noindex=True, rows=rows, default='maldives-honeymoon,bali-highlights,coxs-bazar-saint-martin')
    render('pages/wishlist.html', 'wishlist.html', B('Wishlist', 'উইশলিস্ট'), B('Your saved trips.', 'আপনার সেভ করা ট্রিপ।'), lang=L, active='wishlist', noindex=True,
           crumbs=[(HOME, 'index.html'), (B('Wishlist', 'উইশলিস্ট'), 'wishlist.html')])
    for mode, path, ti in [('login', 'login.html', B('Sign in', 'সাইন ইন')), ('register', 'register.html', B('Create account', 'অ্যাকাউন্ট খুলুন')), ('forgot', 'forgot-password.html', B('Reset password', 'পাসওয়ার্ড রিসেট'))]:
        render('pages/auth.html', path, ti, B('Sign in to manage bookings, e-tickets and visa applications.', 'বুকিং, ই-টিকিট ও ভিসা আবেদন পরিচালনায় সাইন ইন করুন।'), lang=L, active='auth', noindex=True, mode=mode,
               crumbs=[(HOME, 'index.html'), (ti, path)])
    STATE['page'] = f'{L}/credits.html'
    cr = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'site', 'assets', 'img', 'credits.json')))
    cr = sorted((k, v) for k, v in cr.items() if os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'site', 'assets', 'img', k + '-sm.jpg')))
    render('pages/credits.html', 'credits.html', B('Image credits', 'ছবির ক্রেডিট'), B('Photo credits and licences.', 'ছবির ক্রেডিট ও লাইসেন্স।'), lang=L, active='credits',
           crumbs=[(HOME, 'index.html'), (B('Image credits', 'ছবির ক্রেডিট'), 'credits.html')], credits=cr)
    render('pages/brand.html', 'brand.html', B('Musafir brand sheet — logo, colours, type', 'মুসাফির ব্র্যান্ড শিট — লোগো, রং, টাইপ'), B('Musafir logo variants, colour palette, typography and usage rules.', 'মুসাফির লোগোর রূপভেদ, রঙের প্যালেট, টাইপোগ্রাফি ও ব্যবহারের নিয়ম।'),
           lang=L, active='brand', crumbs=[(HOME, 'index.html'), (B('Brand', 'ব্র্যান্ড'), 'brand.html')], noindex=True)
    render('pages/404.html', '404.html', B('Page not found', 'পাতা পাওয়া যায়নি'), B('The page you are looking for does not exist.', 'আপনি যে পাতা খুঁজছেন তা নেই।'), lang=L, noindex=True)
    groups = [(B('Holidays', 'হলিডে'), [('tours.html', B('All tours', 'সব ট্যুর')), ('holidays.html', B('Holidays by theme', 'থিম অনুযায়ী হলিডে'))] + [(f"holidays/{th['slug']}.html", th['name']) for th in DP.THEMES] + [('destinations.html', B('Destinations', 'গন্তব্য')), ('trip-planner.html', B('Trip planner', 'ট্রিপ প্ল্যানার')), ('custom-tour.html', B('Custom trip', 'কাস্টম ট্রিপ')), ('group-tours.html', B('Group tours', 'গ্রুপ ট্যুর')), ('compare.html', B('Compare tours', 'ট্যুর তুলনা'))]),
              (B('Tours', 'ট্যুর'), [(f"tours/{x['slug']}.html", x['title']) for x in DP.TOURS]),
              (B('Cruises & activities', 'ক্রুজ ও অ্যাক্টিভিটি'), [('cruises.html', B('All cruises', 'সব ক্রুজ'))] + [(f"cruises/{c['slug']}.html", c['title']) for c in DP.CRUISES] + [('activities.html', B('All activities', 'সব অ্যাক্টিভিটি'))] + [(f"activities/{a['slug']}.html", a['title']) for a in DP.ACTIVITIES]),
              (B('Destinations', 'গন্তব্য'), [(f"destinations/{d['slug']}.html", d['name']) for d in DP.DESTINATIONS]),
              (B('Flights, hotels & visa', 'ফ্লাইট, হোটেল ও ভিসা'), [('flights.html', B('Flights', 'ফ্লাইট')), ('hotels.html', B('Hotels', 'হোটেল'))] + [(f"hotels/{h['slug']}.html", h['name']) for h in DP.HOTELS] + [('visa.html', B('Visa services', 'ভিসা সেবা'))] + [(f"visa/{v['slug']}.html", v['country']) for v in DP.VISAS] + [('insurance.html', B('Travel insurance', 'ট্রাভেল ইন্স্যুরেন্স'))]),
              (B('Company', 'প্রতিষ্ঠান'), [('about.html', B('About', 'আমাদের কথা')), ('team.html', B('Team', 'টিম')), ('careers.html', B('Careers', 'ক্যারিয়ার')), ('reviews.html', B('Reviews', 'রিভিউ')), ('gallery.html', B('Gallery', 'গ্যালারি')), ('blog.html', B('Blog', 'ব্লগ')), ('offers.html', B('Offers', 'অফার')), ('gift-cards.html', B('Gift cards', 'গিফট কার্ড')), ('contact.html', B('Contact', 'যোগাযোগ')), ('brand.html', B('Brand sheet', 'ব্র্যান্ড শিট')), ('credits.html', B('Image credits', 'ছবির ক্রেডিট'))]),
              (B('Blog', 'ব্লগ'), [(f"blog/{p['slug']}.html", p['title']) for p in DP.BLOG]),
              (B('Help & legal', 'সহায়তা ও আইনি'), [('faq.html', B('FAQ', 'প্রশ্নোত্তর')), ('terms.html', B('Terms', 'শর্তাবলি')), ('privacy.html', B('Privacy', 'গোপনীয়তা')), ('refund-policy.html', B('Refund policy', 'রিফান্ড নীতি')), ('login.html', B('Sign in', 'সাইন ইন')), ('register.html', B('Register', 'রেজিস্টার')), ('wishlist.html', B('Wishlist', 'উইশলিস্ট'))])]
    render('pages/sitemap.html', 'sitemap.html', B('Sitemap', 'সাইটম্যাপ'), B('All pages on musafir.com.bd.', 'musafir.com.bd-এর সব পাতা।'), lang=L, active='sitemap',
           crumbs=[(HOME, 'index.html'), (B('Sitemap', 'সাইটম্যাপ'), 'sitemap.html')], groups=groups)
