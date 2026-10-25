"""Musafir static mock builder — core helpers (i18n, formatting, icons, urls)."""
import os, re, json, html
from markupsafe import Markup
SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'site'))
BASE_URL = 'https://musafir.com.bd'
LUCIDE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'tooling', 'node_modules', 'lucide-static', 'icons'))
BN_DIGITS = str.maketrans('0123456789', '০১২৩৪৫৬৭৮৯')
STATE = {'lang': 'en', 'page': 'en/index.html'}

def B(en, bn=None):
    return {'en': en, 'bn': bn if bn is not None else en}

def tr(v):
    if isinstance(v, dict) and 'en' in v: return v.get(STATE['lang']) or v['en']
    return v

def t(en, bn=None):
    return Markup(bn) if (STATE['lang'] == 'bn' and bn) else Markup(en)

def digits(s):
    s = str(s)
    return s.translate(BN_DIGITS) if STATE['lang'] == 'bn' else s

def group_lakh(n):
    n = int(round(n)); neg = n < 0; s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r'(\d)(?=(\d\d)+$)', r'\1,', head)
        s = head + ',' + tail
    return ('-' if neg else '') + s

def num(n):
    return digits(group_lakh(n))

def bdt(n):
    return Markup('৳\u00a0' + num(n))

def pct(n):
    return digits(n) + '%'

MONTHS = {'en': ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          'bn': ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']}
WDAYS = {'en': ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], 'bn': ['সোম','মঙ্গল','বুধ','বৃহস্পতি','শুক্র','শনি','রবি']}
def date(s, fmt='long'):
    """s: 'YYYY-MM-DD' -> localized '12 Nov 2026' (fmt='short' -> 'Sat, 12 Dec')"""
    import datetime as _d
    y, m, d = s[:10].split('-')
    if fmt == 'short':
        wd = WDAYS[STATE['lang']][_d.date(int(y), int(m), int(d)).weekday()]
        return digits(f"{wd}, {int(d)} {MONTHS[STATE['lang']][int(m)-1]}")
    return digits(f"{int(d)} {MONTHS[STATE['lang']][int(m)-1]} {y}")

_icon_cache = {}
ALIASES = {'passport': 'book-user'}
def icon(name, cls='h-5 w-5', sw=None):
    name = ALIASES.get(name, name)
    if name not in _icon_cache:
        p = os.path.join(os.path.dirname(__file__), 'icons', name + '.svg')
        if not os.path.exists(p): p = os.path.join(LUCIDE, name + '.svg')
        raw = open(p).read()
        raw = re.sub(r'<!--.*?-->', '', raw, flags=re.S).strip()
        raw = re.sub(r'\s*\n\s*', ' ', raw)
        raw = re.sub(r'class="[^"]*"', 'CLASS', raw)
        raw = raw.replace(' width="24" height="24"', '')
        _icon_cache[name] = raw
    s = _icon_cache[name].replace('CLASS', f'class="{cls}" aria-hidden="true" focusable="false"')
    if sw: s = s.replace('stroke-width="2"', f'stroke-width="{sw}"')
    return Markup(s)

def rel(target):
    """target: site-root relative path e.g. 'assets/css/app.css' or 'en/tours.html'"""
    here = os.path.dirname(STATE['page'])
    return os.path.relpath(target, here or '.').replace(os.sep, '/')

def u(path):
    """path within current language: 'tours.html', 'tours/x.html', 'account/index.html'"""
    return rel(f"{STATE['lang']}/{path}")

def asset(path):
    return rel('assets/' + path)

def img(key, sm=False):
    return asset(f"img/{key}{'-sm' if sm else ''}.jpg")

def abs_url(path_in_lang=None, lang=None):
    lang = lang or STATE['lang']
    p = path_in_lang if path_in_lang is not None else STATE['page'].split('/', 1)[1]
    p = re.sub(r'(^|/)index\.html$', r'\1', p)
    p = re.sub(r'\.html$', '', p)
    return f"{BASE_URL}/{lang}/{p}".rstrip('/')

def jsonld(obj):
    return Markup('<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>')
