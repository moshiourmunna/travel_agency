const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: '\u00a0' };
export const decodeEntities = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k: string) => ENT[k]);

/**
 * Splits CMS HTML at each <h2>, giving every heading a stable id (`${prefix}1`, …) for a table of contents.
 * `label` can rewrite the visible heading (e.g. to number it) — the TOC gets the same text.
 */
export function h2Sections(html: string, prefix = 's', label?: (text: string, n: number) => string) {
  const parts = (html ?? '').split(/(?=<h2[\s>])/i).filter((s) => s.trim());
  const toc: { id: string; text: string }[] = [];
  const out = parts.map((s) => {
    const m = s.match(/^<h2([^>]*)>([\s\S]*?)<\/h2>/i);
    if (!m) return s;
    const n = toc.length + 1;
    const id = `${prefix}${n}`;
    const plain = decodeEntities(m[2].replace(/<[^>]+>/g, '').trim());
    const text = label ? label(plain, n) : plain;
    toc.push({ id, text });
    const inner = label ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;') : m[2];
    return s.replace(/^<h2([^>]*)>[\s\S]*?<\/h2>/i, (_, attrs: string) => `<h2${attrs.replace(/\sid="[^"]*"/i, '')} id="${id}">${inner}</h2>`);
  });
  return { toc, parts: out };
}
