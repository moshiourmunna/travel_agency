import os,re,sys,collections
from urllib.parse import urlparse,unquote
SITE='/workspace/musafir/site'; miss=collections.Counter(); src={}
for root,_,fs in os.walk(SITE):
    for f in fs:
        if not f.endswith('.html') or (root==SITE and f=='404.html'): continue
        p=os.path.join(root,f); h=open(p,encoding='utf-8').read()
        for m in re.finditer(r'(?:href|src)="([^"#?]+)',h):
            u=m.group(1)
            if re.match(r'^(https?:|mailto:|tel:|data:|javascript:|//)',u): continue
            t=os.path.normpath(os.path.join(os.path.dirname(p),unquote(u)))
            if not os.path.exists(t): miss[os.path.relpath(t,SITE)]+=1; src.setdefault(os.path.relpath(t,SITE),os.path.relpath(p,SITE))
for k,v in sorted(miss.items()): print(v,k,'  e.g.',src[k])
print('missing targets:',len(miss))
