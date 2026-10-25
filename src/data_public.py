# -*- coding: utf-8 -*-
"""Dummy content for the Musafir mock. All prices in BDT. Bilingual via B(en, bn)."""
from core import B

COMPANY = dict(
    name=B('Musafir Tours & Travels Ltd.', 'মুসাফির ট্যুরস অ্যান্ড ট্রাভেলস লিমিটেড'),
    short='Musafir', tagline=B('Every journey, with care', 'প্রতিটি যাত্রায় আন্তরিক যত্ন'),
    hotline='09612-787878', hotline_tel='+8809612787878', whatsapp='+880 1711-787878', wa='8801711787878',
    email='hello@musafir.com.bd',
    address=B('Level 9, Musafir Tower, 42 Kemal Ataturk Avenue, Banani, Dhaka 1213', 'লেভেল ৯, মুসাফির টাওয়ার, ৪২ কামাল আতাতুর্ক অ্যাভিনিউ, বনানী, ঢাকা ১২১৩'),
    branches=[B('Chattogram: GEC Circle, Chattogram 4000', 'চট্টগ্রাম: জিইসি মোড়, চট্টগ্রাম ৪০০০'), B('Sylhet: Zindabazar, Sylhet 3100', 'সিলেট: জিন্দাবাজার, সিলেট ৩১০০')],
    hours=B('Sat–Thu, 9:30 AM – 8:00 PM · Hotline 24/7', 'শনি–বৃহস্পতি, সকাল ৯:৩০ – রাত ৮:০০ · হটলাইন ২৪/৭'),
    licences=[('IATA', '42-3 1234 5'), ('ATAB', '3456'), ('TOAB', '0789'), (B('Tourism Board Reg.', 'ট্যুরিজম বোর্ড নিবন্ধন'), 'BTB-2214')],
    founded=2012,
)

NAV_TOURS = [
    (B('Bangladesh Tours', 'দেশের ভেতরে ট্যুর'), [('tours.html?region=bd', B("Cox's Bazar & Saint Martin", "কক্সবাজার ও সেন্ট মার্টিন")), ('tours/sajek-rangamati.html', B('Sajek & Rangamati', 'সাজেক ও রাঙামাটি')), ('tours/sylhet-srimangal.html', B('Sylhet & Srimangal', 'সিলেট ও শ্রীমঙ্গল')), ('tours/sundarbans-cruise.html', B('Sundarbans Cruise', 'সুন্দরবন ক্রুজ')), ('tours/bandarban-nilgiri.html', B('Bandarban Trek', 'বান্দরবান ট্রেক'))]),
    (B('International', 'আন্তর্জাতিক'), [('tours/maldives-honeymoon.html', B('Maldives', 'মালদ্বীপ')), ('tours/turkey-classic.html', B('Turkey', 'তুরস্ক')), ('tours/bali-highlights.html', B('Bali, Indonesia', 'বালি, ইন্দোনেশিয়া')), ('tours/dubai-family.html', B('Dubai, UAE', 'দুবাই, সংযুক্ত আরব আমিরাত')), ('tours/nepal-pokhara.html', B('Nepal', 'নেপাল')), ('tours/thailand-phuket.html', B('Thailand', 'থাইল্যান্ড'))]),
    (B('Travel Styles', 'ভ্রমণের ধরন'), [('holidays/honeymoon.html', B('Honeymoon', 'হানিমুন')), ('holidays/family.html', B('Family holidays', 'পারিবারিক ভ্রমণ')), ('holidays/adventure.html', B('Adventure & trekking', 'অ্যাডভেঞ্চার ও ট্রেকিং')), ('group-tours.html', B('Group & corporate', 'গ্রুপ ও কর্পোরেট')), ('custom-tour.html', B('Tailor-made trip', 'নিজের মতো ট্যুর'))]),
]

CATEGORIES = [
    ('beach', 'umbrella', B('Beach', 'সমুদ্র')), ('hills', 'mountain', B('Hills', 'পাহাড়')), ('heritage', 'landmark', B('Heritage', 'ঐতিহ্য')),
    ('honeymoon', 'heart', B('Honeymoon', 'হানিমুন')), ('family', 'users', B('Family', 'পরিবার')), ('adventure', 'tent', B('Adventure', 'অ্যাডভেঞ্চার')),
    ('wildlife', 'trees', B('Wildlife', 'বন্যপ্রাণী')), ('city', 'building-2', B('City break', 'শহর ভ্রমণ')), ('cruise', 'ship', B('Cruise', 'ক্রুজ')),
]

def T(slug, img, title, dest, country, region, cats, days, price, old, rating, reviews, hl, group='2–24', gallery=(), itin=(), badge=None, flight=False, visa=False):
    return dict(slug=slug, img=img, title=title, dest=dest, country=country, region=region, cats=cats, days=days, nights=days-1, price=price, old=old,
                rating=rating, reviews=reviews, hl=hl, group=group, gallery=gallery, itin=itin, badge=badge, flight=flight, visa=visa)

D = lambda t_en, t_bn, d_en=None, d_bn=None: dict(t=B(t_en, t_bn), d=B(d_en, d_bn) if d_en else None)

TOURS = [
    T('coxs-bazar-saint-martin', 'coxsbazar', B("Cox's Bazar & Saint Martin Island Escape", 'কক্সবাজার ও সেন্ট মার্টিন দ্বীপ ভ্রমণ'), B("Cox's Bazar", 'কক্সবাজার'), B('Bangladesh', 'বাংলাদেশ'), 'bd', ['beach', 'family'], 4, 18500, 22000, 4.8, 412,
      [B('Sea-view hotel on Kolatoli beach', 'কলাতলী সৈকতে সি-ভিউ হোটেল'), B('Ship to Saint Martin & Chhera Dwip', 'জাহাজে সেন্ট মার্টিন ও ছেঁড়া দ্বীপ'), B('Marine Drive sunset ride', 'মেরিন ড্রাইভে সূর্যাস্ত ভ্রমণ')],
      gallery=('coxsbazar', 'stmartin', 'kuakata', 'resort'), badge=B('Bestseller', 'সর্বাধিক বিক্রিত'),
      itin=[D('Dhaka → Cox\'s Bazar, Marine Drive', 'ঢাকা → কক্সবাজার, মেরিন ড্রাইভ', 'Morning flight from Dhaka (US-Bangla/Biman). Check in to a sea-view hotel at Kolatoli, then an evening jeep ride along the 80 km Marine Drive to Himchari and Inani for sunset.', 'সকালে ঢাকা থেকে ফ্লাইট (ইউএস-বাংলা/বিমান)। কলাতলীর সি-ভিউ হোটেলে চেক-ইন, এরপর বিকেলে ৮০ কিলোমিটার দীর্ঘ মেরিন ড্রাইভ ধরে হিমছড়ি ও ইনানীতে সূর্যাস্ত দেখতে জিপ ভ্রমণ।'),
            D('Teknaf → Saint Martin Island', 'টেকনাফ → সেন্ট মার্টিন দ্বীপ', 'Early transfer to Teknaf jetty and a 2.5-hour cruise across the Naf river mouth to Saint Martin. Afternoon on the west beach and a seafood barbecue under the stars.', 'ভোরে টেকনাফ জেটিতে পৌঁছে নাফ নদীর মোহনা পেরিয়ে আড়াই ঘণ্টার জাহাজযাত্রায় সেন্ট মার্টিন। বিকেলে পশ্চিম সৈকতে সময় কাটানো এবং রাতে তারাভরা আকাশের নিচে সামুদ্রিক খাবারের বারবিকিউ।'),
            D('Chhera Dwip & return to Cox\'s Bazar', 'ছেঁড়া দ্বীপ ও কক্সবাজারে ফেরা', 'Sunrise walk, then a speedboat to Chhera Dwip, the country\'s southernmost point, for coral pools. Afternoon ship back and an evening at Laboni beach market.', 'সূর্যোদয় দেখে স্পিডবোটে দেশের সর্বদক্ষিণ বিন্দু ছেঁড়া দ্বীপে প্রবালের মাঝে সময় কাটানো। দুপুরে জাহাজে ফেরা এবং সন্ধ্যায় লাবনী সৈকতের বাজারে কেনাকাটা।'),
            D('Leisure morning & fly home', 'অবসর সকাল ও ঢাকায় ফেরা', 'Free morning for the beach or a visit to the Radar Station viewpoint. Afternoon transfer to the airport for your flight to Dhaka.', 'সকাল নিজের মতো সৈকতে কাটানো বা রাডার স্টেশন ভিউপয়েন্ট ঘুরে দেখা। বিকেলে বিমানবন্দরে পৌঁছে ঢাকার ফ্লাইট।')]),
    T('sajek-rangamati', 'sajek', B('Sajek Valley & Rangamati Hill Retreat', 'সাজেক ভ্যালি ও রাঙামাটি পাহাড়ি অবকাশ'), B('Sajek Valley', 'সাজেক ভ্যালি'), B('Bangladesh', 'বাংলাদেশ'), 'bd', ['hills', 'family'], 3, 9800, 11500, 4.7, 286,
      [B('Sunrise over the clouds at Konglak', 'কংলাক পাহাড়ে মেঘের ওপর সূর্যোদয়'), B('Kaptai Lake boat trip', 'কাপ্তাই লেকে নৌভ্রমণ'), B('Hanging bridge & tribal bazaar', 'ঝুলন্ত সেতু ও পাহাড়ি বাজার')],
      gallery=('sajek', 'rangamati', 'bandarban'),
      itin=[D('Dhaka → Khagrachari → Sajek', 'ঢাকা → খাগড়াছড়ি → সাজেক'), D('Konglak sunrise → Rangamati', 'কংলাকে সূর্যোদয় → রাঙামাটি'), D('Kaptai Lake → Dhaka', 'কাপ্তাই লেক → ঢাকা')]),
    T('sylhet-srimangal', 'jaflong', B('Sylhet Tea Trails: Jaflong, Ratargul & Srimangal', 'সিলেটের চা-পথে: জাফলং, রাতারগুল ও শ্রীমঙ্গল'), B('Sylhet', 'সিলেট'), B('Bangladesh', 'বাংলাদেশ'), 'bd', ['hills', 'wildlife'], 3, 11500, 13000, 4.8, 198,
      [B('Boat ride through Ratargul swamp forest', 'রাতারগুল জলাবনে নৌকাভ্রমণ'), B('Tea estate walk & seven-layer tea', 'চা-বাগানে হাঁটা ও সাত রঙের চা'), B('Lawachara rainforest trail', 'লাউয়াছড়া রেইনফরেস্ট ট্রেইল')],
      gallery=('jaflong', 'ratargul', 'darjeeling', 'srimangal'),
      itin=[D('Dhaka → Sylhet, Shrine visits', 'ঢাকা → সিলেট, মাজার জিয়ারত'), D('Ratargul & Jaflong', 'রাতারগুল ও জাফলং'), D('Srimangal tea gardens → Dhaka', 'শ্রীমঙ্গলের চা-বাগান → ঢাকা')]),
    T('sundarbans-cruise', 'sundarbans', B('Sundarbans Mangrove Cruise (3 Days on Deck)', 'সুন্দরবন ম্যানগ্রোভ ক্রুজ (৩ দিন জলযানে)'), B('Sundarbans', 'সুন্দরবন'), B('Bangladesh', 'বাংলাদেশ'), 'bd', ['wildlife', 'adventure'], 3, 14900, 16500, 4.9, 154,
      [B('AC cruise vessel with all meals', 'সব খাবারসহ এসি ক্রুজ জলযান'), B('Kotka & Kochikhali wildlife trails', 'কটকা ও কচিখালীর বন্যপ্রাণী ট্রেইল'), B('Forest permits & armed guard', 'বন বিভাগের অনুমতি ও সশস্ত্র গার্ড')],
      gallery=('sundarbans', 'ratargul'), badge=B('Eco certified', 'পরিবেশবান্ধব'),
      itin=[D('Khulna → Harbaria eco-trail', 'খুলনা → হারবাড়িয়া ইকো-ট্রেইল'), D('Kotka, Jamtola beach & Kochikhali', 'কটকা, জামতলা সৈকত ও কচিখালী'), D('Karamjal → Khulna', 'করমজল → খুলনা')]),
    T('bandarban-nilgiri', 'bandarban', B('Bandarban Nilgiri & Nafakhum Trek', 'বান্দরবান নীলগিরি ও নাফাখুম ট্রেক'), B('Bandarban', 'বান্দরবান'), B('Bangladesh', 'বাংলাদেশ'), 'bd', ['hills', 'adventure'], 4, 12500, None, 4.6, 121,
      [B('Nilgiri cloud-top resort night', 'নীলগিরির মেঘছোঁয়া রিসোর্টে রাত্রিযাপন'), B('Nafakhum waterfall trek with local guide', 'স্থানীয় গাইডসহ নাফাখুম জলপ্রপাত ট্রেক'), B('Golden Temple & Boga Lake', 'স্বর্ণমন্দির ও বগা লেক')],
      gallery=('bandarban', 'sajek'),
      itin=[D('Dhaka → Bandarban, Golden Temple', 'ঢাকা → বান্দরবান, স্বর্ণমন্দির'), D('Thanchi → Remakri', 'থানচি → রেমাক্রি'), D('Nafakhum waterfall trek', 'নাফাখুম জলপ্রপাত ট্রেক'), D('Nilgiri → Dhaka', 'নীলগিরি → ঢাকা')]),
    T('maldives-honeymoon', 'maldives', B('Maldives Water-Villa Honeymoon', 'মালদ্বীপ ওয়াটার-ভিলা হানিমুন'), B('Maldives', 'মালদ্বীপ'), B('Maldives', 'মালদ্বীপ'), 'intl', ['beach', 'honeymoon'], 5, 145000, 168000, 4.9, 233,
      [B('2 nights beach villa + 2 nights water villa', '২ রাত বিচ ভিলা + ২ রাত ওয়াটার ভিলা'), B('Speedboat transfers & half board', 'স্পিডবোট ট্রান্সফার ও হাফ বোর্ড'), B('Sunset dolphin cruise for two', 'দুজনের জন্য সূর্যাস্ত ডলফিন ক্রুজ')],
      gallery=('maldives', 'resort', 'hotelroom'), badge=B('Honeymoon pick', 'হানিমুন বাছাই'), flight=True,
      itin=[D('Dhaka → Malé, speedboat to resort', 'ঢাকা → মালে, স্পিডবোটে রিসোর্ট', 'Direct US-Bangla flight to Malé. Our representative meets you at Velana Airport for the 25-minute speedboat transfer. Welcome drinks and a beach-villa check-in.', 'ইউএস-বাংলার সরাসরি ফ্লাইটে মালে। ভেলানা বিমানবন্দরে আমাদের প্রতিনিধি স্বাগত জানাবেন, এরপর ২৫ মিনিটের স্পিডবোটে রিসোর্টে পৌঁছানো। ওয়েলকাম ড্রিংক ও বিচ ভিলায় চেক-ইন।'),
            D('Snorkelling & house reef', 'স্নরকেলিং ও হাউস রিফ', 'Guided snorkelling on the house reef with turtles and reef sharks, then a spa hour for two. Dinner at the overwater restaurant.', 'কচ্ছপ ও রিফ শার্কের দেখা মেলে এমন হাউস রিফে গাইডসহ স্নরকেলিং, এরপর দুজনের জন্য স্পা। রাতে পানির ওপর রেস্তোরাঁয় ডিনার।'),
            D('Move to water villa, dolphin cruise', 'ওয়াটার ভিলায় স্থানান্তর, ডলফিন ক্রুজ', 'Shift to your overwater villa with a private deck. Late-afternoon sunset cruise to spot spinner dolphins.', 'নিজস্ব ডেকসহ ওয়াটার ভিলায় স্থানান্তর। বিকেলে স্পিনার ডলফিন দেখার সূর্যাস্ত ক্রুজ।'),
            D('Sandbank picnic', 'স্যান্ডব্যাংক পিকনিক', 'A private sandbank picnic with lunch, then a free afternoon. Optional diving or seaplane photo flight.', 'দুপুরের খাবারসহ ব্যক্তিগত স্যান্ডব্যাংক পিকনিক, বিকেল অবসর। চাইলে ডাইভিং বা সি-প্লেনে ফটো ফ্লাইট।'),
            D('Malé → Dhaka', 'মালে → ঢাকা', 'Breakfast, check-out and speedboat to the airport for your flight home.', 'নাশতা ও চেক-আউটের পর স্পিডবোটে বিমানবন্দর, এরপর ঢাকার ফ্লাইট।')]),
    T('bali-highlights', 'bali', B('Bali Highlights: Ubud, Rice Terraces & Beaches', 'বালি হাইলাইটস: উবুদ, ধানখেত ও সৈকত'), B('Bali', 'বালি'), B('Indonesia', 'ইন্দোনেশিয়া'), 'intl', ['beach', 'honeymoon', 'heritage'], 6, 89500, 99000, 4.8, 176,
      [B('Tegallalang rice terraces & jungle swing', 'তেগালালাং ধানখেত ও জঙ্গল সুইং'), B('Uluwatu temple Kecak fire dance', 'উলুওয়াতু মন্দিরে কেচাক অগ্নিনৃত্য'), B('Nusa Penida day cruise', 'নুসা পেনিদা ডে ক্রুজ')],
      gallery=('bali', 'resort', 'hotelroom'), flight=True, visa=True,
      itin=[D('Dhaka → Denpasar', 'ঢাকা → ডেনপাসার'), D('Ubud art villages & Monkey Forest', 'উবুদের শিল্পগ্রাম ও মাঙ্কি ফরেস্ট'), D('Tegallalang & Kintamani volcano', 'তেগালালাং ও কিন্তামানি আগ্নেয়গিরি'), D('Nusa Penida island cruise', 'নুসা পেনিদা দ্বীপ ক্রুজ'), D('Uluwatu & Jimbaran seafood', 'উলুওয়াতু ও জিম্বারান সি-ফুড'), D('Denpasar → Dhaka', 'ডেনপাসার → ঢাকা')]),
    T('dubai-family', 'dubai', B('Dubai Family Fun with Desert Safari', 'ডেজার্ট সাফারিসহ দুবাই পারিবারিক ভ্রমণ'), B('Dubai', 'দুবাই'), B('United Arab Emirates', 'সংযুক্ত আরব আমিরাত'), 'intl', ['family', 'city'], 5, 78000, 85000, 4.7, 309,
      [B('Burj Khalifa "At the Top" tickets', 'বুর্জ খলিফা "অ্যাট দ্য টপ" টিকিট'), B('Desert safari with BBQ dinner', 'বিবিকিউ ডিনারসহ ডেজার্ট সাফারি'), B('Dhow cruise at Dubai Marina', 'দুবাই মেরিনায় ধাও ক্রুজ')],
      gallery=('dubai', 'resort'), flight=True, visa=True, badge=B('Family favourite', 'পরিবারের পছন্দ'),
      itin=[D('Dhaka → Dubai, Marina dhow cruise', 'ঢাকা → দুবাই, মেরিনায় ধাও ক্রুজ'), D('City tour & Burj Khalifa', 'সিটি ট্যুর ও বুর্জ খলিফা'), D('Desert safari', 'ডেজার্ট সাফারি'), D('Abu Dhabi Grand Mosque day trip', 'আবুধাবি গ্র্যান্ড মসজিদ ডে-ট্রিপ'), D('Shopping & fly home', 'কেনাকাটা ও দেশে ফেরা')]),
    T('turkey-classic', 'istanbul', B('Turkey Classic: Istanbul, Cappadocia & Pamukkale', 'তুরস্ক ক্লাসিক: ইস্তাম্বুল, কাপাদোকিয়া ও পামুক্কালে'), B('Istanbul', 'ইস্তাম্বুল'), B('Türkiye', 'তুরস্ক'), 'intl', ['heritage', 'honeymoon', 'city'], 8, 165000, 182000, 4.9, 268,
      [B('Hot-air balloon flight over Cappadocia', 'কাপাদোকিয়ায় হট-এয়ার বেলুন রাইড'), B('Bosphorus cruise & Blue Mosque', 'বসফরাস ক্রুজ ও ব্লু মস্ক'), B('Pamukkale travertine terraces', 'পামুক্কালের সাদা চুনাপাথরের ধাপ')],
      gallery=('istanbul', 'cappadocia', 'turkey2', 'hotelroom'), flight=True, visa=True, badge=B('Top rated', 'সেরা রেটিং'),
      itin=[D('Dhaka → Istanbul', 'ঢাকা → ইস্তাম্বুল', 'Turkish Airlines flight to Istanbul. Private transfer to your Sultanahmet hotel and a welcome dinner with a view of the Golden Horn.', 'টার্কিশ এয়ারলাইন্সে ইস্তাম্বুল। সুলতানাহমেতের হোটেলে প্রাইভেট ট্রান্সফার এবং গোল্ডেন হর্নের দৃশ্যসহ ওয়েলকাম ডিনার।'),
            D('Old City: Hagia Sophia & Blue Mosque', 'পুরোনো শহর: আয়া সোফিয়া ও ব্লু মস্ক', 'Guided walk through Hagia Sophia, the Blue Mosque, Topkapı Palace and the Grand Bazaar.', 'গাইডসহ আয়া সোফিয়া, ব্লু মস্ক, তোপকাপি প্রাসাদ ও গ্র্যান্ড বাজার ভ্রমণ।'),
            D('Bosphorus cruise & Asian side', 'বসফরাস ক্রুজ ও এশীয় অংশ', 'Morning Bosphorus cruise between two continents, then Çamlıca hill and the Spice Bazaar.', 'সকালে দুই মহাদেশের মাঝ দিয়ে বসফরাস ক্রুজ, এরপর চামলিজা পাহাড় ও স্পাইস বাজার।'),
            D('Fly to Cappadocia', 'কাপাদোকিয়ায় ফ্লাইট', 'Domestic flight to Kayseri. Afternoon in Göreme open-air museum and a cave-hotel check-in.', 'কায়সেরিতে অভ্যন্তরীণ ফ্লাইট। বিকেলে গোরেমে ওপেন-এয়ার মিউজিয়াম ও গুহা-হোটেলে চেক-ইন।'),
            D('Balloon flight & underground city', 'বেলুন রাইড ও ভূগর্ভস্থ শহর', 'Sunrise hot-air balloon flight (weather permitting), then Derinkuyu underground city and Pigeon Valley.', 'সূর্যোদয়ে হট-এয়ার বেলুন রাইড (আবহাওয়া অনুকূলে থাকলে), এরপর দেরিনকুয়ু ভূগর্ভস্থ শহর ও পিজিয়ন ভ্যালি।'),
            D('Road to Pamukkale', 'পামুক্কালের পথে', 'Scenic drive via Konya and the Mevlana Museum to Pamukkale; thermal-spa hotel.', 'কোনিয়া ও মাওলানা জাদুঘর হয়ে পামুক্কালে; থার্মাল-স্পা হোটেল।'),
            D('Pamukkale & Hierapolis', 'পামুক্কালে ও হিয়েরাপোলিস', 'Walk barefoot on the white travertines and swim in Cleopatra\'s antique pool. Evening flight back to Istanbul.', 'সাদা চুনাপাথরের ধাপে খালি পায়ে হাঁটা ও ক্লিওপেট্রার প্রাচীন পুলে সাঁতার। সন্ধ্যায় ইস্তাম্বুলে ফেরা।'),
            D('Istanbul → Dhaka', 'ইস্তাম্বুল → ঢাকা', 'Free morning for last-minute shopping and airport transfer.', 'সকালে শেষ মুহূর্তের কেনাকাটা, এরপর বিমানবন্দরে ট্রান্সফার।')]),
    T('nepal-pokhara', 'nepal', B('Nepal: Kathmandu & Pokhara Mountain Escape', 'নেপাল: কাঠমান্ডু ও পোখারা পাহাড়ি অবকাশ'), B('Pokhara', 'পোখারা'), B('Nepal', 'নেপাল'), 'intl', ['hills', 'adventure'], 5, 42500, 47000, 4.7, 214,
      [B('Sarangkot sunrise over the Annapurnas', 'সারাংকোট থেকে অন্নপূর্ণায় সূর্যোদয়'), B('Phewa Lake boating', 'ফেওয়া লেকে নৌকাভ্রমণ'), B('Paragliding add-on available', 'প্যারাগ্লাইডিং যোগ করার সুযোগ')],
      gallery=('nepal', 'darjeeling'), flight=True,
      itin=[D('Dhaka → Kathmandu, Thamel', 'ঢাকা → কাঠমান্ডু, থামেল'), D('Kathmandu Durbar Square & Swayambhu', 'কাঠমান্ডু দরবার স্কয়ার ও স্বয়ম্ভূ'), D('Drive to Pokhara', 'পোখারার পথে'), D('Sarangkot sunrise & Phewa Lake', 'সারাংকোটে সূর্যোদয় ও ফেওয়া লেক'), D('Kathmandu → Dhaka', 'কাঠমান্ডু → ঢাকা')]),
    T('bhutan-happiness', 'bhutan', B('Bhutan Happiness Trail: Thimphu, Punakha & Paro', 'ভুটান হ্যাপিনেস ট্রেইল: থিম্পু, পুনাখা ও পারো'), B('Paro', 'পারো'), B('Bhutan', 'ভুটান'), 'intl', ['hills', 'heritage'], 6, 68000, None, 4.8, 97,
      [B("Hike to Tiger's Nest monastery", 'টাইগার্স নেস্ট মঠে হাইকিং'), B('Punakha Dzong & suspension bridge', 'পুনাখা জং ও ঝুলন্ত সেতু'), B('Dochula Pass 108 chortens', 'দোচুলা পাস ও ১০৮টি চোর্তেন')],
      gallery=('bhutan', 'nepal'), flight=True,
      itin=[D('Dhaka → Paro → Thimphu', 'ঢাকা → পারো → থিম্পু'), D('Thimphu sightseeing', 'থিম্পু দর্শন'), D('Dochula → Punakha', 'দোচুলা → পুনাখা'), D('Punakha → Paro', 'পুনাখা → পারো'), D("Tiger's Nest hike", 'টাইগার্স নেস্ট হাইক'), D('Paro → Dhaka', 'পারো → ঢাকা')]),
    T('thailand-phuket', 'phuket', B('Thailand: Bangkok, Phuket & Phi Phi', 'থাইল্যান্ড: ব্যাংকক, ফুকেট ও ফি ফি'), B('Phuket', 'ফুকেট'), B('Thailand', 'থাইল্যান্ড'), 'intl', ['beach', 'family', 'city'], 6, 62000, 69500, 4.6, 341,
      [B('Phi Phi & Maya Bay speedboat tour', 'ফি ফি ও মায়া বে স্পিডবোট ট্যুর'), B('Bangkok temples & river cruise', 'ব্যাংককের মন্দির ও রিভার ক্রুজ'), B('Dietary needs catered for', 'খাদ্যাভ্যাস অনুযায়ী খাবারের ব্যবস্থা')],
      gallery=('phuket', 'resort'), flight=True, visa=True,
      itin=[D('Dhaka → Bangkok', 'ঢাকা → ব্যাংকক'), D('Grand Palace & Chao Phraya cruise', 'গ্র্যান্ড প্যালেস ও চাও ফ্রায়া ক্রুজ'), D('Fly to Phuket', 'ফুকেটে ফ্লাইট'), D('Phi Phi islands', 'ফি ফি দ্বীপপুঞ্জ'), D('Phuket city & Big Buddha', 'ফুকেট শহর ও বিগ বুদ্ধ'), D('Phuket → Dhaka', 'ফুকেট → ঢাকা')]),
    T('kashmir-paradise', 'kashmir', B('Kashmir Paradise: Srinagar, Gulmarg & Pahalgam', 'ভূস্বর্গ কাশ্মীর: শ্রীনগর, গুলমার্গ ও পহেলগাম'), B('Srinagar', 'শ্রীনগর'), B('India', 'ভারত'), 'intl', ['hills', 'honeymoon'], 6, 58500, 64000, 4.7, 162,
      [B('Houseboat night on Dal Lake', 'ডাল লেকের হাউসবোটে রাত্রিযাপন'), B('Gulmarg gondola ride', 'গুলমার্গ গন্ডোলা রাইড'), B('Shikara ride at sunset', 'সূর্যাস্তে শিকারা ভ্রমণ')],
      gallery=('kashmir', 'swiss'), flight=True, visa=True,
      itin=[D('Dhaka → Srinagar, houseboat', 'ঢাকা → শ্রীনগর, হাউসবোট'), D('Mughal gardens & shikara', 'মুঘল উদ্যান ও শিকারা'), D('Gulmarg gondola', 'গুলমার্গ গন্ডোলা'), D('Pahalgam valleys', 'পহেলগাম উপত্যকা'), D('Sonamarg glacier', 'সোনমার্গ হিমবাহ'), D('Srinagar → Dhaka', 'শ্রীনগর → ঢাকা')]),
    T('singapore-malaysia', 'singapore', B('Singapore & Malaysia Twin-City Holiday', 'সিঙ্গাপুর ও মালয়েশিয়া টুইন-সিটি হলিডে'), B('Singapore', 'সিঙ্গাপুর'), B('Singapore & Malaysia', 'সিঙ্গাপুর ও মালয়েশিয়া'), 'intl', ['city', 'family'], 7, 98000, 108000, 4.7, 188,
      [B('Universal Studios & Gardens by the Bay', 'ইউনিভার্সাল স্টুডিওস ও গার্ডেনস বাই দ্য বে'), B('Genting Highlands cable car', 'গেন্টিং হাইল্যান্ডস ক্যাবল কার'), B('Coach transfer Singapore → KL', 'সিঙ্গাপুর → কুয়ালালামপুর কোচ ট্রান্সফার')],
      gallery=('singapore', 'malaysia'), flight=True, visa=True,
      itin=[D('Dhaka → Singapore', 'ঢাকা → সিঙ্গাপুর'), D('City tour & Gardens by the Bay', 'সিটি ট্যুর ও গার্ডেনস বাই দ্য বে'), D('Sentosa & Universal Studios', 'সেন্তোসা ও ইউনিভার্সাল স্টুডিওস'), D('Coach to Kuala Lumpur', 'কোচে কুয়ালালামপুর'), D('Petronas Towers & Batu Caves', 'পেট্রোনাস টাওয়ার ও বাতু কেভস'), D('Genting Highlands', 'গেন্টিং হাইল্যান্ডস'), D('Kuala Lumpur → Dhaka', 'কুয়ালালামপুর → ঢাকা')]),
    T('egypt-wonders', 'egypt', B('Egypt Wonders: Cairo, Giza & Nile Cruise', 'মিশরের বিস্ময়: কায়রো, গিজা ও নীল নদ ক্রুজ'), B('Cairo', 'কায়রো'), B('Egypt', 'মিশর'), 'intl', ['heritage'], 7, 138000, 149000, 4.8, 74,
      [B('Pyramids of Giza & the Sphinx', 'গিজার পিরামিড ও স্ফিংক্স'), B('3-night Nile cruise Luxor–Aswan', 'লুক্সর–আসওয়ান ৩ রাতের নীল নদ ক্রুজ'), B('Al-Azhar & Islamic Cairo walk', 'আল-আজহার ও ইসলামিক কায়রো ভ্রমণ')],
      gallery=('egypt',), flight=True, visa=True,
      itin=[D('Dhaka → Cairo', 'ঢাকা → কায়রো'), D('Giza pyramids & Egyptian Museum', 'গিজার পিরামিড ও মিশরীয় জাদুঘর'), D('Islamic Cairo & Khan el-Khalili', 'ইসলামিক কায়রো ও খান আল-খলিলি'), D('Fly to Luxor, board cruise', 'লুক্সরে ফ্লাইট, ক্রুজে ওঠা'), D('Edfu & Kom Ombo', 'এডফু ও কম ওম্বো'), D('Aswan & Philae', 'আসওয়ান ও ফিলাই'), D('Cairo → Dhaka', 'কায়রো → ঢাকা')]),
    T('srilanka-culture', 'srilanka', B('Sri Lanka Cultural Triangle & Kandy', 'শ্রীলঙ্কা কালচারাল ট্রায়াঙ্গল ও ক্যান্ডি'), B('Sigiriya', 'সিগিরিয়া'), B('Sri Lanka', 'শ্রীলঙ্কা'), 'intl', ['heritage', 'wildlife'], 6, 72000, None, 4.6, 88,
      [B('Climb Sigiriya Lion Rock', 'সিগিরিয়া লায়ন রক আরোহণ'), B('Minneriya elephant safari', 'মিনেরিয়ায় হাতি সাফারি'), B('Scenic train to Ella', 'এলা পর্যন্ত মনোরম ট্রেনযাত্রা')],
      gallery=('srilanka',), flight=True, visa=True,
      itin=[D('Dhaka → Colombo → Sigiriya', 'ঢাকা → কলম্বো → সিগিরিয়া'), D('Sigiriya rock & Minneriya safari', 'সিগিরিয়া রক ও মিনেরিয়া সাফারি'), D('Dambulla → Kandy', 'ডাম্বুলা → ক্যান্ডি'), D('Train to Ella', 'এলার পথে ট্রেন'), D('Ella → Colombo', 'এলা → কলম্বো'), D('Colombo → Dhaka', 'কলম্বো → ঢাকা')]),
]
TOUR = {x['slug']: x for x in TOURS}

def DS(slug, img, name, country, region, tours, best, visa, cur, fly, desc, things):
    return dict(slug=slug, img=img, name=name, country=country, region=region, tours=tours, best=best, visa=visa, cur=cur, fly=fly, desc=desc, things=things)

DESTINATIONS = [
    DS('coxs-bazar', 'coxsbazar', B("Cox's Bazar", 'কক্সবাজার'), B('Bangladesh', 'বাংলাদেশ'), 'bd', 18, B('Nov – Mar', 'নভেম্বর – মার্চ'), B('Not required', 'প্রয়োজন নেই'), 'BDT', B('1 h flight', '১ ঘণ্টার ফ্লাইট'),
       B("Home to the world's longest natural sea beach — 120 km of golden sand, the scenic Marine Drive, Himchari waterfalls and fresh seafood.", 'বিশ্বের দীর্ঘতম প্রাকৃতিক সমুদ্রসৈকত — ১২০ কিলোমিটার সোনালি বালুকাবেলা, মনোরম মেরিন ড্রাইভ, হিমছড়ির ঝরনা আর টাটকা সামুদ্রিক খাবার।'),
       [B('Inani rocky beach', 'ইনানী পাথুরে সৈকত'), B('Himchari National Park', 'হিমছড়ি জাতীয় উদ্যান'), B('Saint Martin day trip', 'সেন্ট মার্টিন ডে-ট্রিপ'), B('Ramu Buddhist temples', 'রামুর বৌদ্ধ বিহার')]),
    DS('sajek-valley', 'sajek', B('Sajek Valley', 'সাজেক ভ্যালি'), B('Bangladesh', 'বাংলাদেশ'), 'bd', 9, B('Jun – Nov', 'জুন – নভেম্বর'), B('Not required', 'প্রয়োজন নেই'), 'BDT', B('8 h by road', 'সড়কপথে ৮ ঘণ্টা'),
       B('The "queen of hills" in Rangamati, famous for sunrise above a sea of clouds and colourful wooden cottages.', 'রাঙামাটির "পাহাড়ের রানী" — মেঘের সমুদ্রের ওপর সূর্যোদয় আর রঙিন কাঠের কটেজের জন্য বিখ্যাত।'),
       [B('Konglak Para', 'কংলাক পাড়া'), B('Helipad sunset', 'হেলিপ্যাডে সূর্যাস্ত'), B('Hazachora waterfall', 'হাজাছড়া ঝরনা')]),
    DS('sylhet', 'jaflong', B('Sylhet', 'সিলেট'), B('Bangladesh', 'বাংলাদেশ'), 'bd', 12, B('Jun – Oct', 'জুন – অক্টোবর'), B('Not required', 'প্রয়োজন নেই'), 'BDT', B('45 min flight', '৪৫ মিনিটের ফ্লাইট'),
       B('Rolling tea estates, the crystal-clear Jaflong river, Ratargul swamp forest and the turquoise water of Lalakhal.', 'ঢেউখেলানো চা-বাগান, জাফলংয়ের স্বচ্ছ নদী, রাতারগুল জলাবন আর লালাখালের নীলচে পানি।'),
       [B('Ratargul swamp forest', 'রাতারগুল জলাবন'), B('Bisnakandi', 'বিছনাকান্দি'), B('Lalakhal', 'লালাখাল')]),
    DS('sundarbans', 'sundarbans', B('Sundarbans', 'সুন্দরবন'), B('Bangladesh', 'বাংলাদেশ'), 'bd', 6, B('Nov – Feb', 'নভেম্বর – ফেব্রুয়ারি'), B('Not required', 'প্রয়োজন নেই'), 'BDT', B('5 h by road to Khulna', 'খুলনা পর্যন্ত সড়কপথে ৫ ঘণ্টা'),
       B("The world's largest mangrove forest and UNESCO World Heritage site, home of the Royal Bengal tiger.", 'বিশ্বের বৃহত্তম ম্যানগ্রোভ বন ও ইউনেস্কো বিশ্ব ঐতিহ্য — রয়েল বেঙ্গল টাইগারের আবাস।'),
       [B('Kotka', 'কটকা'), B('Kochikhali', 'কচিখালী'), B('Karamjal', 'করমজল')]),
    DS('maldives', 'maldives', B('Maldives', 'মালদ্বীপ'), B('Maldives', 'মালদ্বীপ'), 'intl', 11, B('Nov – Apr', 'নভেম্বর – এপ্রিল'), B('Free on arrival', 'অন-অ্যারাইভাল (ফ্রি)'), 'MVR / USD', B('3 h 50 m direct', 'সরাসরি ৩ ঘণ্টা ৫০ মিনিট'),
       B('Overwater villas, turquoise lagoons and house reefs — the classic honeymoon escape, just under four hours from Dhaka.', 'পানির ওপর ভিলা, ফিরোজা লেগুন আর প্রবালপ্রাচীর — ঢাকা থেকে চার ঘণ্টারও কম দূরত্বে ক্লাসিক হানিমুন গন্তব্য।'),
       [B('Malé city', 'মালে শহর'), B('Maafushi', 'মাফুশি'), B('Sandbank picnic', 'স্যান্ডব্যাংক পিকনিক')]),
    DS('turkey', 'istanbul', B('Türkiye', 'তুরস্ক'), B('Türkiye', 'তুরস্ক'), 'intl', 8, B('Apr – Jun, Sep – Nov', 'এপ্রিল – জুন, সেপ্টেম্বর – নভেম্বর'), B('Sticker visa', 'স্টিকার ভিসা'), 'TRY', B('9 h 1-stop', 'এক স্টপে ৯ ঘণ্টা'),
       B('Where continents meet: Ottoman mosques, Cappadocia balloons and the white terraces of Pamukkale.', 'যেখানে দুই মহাদেশ মিলেছে: উসমানীয় মসজিদ, কাপাদোকিয়ার বেলুন আর পামুক্কালের সাদা ধাপ।'),
       [B('Istanbul', 'ইস্তাম্বুল'), B('Cappadocia', 'কাপাদোকিয়া'), B('Bursa', 'বুরসা'), B('Antalya', 'আন্তালিয়া')]),
    DS('bali', 'bali', B('Bali', 'বালি'), B('Indonesia', 'ইন্দোনেশিয়া'), 'intl', 7, B('Apr – Oct', 'এপ্রিল – অক্টোবর'), B('e-VOA', 'ই-ভিসা অন অ্যারাইভাল'), 'IDR', B('7 h 1-stop', 'এক স্টপে ৭ ঘণ্টা'),
       B('Temples, terraced rice fields and surf beaches on the Island of the Gods.', 'দেবতাদের দ্বীপে মন্দির, ধাপে ধাপে ধানখেত আর সার্ফিং সৈকত।'),
       [B('Ubud', 'উবুদ'), B('Uluwatu', 'উলুওয়াতু'), B('Nusa Penida', 'নুসা পেনিদা')]),
    DS('dubai', 'dubai', B('Dubai', 'দুবাই'), B('United Arab Emirates', 'সংযুক্ত আরব আমিরাত'), 'intl', 10, B('Nov – Mar', 'নভেম্বর – মার্চ'), B('e-Visa', 'ই-ভিসা'), 'AED', B('5 h direct', 'সরাসরি ৫ ঘণ্টা'),
       B('Skyscrapers, desert dunes and world-class malls — perfect for families and shoppers.', 'আকাশচুম্বী ভবন, মরুভূমির বালিয়াড়ি আর বিশ্বমানের শপিং মল — পরিবার ও কেনাকাটাপ্রেমীদের জন্য আদর্শ।'),
       [B('Burj Khalifa', 'বুর্জ খলিফা'), B('Desert safari', 'ডেজার্ট সাফারি'), B('Abu Dhabi', 'আবুধাবি')]),
    DS('nepal', 'nepal', B('Nepal', 'নেপাল'), B('Nepal', 'নেপাল'), 'intl', 6, B('Oct – Dec, Mar – May', 'অক্টোবর – ডিসেম্বর, মার্চ – মে'), B('Free on arrival', 'অন-অ্যারাইভাল (ফ্রি)'), 'NPR', B('1 h 15 m direct', 'সরাসরি ১ ঘণ্টা ১৫ মিনিট'),
       B('Himalayan sunrises, lakeside Pokhara and the temples of the Kathmandu valley.', 'হিমালয়ের সূর্যোদয়, হ্রদের ধারে পোখারা আর কাঠমান্ডু উপত্যকার মন্দির।'),
       [B('Pokhara', 'পোখারা'), B('Nagarkot', 'নাগরকোট'), B('Chitwan', 'চিতওয়ান')]),
    DS('thailand', 'phuket', B('Thailand', 'থাইল্যান্ড'), B('Thailand', 'থাইল্যান্ড'), 'intl', 9, B('Nov – Apr', 'নভেম্বর – এপ্রিল'), B('Sticker / e-Visa', 'স্টিকার / ই-ভিসা'), 'THB', B('2 h 30 m direct', 'সরাসরি ২ ঘণ্টা ৩০ মিনিট'),
       B('Island hopping, street food and golden temples — great value for every budget.', 'দ্বীপ ভ্রমণ, স্ট্রিট ফুড আর সোনালি মন্দির — সব বাজেটে সাশ্রয়ী।'),
       [B('Phuket', 'ফুকেট'), B('Krabi', 'ক্রাবি'), B('Bangkok', 'ব্যাংকক'), B('Pattaya', 'পাতায়া')]),
    DS('bhutan', 'bhutan', B('Bhutan', 'ভুটান'), B('Bhutan', 'ভুটান'), 'intl', 4, B('Mar – May, Sep – Nov', 'মার্চ – মে, সেপ্টেম্বর – নভেম্বর'), B('Free on arrival (SDF applies)', 'অন-অ্যারাইভাল (এসডিএফ প্রযোজ্য)'), 'BTN', B('1 h 20 m direct', 'সরাসরি ১ ঘণ্টা ২০ মিনিট'),
       B('The land of the thunder dragon — cliffside monasteries, clean air and Gross National Happiness.', 'বজ্র ড্রাগনের দেশ — পাহাড়ের গায়ে মঠ, নির্মল বাতাস আর "গ্রস ন্যাশনাল হ্যাপিনেস"।'),
       [B('Paro', 'পারো'), B('Thimphu', 'থিম্পু'), B('Punakha', 'পুনাখা')]),
    DS('singapore-malaysia', 'singapore', B('Singapore & Malaysia', 'সিঙ্গাপুর ও মালয়েশিয়া'), B('Singapore · Malaysia', 'সিঙ্গাপুর · মালয়েশিয়া'), 'intl', 7, B('Feb – Apr, Jul – Sep', 'ফেব্রুয়ারি – এপ্রিল, জুলাই – সেপ্টেম্বর'), B('e-Visa (both)', 'ই-ভিসা (দুই দেশেই)'), 'SGD/MYR', B('4 h direct', 'সরাসরি ৪ ঘণ্টা'),
       B('Two easy, family-friendly cities: Gardens by the Bay, Sentosa and Universal Studios, then the Petronas Towers, Genting Highlands and Malay street food.', 'পরিবারের জন্য দুটি সহজ শহর: গার্ডেনস বাই দ্য বে, সেন্তোসা ও ইউনিভার্সাল স্টুডিওস, এরপর পেট্রোনাস টাওয়ার, গেন্টিং হাইল্যান্ডস আর মালয় স্ট্রিট ফুড।'),
       [B('Gardens by the Bay', 'গার্ডেনস বাই দ্য বে'), B('Sentosa Island', 'সেন্তোসা দ্বীপ'), B('Petronas Twin Towers', 'পেট্রোনাস টুইন টাওয়ার'), B('Genting Highlands', 'গেন্টিং হাইল্যান্ডস')]),
]
DEST = {d['slug']: d for d in DESTINATIONS}
DEST_TOURS = {'coxs-bazar': ['coxs-bazar-saint-martin'], 'sajek-valley': ['sajek-rangamati', 'bandarban-nilgiri'], 'sylhet': ['sylhet-srimangal'], 'sundarbans': ['sundarbans-cruise'],
              'maldives': ['maldives-honeymoon'], 'turkey': ['turkey-classic'], 'bali': ['bali-highlights'], 'dubai': ['dubai-family'], 'nepal': ['nepal-pokhara'], 'thailand': ['thailand-phuket'], 'bhutan': ['bhutan-happiness'], 'singapore-malaysia': ['singapore-malaysia']}

# ---------------- Cruises ----------------
def CR(slug, img, title, ship, line, region, nights, price, old, rating, reviews, depart, port, ports, cabin, hl, badge=None):
    return dict(slug=slug, img=img, title=title, ship=ship, line=line, region=region, nights=nights, price=price, old=old, rating=rating, reviews=reviews,
                depart=depart, port=port, ports=ports, cabin=cabin, hl=hl, badge=badge)
CRUISES = [
    CR('singapore-penang-phuket', 'cruise', B('Singapore · Penang · Phuket Cruise', 'সিঙ্গাপুর · পেনাং · ফুকেট ক্রুজ'), 'Ocean Spectrum', 'Spectrum Cruises', 'asia', 4, 68500, 74000, 4.8, 412, '2026-12-14',
       B('Singapore', 'সিঙ্গাপুর'), [B('Singapore', 'সিঙ্গাপুর'), B('Penang', 'পেনাং'), B('Phuket', 'ফুকেট'), B('Singapore', 'সিঙ্গাপুর')], B('Ocean-view cabin', 'সমুদ্রমুখী কেবিন'),
       [B('All main meals on board', 'জাহাজে সব প্রধান খাবার'), B('Broadway-style shows', 'ব্রডওয়ে-ধাঁচের শো'), B('Kids club & water park', 'কিডস ক্লাব ও ওয়াটার পার্ক')], badge=B('Bestseller', 'সেরা বিক্রিত')),
    CR('arabian-gulf-7-nights', 'dubai', B('Arabian Gulf: Dubai, Abu Dhabi & Doha', 'আরব উপসাগর: দুবাই, আবুধাবি ও দোহা'), 'Gulf Star', 'Azure Line', 'gulf', 7, 112000, None, 4.7, 268, '2027-01-09',
       B('Dubai', 'দুবাই'), [B('Dubai', 'দুবাই'), B('Abu Dhabi', 'আবুধাবি'), B('Sir Bani Yas', 'স্যার বানি ইয়াস'), B('Doha', 'দোহা'), B('Dubai', 'দুবাই')], B('Balcony cabin', 'ব্যালকনি কেবিন'),
       [B('Private beach day', 'প্রাইভেট সৈকত দিবস'), B('Desert safari add-on', 'মরু সাফারি অ্যাড-অন'), B('Beachfront dining', 'সৈকতের ধারে ডাইনিং')]),
    CR('greek-isles-turkey', 'greece', B('Greek Isles & Türkiye', 'গ্রিক দ্বীপপুঞ্জ ও তুরস্ক'), 'Aegean Pearl', 'Azure Line', 'europe', 7, 189000, 205000, 4.9, 156, '2027-05-22',
       B('Athens', 'এথেন্স'), [B('Athens', 'এথেন্স'), B('Mykonos', 'মিকোনোস'), B('Kuşadası', 'কুশাদাসি'), B('Santorini', 'সান্তোরিনি'), B('Athens', 'এথেন্স')], B('Balcony cabin', 'ব্যালকনি কেবিন'),
       [B('Sunset in Santorini', 'সান্তোরিনিতে সূর্যাস্ত'), B('Ephesus excursion', 'এফেসাস ভ্রমণ'), B('Schengen visa support', 'শেনজেন ভিসা সহায়তা')], badge=B('New', 'নতুন')),
    CR('halong-bay-overnight', 'halong', B('Ha Long Bay Overnight Junk Cruise', 'হা লং বে রাত্রিযাপন জাঙ্ক ক্রুজ'), 'Jade Sail', 'Bay Heritage', 'asia', 2, 38900, None, 4.8, 334, '2026-11-28',
       B('Hanoi', 'হ্যানয়'), [B('Hanoi', 'হ্যানয়'), B('Ha Long Bay', 'হা লং বে'), B('Lan Ha Bay', 'লান হা বে'), B('Hanoi', 'হ্যানয়')], B('Deluxe cabin', 'ডিলাক্স কেবিন'),
       [B('Kayaking among limestone karsts', 'চুনাপাথরের পাহাড়ের মাঝে কায়াকিং'), B('Sunrise tai chi on deck', 'ডেকে সূর্যোদয়ে তাই চি'), B('Cooking class', 'রান্নার ক্লাস')]),
    CR('sundarbans-luxury-3-nights', 'sundarbans', B('Sundarbans Luxury River Cruise', 'সুন্দরবন বিলাসবহুল নৌ-ক্রুজ'), 'MV Bonolata', 'Musafir River Cruises', 'bd', 3, 21500, 24000, 4.9, 521, '2026-12-04',
       B('Khulna', 'খুলনা'), [B('Khulna', 'খুলনা'), B('Harbaria', 'হারবাড়িয়া'), B('Kotka', 'কটকা'), B('Kochikhali', 'কচিখালী'), B('Khulna', 'খুলনা')], B('AC twin cabin', 'এসি টুইন কেবিন'),
       [B('Forest guard & naturalist', 'বনরক্ষী ও প্রকৃতিবিদ'), B('Fresh-catch seafood', 'টাটকা সামুদ্রিক খাবার'), B('Country boat safaris', 'দেশি নৌকায় সাফারি')], badge=B('Domestic', 'দেশীয়')),
    CR('maldives-island-hopper', 'maldives', B('Maldives Island-Hopper Yacht', 'মালদ্বীপ আইল্যান্ড-হপার ইয়ট'), 'Blue Manta', 'Atoll Yachts', 'asia', 5, 145000, None, 4.9, 98, '2027-02-12',
       B('Malé', 'মালে'), [B('Malé', 'মালে'), B('Maafushi', 'মাফুশি'), B('Rasdhoo', 'রাসধু'), B('Fulidhoo', 'ফুলিধু'), B('Malé', 'মালে')], B('Double cabin', 'ডাবল কেবিন'),
       [B('Snorkelling with mantas', 'ম্যান্টার সাথে স্নরকেলিং'), B('Sandbank picnic', 'স্যান্ডব্যাঙ্কে পিকনিক'), B('All meals & soft drinks', 'সব খাবার ও কোমল পানীয়')]),
]
CRUISE = {c['slug']: c for c in CRUISES}
CRUISE_REGIONS = {'asia': B('Southeast Asia', 'দক্ষিণ-পূর্ব এশিয়া'), 'gulf': B('Arabian Gulf', 'আরব উপসাগর'), 'europe': B('Mediterranean', 'ভূমধ্যসাগর'), 'bd': B('Bangladesh', 'বাংলাদেশ')}

# ---------------- Holiday themes ----------------
THEMES = [
    dict(slug='honeymoon', cat='honeymoon', img='maldives', icon='heart', name=B('Honeymoon', 'হানিমুন'),
         tag=B('Romantic escapes with private transfers, upgrades and candle-lit dinners.', 'প্রাইভেট ট্রান্সফার, আপগ্রেড আর মোমবাতির আলোয় ডিনারসহ রোমান্টিক ভ্রমণ।'),
         perks=[B('Free room upgrade on request', 'অনুরোধে ফ্রি রুম আপগ্রেড'), B('Flower & cake setup', 'ফুল ও কেক সাজসজ্জা'), B('Couple photoshoot add-on', 'কাপল ফটোশুট অ্যাড-অন')]),
    dict(slug='family', cat='family', img='singapore', icon='users', name=B('Family holidays', 'পারিবারিক ভ্রমণ'),
         tag=B('Kid-friendly hotels, theme parks and relaxed pacing for all ages.', 'শিশুবান্ধব হোটেল, থিম পার্ক আর সব বয়সীদের জন্য আরামদায়ক গতি।'),
         perks=[B('Kids under 6 travel free on selected dates', 'নির্দিষ্ট তারিখে ৬ বছরের কম শিশু ফ্রি'), B('Family rooms & connecting rooms', 'ফ্যামিলি ও কানেক্টিং রুম'), B('Stroller-friendly itineraries', 'স্ট্রলার-বান্ধব ভ্রমণসূচি')]),
    dict(slug='adventure', cat='adventure', img='nepal', icon='mountain', name=B('Adventure', 'অ্যাডভেঞ্চার'),
         tag=B('Treks, hikes, paragliding and off-the-beaten-path trails with certified guides.', 'সার্টিফায়েড গাইডের সাথে ট্রেক, হাইক, প্যারাগ্লাইডিং ও অচেনা পথ।'),
         perks=[B('Certified trek leaders', 'সার্টিফায়েড ট্রেক লিডার'), B('Gear rental included', 'সরঞ্জাম ভাড়া অন্তর্ভুক্ত'), B('Adventure insurance', 'অ্যাডভেঞ্চার বিমা')]),
    dict(slug='beach', cat='beach', img='phuket', icon='umbrella', name=B('Beach & islands', 'সৈকত ও দ্বীপ'),
         tag=B("From Cox's Bazar and Saint Martin to Phuket, Bali and the Maldives.", 'কক্সবাজার ও সেন্ট মার্টিন থেকে ফুকেট, বালি ও মালদ্বীপ।'),
         perks=[B('Beachfront hotels', 'সৈকতঘেঁষা হোটেল'), B('Snorkel & island-hopping trips', 'স্নরকেল ও দ্বীপ ভ্রমণ'), B('Sunset dinners', 'সূর্যাস্তে ডিনার')]),
    dict(slug='heritage', cat='heritage', img='cappadocia', icon='landmark', name=B('Culture & heritage', 'সংস্কৃতি ও ঐতিহ্য'),
         tag=B('Ancient cities, UNESCO sites, local food and stories told by expert guides.', 'প্রাচীন নগরী, ইউনেস্কো ঐতিহ্য, স্থানীয় খাবার আর বিশেষজ্ঞ গাইডের গল্প।'),
         perks=[B('Licensed historian guides', 'লাইসেন্সধারী ইতিহাসবিদ গাইড'), B('Skip-the-line tickets', 'লাইন ছাড়া প্রবেশ টিকিট'), B('Food walks', 'ফুড ওয়াক')]),
    dict(slug='wildlife', cat='wildlife', img='sundarbans', icon='trees', name=B('Wildlife & nature', 'বন্যপ্রাণী ও প্রকৃতি'),
         tag=B('Mangroves, rainforests and national parks with naturalist guides.', 'প্রকৃতিবিদ গাইডের সাথে ম্যানগ্রোভ, রেইনফরেস্ট ও জাতীয় উদ্যান।'),
         perks=[B('Naturalist on every trip', 'প্রতিটি ট্রিপে প্রকৃতিবিদ'), B('Small groups (max 16)', 'ছোট দল (সর্বোচ্চ ১৬)'), B('Eco-certified stays', 'ইকো-সার্টিফায়েড আবাসন')]),
]
THEME = {t['slug']: t for t in THEMES}

def H(slug, img, name, city, stars, price, old, rating, reviews, dist, amen, kind='hotel', refundable=True, breakfast=True):
    return dict(slug=slug, img=img, name=name, city=city, stars=stars, price=price, old=old, rating=rating, reviews=reviews, dist=dist, amen=amen, kind=kind, refundable=refundable, breakfast=breakfast)
HOTELS = [
    H('ocean-pearl-resort', 'resort', B('Ocean Pearl Resort & Spa', 'ওশান পার্ল রিসোর্ট অ্যান্ড স্পা'), B("Cox's Bazar", 'কক্সবাজার'), 5, 14500, 17800, 9.1, 1284, B('50 m from Inani beach', 'ইনানী সৈকত থেকে ৫০ মিটার'), ['wifi', 'pool', 'spa', 'parking', 'restaurant']),
    H('cloud-valley-resort', 'sajek', B('Cloud Valley Eco Resort', 'ক্লাউড ভ্যালি ইকো রিসোর্ট'), B('Sajek Valley', 'সাজেক ভ্যালি'), 3, 6200, None, 8.7, 412, B('Ruilui Para, valley view', 'রুইলুই পাড়া, ভ্যালি ভিউ'), ['wifi', 'restaurant', 'parking'], refundable=False),
    H('grand-tea-valley', 'darjeeling', B('Grand Tea Valley Resort', 'গ্র্যান্ড টি ভ্যালি রিসোর্ট'), B('Srimangal', 'শ্রীমঙ্গল'), 4, 9800, 11000, 8.9, 655, B('Inside a tea estate', 'চা-বাগানের ভেতরে'), ['wifi', 'pool', 'restaurant', 'gym']),
    H('himalaya-view-pokhara', 'nepal', B('Himalaya View Lakeside Hotel', 'হিমালয় ভিউ লেকসাইড হোটেল'), B('Pokhara', 'পোখারা'), 4, 11800, 13500, 9.0, 1210, B('Lakeside, 3 min walk to Phewa Lake', 'লেকসাইড, ফেওয়া লেক থেকে ৩ মিনিট হাঁটা'), ['wifi', 'restaurant', 'shuttle', 'family']),
    H('ubud-jungle-villas', 'bali', B('Ubud Jungle Pool Villas', 'উবুদ জঙ্গল পুল ভিলা'), B('Ubud, Bali', 'উবুদ, বালি'), 5, 21500, None, 9.3, 980, B('Rice-terrace view, 10 min to Ubud centre', 'ধানক্ষেতের ভিউ, উবুদ কেন্দ্র থেকে ১০ মিনিট'), ['wifi', 'pool', 'spa', 'family']),
    H('bosphorus-boutique', 'istanbul', B('Bosphorus Boutique Hotel', 'বসফরাস বুটিক হোটেল'), B('Istanbul', 'ইস্তাম্বুল'), 4, 16800, 19500, 9.2, 876, B('Sultanahmet, 400 m to Blue Mosque', 'সুলতানাহমেত, ব্লু মস্ক থেকে ৪০০ মিটার'), ['wifi', 'restaurant', 'spa']),
    H('lagoon-water-villas', 'maldives', B('Lagoon Water Villas Maldives', 'লেগুন ওয়াটার ভিলাস মালদ্বীপ'), B('South Malé Atoll', 'সাউথ মালে অ্যাটল'), 5, 58000, 64000, 9.4, 742, B('25 min speedboat from airport', 'বিমানবন্দর থেকে ২৫ মিনিট স্পিডবোটে'), ['wifi', 'pool', 'spa', 'restaurant']),
    H('marina-skyline-dubai', 'dubai', B('Marina Skyline Hotel Dubai', 'মেরিনা স্কাইলাইন হোটেল দুবাই'), B('Dubai', 'দুবাই'), 4, 15200, None, 8.6, 1932, B('Dubai Marina, 2 min to metro', 'দুবাই মেরিনা, মেট্রো থেকে ২ মিনিট'), ['wifi', 'pool', 'gym', 'parking'], breakfast=False),
]
HOTEL = {h['slug']: h for h in HOTELS}
AMENITY = {'wifi': ('wifi', B('Free Wi-Fi', 'ফ্রি ওয়াই-ফাই')), 'pool': ('waves', B('Swimming pool', 'সুইমিং পুল')), 'spa': ('flower-2', B('Spa', 'স্পা')), 'parking': ('square-parking', B('Parking', 'পার্কিং')),
           'restaurant': ('utensils', B('Restaurant', 'রেস্তোরাঁ')), 'gym': ('dumbbell', B('Fitness centre', 'ফিটনেস সেন্টার')), 'shuttle': ('bus', B('Airport shuttle', 'এয়ারপোর্ট শাটল')), 'family': ('baby', B('Family rooms', 'পারিবারিক রুম'))}

# ---------------- Flights ----------------
AIRLINES = [('BG', 'Biman Bangladesh', '#0C6E3F'), ('BS', 'US-Bangla Airlines', '#1D4E9E'), ('EK', 'Emirates', '#C8102E'), ('QR', 'Qatar Airways', '#5C0632'), ('SV', 'Saudia', '#006C35'),
            ('TK', 'Turkish Airlines', '#C70A0C'), ('SQ', 'Singapore Airlines', '#0B2A5B'), ('XY', 'flynas', '#4B2C83'), ('G9', 'Air Arabia', '#E2231A'), ('UL', 'SriLankan', '#18275B')]
FLIGHTS = [
    dict(code='BS', no='BS 341', dep='09:15', arr='12:35', dur=B('5h 20m', '৫ ঘ ২০ মি'), stops=0, price=38450, seats=7, refundable=True, bag='30 kg'),
    dict(code='EK', no='EK 585', dep='10:45', arr='13:55', dur=B('5h 10m', '৫ ঘ ১০ মি'), stops=0, price=52900, seats=4, refundable=True, bag='35 kg'),
    dict(code='BG', no='BG 047', dep='20:30', arr='23:50', dur=B('5h 20m', '৫ ঘ ২০ মি'), stops=0, price=41200, seats=12, refundable=False, bag='40 kg'),
    dict(code='G9', no='G9 513', dep='04:10', arr='07:10', dur=B('5h 00m', '৫ ঘ ০০ মি'), stops=0, price=33780, seats=3, refundable=False, bag='20 kg'),
    dict(code='QR', no='QR 641', dep='03:55', arr='11:20', dur=B('9h 25m', '৯ ঘ ২৫ মি'), stops=1, via='DOH', price=47350, seats=9, refundable=True, bag='30 kg'),
    dict(code='SV', no='SV 805', dep='12:20', arr='19:05', dur=B('8h 45m', '৮ ঘ ৪৫ মি'), stops=1, via='RUH', price=44100, seats=6, refundable=True, bag='46 kg'),
]

# ---------------- Visa ----------------
def V(slug, flag, country, vtype, days, fee, validity, stay, entry, img, docs_extra=()):
    return dict(slug=slug, flag=flag, country=country, vtype=vtype, days=days, fee=fee, validity=validity, stay=stay, entry=entry, img=img, docs_extra=docs_extra)
VISAS = [
    V('thailand', '🇹🇭', B('Thailand', 'থাইল্যান্ড'), B('Tourist e-Visa', 'ট্যুরিস্ট ই-ভিসা'), B('10–14 working days', '১০–১৪ কর্মদিবস'), 6500, B('90 days', '৯০ দিন'), B('60 days', '৬০ দিন'), B('Single', 'একক'), 'phuket'),
    V('malaysia', '🇲🇾', B('Malaysia', 'মালয়েশিয়া'), B('eVisa', 'ই-ভিসা'), B('5–7 working days', '৫–৭ কর্মদিবস'), 5800, B('3 months', '৩ মাস'), B('30 days', '৩০ দিন'), B('Single', 'একক'), 'malaysia'),
    V('singapore', '🇸🇬', B('Singapore', 'সিঙ্গাপুর'), B('Tourist visa', 'ট্যুরিস্ট ভিসা'), B('7–10 working days', '৭–১০ কর্মদিবস'), 7200, B('63 days', '৬৩ দিন'), B('30 days', '৩০ দিন'), B('Multiple', 'একাধিক'), 'singapore'),
    V('uae', '🇦🇪', B('United Arab Emirates', 'সংযুক্ত আরব আমিরাত'), B('30-day e-Visa', '৩০ দিনের ই-ভিসা'), B('3–5 working days', '৩–৫ কর্মদিবস'), 14500, B('58 days', '৫৮ দিন'), B('30 days', '৩০ দিন'), B('Single', 'একক'), 'dubai'),
    V('vietnam', '🇻🇳', B('Vietnam', 'ভিয়েতনাম'), B('Tourist e-Visa', 'ট্যুরিস্ট ই-ভিসা'), B('5–7 working days', '৫–৭ কর্মদিবস'), 7800, B('90 days', '৯০ দিন'), B('90 days', '৯০ দিন'), B('Single / Multiple', 'একক / একাধিক'), 'halong'),
    V('turkey', '🇹🇷', B('Türkiye', 'তুরস্ক'), B('Sticker visa', 'স্টিকার ভিসা'), B('15–20 working days', '১৫–২০ কর্মদিবস'), 11000, B('180 days', '১৮০ দিন'), B('30 days', '৩০ দিন'), B('Single', 'একক'), 'cappadocia'),
    V('india', '🇮🇳', B('India', 'ভারত'), B('Tourist visa (IVAC)', 'ট্যুরিস্ট ভিসা (আইভ্যাক)'), B('7–15 working days', '৭–১৫ কর্মদিবস'), 2500, B('Up to 1 year', 'সর্বোচ্চ ১ বছর'), B('90 days per visit', 'প্রতিবার ৯০ দিন'), B('Multiple', 'একাধিক'), 'kashmir'),
    V('schengen', '🇪🇺', B('Schengen (Europe)', 'শেনজেন (ইউরোপ)'), B('Short-stay C visa', 'স্বল্পমেয়াদি সি ভিসা'), B('15–45 days', '১৫–৪৫ দিন'), 16500, B('As granted', 'অনুমোদন অনুযায়ী'), B('Up to 90 days', 'সর্বোচ্চ ৯০ দিন'), B('Single / Multiple', 'একক / একাধিক'), 'swiss'),
    V('japan', '🇯🇵', B('Japan', 'জাপান'), B('Temporary visitor visa', 'টেম্পোরারি ভিজিটর ভিসা'), B('7–10 working days', '৭–১০ কর্মদিবস'), 4500, B('90 days', '৯০ দিন'), B('15 days', '১৫ দিন'), B('Single', 'একক'), 'japan'),
    V('egypt', '🇪🇬', B('Egypt', 'মিশর'), B('Tourist visa', 'ট্যুরিস্ট ভিসা'), B('10–15 working days', '১০–১৫ কর্মদিবস'), 9500, B('3 months', '৩ মাস'), B('30 days', '৩০ দিন'), B('Single', 'একক'), 'egypt'),
]
VISA = {v['slug']: v for v in VISAS}
VISA_DOCS = {
 'general': [B('Original passport (6+ months validity, 2 blank pages)', 'মূল পাসপোর্ট (৬ মাসের বেশি মেয়াদ, ২টি ফাঁকা পাতা)'), B('Old passports (if any)', 'পুরোনো পাসপোর্ট (যদি থাকে)'), B('2 photos 35×45 mm, white background', 'সাদা ব্যাকগ্রাউন্ডে ৩৫×৪৫ মিমি মাপের ২টি ছবি'), B('NID copy', 'এনআইডির কপি'), B('Bank statement (last 6 months) & solvency certificate', 'ব্যাংক স্টেটমেন্ট (গত ৬ মাস) ও সলভেন্সি সনদ'), B('Return air-ticket booking & hotel booking', 'রিটার্ন টিকিট ও হোটেল বুকিং')],
 'job': [B('NOC / leave letter from employer', 'নিয়োগকর্তার এনওসি / ছুটির চিঠি'), B('Visiting card & office ID', 'ভিজিটিং কার্ড ও অফিস আইডি'), B('Last 3 months salary slips', 'গত ৩ মাসের বেতন স্লিপ')],
 'business': [B('Trade licence (notarised English translation)', 'ট্রেড লাইসেন্স (নোটারিকৃত ইংরেজি অনুবাদ)'), B('Company bank statement', 'প্রতিষ্ঠানের ব্যাংক স্টেটমেন্ট'), B('TIN / tax return certificate', 'টিআইএন / আয়কর রিটার্ন সনদ')],
 'student': [B('Student ID & institution letter', 'শিক্ষার্থী আইডি ও প্রতিষ্ঠানের চিঠি'), B("Parents' bank statement & sponsorship letter", 'অভিভাবকের ব্যাংক স্টেটমেন্ট ও স্পনসরশিপ চিঠি')],
}

# ---------------- Social proof & content ----------------
REVIEWS = [
    dict(name=B('Tanvir & Nusrat Ahmed', 'তানভীর ও নুসরাত আহমেদ'), city=B('Dhaka', 'ঢাকা'), trip=B('Maldives Water-Villa Honeymoon', 'মালদ্বীপ ওয়াটার-ভিলা হানিমুন'), rating=5, date='2026-09-14',
         text=B('Everything was seamless — the speedboat was waiting, our villa was upgraded and the team checked on us every day on WhatsApp. Worth every taka.', 'সবকিছু একদম নিখুঁত ছিল — স্পিডবোট অপেক্ষা করছিল, আমাদের ভিলা আপগ্রেড করে দেওয়া হয়েছিল, আর টিম প্রতিদিন হোয়াটসঅ্যাপে খোঁজ নিয়েছে। প্রতিটি টাকা সার্থক।'), ini='TN'),
    dict(name=B('Mahmud & Shirin Hasan', 'মাহমুদ ও শিরিন হাসান'), city=B('Narayanganj', 'নারায়ণগঞ্জ'), trip=B('Singapore · Penang · Phuket Cruise', 'সিঙ্গাপুর · পেনাং · ফুকেট ক্রুজ'), rating=5, date='2026-07-02',
         text=B('Our first cruise with two kids — the cabin upgrade, the shows and the water park made it unforgettable. Musafir handled visas and boarding papers perfectly.', 'দুই সন্তানকে নিয়ে প্রথম ক্রুজ — কেবিন আপগ্রেড, শো আর ওয়াটার পার্ক মিলিয়ে অবিস্মরণীয়। ভিসা ও বোর্ডিংয়ের কাগজপত্র মুসাফির নিখুঁতভাবে সামলেছে।'), ini='MH'),
    dict(name=B('Farhana Rahman', 'ফারহানা রহমান'), city=B('Chattogram', 'চট্টগ্রাম'), trip=B('Turkey Classic', 'তুরস্ক ক্লাসিক'), rating=5, date='2026-06-21',
         text=B('The Cappadocia balloon ride at sunrise was magical. Visa processing was quick and the guide in Istanbul was brilliant with my parents.', 'কাপাদোকিয়ায় সূর্যোদয়ের বেলুন রাইড ছিল জাদুকরী। ভিসা প্রসেসিং দ্রুত হয়েছে, আর ইস্তাম্বুলের গাইড আমার মা-বাবার সাথে চমৎকার ছিলেন।'), ini='FR'),
    dict(name=B('Rashed Karim', 'রাশেদ করিম'), city=B('Sylhet', 'সিলেট'), trip=B('Corporate retreat — Sajek', 'কর্পোরেট রিট্রিট — সাজেক'), rating=4, date='2026-05-30',
         text=B('Handled 64 colleagues without a hitch. Invoicing and the VAT breakdown made our finance team happy too.', '৬৪ জন সহকর্মীর ভ্রমণ কোনো ঝামেলা ছাড়াই সামলেছেন। ইনভয়েস ও ভ্যাটের বিস্তারিত হিসাবে আমাদের ফিন্যান্স টিমও খুশি।'), ini='RK'),
    dict(name=B('Sumaiya Islam', 'সুমাইয়া ইসলাম'), city=B('Rajshahi', 'রাজশাহী'), trip=B('Nepal: Kathmandu & Pokhara', 'নেপাল: কাঠমান্ডু ও পোখারা'), rating=5, date='2026-04-11',
         text=B('Took my mother to see the Himalayas. The installment plan made it affordable and our guide was so caring and patient.', 'মাকে নিয়ে হিমালয় দেখতে গিয়েছিলাম। কিস্তির সুবিধায় খরচ সাধ্যের মধ্যে ছিল, আর গাইড ছিলেন খুবই যত্নশীল ও ধৈর্যশীল।'), ini='SI'),
    dict(name=B('Imran Chowdhury', 'ইমরান চৌধুরী'), city=B('Khulna', 'খুলনা'), trip=B('Sundarbans Mangrove Cruise', 'সুন্দরবন ম্যানগ্রোভ ক্রুজ'), rating=5, date='2026-02-08',
         text=B('Spotted deer, crocodiles and even fresh tiger pug-marks at Kotka! The food on the boat was outstanding.', 'কটকায় হরিণ, কুমির, এমনকি বাঘের টাটকা পায়ের ছাপও দেখেছি! জাহাজের খাবার ছিল অসাধারণ।'), ini='IC'),
]

TEAM = [
    dict(name=B('Ahmed Zubair', 'আহমেদ জুবায়ের'), role=B('Founder & CEO', 'প্রতিষ্ঠাতা ও প্রধান নির্বাহী'), ini='AZ', c='from-brand-500 to-brand-800'),
    dict(name=B('Nazia Haque', 'নাজিয়া হক'), role=B('Head of Holidays', 'হলিডে বিভাগের প্রধান'), ini='NH', c='from-accent-400 to-accent-700'),
    dict(name=B('Arif Rahman', 'আরিফ রহমান'), role=B('Head of Cruises & Luxury', 'ক্রুজ ও লাক্সারি বিভাগের প্রধান'), ini='AR', c='from-gold-400 to-gold-700'),
    dict(name=B('Shafiqul Alam', 'শফিকুল আলম'), role=B('Head of Air Ticketing', 'এয়ার টিকেটিং বিভাগের প্রধান'), ini='SA', c='from-sky-400 to-sky-700'),
    dict(name=B('Tasnim Akter', 'তাসনিম আক্তার'), role=B('Visa Processing Lead', 'ভিসা প্রসেসিং লিড'), ini='TA', c='from-violet-400 to-violet-700'),
    dict(name=B('Rafiq Uddin', 'রফিক উদ্দিন'), role=B('Corporate & MICE', 'কর্পোরেট ও মাইস'), ini='RU', c='from-emerald-400 to-emerald-700'),
    dict(name=B('Mehjabin Sultana', 'মেহজাবিন সুলতানা'), role=B('Customer Experience', 'কাস্টমার এক্সপেরিয়েন্স'), ini='MS', c='from-rose-400 to-rose-700'),
    dict(name=B('Kamrul Hasan', 'কামরুল হাসান'), role=B('Technology & Product', 'প্রযুক্তি ও প্রোডাক্ট'), ini='KH', c='from-ink-400 to-ink-700'),
]

FAQS = [
    (B('How do I book a tour with Musafir?', 'মুসাফিরের সাথে কীভাবে ট্যুর বুক করব?'), B('Choose a package, pick your date and travellers, then pay a deposit online with bKash, Nagad, card or bank transfer. You get an instant e-voucher by email and SMS.', 'প্যাকেজ বেছে নিয়ে তারিখ ও যাত্রীর সংখ্যা নির্বাচন করুন, এরপর বিকাশ, নগদ, কার্ড বা ব্যাংক ট্রান্সফারে অনলাইনে অগ্রিম পরিশোধ করুন। সঙ্গে সঙ্গে ইমেইল ও এসএমএসে ই-ভাউচার পেয়ে যাবেন।'), 'booking'),
    (B('Can I pay in installments?', 'কিস্তিতে কি পরিশোধ করা যায়?'), B('Yes. International holidays and cruises can be paid in up to 4 installments. Selected bank cards also offer 0% EMI for 3–12 months.', 'হ্যাঁ। আন্তর্জাতিক ট্যুর ও ক্রুজ সর্বোচ্চ ৪ কিস্তিতে পরিশোধ করা যায়। নির্দিষ্ট ব্যাংকের কার্ডে ৩–১২ মাসের ০% ইএমআই সুবিধাও আছে।'), 'payment'),
    (B('Is Musafir a licensed travel agency?', 'মুসাফির কি লাইসেন্সপ্রাপ্ত ট্রাভেল এজেন্সি?'), B('Yes. We are IATA accredited, members of ATAB and TOAB, and registered with the Bangladesh Tourism Board (BTB-2214).', 'হ্যাঁ। আমরা আইএটিএ স্বীকৃত, আটাব ও টোয়াবের সদস্য এবং বাংলাদেশ ট্যুরিজম বোর্ডে নিবন্ধিত (BTB-2214)।'), 'booking'),
    (B('What is your cancellation and refund policy?', 'বাতিল ও রিফান্ড নীতিমালা কী?'), B('Cancellations 30+ days before departure get a full refund minus non-refundable airline, visa and government fees. See the Refund Policy page for the full slab.', 'যাত্রার ৩০ দিনের বেশি আগে বাতিল করলে অফেরতযোগ্য এয়ারলাইন, ভিসা ও সরকারি ফি বাদে পুরো টাকা ফেরত। বিস্তারিত স্ল্যাব রিফান্ড নীতিমালা পাতায় দেখুন।'), 'booking'),
    (B('Do you help with visa processing?', 'আপনারা কি ভিসা প্রসেসিংয়ে সাহায্য করেন?'), B('Yes — document checklists, appointment booking, form filling and submission for 40+ countries. Our visa desk shows your application status in your account.', 'হ্যাঁ — ৪০টিরও বেশি দেশের জন্য কাগজপত্রের তালিকা, অ্যাপয়েন্টমেন্ট, ফরম পূরণ ও জমা দেওয়া। আপনার অ্যাকাউন্টে আবেদনের অবস্থা দেখা যায়।'), 'visa'),
    (B('Are flights included in tour prices?', 'ট্যুরের দামে কি ফ্লাইট অন্তর্ভুক্ত?'), B('Packages marked "Flight included" have return economy tickets. Others are land-only and you can add flights during booking.', '"ফ্লাইটসহ" চিহ্নিত প্যাকেজে রিটার্ন ইকোনমি টিকিট থাকে। বাকিগুলো ল্যান্ড-অনলি; বুকিংয়ের সময় ফ্লাইট যোগ করা যায়।'), 'booking'),
    (B('Do I need travel insurance?', 'ভ্রমণ বিমা কি দরকার?'), B('It is mandatory for Schengen and strongly recommended everywhere else. Our plans start at ৳600 and cover medical costs, delays and lost baggage.', 'শেনজেনের জন্য বাধ্যতামূলক, অন্য সব জায়গায়ও জোরালোভাবে প্রস্তাবিত। আমাদের প্ল্যান ৳৬০০ থেকে শুরু, যাতে চিকিৎসা খরচ, বিলম্ব ও ব্যাগেজ হারানো কভার করা হয়।'), 'visa'),
    (B('Can you cater for dietary needs abroad?', 'বিদেশে কি বিশেষ খাদ্যাভ্যাসের ব্যবস্থা করেন?'), B('Yes. Tell us your needs (vegetarian, allergies, diabetic and more) and we brief hotels and restaurants in advance.', 'হ্যাঁ। আপনার চাহিদা (নিরামিষ, অ্যালার্জি, ডায়াবেটিক ইত্যাদি) জানালে আমরা আগেই হোটেল ও রেস্তোরাঁকে জানিয়ে রাখি।'), 'booking'),
    (B('Which payment methods do you accept?', 'কোন কোন পেমেন্ট মাধ্যম গ্রহণ করেন?'), B('bKash, Nagad, Rocket, Visa, Mastercard, American Express, internet banking through SSLCommerz, and bank deposit.', 'বিকাশ, নগদ, রকেট, ভিসা, মাস্টারকার্ড, আমেরিকান এক্সপ্রেস, এসএসএলকমার্জের মাধ্যমে ইন্টারনেট ব্যাংকিং এবং ব্যাংক ডিপোজিট।'), 'payment'),
    (B('How can I check my booking status?', 'বুকিংয়ের অবস্থা কীভাবে দেখব?'), B('Log in to My Account to see bookings, invoices, documents and visa application status, or call our 24/7 hotline.', 'মাই অ্যাকাউন্টে লগইন করে বুকিং, ইনভয়েস, ডকুমেন্ট ও ভিসা আবেদনের অবস্থা দেখুন, অথবা ২৪/৭ হটলাইনে কল করুন।'), 'booking'),
]

OFFERS = [
    dict(code='WINTER26', img='coxsbazar', title=B("Winter beach sale — Cox's Bazar", 'শীতের সৈকত অফার — কক্সবাজার'), off=B('Up to 20% off', 'সর্বোচ্চ ২০% ছাড়'), ends='2026-11-30', tag=B('Domestic', 'দেশীয়'), link='tours/coxs-bazar-saint-martin.html'),
    dict(code='BKASH1500', img='maldives', title=B('৳1,500 instant cashback with bKash', 'বিকাশে ৳১,৫০০ তাৎক্ষণিক ক্যাশব্যাক'), off=B('৳1,500 cashback', '৳১,৫০০ ক্যাশব্যাক'), ends='2026-12-15', tag=B('Payment', 'পেমেন্ট'), link='tours.html'),
    dict(code='CRUISE-EMI', img='cruise', title=B('Cruises on 0% EMI for 12 months', '১২ মাসের ০% ইএমআইতে ক্রুজ'), off=B('0% EMI', '০% ইএমআই'), ends='2027-01-31', tag=B('Cruise', 'ক্রুজ'), link='cruises.html'),
    dict(code='FLYDXB', img='plane', title=B('Dhaka → Dubai fares from ৳33,780', 'ঢাকা → দুবাই ভাড়া ৳৩৩,৭৮০ থেকে'), off=B('Save ৳4,000', '৳৪,০০০ সাশ্রয়'), ends='2026-11-10', tag=B('Flights', 'ফ্লাইট'), link='flights.html'),
    dict(code='HONEY10', img='bali', title=B('Honeymoon specials: Bali & Maldives', 'হানিমুন স্পেশাল: বালি ও মালদ্বীপ'), off=B('10% off + free upgrade', '১০% ছাড় + ফ্রি আপগ্রেড'), ends='2026-12-31', tag=B('Honeymoon', 'হানিমুন'), link='tours.html?type=honeymoon'),
    dict(code='GROUP15', img='sajek', title=B('Groups of 15+ save more', '১৫+ জনের গ্রুপে বেশি সাশ্রয়'), off=B('15% group discount', '১৫% গ্রুপ ছাড়'), ends='2027-03-31', tag=B('Groups', 'গ্রুপ'), link='group-tours.html'),
]

BLOG = [
    dict(slug='first-cruise-guide', img='cruise', cat=B('Cruises', 'ক্রুজ'), date='2026-10-12', mins=8, author=B('Arif Rahman', 'আরিফ রহমান'),
         title=B('Your first cruise from Bangladesh: costs, cabins and what to pack', 'বাংলাদেশ থেকে প্রথম ক্রুজ: খরচ, কেবিন ও যা সাথে নেবেন'),
         ex=B('Inside vs balcony cabins, what is included on board, visas for Singapore cruises and a packing list you can print.', 'ইনসাইড নাকি ব্যালকনি কেবিন, জাহাজে কী কী অন্তর্ভুক্ত, সিঙ্গাপুর ক্রুজের ভিসা এবং প্রিন্টযোগ্য প্যাকিং তালিকা।')),
    dict(slug='sajek-travel-guide', img='sajek', cat=B('Bangladesh', 'বাংলাদেশ'), date='2026-09-28', mins=6, author=B('Nazia Haque', 'নাজিয়া হক'),
         title=B('Sajek Valley in 2026: the complete first-timer guide', 'সাজেক ভ্যালি ২০২৬: প্রথমবার যাওয়ার পূর্ণাঙ্গ গাইড'),
         ex=B('When to go for the cloud sea, where to stay, jeep costs from Khagrachari and responsible-travel tips.', 'মেঘের সমুদ্র দেখতে কখন যাবেন, কোথায় থাকবেন, খাগড়াছড়ি থেকে জিপ ভাড়া এবং দায়িত্বশীল ভ্রমণের টিপস।')),
    dict(slug='maldives-on-a-budget', img='maldives', cat=B('Honeymoon', 'হানিমুন'), date='2026-09-09', mins=7, author=B('Nazia Haque', 'নাজিয়া হক'),
         title=B('Maldives on a budget: local islands vs resorts', 'কম খরচে মালদ্বীপ: লোকাল আইল্যান্ড নাকি রিসোর্ট'),
         ex=B('How Bangladeshi couples can do the Maldives for under ৳1 lakh — and when a water villa is worth it.', 'বাংলাদেশি দম্পতিরা কীভাবে ১ লাখ টাকার কমে মালদ্বীপ ঘুরতে পারেন — আর কখন ওয়াটার ভিলা সত্যিই মূল্যবান।')),
    dict(slug='schengen-visa-checklist', img='swiss', cat=B('Visa', 'ভিসা'), date='2026-08-22', mins=9, author=B('Tasnim Akter', 'তাসনিম আক্তার'),
         title=B('Schengen visa from Dhaka: a 2026 checklist that actually works', 'ঢাকা থেকে শেনজেন ভিসা: ২০২৬ সালের কার্যকর চেকলিস্ট'),
         ex=B('Bank statements, cover letters, travel insurance and the mistakes that cause most refusals.', 'ব্যাংক স্টেটমেন্ট, কভার লেটার, ভ্রমণ বিমা এবং যেসব ভুলে বেশিরভাগ আবেদন বাতিল হয়।')),
    dict(slug='family-holiday-singapore', img='singapore', cat=B('Family', 'পরিবার'), date='2026-08-03', mins=7, author=B('Nazia Haque', 'নাজিয়া হক'),
         title=B('Singapore with kids: a 5-day family plan that works', 'শিশুদের নিয়ে সিঙ্গাপুর: ৫ দিনের কার্যকর পারিবারিক পরিকল্পনা'),
         ex=B('Sentosa, Universal Studios, the zoo and Gardens by the Bay — with budgets, MRT tips and kid-friendly food.', 'সেন্তোসা, ইউনিভার্সাল স্টুডিওস, চিড়িয়াখানা ও গার্ডেনস বাই দ্য বে — বাজেট, এমআরটি টিপস ও শিশুবান্ধব খাবারসহ।')),
    dict(slug='turkey-itinerary-10-days', img='cappadocia', cat=B('International', 'আন্তর্জাতিক'), date='2026-07-18', mins=8, author=B('Farhan Kabir', 'ফারহান কবির'),
         title=B('The perfect 10-day Türkiye itinerary for Bangladeshi travellers', 'বাংলাদেশি ভ্রমণকারীদের জন্য ১০ দিনের আদর্শ তুরস্ক ভ্রমণসূচি'),
         ex=B('Istanbul, Bursa, Cappadocia and Pamukkale — with food spots, budgets and visa tips.', 'ইস্তাম্বুল, বুরসা, কাপাদোকিয়া ও পামুক্কালে — খাবারের ঠিকানা, বাজেট ও ভিসা টিপসসহ।')),
]
POST = {p['slug']: p for p in BLOG}

CAREERS = [
    dict(title=B('Senior Travel Consultant (International)', 'সিনিয়র ট্রাভেল কনসালট্যান্ট (আন্তর্জাতিক)'), dept=B('Holidays', 'হলিডে'), loc=B('Banani, Dhaka', 'বনানী, ঢাকা'), type=B('Full-time', 'পূর্ণকালীন'), exp=B('3+ years', '৩+ বছর')),
    dict(title=B('Air Ticketing Executive (GDS — Sabre/Amadeus)', 'এয়ার টিকেটিং এক্সিকিউটিভ (জিডিএস — সেবার/অ্যামাডিউস)'), dept=B('Air Ticketing', 'এয়ার টিকেটিং'), loc=B('Banani, Dhaka', 'বনানী, ঢাকা'), type=B('Full-time', 'পূর্ণকালীন'), exp=B('2+ years', '২+ বছর')),
    dict(title=B('Cruise & Holidays Sales Executive', 'ক্রুজ ও হলিডে সেলস এক্সিকিউটিভ'), dept=B('Cruises', 'ক্রুজ'), loc=B('Banani, Dhaka', 'বনানী, ঢাকা'), type=B('Full-time', 'পূর্ণকালীন'), exp=B('2+ years', '২+ বছর')),
    dict(title=B('Visa Documentation Officer', 'ভিসা ডকুমেন্টেশন অফিসার'), dept=B('Visa', 'ভিসা'), loc=B('Chattogram', 'চট্টগ্রাম'), type=B('Full-time', 'পূর্ণকালীন'), exp=B('1+ year', '১+ বছর')),
    dict(title=B('Frontend Engineer (Next.js)', 'ফ্রন্টএন্ড ইঞ্জিনিয়ার (নেক্সট.জেএস)'), dept=B('Technology', 'প্রযুক্তি'), loc=B('Hybrid, Dhaka', 'হাইব্রিড, ঢাকা'), type=B('Full-time', 'পূর্ণকালীন'), exp=B('3+ years', '৩+ বছর')),
]

STATS = [(120000, '+', B('Happy travellers', 'সন্তুষ্ট ভ্রমণকারী')), (14, '', B('Years of service', 'বছরের সেবা')), (18500, '+', B('Visas processed', 'ভিসা প্রসেস')), (48, '', B('Countries covered', 'দেশে সেবা'))]

# ---------------- Activities & experiences ----------------
def A(slug, img, title, city, cat, dur, price, old, rating, reviews, cancel, hl, lang=('en', 'bn'), instant=True, badge=None, pickup=False):
    return dict(slug=slug, img=img, title=title, city=city, cat=cat, dur=dur, price=price, old=old, rating=rating, reviews=reviews, cancel=cancel, hl=hl, langs=lang, instant=instant, badge=badge, pickup=pickup)
ACT_CATS = {'tour': ('map', B('Day tours', 'ডে-ট্যুর')), 'water': ('waves', B('Water & boats', 'পানি ও নৌকা')), 'adventure': ('mountain', B('Adventure', 'অ্যাডভেঞ্চার')),
            'tickets': ('ticket', B('Attractions & tickets', 'আকর্ষণ ও টিকিট')), 'food': ('utensils', B('Food & culture', 'খাবার ও সংস্কৃতি')), 'transfer': ('car', B('Transfers', 'ট্রান্সফার'))}
CANCEL = {'free24': ('free', B('Free cancellation · 24 h', 'ফ্রি বাতিল · ২৪ ঘণ্টা')), 'free72': ('free', B('Free cancellation · 72 h', 'ফ্রি বাতিল · ৭২ ঘণ্টা')),
          'free30': ('free', B('Free cancellation · 30 days', 'ফ্রি বাতিল · ৩০ দিন')), 'free7': ('free', B('Free cancellation · 7 days', 'ফ্রি বাতিল · ৭ দিন')),
          'partial': ('partial', B('Partial refund', 'আংশিক রিফান্ড')), 'none': ('none', B('Non-refundable', 'অফেরতযোগ্য'))}
ACTIVITIES = [
    A('cappadocia-balloon-sunrise', 'cappadocia', B('Cappadocia hot-air balloon flight at sunrise', 'সূর্যোদয়ে কাপাদোকিয়ার হট-এয়ার বেলুন ফ্লাইট'), B('Cappadocia, Türkiye', 'কাপাদোকিয়া, তুরস্ক'), 'adventure', B('3–4 hours', '৩–৪ ঘণ্টা'), 24500, 27500, 4.9, 3812, 'free24',
      [B('1 hour flight over fairy chimneys', 'পরী-চিমনির ওপর ১ ঘণ্টার ফ্লাইট'), B('Hotel pickup & champagne-free toast', 'হোটেল পিকআপ ও উদ্‌যাপন'), B('Flight certificate', 'ফ্লাইট সার্টিফিকেট')], badge=B('Likely to sell out', 'দ্রুত শেষ হতে পারে'), pickup=True),
    A('saint-martin-day-cruise', 'stmartin', B("Saint Martin's Island day cruise from Teknaf", 'টেকনাফ থেকে সেন্ট মার্টিন দ্বীপ ডে-ক্রুজ'), B("Cox's Bazar, Bangladesh", 'কক্সবাজার, বাংলাদেশ'), 'water', B('12 hours', '১২ ঘণ্টা'), 3200, None, 4.6, 1240, 'free24',
      [B('Return ship ticket', 'যাওয়া-আসার জাহাজের টিকিট'), B('Seafood lunch', 'সামুদ্রিক খাবারে দুপুরের খাবার'), B('Chera Dwip by van', 'ভ্যানে ছেঁড়া দ্বীপ')], pickup=True),
    A('sundarbans-day-safari', 'sundarbans', B('Sundarbans day safari from Mongla', 'মোংলা থেকে সুন্দরবন ডে-সাফারি'), B('Khulna, Bangladesh', 'খুলনা, বাংলাদেশ'), 'tour', B('9 hours', '৯ ঘণ্টা'), 4500, 5200, 4.7, 688, 'free72',
      [B('Karamjal wildlife centre', 'করমজল বন্যপ্রাণী কেন্দ্র'), B('Armed forest guard', 'সশস্ত্র বনরক্ষী'), B('Lunch on boat', 'নৌকায় দুপুরের খাবার')]),
    A('dubai-desert-safari', 'dubai', B('Dubai evening desert safari with BBQ dinner', 'বারবিকিউ ডিনারসহ দুবাই সন্ধ্যার মরু সাফারি'), B('Dubai, UAE', 'দুবাই, সংযুক্ত আরব আমিরাত'), 'adventure', B('6 hours', '৬ ঘণ্টা'), 6900, 8500, 4.8, 9214, 'free24',
      [B('Dune bashing in 4x4', '৪x৪-এ ডিউন ব্যাশিং'), B('Camel ride & sandboarding', 'উটের পিঠে চড়া ও স্যান্ডবোর্ডিং'), B('Live shows & BBQ', 'লাইভ শো ও বারবিকিউ')], badge=B('Bestseller', 'সেরা বিক্রিত'), pickup=True),
    A('bali-ubud-swing-waterfalls', 'bali', B('Ubud jungle swing, rice terraces & waterfalls', 'উবুদ জঙ্গল সুইং, ধানক্ষেত ও ঝরনা'), B('Bali, Indonesia', 'বালি, ইন্দোনেশিয়া'), 'tour', B('10 hours', '১০ ঘণ্টা'), 7400, None, 4.8, 5120, 'free24',
      [B('Tegallalang rice terraces', 'তেগাল্লালাং ধানক্ষেত'), B('Tegenungan waterfall', 'তেগেনুংগান ঝরনা'), B('Private driver-guide', 'প্রাইভেট ড্রাইভার-গাইড')], pickup=True),
    A('singapore-universal-studios', 'singapore', B('Universal Studios Singapore — 1-day ticket', 'ইউনিভার্সাল স্টুডিওস সিঙ্গাপুর — ১ দিনের টিকিট'), B('Sentosa, Singapore', 'সেন্তোসা, সিঙ্গাপুর'), 'tickets', B('Full day', 'সারাদিন'), 8900, 9600, 4.7, 12840, 'none',
      [B('Instant e-ticket', 'তাৎক্ষণিক ই-টিকিট'), B('All rides & shows', 'সব রাইড ও শো'), B('Skip the ticket queue', 'টিকিটের লাইন এড়িয়ে')]),
    A('phuket-phi-phi-speedboat', 'phuket', B('Phi Phi & Maya Bay speedboat tour with snorkelling', 'স্নরকেলিংসহ ফি ফি ও মায়া বে স্পিডবোট ট্যুর'), B('Phuket, Thailand', 'ফুকেট, থাইল্যান্ড'), 'water', B('8 hours', '৮ ঘণ্টা'), 6200, 7000, 4.6, 7322, 'free24',
      [B('Maya Bay & Pileh Lagoon', 'মায়া বে ও পিলেহ লেগুন'), B('Snorkel gear included', 'স্নরকেল সরঞ্জাম অন্তর্ভুক্ত'), B('Thai buffet lunch', 'থাই বুফে লাঞ্চ')], pickup=True),
    A('old-dhaka-food-walk', 'dhaka', B('Old Dhaka food & heritage walk', 'পুরান ঢাকার খাবার ও ঐতিহ্য হাঁটা'), B('Dhaka, Bangladesh', 'ঢাকা, বাংলাদেশ'), 'food', B('4 hours', '৪ ঘণ্টা'), 2800, None, 4.9, 864, 'free24',
      [B('10+ tastings incl. biryani & lassi', 'বিরিয়ানি ও লাচ্ছিসহ ১০+ স্বাদ'), B('Ahsan Manzil & Shankhari Bazar', 'আহসান মঞ্জিল ও শাঁখারীবাজার'), B('Rickshaw ride', 'রিকশা ভ্রমণ')], badge=B('Local favourite', 'স্থানীয়দের প্রিয়')),
    A('pokhara-paragliding', 'nepal', B('Pokhara tandem paragliding over Phewa Lake', 'ফেওয়া লেকের ওপর পোখারা ট্যান্ডেম প্যারাগ্লাইডিং'), B('Pokhara, Nepal', 'পোখারা, নেপাল'), 'adventure', B('30 min flight', '৩০ মিনিটের ফ্লাইট'), 9800, None, 4.9, 2210, 'free72',
      [B('Himalaya views on clear days', 'পরিষ্কার দিনে হিমালয়ের দৃশ্য'), B('Licensed pilot', 'লাইসেন্সধারী পাইলট'), B('GoPro video add-on', 'গোপ্রো ভিডিও অ্যাড-অন')], pickup=True),
    A('istanbul-bosphorus-dinner-cruise', 'istanbul', B('Bosphorus dinner cruise with Turkish night show', 'টার্কিশ নাইট শোসহ বসফরাস ডিনার ক্রুজ'), B('Istanbul, Türkiye', 'ইস্তাম্বুল, তুরস্ক'), 'water', B('3.5 hours', '৩.৫ ঘণ্টা'), 5600, 6400, 4.5, 4108, 'free24',
      [B('3-course dinner', '৩-কোর্স ডিনার'), B('Whirling dervish & folk dance', 'ঘূর্ণি দরবেশ ও লোকনৃত্য'), B('Hotel transfers', 'হোটেল ট্রান্সফার')], pickup=True),
    A('ratargul-boat-ride', 'ratargul', B('Ratargul swamp forest boat ride', 'রাতারগুল জলাবনে নৌকা ভ্রমণ'), B('Sylhet, Bangladesh', 'সিলেট, বাংলাদেশ'), 'water', B('5 hours', '৫ ঘণ্টা'), 2400, None, 4.7, 532, 'free24',
      [B('Country boat with boatman', 'মাঝিসহ দেশি নৌকা'), B('Watchtower view', 'ওয়াচটাওয়ার থেকে দৃশ্য'), B('Return car from Sylhet', 'সিলেট থেকে যাওয়া-আসার গাড়ি')], pickup=True),
    A('dhaka-airport-transfer', 'plane', B('Dhaka airport private transfer (HSIA)', 'ঢাকা এয়ারপোর্ট প্রাইভেট ট্রান্সফার (শাহজালাল বিমানবন্দর)'), B('Dhaka, Bangladesh', 'ঢাকা, বাংলাদেশ'), 'transfer', B('Up to 1.5 hours', 'সর্বোচ্চ ১.৫ ঘণ্টা'), 1800, None, 4.8, 3120, 'free24',
      [B('Meet & greet with name board', 'নাম-বোর্ডসহ অভ্যর্থনা'), B('60 min free waiting', '৬০ মিনিট ফ্রি অপেক্ষা'), B('AC sedan or microbus', 'এসি সেডান বা মাইক্রোবাস')]),
]
ACTIVITY = {a['slug']: a for a in ACTIVITIES}

# cancellation policy per tour (shown as badges)
for _x in TOURS:
    _x['cancel'] = 'free7' if _x['region'] == 'bd' else ('free30' if not _x.get('visa') else 'partial')
for _c in CRUISES:
    _c['cancel'] = 'partial' if _c['region'] != 'bd' else 'free7'

# --- activity → destination mapping, region, trip-planner cost model (per person, mid-range, BDT) ---
ACT_DEST = {'cappadocia-balloon-sunrise': 'turkey', 'saint-martin-day-cruise': 'coxs-bazar', 'sundarbans-day-safari': 'sundarbans', 'dubai-desert-safari': 'dubai',
            'bali-ubud-swing-waterfalls': 'bali', 'singapore-universal-studios': 'singapore-malaysia', 'phuket-phi-phi-speedboat': 'thailand', 'old-dhaka-food-walk': None,
            'pokhara-paragliding': 'nepal', 'istanbul-bosphorus-dinner-cruise': 'turkey', 'ratargul-boat-ride': 'sylhet', 'dhaka-airport-transfer': None}
for _a in ACTIVITIES:
    _a['dest'] = ACT_DEST.get(_a['slug'])
    _a['region'] = 'bd' if 'Bangladesh' in _a['city']['en'] else 'intl'
PLAN_COST = {'coxs-bazar': (6500, 5500), 'sajek-valley': (5500, 3000), 'sylhet': (6000, 4500), 'sundarbans': (7500, 2500), 'maldives': (28000, 38000),
             'turkey': (16000, 75000), 'bali': (14000, 52000), 'dubai': (18000, 42000), 'nepal': (9000, 24000), 'thailand': (12000, 32000),
             'bhutan': (13000, 30000), 'singapore-malaysia': (17000, 40000)}  # (land cost per day, return airfare from Dhaka)
