"""Extract every bilingual UI string pair from the mockup templates/py (t('en','bn') and ('en','bn') tuples)
into backend/database/seeders/data/ui.json — seeded into `translations` (group ui) so admins can edit any label."""
import os, re, json, glob, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BN = re.compile(r'[\u0980-\u09FF]')
pairs = {}
q = r"""(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")"""
pat = re.compile(r'\(\s*' + q + r'\s*,\s*' + q + r'\s*\)')
for f in sorted(glob.glob(os.path.join(ROOT, 'src', '**', '*.*'), recursive=True)):
    if not f.endswith(('.html', '.py')) or os.path.basename(f) in ('data_public.py', 'data_app.py'):
        continue
    s = open(f, encoding='utf-8').read()
    for m in pat.finditer(s):
        en = m.group(1) if m.group(1) is not None else m.group(2)
        bn = m.group(3) if m.group(3) is not None else m.group(4)
        en = en.replace("\\'", "'").replace('\\"', '"')
        bn = bn.replace("\\'", "'").replace('\\"', '"')
        if not BN.search(bn) or BN.search(en) or '{{' in en or '{%' in en:
            continue
        pairs.setdefault(en, bn)
def key(en):
    return en if len(en) <= 191 else 'h:' + hashlib.sha1(en.encode()).hexdigest()[:12]
out = [{'key': key(en), 'en': en, 'bn': bn} for en, bn in pairs.items()]
json.dump(out, open(os.path.join(ROOT, 'backend', 'database', 'seeders', 'data', 'ui.json'), 'w'), ensure_ascii=False, indent=0)
print(len(out), 'pairs', sum(1 for o in out if o['key'].startswith('h:')), 'hashed')
