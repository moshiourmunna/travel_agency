import cairosvg,sys
sys.path.insert(0,'.')
from crescent import crescent
from PIL import Image
M='M22 92 C32 74 35 46 44 46 C52 46 54 72 60 72 C66 72 68 46 76 46 C85 46 88 74 98 92'
def icon(cr):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14A497"/><stop offset="1" stop-color="#0A5C57"/></linearGradient></defs>
<rect width="120" height="120" rx="30" fill="url(#g)"/>
<path d="{cr}" fill="#F6A33B"/>
<path d="{M}" fill="none" stroke="#fff" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M30 105 Q60 98 90 105" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0.1 7.4"/>
</svg>'''
crs=[crescent(60,26,11,5,-3.5,9.3),crescent(91,27,11,5,-3.5,9.3),crescent(60,27,10.5,-4.5,-3,9)]
s=Image.new('RGBA',(900,250),'white')
for i,c in enumerate(crs):
    cairosvg.svg2png(bytestring=icon(c).encode(),write_to=f'/tmp/j{i}.png'); im=Image.open(f'/tmp/j{i}.png'); s.paste(im,(i*255,5),im)
    sm=im.resize((32,32),Image.LANCZOS); s.paste(sm,(780,10+i*40),sm)
s.save('/tmp/icons3.png')
