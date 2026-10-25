import cairosvg,sys
sys.path.insert(0,'.')
from crescent import crescent
from PIL import Image
def icon(v):
    m={1:'M24 90 L43 42 Q45 37 47 42 L60 72 L73 42 Q75 37 77 42 L96 90',
       2:'M22 90 C32 72 36 44 44 44 C52 44 54 70 60 70 C66 70 68 44 76 44 C84 44 88 72 98 90',
       3:'M26 92 L26 52 Q26 40 36 46 L60 70 L84 46 Q94 40 94 52 L94 92'}[v]
    cr=crescent(86,27,11,-5,4,9.5) if v!=3 else crescent(60,26,10,-4.5,3.5,8.6)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#13A196"/><stop offset="1" stop-color="#0A5C57"/></linearGradient></defs>
<rect width="120" height="120" rx="30" fill="url(#g)"/>
<path d="{cr}" fill="#F6A33B"/>
<path d="{m}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M20 104 Q60 96 100 104" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.1 7.5"/>
</svg>'''
s=Image.new('RGBA',(760,250),'white')
for i,v in enumerate((1,2,3)):
    cairosvg.svg2png(bytestring=icon(v).encode(),write_to=f'/tmp/i{v}.png'); im=Image.open(f'/tmp/i{v}.png'); s.paste(im,(i*255,5),im)
s.save('/tmp/icons2.png')
