"""Route sweep + internal link check: every sitemap path in en/bn, then every internal href found on those pages."""
import json, re, sys, urllib.request, concurrent.futures as cf
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
API = 'http://127.0.0.1:8000/api/v1/sitemap'
def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'sweep'}), timeout=60) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''
    except Exception as e:
        return 0, str(e)
paths = [r['path'] for r in json.load(urllib.request.urlopen(API))['data']]
extra = ['/sitemap', '/brand', '/login', '/register', '/forgot-password', '/booking', '/compare', '/wishlist']
pages = sorted({f'/{l}{"" if p == "/" else p}' for p in paths + extra for l in ('en', 'bn')})
bad, links = [], set()
with cf.ThreadPoolExecutor(6) as ex:
    for p, (st, html) in zip(pages, ex.map(lambda p: get(BASE + p), pages)):
        if st != 200: bad.append((p, st))
        for h in re.findall(r'href="(/(?:en|bn)(?:/[^"#?]*)?)', html): links.add(h.rstrip('/') or h)
todo = sorted(links - set(pages))
with cf.ThreadPoolExecutor(6) as ex:
    for p, (st, _) in zip(todo, ex.map(lambda p: get(BASE + p), todo)):
        if st != 200: bad.append((p + '  (linked)', st))
print(json.dumps({'pages': len(pages), 'linked_extra': len(todo), 'bad': bad}, ensure_ascii=False, indent=1))
