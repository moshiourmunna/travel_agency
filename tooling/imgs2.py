import json,urllib.request,urllib.parse,sys,os,re,time
UA={'User-Agent':'MusafirMockup/1.0 (design mockup; contact box)'}
Q={'cruise':'cruise ship sea sunset','halong':'Ha Long Bay junk boats','greece':'Mykonos windmills'}
out={}
if os.path.exists('../site/assets/img/credits.json'): out=json.load(open('../site/assets/img/credits.json'))
for k,q in Q.items():
    if k in out: continue
    u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',format='json',generator='search',gsrsearch=q+' filetype:bitmap',gsrnamespace=6,gsrlimit=15,prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=1600))
    try: d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30))
    except Exception as e: print('ERR',k,e); continue
    pages=sorted(d.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',99))
    for p in pages:
        ii=p['imageinfo'][0]; w,h=ii['width'],ii['height']
        if w>=1600 and 1.2<w/h<2.1 and ii['url'].split('?')[0].lower().endswith(('.jpg','.jpeg')):
            md=ii.get('extmetadata',{})
            art=re.sub('<[^>]+>','',md.get('Artist',{}).get('value','')).strip()
            out[k]=dict(title=p['title'],thumb=ii['thumburl'],page=ii['descriptionurl'],artist=art[:80],license=md.get('LicenseShortName',{}).get('value',''))
            try:
                urllib.request.urlretrieve if False else None
                r=urllib.request.urlopen(urllib.request.Request(ii['thumburl'],headers=UA),timeout=60).read()
                open(f'../site/assets/img/raw_{k}.jpg','wb').write(r); print('ok',k,p['title'])
            except Exception as e: print('dlerr',k,e); out.pop(k,None); continue
            break
    else: print('none',k)
    time.sleep(1)
    json.dump(out,open('../site/assets/img/credits.json','w'),indent=1)
