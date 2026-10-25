#!/usr/bin/env python3
"""Export the mockup's data modules (src/data_public.py, src/data_app.py) to JSON for the Laravel seeders.

Usage: python3 tooling/export_seed.py  ->  backend/database/seeders/data/{public,app}.json
Tuples become lists, B(en, bn) values stay {"en": .., "bn": ..}. Index dicts (TOUR, DEST, ...) are skipped.
"""
import json, os, sys, types
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'src'))
import data_public, data_app  # noqa: E402

SKIP = {'TOUR', 'DEST', 'CRUISE', 'THEME', 'HOTEL', 'VISA', 'POST', 'ACTIVITY', 'MYB', 'FEATURED', 'P', 'T', 'R', 'D', 'B'}

def conv(v):
    if isinstance(v, dict): return {str(k): conv(x) for k, x in v.items()}
    if isinstance(v, (list, tuple, set)): return [conv(x) for x in v]
    if isinstance(v, (str, int, float, bool)) or v is None: return str(v) if type(v).__name__ == 'Markup' else v
    return str(v)

def dump(mod, name):
    out = {}
    for k, v in vars(mod).items():
        if not k.isupper() or k in SKIP or isinstance(v, (types.ModuleType, types.FunctionType)) or callable(v): continue
        out[k] = conv(v)
    d = os.path.join(ROOT, 'backend', 'database', 'seeders', 'data'); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), 'w', encoding='utf-8') as f: json.dump(out, f, ensure_ascii=False, indent=1)
    print(name, len(out), 'keys:', ' '.join(sorted(out)))

dump(data_public, 'public.json'); dump(data_app, 'app.json')
