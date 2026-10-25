import sys,cairosvg,os
sys.path.insert(0,'.')
from textpath import text_path
from PIL import Image
OUT='/workspace/musafir/logo'; os.makedirs(OUT+'/png',exist_ok=True)
PJS='fonts/PJS.ttf'; HS='fonts/HindSiliguri-SemiBold.ttf'; HSB='fonts/HindSiliguri-Bold.ttf'
TEAL='#0D7C74'; TEAL2='#14A497'; TEALD='#0A5C57'; AMBER='#F6A33B'; INK='#0B1B2B'
M='M22 92 C32 74 35 46 44 46 C52 46 54 72 60 72 C66 72 68 46 76 46 C85 46 88 74 98 92'
SUN='<circle cx="60" cy="27" r="10" fill="%s"/>'  # sun rising between the two peaks of the M (neutral travel motif)
TRAIL='M30 105 Q60 98 90 105'
def mark(gid='g',bg=True,mcol='#fff',trail_op=.65,tcol='#fff'):
    b=f'<rect width="120" height="120" rx="30" fill="url(#{gid})"/>' if bg else ''
    return f'''{b}{SUN % AMBER}<path d="{M}" fill="none" stroke="{mcol}" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"/><path d="{TRAIL}" fill="none" stroke="{tcol}" stroke-opacity="{trail_op}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0.1 7.4"/>'''
GRAD=lambda gid='g':f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{TEAL2}"/><stop offset="1" stop-color="{TEALD}"/></linearGradient>'
def svg(w,h,body,defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="Musafir (মুসাফির) logo"><title>Musafir — মুসাফির</title><defs>{defs}</defs>{body}</svg>'
files={}
files['icon.svg']=svg(120,120,mark(),GRAD())
files['icon-white.svg']=svg(120,120,mark(bg=False),'')  # for dark bg / photos
files['icon-teal.svg']=svg(120,120,mark(bg=False,mcol=TEAL,tcol=TEAL),'')  # for light bg without tile
# horizontal lockup
def horiz(dark=False):
    en,wen=text_path('Musafir',PJS,66,148,72,wght=800,tracking=-20)
    bn,wbn=text_path('মুসাফির',HS,33,150,112)
    tg,wtg=text_path('HOLIDAYS · CRUISES · VISA',PJS,12.5,150+wbn+26,106,wght=700,tracking=180)
    W=max(148+wen,150+wbn+26+wtg)+6
    c_en='#FFFFFF' if dark else INK; c_bn='#5EEAD4' if dark else TEAL; c_tg='#94A3B8' if dark else '#64748B'
    body=mark()+f'<path d="{en}" fill="{c_en}"/><path d="{bn}" fill="{c_bn}"/><rect x="{150+wbn+12:.1f}" y="92" width="1.6" height="18" rx=".8" fill="{c_tg}" opacity=".6"/><path d="{tg}" fill="{c_tg}"/>'
    return svg(W,122,body,GRAD())
files['logo.svg']=horiz(False); files['logo-dark.svg']=horiz(True)
# compact (no tagline) for header
def compact(dark=False):
    en,wen=text_path('Musafir',PJS,50,138,62,wght=800,tracking=-20)
    bn,wbn=text_path('মুসাফির',HS,27,140,100)
    c_en='#FFFFFF' if dark else INK; c_bn='#5EEAD4' if dark else TEAL
    return svg(max(138+wen,140+wbn)+4,120,mark()+f'<path d="{en}" fill="{c_en}"/><path d="{bn}" fill="{c_bn}"/>',GRAD())
files['logo-compact.svg']=compact(False); files['logo-compact-dark.svg']=compact(True)
# stacked
def stacked(dark=False):
    en,wen=text_path('Musafir',PJS,56,0,0,wght=800,tracking=-20)
    bn,wbn=text_path('মুসাফির',HS,30,0,0)
    W=max(wen,wbn,120)+40
    en,_=text_path('Musafir',PJS,56,(W-wen)/2,200,wght=800,tracking=-20)
    bn,_=text_path('মুসাফির',HS,30,(W-wbn)/2,246)
    c_en='#FFFFFF' if dark else INK; c_bn='#5EEAD4' if dark else TEAL
    return svg(W,262,f'<g transform="translate({(W-120)/2},10)">{mark()}</g><path d="{en}" fill="{c_en}"/><path d="{bn}" fill="{c_bn}"/>',GRAD())
files['logo-stacked.svg']=stacked(False); files['logo-stacked-dark.svg']=stacked(True)
for n,s in files.items(): open(f'{OUT}/{n}','w').write(s)
# PNG exports
def png(n,w,out,bg=None):
    cairosvg.svg2png(url=f'{OUT}/{n}',write_to=f'{OUT}/png/{out}',output_width=w,background_color=bg)
for w in (16,32,48,64,180,192,256,512,1024): png('icon.svg',w,f'icon-{w}.png')
png('logo.svg',1200,'logo-1200.png'); png('logo.svg',600,'logo-600.png')
png('logo-dark.svg',1200,'logo-dark-1200.png',bg='#07131F'); png('logo-dark.svg',1200,'logo-dark-1200-transparent.png')
png('logo-stacked.svg',800,'logo-stacked-800.png'); png('logo-stacked-dark.svg',800,'logo-stacked-dark-800.png',bg='#07131F')
png('icon-white.svg',512,'icon-white-512.png')
ims=[Image.open(f'{OUT}/png/icon-{w}.png') for w in (16,32,48,64,256)]
ims[-1].save(f'{OUT}/favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(256,256)])
print('ok')
