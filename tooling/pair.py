# usage: python3 pair.py a.png b.png y0 y1 out.png  — side-by-side crop
import sys
from PIL import Image
a=Image.open(sys.argv[1]); b=Image.open(sys.argv[2]); y0,y1=int(sys.argv[3]),int(sys.argv[4])
w=a.width; c=Image.new('RGB',(w*2+10,y1-y0),'red'); c.paste(a.crop((0,y0,w,y1)),(0,0)); c.paste(b.crop((0,y0,w,y1)),(w+10,0))
s=min(1, 1800/(y1-y0)); c=c.resize((int(c.width*s),int(c.height*s))); c.save(sys.argv[5])
