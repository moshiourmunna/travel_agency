import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib import instancer
import io,functools
@functools.lru_cache(None)
def load(path,wght=None):
    f=TTFont(path)
    if wght and 'fvar' in f: f=instancer.instantiateVariableFont(f,{'wght':wght})
    buf=io.BytesIO(); f.save(buf); data=buf.getvalue()
    return TTFont(io.BytesIO(data)), data
def text_path(text,path,size,x=0,y=0,wght=None,tracking=0,liga=None):
    if liga is None: liga = not text.isascii()
    """returns (d, width) - baseline at y"""
    tt,data=load(path,wght)
    face=hb.Face(data); font=hb.Font(face); upem=face.upem
    buf=hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font,buf,{"kern":True,"liga":liga})
    gs=tt.getGlyphSet(); order=tt.getGlyphOrder(); s=size/upem
    pen=SVGPathPen(gs); cx=0
    for info,pos in zip(buf.glyph_infos,buf.glyph_positions):
        g=order[info.codepoint]
        tp=TransformPen(pen,(s,0,0,-s,x+(cx+pos.x_offset)*s,y-pos.y_offset*s))
        gs[g].draw(tp); cx+=pos.x_advance+tracking*upem/1000
    return pen.getCommands(), (cx-tracking*upem/1000)*s
