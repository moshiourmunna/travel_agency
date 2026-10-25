# usage: python3 diffrows.py a.png b.png -> prints y ranges where the screenshots differ (row mean abs diff)
import sys
from PIL import Image, ImageChops
a=Image.open(sys.argv[1]).convert('L'); b=Image.open(sys.argv[2]).convert('L')
w=min(a.width,b.width); h=min(a.height,b.height)
d=ImageChops.difference(a.crop((0,0,w,h)),b.crop((0,0,w,h)))
rows=[]; 
for y in range(0,h,4):
    s=sum(d.crop((0,y,w,y+4)).getdata())/(w*4)
    rows.append((y,s))
bad=[y for y,s in rows if s>6]
rng=[]
for y in bad:
    if rng and y-rng[-1][1]<=40: rng[-1][1]=y
    else: rng.append([y,y])
print([tuple(r) for r in rng][:30])
