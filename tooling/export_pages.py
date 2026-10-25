#!/usr/bin/env python3
"""Capture every page the mockup builder renders (both languages) WITHOUT rendering templates:
path, meta title/description and the page-specific context (derived data such as tour departures,
inclusions, hotel rooms, activity slots, info-page content). Output: backend/database/seeders/data/pages.json
Used by the Laravel seeders (SEO table + derived catalogue data) so the dynamic site matches the mockup."""
import json, os, sys, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'src'))
import core
from core import STATE, tr
import pages_public, pages_info, pages_account, pages_admin

def conv(v):
    if isinstance(v, dict): return {str(k): conv(x) for k, x in v.items()}
    if isinstance(v, (list, tuple, set)): return [conv(x) for x in v]
    if isinstance(v, bool) or v is None or isinstance(v, (int, float)): return v
    return str(v)

OUT = {}
SKIP_CTX = {'ld', 'crumbs', 'lang', 'active', 'image', 'body_class', 'charts', 'og_type', 'noindex'}

def render(tpl, path, title, desc, *, lang, active=None, crumbs=None, ld=(), image='coxsbazar', noindex=False, og_type=None, charts=False, body_class='', **ctx):
    STATE['lang'] = lang; STATE['page'] = f'{lang}/{path}'
    t, d = str(tr(title)), str(tr(desc))
    if lang == 'bn': t, d = t.translate(core.BN_DIGITS), d.translate(core.BN_DIGITS)
    e = OUT.setdefault(path, {'tpl': tpl, 'image': image, 'noindex': noindex, 'active': active, 'title': {}, 'desc': {}, 'crumbs': {}, 'ctx': {}})
    e['title'][lang] = t; e['desc'][lang] = d
    e['crumbs'][lang] = [[str(tr(n)), h] for n, h in (crumbs or [])]
    e['ctx'][lang] = conv({k: v for k, v in ctx.items() if k not in SKIP_CTX})

for L in ('en', 'bn'):
    for m in (pages_public, pages_info, pages_account, pages_admin):
        m.build(render, L)

dst = os.path.join(ROOT, 'backend', 'database', 'seeders', 'data', 'pages.json')
json.dump(OUT, open(dst, 'w', encoding='utf-8'), ensure_ascii=False)
print(len(OUT), 'pages ->', dst, os.path.getsize(dst) // 1024, 'KB')
