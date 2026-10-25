"""Print a mockup page's <main> with svg bodies collapsed to <svg:name/> (for porting)."""
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<main.*?</main>', s, re.S)
x = m.group(0) if m else s
x = re.sub(r'<svg[^>]*data-icon="([^"]+)"[^>]*>.*?</svg>', r'<svg:\1/>', x, flags=re.S)
x = re.sub(r'<svg[^>]*>.*?</svg>', '<svg/>', x, flags=re.S)
x = re.sub(r' (aria-hidden|focusable)="[^"]*"', '', x)
x = re.sub(r'\n\s*\n', '\n', x)
print(x)
