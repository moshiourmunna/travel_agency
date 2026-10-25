# replace images that show places of worship with neutral landscape/cityscape shots
import json,urllib.request,urllib.parse,os,re,time
from PIL import Image, ImageOps
UA={'User-Agent':'MusafirMockup/1.0 (design mockup)'}
Q={'bhutan':['Phobjika Valley view Bhutan','Paro Valley Landscape']}
BAN=re.compile('mosque|cami|temple|church|monaster|dzong|shrine|pagoda|cathedral|dome|chapel|jinja|tera|mesquita|kirche|stupa|buddha',re.I)
D='../site/assets/img/'; out=json.load(open(D+'credits.json'))
for k,qs in Q.items():
    done=False
    for q in qs:
        u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',format='json',generator='search',gsrsearch=q+' filetype:bitmap',gsrnamespace=6,gsrlimit=20,prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=1920))
        try: d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30))
        except Exception as e: print('ERR',k,e); continue
        for p in sorted(d.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',99)):
            if BAN.search(p['title']): continue
            ii=p['imageinfo'][0]; w,h=ii['width'],ii['height']
            if not (w>=1800 and 1.3<w/h<2.0 and ii['url'].split('?')[0].lower().endswith(('.jpg','.jpeg'))): continue
            md=ii.get('extmetadata',{}); lic=md.get('LicenseShortName',{}).get('value','')
            if not re.search('CC|Public domain|PD',lic): continue
            try: r=urllib.request.urlopen(urllib.request.Request(ii['thumburl'],headers=UA),timeout=60).read()
            except Exception as e: print('dl',e); continue
            open('/tmp/raw.jpg','wb').write(r)
            im=Image.open('/tmp/raw.jpg').convert('RGB')
            ImageOps.fit(im,(1600,1000),Image.LANCZOS).save(D+k+'.jpg',quality=80,optimize=True,progressive=True)
            ImageOps.fit(im,(640,400),Image.LANCZOS).save(D+k+'-sm.jpg',quality=78,optimize=True,progressive=True)
            art=re.sub('<[^>]+>','',md.get('Artist',{}).get('value','')).strip()
            out[k]=dict(title=p['title'],thumb=ii['thumburl'],page=ii['descriptionurl'],artist=art[:80],license=lic)
            print('ok',k,p['title'],lic); done=True; break
        time.sleep(1)
        if done: break
    if not done: print('NONE',k)
json.dump(out,open(D+'credits.json','w'),indent=1,ensure_ascii=False)
