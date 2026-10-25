"""Admin console — noindex, dummy data from data_app."""
import json
from core import B, STATE
import data_app as A
import data_public as P

NAV = [
 (None, [('index', 'admin/index.html', 'layout-dashboard', B('Dashboard', 'ড্যাশবোর্ড'), None), ('reports', 'admin/reports.html', 'chart-column', B('Reports', 'রিপোর্ট'), None)]),
 (B('Sales', 'বিক্রয়'), [('bookings', 'admin/bookings.html', 'luggage', B('Bookings', 'বুকিং'), 12), ('leads', 'admin/leads.html', 'kanban', B('Leads & enquiries', 'লিড ও অনুসন্ধান'), 4),
        ('customers', 'admin/customers.html', 'users', B('Customers', 'গ্রাহক'), None), ('payments', 'admin/payments.html', 'circle-dollar-sign', B('Payments & refunds', 'পেমেন্ট ও রিফান্ড'), 2),
        ('coupons', 'admin/coupons.html', 'badge-percent', B('Coupons & deals', 'কুপন ও ডিল'), None)]),
 (B('Catalog', 'ক্যাটালগ'), [('tours', 'admin/tours.html', 'map', B('Holiday packages', 'হলিডে প্যাকেজ'), None), ('cruises', 'admin/cruises.html', 'ship', B('Cruises', 'ক্রুজ'), None),
        ('activities', 'admin/activities.html', 'ticket', B('Activities', 'অ্যাক্টিভিটি'), None), ('themes', 'admin/themes.html', 'shapes', B('Themes & destinations', 'থিম ও গন্তব্য'), None),
        ('visa', 'admin/visa.html', 'stamp', B('Visa desk', 'ভিসা ডেস্ক'), 3)]),
 (B('Content', 'কনটেন্ট'), [('reviews', 'admin/reviews.html', 'star', B('Reviews', 'রিভিউ'), 2), ('cms', 'admin/cms.html', 'file-text', B('Pages, blog & banners', 'পেজ, ব্লগ ও ব্যানার'), None),
        ('media', 'admin/media.html', 'image', B('Media library', 'মিডিয়া লাইব্রেরি'), None)]),
 (B('Organisation', 'প্রতিষ্ঠান'), [('agents', 'admin/agents.html', 'building-2', B('B2B agents', 'বিটুবি এজেন্ট'), 1), ('staff', 'admin/staff.html', 'user-cog', B('Staff & roles', 'স্টাফ ও রোল'), None),
        ('tickets', 'admin/tickets.html', 'headset', B('Support tickets', 'সাপোর্ট টিকিট'), 3), ('notifications', 'admin/notifications.html', 'megaphone', B('Notifications & campaigns', 'নোটিফিকেশন ও ক্যাম্পেইন'), None),
        ('settings', 'admin/settings.html', 'settings', B('Settings', 'সেটিংস'), None), ('logs', 'admin/logs.html', 'scroll-text', B('Audit log', 'অডিট লগ'), None)]),
]
TITLES = {
 'index': (B('Admin dashboard', 'অ্যাডমিন ড্যাশবোর্ড'), B('Sales, bookings and operations at a glance.', 'বিক্রয়, বুকিং ও অপারেশন এক নজরে।')),
 'reports': (B('Reports', 'রিপোর্ট'), B('Revenue, margin, channel and destination performance.', 'আয়, মার্জিন, চ্যানেল ও গন্তব্যভিত্তিক পারফরম্যান্স।')),
 'bookings': (B('Bookings', 'বুকিং'), B('All bookings across holidays, cruises, flights, hotels, visas and activities.', 'হলিডে, ক্রুজ, ফ্লাইট, হোটেল, ভিসা ও অ্যাক্টিভিটির সব বুকিং।')),
 'booking': (B('Booking MSF-26-48213', 'বুকিং MSF-26-48213'), B('Booking detail, payments, documents and timeline.', 'বুকিংয়ের বিস্তারিত, পেমেন্ট, ডকুমেন্ট ও টাইমলাইন।')),
 'leads': (B('Leads & enquiries', 'লিড ও অনুসন্ধান'), B('Pipeline from enquiry to booking.', 'অনুসন্ধান থেকে বুকিং পর্যন্ত পাইপলাইন।')),
 'customers': (B('Customers', 'গ্রাহক'), B('Traveller accounts, tiers and lifetime value.', 'ভ্রমণকারীর অ্যাকাউন্ট, স্তর ও লাইফটাইম ভ্যালু।')),
 'customer': (B('Farhana Rahman', 'ফারহানা রহমান'), B('Customer profile, bookings and notes.', 'গ্রাহকের প্রোফাইল, বুকিং ও নোট।')),
 'payments': (B('Payments & refunds', 'পেমেন্ট ও রিফান্ড'), B('Gateway transactions, settlements and refunds.', 'গেটওয়ে লেনদেন, সেটেলমেন্ট ও রিফান্ড।')),
 'coupons': (B('Coupons & deals', 'কুপন ও ডিল'), B('Promo codes, flash deals and bank offers.', 'প্রোমো কোড, ফ্ল্যাশ ডিল ও ব্যাংক অফার।')),
 'tours': (B('Holiday packages', 'হলিডে প্যাকেজ'), B('Domestic and international packages.', 'দেশীয় ও আন্তর্জাতিক প্যাকেজ।')),
 'tour-edit': (B('Edit package', 'প্যাকেজ এডিট'), B('Content, pricing, departures, SEO and media.', 'কনটেন্ট, মূল্য, যাত্রার তারিখ, এসইও ও মিডিয়া।')),
 'cruises': (B('Cruises', 'ক্রুজ'), B('Sailings, cabins and allocations.', 'সেলিং, কেবিন ও বরাদ্দ।')),
 'activities': (B('Activities', 'অ্যাক্টিভিটি'), B('Day tours, experiences and tickets.', 'ডে-ট্যুর, অভিজ্ঞতা ও টিকিট।')),
 'themes': (B('Themes & destinations', 'থিম ও গন্তব্য'), B('Holiday themes and destination guides.', 'হলিডে থিম ও গন্তব্য গাইড।')),
 'visa': (B('Visa desk', 'ভিসা ডেস্ক'), B('Application queue and document checks.', 'আবেদনের সারি ও কাগজপত্র যাচাই।')),
 'reviews': (B('Reviews', 'রিভিউ'), B('Moderate and reply to traveller reviews.', 'ভ্রমণকারীদের রিভিউ মডারেট ও উত্তর।')),
 'cms': (B('Pages, blog & banners', 'পেজ, ব্লগ ও ব্যানার'), B('Website content management.', 'ওয়েবসাইটের কনটেন্ট ব্যবস্থাপনা।')),
 'media': (B('Media library', 'মিডিয়া লাইব্রেরি'), B('Images, licences and alt text.', 'ছবি, লাইসেন্স ও অল্ট টেক্সট।')),
 'agents': (B('B2B agents', 'বিটুবি এজেন্ট'), B('Partner agencies, commission and credit.', 'পার্টনার এজেন্সি, কমিশন ও ক্রেডিট।')),
 'staff': (B('Staff & roles', 'স্টাফ ও রোল'), B('Team members and role-based permissions.', 'টিম সদস্য ও রোলভিত্তিক অনুমতি।')),
 'tickets': (B('Support tickets', 'সাপোর্ট টিকিট'), B('Customer requests and SLAs.', 'গ্রাহকের অনুরোধ ও এসএলএ।')),
 'notifications': (B('Notifications & campaigns', 'নোটিফিকেশন ও ক্যাম্পেইন'), B('SMS, email, WhatsApp and push templates.', 'এসএমএস, ইমেইল, হোয়াটসঅ্যাপ ও পুশ টেমপ্লেট।')),
 'settings': (B('Settings', 'সেটিংস'), B('Company, payments, taxes, languages and integrations.', 'কোম্পানি, পেমেন্ট, ট্যাক্স, ভাষা ও ইন্টিগ্রেশন।')),
 'logs': (B('Audit log', 'অডিট লগ'), B('Every sensitive action, who and when.', 'প্রতিটি গুরুত্বপূর্ণ কাজ — কে ও কখন।')),
}
PARENT = {'booking': 'bookings', 'customer': 'customers', 'tour-edit': 'tours'}
CHARTS = {'index', 'reports'}

def chart_cfg(L):
    m = A.MONTHS_BN if L == 'bn' else A.MONTHS_EN
    rev = {"type": "line", "data": {"labels": m, "datasets": [
        {"label": "2026" if L == 'en' else "২০২৬", "data": [v * 100000 for v in A.REV], "borderColor": "#14A497", "fill": True, "tension": .35, "pointRadius": 0, "borderWidth": 2.5},
        {"label": "2025" if L == 'en' else "২০২৫", "data": [v * 100000 for v in A.REV_LY], "borderColor": "#F6A33B", "borderDash": [5, 5], "tension": .35, "pointRadius": 0, "borderWidth": 2}]},
        "options": {"plugins": {"legend": {"display": True, "position": "bottom", "labels": {"boxWidth": 10, "usePointStyle": True}}}}}
    mix = {"type": "doughnut", "data": {"labels": [x[0][L] for x in A.MIX], "datasets": [{"data": [x[1] for x in A.MIX], "backgroundColor": [x[2] for x in A.MIX], "borderWidth": 0}]}, "options": {"cutout": "68%"}}
    bk = {"type": "bar", "data": {"labels": m, "datasets": [{"label": "Bookings" if L == 'en' else "বুকিং", "data": [612, 844, 790, 541, 498, 452, 566, 520, 489, 601, 738, 812], "backgroundColor": "#0D6B65", "borderRadius": 6}]}}
    ch = {"type": "bar", "data": {"labels": [c[1][L] for c in A.CHANNELS], "datasets": [{"label": "%", "data": [48, 21, 17, 9, 5], "backgroundColor": ["#0D6B65", "#14A497", "#1FAF38", "#F6A33B", "#64748B"], "borderRadius": 6}]}, "options": {"indexAxis": "y"}}
    return {k: json.dumps(v, ensure_ascii=False) for k, v in dict(rev=rev, mix=mix, bk=bk, ch=ch).items()}

def build(render, L):
    home = B('Admin', 'অ্যাডমিন')
    STATE['lang'] = L
    cc = chart_cfg(L)
    for key, (title, desc) in TITLES.items():
        crumbs = None if key == 'index' else [(home, 'admin/index.html')] + ([(TITLES[PARENT[key]][0], f'admin/{PARENT[key]}.html')] if key in PARENT else []) + [(title, f'admin/{key}.html')]
        render(f'admin/{key}.html', f'admin/{key}.html', title, desc, lang=L, noindex=True, area='admin', nav=NAV, nav_active=PARENT.get(key, key), crumbs_ui=crumbs,
               charts=key in CHARTS, cc=cc)
    render('admin/login.html', 'admin/login.html', B('Staff sign-in', 'স্টাফ সাইন-ইন'), B('Musafir admin console sign-in.', 'মুসাফির অ্যাডমিন কনসোল সাইন-ইন।'), lang=L, noindex=True)
