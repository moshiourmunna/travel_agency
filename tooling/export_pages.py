"""Export listing/static page heroes (H1, subtitle, hero image) from the mockup templates -> backend/database/seeders/data/static_pages.json.
Pages become admin-editable `pages` rows; tours' "16" becomes the live ":count" placeholder."""
import os, re, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
P = os.path.join(ROOT, 'src', 'templates', 'pages')
T = r"t\('((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)'\)"
SLUG = {'visas': 'visa'}
out = {}
for f in sorted(os.listdir(P)):
    s = open(os.path.join(P, f), encoding='utf-8').read()
    name = f[:-5]
    m = re.search(r"ui\.page_hero\(" + T + r",\s*" + T + r",.*?\],\s*'([a-z0-9-]+)'\)", s, re.S)
    if m:
        out[SLUG.get(name, name)] = {'title': {'en': m[1], 'bn': m[2]}, 'subtitle': {'en': m[3], 'bn': m[4]}, 'image': m[5], 'template': 'hero'}
        continue
    if name in ('flights', 'hotels', 'compare', 'wishlist', 'sitemap'):
        h = re.search(r"<h1[^>]*>\{\{ " + T, s)
        sub = re.search(r"</h1>\s*<p class=\"mt-[12] (?:text-ink-200|muted)\">\{\{ " + T, s)
        img = re.search(r"\{\{ (?:img|picture)\('([a-z0-9-]+)'", s)
        out[name] = {'title': {'en': h[1], 'bn': h[2]}, 'subtitle': {'en': sub[1], 'bn': sub[2]} if sub else None, 'image': img[1] if img else None, 'template': 'search' if name in ('flights', 'hotels') else 'plain'}
out['tours']['subtitle'] = {k: v.replace('16', ':count').replace('১৬', ':count') for k, v in out['tours']['subtitle'].items()}
out['destinations']['subtitle'] = {'en': 'From Bangladesh’s hills and beaches to island resorts and the Himalayas — explore where to go next.', 'bn': 'বাংলাদেশের পাহাড়-সমুদ্র থেকে দ্বীপের রিসোর্ট আর হিমালয় — এবার কোথায় যাবেন খুঁজে নিন।'}
out.pop('theme', None)
json.dump(out, open(os.path.join(ROOT, 'backend', 'database', 'seeders', 'data', 'static_pages.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out), sorted(out))
