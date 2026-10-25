from core import B, tr, t, digits, img, date, abs_url, BASE_URL, STATE
import data_public as DP
import json

def build(render, L):
    HOME = B('Home', 'হোম')
    render('pages/home.html', 'index.html',
           B('Musafir — Holidays, Cruises, Flights & Visa from Bangladesh', 'মুসাফির — বাংলাদেশ থেকে হলিডে, ক্রুজ, ফ্লাইট ও ভিসা'),
           B('Book holiday packages, cruises, activities, air tickets, hotels and visas from Dhaka. Free-cancellation options, easy installments with bKash & Nagad, 24/7 support.',
             'ঢাকা থেকে হলিডে প্যাকেজ, ক্রুজ, অ্যাক্টিভিটি, এয়ার টিকেট, হোটেল ও ভিসা বুক করুন। ফ্রি বাতিলের সুবিধা, বিকাশ ও নগদে সহজ কিস্তি, ২৪/৭ সাপোর্ট।'),
           lang=L, active='home', ld=[{"@context": "https://schema.org", "@type": "WebSite", "name": "Musafir", "url": BASE_URL + "/" + L,
               "inLanguage": L, "potentialAction": {"@type": "SearchAction", "target": BASE_URL + "/" + L + "/tours?q={search_term_string}", "query-input": "required name=search_term_string"}},
               {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": tr(q), "acceptedAnswer": {"@type": "Answer", "text": tr(a)}} for q, a, c in DP.FAQS[:6]]}])
    build_tours(render, L); build_dest(render, L); build_travel(render, L); build_booking(render, L); build_extras(render, L)

import datetime as _dt
def _deps(x):
    base = _dt.date(2026, 11, 6); out = []
    seats = [12, 3, 18, 7, 2, 15]
    for i in range(6):
        d = base + _dt.timedelta(days=17 * i + (hash(x['slug']) % 5))
        r = d + _dt.timedelta(days=x['days'] - 1)
        p = x['price'] + (0 if i in (0, 3) else (1500 if x['price'] < 50000 else 6000) * (1 if i % 2 else -1 if i == 5 else 2))
        out.append(dict(d=d.isoformat(), r=r.isoformat(), s=seats[i], p=max(p, int(x['price'] * 0.9))))
    return out

def _itin(x):
    res = []
    for d in x['itin']:
        if d['d'] is None:
            d = dict(t=d['t'], d=B(f"After breakfast, {d['t']['en'][0].lower() + d['t']['en'][1:]} with your Musafir guide. Free time in the evening; overnight at the hotel.",
                                   f"সকালের নাশতার পর মুসাফির গাইডের সাথে {d['t']['bn']}। সন্ধ্যা অবসর; হোটেলে রাত্রিযাপন।"))
        res.append(d)
    return res

def _incl(x):
    i = [B('Accommodation in handpicked hotels (twin sharing)', 'বাছাই করা হোটেলে থাকা (দুজনের রুম)'), B('Daily breakfast and selected dinners', 'প্রতিদিন নাশতা ও নির্দিষ্ট রাতের খাবার'),
         B('All transfers and sightseeing by private AC vehicle', 'প্রাইভেট এসি গাড়িতে সব ট্রান্সফার ও দর্শনীয় স্থান ভ্রমণ'), B('English/Bangla-speaking guide', 'ইংরেজি/বাংলাভাষী গাইড'), B('Entry tickets as per itinerary', 'ভ্রমণসূচি অনুযায়ী প্রবেশ টিকিট'), B('VAT and service charges', 'ভ্যাট ও সার্ভিস চার্জ')]
    if x['flight']: i.insert(0, B('Return economy air ticket from Dhaka', 'ঢাকা থেকে রিটার্ন ইকোনমি এয়ার টিকেট'))
    if x['visa']: i.append(B('Visa processing assistance (fee extra)', 'ভিসা প্রসেসিং সহায়তা (ফি আলাদা)'))
    e = [B('Lunch and personal expenses', 'দুপুরের খাবার ও ব্যক্তিগত খরচ'), B('Optional activities and tips', 'ঐচ্ছিক কার্যক্রম ও বখশিশ'), B('Travel insurance (add-on available)', 'ভ্রমণ বিমা (অ্যাড-অন হিসেবে নেওয়া যায়)')]
    if not x['flight']: e.insert(0, B('Air tickets (can be added)', 'এয়ার টিকেট (যোগ করা যায়)'))
    if x['visa']: e.append(B('Embassy visa fee', 'দূতাবাসের ভিসা ফি'))
    return i, e

def _overview(x):
    return B(f"Discover {x['dest']['en']} on a {x['days']}-day journey designed by our in-house experts. "
             f"This {('domestic' if x['region']=='bd' else 'international')} package balances must-see sights with time to relax, uses vetted hotels and private transport, "
             "and comes with a dedicated Musafir coordinator on WhatsApp from booking to homecoming.",
             f"আমাদের নিজস্ব বিশেষজ্ঞদের সাজানো {x['days']} দিনের ভ্রমণে ঘুরে দেখুন {x['dest']['bn']}। "
             f"এই {('দেশীয়' if x['region']=='bd' else 'আন্তর্জাতিক')} প্যাকেজে অবশ্যই-দেখার জায়গাগুলোর পাশাপাশি বিশ্রামের সময়ও রাখা হয়েছে; যাচাই করা হোটেল, প্রাইভেট পরিবহন "
             "এবং বুকিং থেকে দেশে ফেরা পর্যন্ত হোয়াটসঅ্যাপে একজন নিবেদিত মুসাফির সমন্বয়ক থাকছেন।".replace(str(x['days']), str(x['days']).translate(str.maketrans('0123456789','০১২৩৪৫৬৭৮৯'))))

def _stops(x, L):
    st = []
    for d in x['itin']:
        lab = d['t'][L].split('→')[-1].split(',')[0].split(' & ')[0].split(' ও ')[0].strip()
        if not st or st[-1] != lab: st.append(lab)
    return st[:7]

def build_tours(render, L):
    HOME = B('Home', 'হোম'); TOURS = B('Tours', 'ট্যুর')
    render('pages/tours.html', 'tours.html', B('Tour packages from Bangladesh — domestic & international', 'বাংলাদেশ থেকে ট্যুর প্যাকেজ — দেশীয় ও আন্তর্জাতিক'),
           B("Compare 16 tour packages: Cox's Bazar, Sajek, Sundarbans, Maldives, Türkiye, Bali, Dubai and more. Filter by budget, duration and travel style.",
             'কক্সবাজার, সাজেক, সুন্দরবন, মালদ্বীপ, তুরস্ক, বালি, দুবাইসহ ১৬টি ট্যুর প্যাকেজ তুলনা করুন। বাজেট, সময়কাল ও ভ্রমণের ধরন অনুযায়ী ফিল্টার করুন।'),
           lang=L, active='tours', crumbs=[(HOME, 'index.html'), (TOURS, 'tours.html')], image='bali',
           ld=[{"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": abs_url(f"tours/{x['slug']}.html"), "name": tr(x['title'])} for i, x in enumerate(DP.TOURS)]}])
    for x in DP.TOURS:
        deps = _deps(x); incl, excl = _incl(x)
        sim = [s for s in DP.TOURS if s['slug'] != x['slug'] and (s['region'] == x['region'] or set(s['cats']) & set(x['cats']))][:4]
        ld = {"@context": "https://schema.org", "@type": ["TouristTrip", "Product"], "name": tr(x['title']), "description": tr(_overview(x)),
              "image": [f"{BASE_URL}/assets/img/{k}.jpg" for k in (x['gallery'] or (x['img'],))], "touristType": x['cats'], "brand": {"@type": "Brand", "name": "Musafir"},
              "sku": "MSF-" + x['slug'].upper()[:12], "provider": {"@id": BASE_URL + "/#org"},
              "itinerary": {"@type": "ItemList", "numberOfItems": len(x['itin']), "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": {"@type": "TouristAttraction", "name": tr(d['t'])}} for i, d in enumerate(x['itin'])]},
              "offers": {"@type": "AggregateOffer", "priceCurrency": "BDT", "lowPrice": min(d['p'] for d in deps), "highPrice": max(d['p'] for d in deps), "offerCount": len(deps), "availability": "https://schema.org/InStock", "url": abs_url(f"tours/{x['slug']}.html")},
              "aggregateRating": {"@type": "AggregateRating", "ratingValue": x['rating'], "reviewCount": x['reviews'], "bestRating": 5},
              "review": [{"@type": "Review", "author": {"@type": "Person", "name": tr(r['name'])}, "datePublished": r['date'], "reviewRating": {"@type": "Rating", "ratingValue": r['rating'], "bestRating": 5}, "reviewBody": tr(r['text'])} for r in DP.REVIEWS[:2]]}
        render('pages/tour.html', f"tours/{x['slug']}.html", B(f"{x['title']['en']} — {x['days']} days from {x['price']:,} BDT".replace(',', ','), f"{x['title']['bn']} — {x['days']} দিন"),
               B(f"{x['days']}D/{x['nights']}N {x['title']['en']}: {', '.join(h['en'] for h in x['hl'])}. Book online with installments.", f"{x['title']['bn']}: {', '.join(h['bn'] for h in x['hl'])}। কিস্তিতে অনলাইনে বুক করুন।"),
               lang=L, active='tours', crumbs=[(HOME, 'index.html'), (TOURS, 'tours.html'), (x['title'], f"tours/{x['slug']}.html")], image=x['img'], og_type='product', body_class='has-bookbar',
               ld=[ld], tour=x, deps=deps, incl=incl, excl=excl, itin=_itin(x), overview=_overview(x), stops=_stops(x, L), similar=sim)

def build_dest(render, L):
    HOME = B('Home', 'হোম'); DS = B('Destinations', 'গন্তব্য')
    render('pages/destinations.html', 'destinations.html', B('Travel destinations — Bangladesh & worldwide', 'ভ্রমণ গন্তব্য — বাংলাদেশ ও বিশ্বজুড়ে'),
           B("Explore Cox's Bazar, Sajek, Sylhet, the Sundarbans, Maldives, Türkiye, Bali, Dubai, Nepal, Singapore and Malaysia with Musafir.", 'মুসাফিরের সাথে ঘুরে দেখুন কক্সবাজার, সাজেক, সিলেট, সুন্দরবন, মালদ্বীপ, তুরস্ক, বালি, দুবাই, নেপাল, সিঙ্গাপুর ও মালয়েশিয়া।'),
           lang=L, active='dest', crumbs=[(HOME, 'index.html'), (DS, 'destinations.html')], image='nepal')
    for d in DP.DESTINATIONS:
        tours = [DP.TOUR[s] for s in DP.DEST_TOURS.get(d['slug'], []) if s in DP.TOUR]
        if tours and len(tours) < 2:
            tours += [x for x in DP.TOURS if x['region'] == d['region'] and x not in tours][:2 - len(tours) + 1]
        render('pages/destination.html', f"destinations/{d['slug']}.html", B(f"{d['name']['en']} travel guide & tour packages", f"{d['name']['bn']} ভ্রমণ গাইড ও ট্যুর প্যাকেজ"), d['desc'],
               lang=L, active='dest', crumbs=[(HOME, 'index.html'), (DS, 'destinations.html'), (d['name'], f"destinations/{d['slug']}.html")], image=d['img'],
               ld=[{"@context": "https://schema.org", "@type": "TouristDestination", "name": tr(d['name']), "description": tr(d['desc']), "image": f"{BASE_URL}/assets/img/{d['img']}.jpg", "includesAttraction": [{"@type": "TouristAttraction", "name": tr(x)} for x in d['things']]}],
               dest=d, tours=tours, acts=[a for a in DP.ACTIVITIES if any(w in a['city']['en'] for w in d['name']['en'].replace('&', ' ').split() if len(w) > 3) or a['city']['en'].split(',')[0] in d['name']['en']][:4])

ISO = {'thailand': 'TH', 'malaysia': 'MY', 'singapore': 'SG', 'uae': 'AE', 'vietnam': 'VN', 'turkey': 'TR', 'india': 'IN', 'schengen': 'EU', 'japan': 'JP', 'egypt': 'EG'}
VISA_FAQ = [
    (B('Do you guarantee visa approval?', 'ভিসা অনুমোদনের নিশ্চয়তা দেন কি?'), B('No agency can guarantee approval — the decision rests with the embassy. We maximise your chances with a thorough document check and a strong cover letter.', 'কোনো এজেন্সিই অনুমোদনের নিশ্চয়তা দিতে পারে না — সিদ্ধান্ত দূতাবাসের। পূর্ণাঙ্গ কাগজ যাচাই ও শক্তিশালী কভার লেটারের মাধ্যমে আমরা আপনার সম্ভাবনা সর্বোচ্চ করি।'), 'visa'),
    (B('How much bank balance do I need?', 'ব্যাংকে কত টাকা থাকা দরকার?'), B('As a rule of thumb, at least ৳1,50,000–3,00,000 per traveller with steady transactions for the last 6 months, depending on the country.', 'সাধারণত দেশভেদে জনপ্রতি অন্তত ৳১,৫০,০০০–৩,০০,০০০ এবং গত ৬ মাসে নিয়মিত লেনদেন থাকা উচিত।'), 'visa'),
    (B('Can I track my application?', 'আবেদনের অবস্থা কি ট্র্যাক করা যায়?'), B('Yes — every application gets a live tracker in My Account, plus SMS at each stage.', 'হ্যাঁ — প্রতিটি আবেদনের জন্য মাই অ্যাকাউন্টে লাইভ ট্র্যাকার এবং প্রতিটি ধাপে এসএমএস পাবেন।'), 'visa'),
]
HOTEL_ABOUT = B('A guest favourite with warm Bangladeshi hospitality, spotless rooms and an unbeatable location. Musafir guests enjoy early check-in on request, great dining and 24-hour support from our local team.',
                'আন্তরিক আতিথেয়তা, ঝকঝকে রুম আর অসাধারণ অবস্থানের জন্য অতিথিদের প্রিয়। মুসাফিরের অতিথিরা অনুরোধে আর্লি চেক-ইন, চমৎকার খাবার ও আমাদের স্থানীয় টিমের ২৪ ঘণ্টা সহায়তা পান।')

HG = {'ocean-pearl-resort': 'coxsbazar', 'cloud-valley-resort': 'rangamati', 'grand-tea-valley': 'srimangal', 'himalaya-view-pokhara': 'nepal', 'ubud-jungle-villas': 'bali',
      'bosphorus-boutique': 'turkey2', 'lagoon-water-villas': 'santorini', 'marina-skyline-dubai': 'plane'}
def _hgal(h):
    g = [h['img'], 'hotelroom', 'resort', HG.get(h['slug'], 'hotelroom'), 'maldives', 'bali', 'santorini']
    out = []
    for k in g:
        if k not in out: out.append(k)
    return out[:5]

def build_travel(render, L):
    HOME = B('Home', 'হোম')
    render('pages/flights.html', 'flights.html', B('Cheap flights & air tickets from Bangladesh', 'বাংলাদেশ থেকে সাশ্রয়ী বিমান টিকেট'),
           B('Book domestic and international air tickets: Biman, US-Bangla, Emirates, Saudia, Qatar and more. Pay with bKash, Nagad or card EMI.', 'দেশি-বিদেশি এয়ার টিকেট বুক করুন: বিমান, ইউএস-বাংলা, এমিরেটস, সৌদিয়া, কাতারসহ আরও অনেক। বিকাশ, নগদ বা কার্ড ইএমআইতে পরিশোধ।'),
           lang=L, active='flights', crumbs=[(HOME, 'index.html'), (B('Flights', 'ফ্লাইট'), 'flights.html')], image='plane')
    render('pages/hotels.html', 'hotels.html', B('Hotels & resorts — best rates in Bangladesh and abroad', 'হোটেল ও রিসোর্ট — দেশে-বিদেশে সেরা রেট'),
           B("Book hotels in Cox's Bazar, Sajek, Srimangal, Pokhara, Bali, Istanbul, Maldives and Dubai with free cancellation.", 'কক্সবাজার, সাজেক, শ্রীমঙ্গল, পোখারা, বালি, ইস্তাম্বুল, মালদ্বীপ ও দুবাইয়ে ফ্রি বাতিলসহ হোটেল বুক করুন।'),
           lang=L, active='hotels', crumbs=[(HOME, 'index.html'), (B('Hotels', 'হোটেল'), 'hotels.html')], image='resort')
    for h in DP.HOTELS:
        rooms = [dict(name=B('Deluxe Twin Room', 'ডিলাক্স টুইন রুম'), bed=B('2 single beds', '২টি সিঙ্গেল বেড'), occ=2, size=28, price=h['price'], bf=h['breakfast'], ref=True, left=3, img='hotelroom'),
                 dict(name=B('Premium King — view', 'প্রিমিয়াম কিং — ভিউ'), bed=B('1 king bed', '১টি কিং বেড'), occ=2, size=34, price=int(h['price'] * 1.3), bf=True, ref=True, left=0, img=h['img']),
                 dict(name=B('Family Suite', 'ফ্যামিলি স্যুট'), bed=B('1 king + 2 single', '১টি কিং + ২টি সিঙ্গেল'), occ=4, size=52, price=int(h['price'] * 1.85), bf=True, ref=False, left=2, img='resort')]
        render('pages/hotel.html', f"hotels/{h['slug']}.html", B(f"{h['name']['en']}, {h['city']['en']} — {h['stars']}-star hotel", f"{h['name']['bn']}, {h['city']['bn']} — {h['stars']} তারকা হোটেল"),
               B(f"{h['name']['en']}: {h['dist']['en']}. Rated {h['rating']}/10 by {h['reviews']:,} guests. From {h['price']:,} BDT per night.", f"{h['name']['bn']}: {h['dist']['bn']}।"),
               lang=L, active='hotels', crumbs=[(HOME, 'index.html'), (B('Hotels', 'হোটেল'), 'hotels.html'), (h['name'], f"hotels/{h['slug']}.html")], image=h['img'],
               ld=[{"@context": "https://schema.org", "@type": "Hotel", "name": tr(h['name']), "image": f"{BASE_URL}/assets/img/{h['img']}.jpg", "starRating": {"@type": "Rating", "ratingValue": h['stars']},
                    "address": {"@type": "PostalAddress", "addressLocality": tr(h['city'])}, "priceRange": f"BDT {h['price']}–{int(h['price']*1.85)}",
                    "aggregateRating": {"@type": "AggregateRating", "ratingValue": h['rating'], "bestRating": 10, "reviewCount": h['reviews']},
                    "amenityFeature": [{"@type": "LocationFeatureSpecification", "name": tr(DP.AMENITY[a][1]), "value": True} for a in h['amen']]}],
               hotel=h, rooms=rooms, about=HOTEL_ABOUT, gallery=_hgal(h))
    render('pages/visas.html', 'visa.html', B('Visa processing from Bangladesh — 40+ countries', 'বাংলাদেশ থেকে ভিসা প্রসেসিং — ৪০+ দেশ'),
           B('Thailand, Malaysia, Singapore, Dubai, Vietnam, Türkiye, India, Schengen, Japan and Egypt visa from Dhaka. Document checklist, fees and processing time.', 'ঢাকা থেকে থাইল্যান্ড, মালয়েশিয়া, সিঙ্গাপুর, দুবাই, ভিয়েতনাম, তুরস্ক, ভারত, শেনজেন, জাপান ও মিশরের ভিসা। কাগজপত্র, ফি ও সময়।'),
           lang=L, active='visa', crumbs=[(HOME, 'index.html'), (B('Visa', 'ভিসা'), 'visa.html')], image='istanbul', ISO=ISO)
    for v in DP.VISAS:
        render('pages/visa.html', f"visa/{v['slug']}.html", B(f"{v['country']['en']} visa from Bangladesh — documents, fee & processing time", f"বাংলাদেশ থেকে {v['country']['bn']} ভিসা — কাগজপত্র, ফি ও সময়"),
               B(f"{v['country']['en']} {v['vtype']['en']} for Bangladeshi passport holders: {v['days']['en']}, total fee {v['fee']:,} BDT. Full document checklist.", f"বাংলাদেশি পাসপোর্টধারীদের জন্য {v['country']['bn']} {v['vtype']['bn']}: {v['days']['bn']}।"),
               lang=L, active='visa', crumbs=[(HOME, 'index.html'), (B('Visa', 'ভিসা'), 'visa.html'), (v['country'], f"visa/{v['slug']}.html")], image=v['img'],
               ld=[{"@context": "https://schema.org", "@type": "Service", "serviceType": "Visa processing", "name": tr(v['country']) + ' — ' + tr(v['vtype']), "provider": {"@id": BASE_URL + "/#org"}, "areaServed": "BD",
                    "offers": {"@type": "Offer", "price": v['fee'], "priceCurrency": "BDT"}},
                   {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": tr(q), "acceptedAnswer": {"@type": "Answer", "text": tr(a)}} for q, a, c in VISA_FAQ]}],
               visa=v, ISO=ISO, faqs=VISA_FAQ)

INV = dict(no='INV-2026-004581', ref='MSF-26-10458', date='2026-10-25', due='2026-11-17', cust=B('Rafiqul Islam', 'রফিকুল ইসলাম'), phone='01711-234567', email='rafiq@example.com', disc=0.0, method='bKash',
           items=[(B('Turkey Classic: Istanbul, Cappadocia & Pamukkale — adult (twin)', 'তুরস্ক ক্লাসিক: ইস্তাম্বুল, কাপাদোকিয়া ও পামুক্কালে — প্রাপ্তবয়স্ক (টুইন)'), 2, 165000),
                  (B('Travel insurance', 'ভ্রমণ বিমা'), 2, 1200), (B('Airport pickup, Dhaka', 'এয়ারপোর্ট পিকআপ, ঢাকা'), 1, 1800)], paid=100320)

def build_booking(render, L):
    import json as _j
    STATE['lang'] = L; STATE['page'] = f'{L}/booking.html'
    cat = {}
    for x in DP.TOURS: cat['tour:' + x['slug']] = dict(title=tr(x['title']), sub=f"{digits(x['days'])} {t('days', 'দিন')} · {tr(x['dest'])}", img=img(x['img'], True), price=x['price'])
    for c in DP.CRUISES: cat['cruise:' + c['slug']] = dict(title=tr(c['title']), sub=f"{digits(c['nights'])} {t('nights', 'রাত')} · {c['ship']}", img=img(c['img'], True), price=c['price'])
    for a in DP.ACTIVITIES: cat['activity:' + a['slug']] = dict(title=tr(a['title']), sub=f"{tr(a['dur'])} · {tr(a['city'])}", img=img(a['img'], True), price=a['price'])
    for h in DP.HOTELS: cat['hotel:' + h['slug']] = dict(title=tr(h['name']), sub=f"{tr(h['city'])} · {t('3 nights', '৩ রাত')}", img=img(h['img'], True), price=h['price'] * 3)
    for f in DP.FLIGHTS: cat['flight:' + f['no'].replace(' ', '')] = dict(title=f"{f['no']} · {t('Dhaka → Dubai', 'ঢাকা → দুবাই')}", sub=f"{date('2026-12-12')} · {digits(f['dep'])}–{digits(f['arr'])}", img=img('plane', True), price=f['price'])
    HOME = B('Home', 'হোম')
    render('pages/booking.html', 'booking.html', B('Secure checkout', 'নিরাপদ চেকআউট'), B('Complete your Musafir booking in 4 easy steps.', '৪টি সহজ ধাপে মুসাফির বুকিং সম্পন্ন করুন।'),
           lang=L, active='', crumbs=[(HOME, 'index.html'), (B('Checkout', 'চেকআউট'), 'booking.html')], noindex=True, catalog=_j.dumps(cat, ensure_ascii=False).replace('</', '<\\/'))
    render('pages/booking-confirmed.html', 'booking-confirmed.html', B('Booking confirmed', 'বুকিং নিশ্চিত'), B('Your Musafir booking is confirmed.', 'আপনার মুসাফির বুকিং নিশ্চিত হয়েছে।'),
           lang=L, active='', noindex=True, inv=INV)


def _prod_ld(name, desc, image, sku, price, rating, reviews, url, kind="TouristTrip", extra=None):
    d = {"@context": "https://schema.org", "@type": ["Product", kind], "name": name, "description": desc, "image": [f"{BASE_URL}/assets/img/{image}.jpg"],
         "sku": sku, "brand": {"@type": "Brand", "name": "Musafir"}, "provider": {"@id": BASE_URL + "/#org"},
         "offers": {"@type": "Offer", "priceCurrency": "BDT", "price": price, "availability": "https://schema.org/InStock", "url": url, "validFrom": "2026-10-01"},
         "aggregateRating": {"@type": "AggregateRating", "ratingValue": rating, "reviewCount": reviews, "bestRating": 5}}
    if extra: d.update(extra)
    return d


def _itemlist(items):
    return {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": abs_url(h), "name": n} for i, (n, h) in enumerate(items)]}


def build_extras(render, L):
    HOME = B('Home', 'হোম'); HOL = B('Holidays', 'হলিডে'); CR = B('Cruises', 'ক্রুজ'); AC = B('Activities', 'অ্যাক্টিভিটি')
    STATE['lang'] = L
    # holidays by theme
    render('pages/holidays.html', 'holidays.html', B('Holidays by theme — honeymoon, family, adventure, beach & more', 'থিম অনুযায়ী হলিডে — হানিমুন, পারিবারিক, অ্যাডভেঞ্চার, সৈকত ও আরও'),
           B('Choose a travel style first: honeymoon, family, adventure, beach, heritage or wildlife holidays from Bangladesh with transparent BDT prices.',
             'আগে ভ্রমণের ধরন বাছুন: বাংলাদেশ থেকে হানিমুন, পারিবারিক, অ্যাডভেঞ্চার, সৈকত, ঐতিহ্য বা বন্যপ্রাণী হলিডে — স্বচ্ছ টাকায় মূল্য।'),
           lang=L, active='holidays', crumbs=[(HOME, 'index.html'), (HOL, 'holidays.html')], image='santorini',
           ld=[_itemlist([(tr(th['name']), f"holidays/{th['slug']}.html") for th in DP.THEMES])])
    for th in DP.THEMES:
        tours = [x for x in DP.TOURS if th['cat'] in x['cats']]
        if len(tours) < 3:
            tours += [x for x in DP.TOURS if x not in tours][:3 - len(tours)]
        dests = {d for x in tours for d in [s for s, v in DP.DEST_TOURS.items() if x['slug'] in v]}
        acts = [a for a in DP.ACTIVITIES if a['dest'] in dests][:4]
        render('pages/theme.html', f"holidays/{th['slug']}.html", B(f"{th['name']['en']} packages from Bangladesh", f"বাংলাদেশ থেকে {th['name']['bn']} প্যাকেজ"),
               B(f"{th['tag']['en']} {len(tours)} curated trips with prices in BDT and easy installments.", f"{th['tag']['bn']} টাকায় মূল্য ও সহজ কিস্তিসহ {len(tours)}টি বাছাই করা ট্রিপ।"),
               lang=L, active='holidays', crumbs=[(HOME, 'index.html'), (HOL, 'holidays.html'), (th['name'], f"holidays/{th['slug']}.html")], image=th['img'],
               ld=[_itemlist([(tr(x['title']), f"tours/{x['slug']}.html") for x in tours])], th=th, tours=tours, acts=acts)
    # cruises
    render('pages/cruises.html', 'cruises.html', B('Cruise holidays from Bangladesh — Asia, Gulf, Europe & Sundarbans', 'বাংলাদেশ থেকে ক্রুজ হলিডে — এশিয়া, উপসাগর, ইউরোপ ও সুন্দরবন'),
           B('Compare ocean, island and river cruises with cabins from BDT, port taxes included, visa and flights to the port arranged by Musafir.',
             'সমুদ্র, দ্বীপ ও নদী ক্রুজ তুলনা করুন — টাকায় কেবিন মূল্য, বন্দর কর অন্তর্ভুক্ত, ভিসা ও বন্দর পর্যন্ত ফ্লাইট মুসাফির ব্যবস্থা করে।'),
           lang=L, active='cruises', crumbs=[(HOME, 'index.html'), (CR, 'cruises.html')], image='cruise',
           ld=[_itemlist([(tr(c['title']), f"cruises/{c['slug']}.html") for c in DP.CRUISES])])
    for c in DP.CRUISES:
        n = len(c['ports'])
        pdays = [round(i * c['nights'] / max(n - 1, 1)) + 1 for i in range(n)]
        url = abs_url(f"cruises/{c['slug']}.html")
        ld = _prod_ld(tr(c['title']), f"{c['nights']}-night cruise on {c['ship']} ({c['line']}) from {tr(c['port'])}.", c['img'], 'MSF-CR-' + c['slug'][:10].upper(),
                      c['price'], c['rating'], c['reviews'], url, "BoatTrip",
                      {"departureTime": c['depart'], "itinerary": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": tr(p)} for i, p in enumerate(c['ports'])]}})
        render('pages/cruise.html', f"cruises/{c['slug']}.html", B(f"{c['title']['en']} — {c['nights']} nights from {c['price']:,} BDT", f"{c['title']['bn']} — {c['nights']} রাত"),
               B(f"{c['nights']}-night cruise on {c['ship']}: {', '.join(p['en'] for p in c['ports'])}. Cabins, prices and booking with Musafir.",
                 f"{c['ship']}-এ {c['nights']} রাতের ক্রুজ: {', '.join(p['bn'] for p in c['ports'])}। কেবিন, মূল্য ও বুকিং — মুসাফির।"),
               lang=L, active='cruises', crumbs=[(HOME, 'index.html'), (CR, 'cruises.html'), (c['title'], f"cruises/{c['slug']}.html")], image=c['img'], og_type='product',
               body_class='has-bookbar', ld=[ld], cruise=c, port_days=pdays)
    # activities
    render('pages/activities.html', 'activities.html', B('Things to do — tours, tickets & experiences', 'যা যা করবেন — ট্যুর, টিকিট ও অভিজ্ঞতা'),
           B('Book day tours, boat rides, attraction tickets, food walks and airport transfers in Bangladesh and abroad. Instant confirmation, free cancellation on most.',
             'বাংলাদেশ ও বিদেশে ডে-ট্যুর, নৌভ্রমণ, আকর্ষণের টিকিট, ফুড ওয়াক ও এয়ারপোর্ট ট্রান্সফার বুক করুন। তাৎক্ষণিক নিশ্চিতকরণ, বেশিরভাগে ফ্রি বাতিল।'),
           lang=L, active='activities', crumbs=[(HOME, 'index.html'), (AC, 'activities.html')], image='cappadocia',
           ld=[_itemlist([(tr(a['title']), f"activities/{a['slug']}.html") for a in DP.ACTIVITIES])])
    pool = ['resort', 'bali', 'santorini', 'nepal', 'maldives', 'coxsbazar', 'turkey2', 'sundarbans']
    for a in DP.ACTIVITIES:
        dimg = next((d['img'] for d in DP.DESTINATIONS if d['slug'] == a['dest']), None)
        gal = [k for k in [dimg] + pool if k and k != a['img']][:2]
        more = [m for m in DP.ACTIVITIES if m['slug'] != a['slug'] and (m['cat'] == a['cat'] or m['region'] == a['region'])][:3]
        slots = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'] if a['cat'] == 'transfer' else (['04:30', '05:30', '06:30'] if 'balloon' in a['slug'] else ['09:00', '13:00', '16:00'])
        url = abs_url(f"activities/{a['slug']}.html")
        ld = _prod_ld(tr(a['title']), '; '.join(tr(h) for h in a['hl']), a['img'], 'MSF-AC-' + a['slug'][:10].upper(), a['price'], a['rating'], a['reviews'], url)
        render('pages/activity.html', f"activities/{a['slug']}.html", B(f"{a['title']['en']} — from {a['price']:,} BDT", f"{a['title']['bn']} — {a['price']:,} টাকা থেকে"),
               B(f"{a['title']['en']} in {a['city']['en']}: {', '.join(h['en'] for h in a['hl'])}. {DP.CANCEL[a['cancel']][1]['en']}.",
                 f"{a['city']['bn']}-এ {a['title']['bn']}: {', '.join(h['bn'] for h in a['hl'])}। {DP.CANCEL[a['cancel']][1]['bn']}।"),
               lang=L, active='activities', crumbs=[(HOME, 'index.html'), (AC, 'activities.html'), (a['title'], f"activities/{a['slug']}.html")], image=a['img'], og_type='product',
               body_class='has-bookbar', ld=[ld], act=a, gal=gal, more=more, slots=slots)
    # trip planner
    STATE['lang'] = L; STATE['page'] = f'{L}/trip-planner.html'
    pj = {"dest": {d['slug']: {"name": tr(d['name']), "img": img(d['img'], True), "land": DP.PLAN_COST[d['slug']][0], "air": DP.PLAN_COST[d['slug']][1],
                               "def": 3 if d['region'] == 'bd' else 4} for d in DP.DESTINATIONS}}
    render('pages/trip-planner.html', 'trip-planner.html', B('Trip planner — build a custom itinerary with live budget', 'ট্রিপ প্ল্যানার — লাইভ বাজেটসহ কাস্টম ভ্রমণসূচি'),
           B('Pick destinations, set days, choose hotel level and add experiences — see an instant BDT estimate and get a free quote from a Musafir expert.',
             'গন্তব্য বাছুন, দিন ঠিক করুন, হোটেলের মান ও অভিজ্ঞতা যোগ করুন — সাথে সাথে টাকায় আনুমানিক খরচ দেখুন ও মুসাফির বিশেষজ্ঞের কাছ থেকে ফ্রি কোটেশন নিন।'),
           lang=L, active='planner', crumbs=[(HOME, 'index.html'), (B('Trip planner', 'ট্রিপ প্ল্যানার'), 'trip-planner.html')], image='bali',
           ld=[{"@context": "https://schema.org", "@type": "Service", "name": "Custom trip planning", "serviceType": "Travel itinerary planning", "provider": {"@id": BASE_URL + "/#org"},
                "areaServed": "BD", "offers": {"@type": "Offer", "price": 0, "priceCurrency": "BDT", "description": "Free quote"}}],
           planner_json=json.dumps(pj, ensure_ascii=False).replace('</', '<\\/'), PLAN_COST=DP.PLAN_COST)
