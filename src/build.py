#!/usr/bin/env python3
"""Build the Musafir static mock: python3 src/build.py  (then tooling: npx tailwindcss)"""
import os, sys, json, shutil, re, time
sys.path.insert(0, os.path.dirname(__file__))
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup
import core
from core import STATE, B, tr, t, digits, num, bdt, date, icon, rel, u, asset, img, abs_url, jsonld, SITE, BASE_URL
import data_public as DP

env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')), autoescape=True, undefined=StrictUndefined, trim_blocks=True, lstrip_blocks=True)
env.filters['tr'] = tr
env.tests['contains'] = lambda seq, x: x in (seq or ())
import data_app
env.globals.update(A=data_app, t=t, digits=digits, num=num, bdt=bdt, date=date, icon=icon, rel=rel, u=u, asset=asset, img=img, B=B, tr=tr, range=range, C=DP.COMPANY,
                   NAV_TOURS=DP.NAV_TOURS, AIRLINE={a[0]: a for a in DP.AIRLINES}, AMENITY=DP.AMENITY, jsonld=jsonld, D=DP, abs_url=abs_url)

JS_I18N = {
 'en': {'added': 'Saved to wishlist', 'removed': 'Removed from wishlist', 'compareMax': 'You can compare up to 3 packages', 'compareBar': 'Compare', 'copied': 'Copied!', 'required': 'This field is required', 'sent': 'Thanks! We will get back to you shortly.', 'reply': 'Thanks! A travel expert will reply within 2 minutes. You can also WhatsApp us anytime.', 'results': 'results', 'saved': 'Saved', 'step': 'Step', 'demo': 'Demo action — no data was changed.', 'deleted': 'Deleted (demo)', 'otpSent': 'OTP sent to your phone', 'paid': 'Payment successful (mock)', 'coupon_ok': 'Promo applied — 10% off!', 'coupon_bad': 'Invalid or expired promo code', 'nothing': 'No matches — try clearing a filter.', 'days': 'd', 'hrs': 'h', 'min': 'm', 'sec': 's'},
 'bn': {'added': 'উইশলিস্টে রাখা হয়েছে', 'removed': 'উইশলিস্ট থেকে সরানো হয়েছে', 'compareMax': 'সর্বোচ্চ ৩টি প্যাকেজ তুলনা করা যায়', 'compareBar': 'তুলনা করুন', 'copied': 'কপি হয়েছে!', 'required': 'এই ঘরটি পূরণ করা আবশ্যক', 'sent': 'ধন্যবাদ! আমরা শিগগিরই যোগাযোগ করব।', 'reply': 'ধন্যবাদ! একজন ট্রাভেল এক্সপার্ট ২ মিনিটের মধ্যে উত্তর দেবেন। চাইলে যেকোনো সময় হোয়াটসঅ্যাপ করুন।', 'results': 'ফলাফল', 'saved': 'সংরক্ষিত', 'step': 'ধাপ', 'demo': 'ডেমো অ্যাকশন — কোনো তথ্য পরিবর্তন হয়নি।', 'deleted': 'মুছে ফেলা হয়েছে (ডেমো)', 'otpSent': 'আপনার ফোনে ওটিপি পাঠানো হয়েছে', 'paid': 'পেমেন্ট সফল (মক)', 'coupon_ok': 'প্রোমো প্রয়োগ হয়েছে — ১০% ছাড়!', 'coupon_bad': 'প্রোমো কোডটি সঠিক নয় বা মেয়াদোত্তীর্ণ', 'nothing': 'কিছু মেলেনি — একটি ফিল্টার সরিয়ে দেখুন।', 'days': 'দি', 'hrs': 'ঘ', 'min': 'মি', 'sec': 'সে'},
}
PAGES = []   # (lang, path_in_lang)

ORG = lambda: {"@type": ["TravelAgency", "Organization"], "@id": BASE_URL + "/#org", "name": "Musafir Tours & Travels Ltd.", "alternateName": "মুসাফির", "url": BASE_URL + "/",
    "logo": BASE_URL + "/assets/brand/icon-512.png", "image": BASE_URL + "/assets/img/coxsbazar.jpg", "telephone": "+8809612787878", "email": "hello@musafir.com.bd", "priceRange": "৳৳",
    "address": {"@type": "PostalAddress", "streetAddress": "Level 9, Musafir Tower, 42 Kemal Ataturk Avenue, Banani", "addressLocality": "Dhaka", "postalCode": "1213", "addressCountry": "BD"},
    "geo": {"@type": "GeoCoordinates", "latitude": 23.7937, "longitude": 90.4066}, "openingHours": "Sa-Th 09:30-20:00", "foundingDate": "2012",
    "sameAs": ["https://facebook.com/musafirbd", "https://instagram.com/musafirbd", "https://youtube.com/@musafirbd", "https://linkedin.com/company/musafirbd"],
    "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "8421"}}

def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": str(n), "item": h} for i, (n, h) in enumerate(items)]}

def render(tpl, path, title, desc, *, lang, active=None, crumbs=None, ld=(), image='coxsbazar', noindex=False, og_type=None, charts=False, body_class='', **ctx):
    STATE['lang'] = lang; STATE['page'] = f'{lang}/{path}'
    other = 'bn' if lang == 'en' else 'en'
    title_s, desc_s = str(tr(title)), str(tr(desc))
    if lang == 'bn': title_s, desc_s = title_s.translate(core.BN_DIGITS), desc_s.translate(core.BN_DIGITS)
    full = title_s if 'Musafir' in title_s or 'মুসাফির' in title_s else f"{title_s} | {'মুসাফির' if lang=='bn' else 'Musafir'}"
    jl = [dict(ORG(), **{"@context": "https://schema.org"})] if path == 'index.html' else []
    if crumbs:
        jl.append(crumbs_ld([(tr(n), abs_url(h)) for n, h in crumbs]))
    jl += list(ld)
    c = dict(L=lang, other_lang=other, other_lang_url=rel(f'{other}/{path}'), meta_title=full, meta_desc=desc_s, canonical=abs_url(),
             alt_en=abs_url(lang='en'), alt_bn=abs_url(lang='bn'), og_image=f'{BASE_URL}/assets/img/{image}.jpg', og_alt=None, og_type=og_type,
             noindex=noindex, jsonlds=jl, active=active, charts=charts, body_class=body_class, preload_img=None,
             js_i18n=json.dumps(JS_I18N[lang], ensure_ascii=False), page_path=path, title=tr(title))
    c.update(ctx)
    html = env.get_template(tpl).render(**c)
    html = re.sub(r'\n\s*\n+', '\n', html)
    out = os.path.join(SITE, lang, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(html)
    PAGES.append((lang, path, noindex))

def main():
    import pages_public, pages_info, pages_account, pages_admin
    t0 = time.time()
    for lang in ('en', 'bn'):
        pages_public.build(render, lang)
        pages_info.build(render, lang)
        pages_account.build(render, lang)
        pages_admin.build(render, lang)
    write_root()
    print(f'built {len(PAGES)} pages in {time.time()-t0:.1f}s')

def write_root():
    # language-aware entry point (works from file:// too)
    open(os.path.join(SITE, 'index.html'), 'w').write('''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Musafir — Tours, Cruises, Flights &amp; Visa | মুসাফির</title><link rel="canonical" href="https://musafir.com.bd/en"><link rel="alternate" hreflang="en" href="https://musafir.com.bd/en"><link rel="alternate" hreflang="bn" href="https://musafir.com.bd/bn"><link rel="alternate" hreflang="x-default" href="https://musafir.com.bd/en">
<link rel="icon" href="assets/brand/favicon.ico"><meta name="description" content="Musafir — Bangladesh-based holidays, cruises, flights, hotels and visa services.">
<script>(function(){var l='en';try{l=localStorage.getItem('musafir-lang')||((navigator.language||'').toLowerCase().indexOf('bn')===0?'bn':'en')}catch(e){}location.replace(l+'/index.html')})();</script>
<meta http-equiv="refresh" content="2;url=en/index.html"><style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#07131F;color:#fff}a{color:#5EEAD4}</style></head>
<body><p><img src="assets/brand/icon.svg" width="56" height="56" alt="" style="display:block;margin:0 auto 12px"> <a href="en/index.html">English</a> · <a href="bn/index.html" lang="bn">বাংলা</a></p></body></html>''')
    # 404 at root (static hosts)
    open(os.path.join(SITE, '404.html'), 'w').write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Musafir</title><script>location.replace("/en/404.html")</script></head><body><p><a href="/en/404.html">Page not found — continue</a></p></body></html>')
    # sitemap.xml with hreflang alternates
    urls = []
    for lang, path, noindex in PAGES:
        if noindex or lang != 'en': continue
        p = re.sub(r'(^|/)index\.html$', r'\1', path); p = re.sub(r'\.html$', '', p)
        en, bn = f'{BASE_URL}/en/{p}'.rstrip('/'), f'{BASE_URL}/bn/{p}'.rstrip('/')
        pr = '1.0' if path == 'index.html' else ('0.9' if path.count('/') == 0 else '0.7')
        for loc in (en, bn):
            urls.append(f'  <url><loc>{loc}</loc><lastmod>2026-10-25</lastmod><changefreq>weekly</changefreq><priority>{pr}</priority>'
                        f'<xhtml:link rel="alternate" hreflang="en" href="{en}"/><xhtml:link rel="alternate" hreflang="bn" href="{bn}"/><xhtml:link rel="alternate" hreflang="x-default" href="{en}"/></url>')
    open(os.path.join(SITE, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n')
    open(os.path.join(SITE, 'robots.txt'), 'w').write(f'''# Musafir — robots.txt
User-agent: *
Allow: /
Disallow: /en/account/
Disallow: /bn/account/
Disallow: /en/admin/
Disallow: /bn/admin/
Disallow: /en/booking
Disallow: /bn/booking
Disallow: /*?*sort=
Disallow: /*?*page=

Sitemap: {BASE_URL}/sitemap.xml
''')
    open(os.path.join(SITE, 'manifest.webmanifest'), 'w').write(json.dumps({"name": "Musafir — Tours & Travels", "short_name": "Musafir", "start_url": "/en/", "display": "standalone", "background_color": "#ffffff", "theme_color": "#0D6B65",
        "icons": [{"src": "assets/brand/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "assets/brand/icon-512.png", "sizes": "512x512", "type": "image/png"}, {"src": "assets/brand/icon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=1))

if __name__ == '__main__':
    main()
