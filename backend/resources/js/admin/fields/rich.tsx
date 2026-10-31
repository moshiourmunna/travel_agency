import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { cx } from '@/components/ui';
import { useT } from '@/lib/i18n';

type Cmd = { icon?: string; text?: string; label: string; run: () => void; active?: () => boolean };

const clean = (html: string) => html.replace(/<p><br><\/p>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+style="[^"]*"/g, '').trim();

/**
 * Lightweight rich-text editor (contentEditable): headings, lists, links, quotes and an HTML view.
 * The server sanitises the HTML (App\Support\Html), so only what the site renders survives.
 */
export function RichText({ value, onChange, lang, minRows = 8, invalid }: { value: string; onChange: (v: string) => void; lang?: string; minRows?: number; invalid?: boolean }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(false);
  const last = useRef<string>('');
  const [, force] = useState(0);

  useEffect(() => {
    if (!source && ref.current && value !== last.current) { ref.current.innerHTML = value || ''; last.current = value || ''; }
  }, [value, source]);

  const emit = () => { if (!ref.current) return; const h = clean(ref.current.innerHTML); last.current = h; onChange(h); };
  const exec = (c: string, v?: string) => { ref.current?.focus(); document.execCommand(c, false, v); emit(); force((n) => n + 1); };
  const block = (tag: string) => exec('formatBlock', tag);
  const q = (c: string) => { try { return document.queryCommandState(c); } catch { return false; } };
  const blockIs = (tag: string) => { try { return String(document.queryCommandValue('formatBlock')).toLowerCase() === tag; } catch { return false; } };

  const cmds: (Cmd | '|')[] = [
    { text: 'B', label: t('Bold', 'বোল্ড'), run: () => exec('bold'), active: () => q('bold') },
    { icon: 'italic', label: t('Italic', 'ইটালিক'), run: () => exec('italic'), active: () => q('italic') },
    '|',
    { icon: 'heading-2', label: t('Heading 2', 'হেডিং ২'), run: () => block(blockIs('h2') ? 'p' : 'h2'), active: () => blockIs('h2') },
    { icon: 'heading-3', label: t('Heading 3', 'হেডিং ৩'), run: () => block(blockIs('h3') ? 'p' : 'h3'), active: () => blockIs('h3') },
    { icon: 'pilcrow', label: t('Paragraph', 'অনুচ্ছেদ'), run: () => block('p') },
    { icon: 'quote', label: t('Quote', 'উদ্ধৃতি'), run: () => block(blockIs('blockquote') ? 'p' : 'blockquote'), active: () => blockIs('blockquote') },
    '|',
    { icon: 'list', label: t('Bullet list', 'বুলেট তালিকা'), run: () => exec('insertUnorderedList'), active: () => q('insertUnorderedList') },
    { icon: 'list-ordered', label: t('Numbered list', 'নম্বর তালিকা'), run: () => exec('insertOrderedList'), active: () => q('insertOrderedList') },
    '|',
    { icon: 'link', label: t('Link', 'লিংক'), run: () => { const u = window.prompt(t('Link address (https://… or /page)', 'লিংকের ঠিকানা (https://… বা /page)'), 'https://'); if (u && u !== 'https://') exec('createLink', u); } },
    { icon: 'unlink', label: t('Remove link', 'লিংক সরান'), run: () => exec('unlink') },
    { icon: 'remove-formatting', label: t('Clear formatting', 'ফরম্যাটিং মুছুন'), run: () => exec('removeFormat') },
    '|',
    { icon: 'undo-2', label: t('Undo', 'আগের অবস্থা'), run: () => exec('undo') },
    { icon: 'redo-2', label: t('Redo', 'পুনরায়'), run: () => exec('redo') },
  ];

  return (
    <div className={cx('overflow-hidden rounded-xl border bg-white dark:bg-ink-900', invalid ? 'border-rose-500' : 'border-ink-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-ink-700')}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-ink-50/70 px-1.5 py-1 dark:border-ink-800 dark:bg-ink-950/40" role="toolbar" aria-label={t('Formatting', 'ফরম্যাটিং')}>
        {cmds.map((c, i) => c === '|' ? <span key={i} className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" /> : (
          <button key={i} type="button" disabled={source} title={c.label} aria-label={c.label} onMouseDown={(e) => e.preventDefault()} onClick={c.run}
            className={cx('grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-sm text-ink-600 hover:bg-white hover:text-ink-900 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800', !source && c.active?.() && 'bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-300')}>
            {c.icon ? <Icon name={c.icon} size={16} /> : <b className="font-black">{c.text}</b>}
          </button>
        ))}
        <button type="button" className={cx('ml-auto flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold', source ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-white dark:text-ink-300 dark:hover:bg-ink-800')} onClick={() => setSource(!source)} aria-pressed={source}>
          <Icon name="code" size={14} />HTML
        </button>
      </div>
      {source ? (
        <textarea className="block w-full resize-y bg-transparent p-3 font-mono text-xs leading-5 outline-none" style={{ minHeight: minRows * 24 }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} spellCheck={false} aria-label="HTML" />
      ) : (
        <div ref={ref} contentEditable suppressContentEditableWarning lang={lang} role="textbox" aria-multiline="true"
          className="prose-admin max-h-[32rem] overflow-y-auto px-4 py-3 text-[15px] leading-7 outline-none" style={{ minHeight: minRows * 24 }}
          onInput={emit} onBlur={emit} onKeyUp={() => force((n) => n + 1)} onMouseUp={() => force((n) => n + 1)}
          onPaste={(e) => {
            // paste as clean text paragraphs — keeps Word / Google Docs styles out
            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');
            if (html || text) {
              e.preventDefault();
              const safe = text.split(/\n{2,}/).map((p) => '<p>' + p.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)).replace(/\n/g, '<br>') + '</p>').join('');
              document.execCommand('insertHTML', false, safe);
              emit();
            }
          }} />
      )}
    </div>
  );
}
