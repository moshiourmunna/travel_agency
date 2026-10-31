import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Switch, cx } from '@/components/ui';
import { useT } from '@/lib/i18n';
import type { Opt } from '@/lib/types';
import { MultiSelect } from './basic';
import { ListEdit, TrList, TrPair, useKeys } from './bilingual';
import { emptied, humanize, isTr } from './ctx';
import { IconPicker, SiteIcon } from './icons';
import { GalleryField, ImageField } from './media';

export type JsonCtx = { sources?: Record<string, Opt[]>; errors: Record<string, string>; path: string };

const isImageId = (k: string) => /(^|_)image_id$/.test(k) || k === 'og_image_id';
const isImageIds = (k: string) => /(^|_)image_ids$/.test(k);
const NUMERIC = /^(limit|rating|count|price|amount|min|max|value|year|nights|days|percent|sort|order|lat|lng)$|_(count|price|amount|pct|no)$/;
const LONG = /(text|body|subtitle|description|intro|lead|note|answer|summary|story|bio|quote|excerpt|message)$/;

/** Recursive editor that follows the existing shape of a json value. */
export function JsonNode({ k, value, onChange, ctx, siblings, depth = 0 }: { k: string; value: any; onChange: (v: any) => void; ctx: JsonCtx; siblings?: Record<string, any>; depth?: number }) {
  const { t } = useT();
  const err = ctx.errors[ctx.path];

  if (isTr(value)) {
    const long = LONG.test(k) || (value.en?.length ?? 0) > 90 || (value.bn?.length ?? 0) > 90;
    return <TrPair value={value} onChange={onChange} kind={long ? 'text' : 'line'} rows={long ? 3 : 2} errors={{ en: ctx.errors[ctx.path + '.en'], bn: ctx.errors[ctx.path + '.bn'] }} />;
  }
  if (typeof value === 'boolean') return <Switch checked={value} onChange={onChange} label={value ? t('On', 'চালু') : t('Off', 'বন্ধ')} />;
  if (k === 'icon' && (typeof value === 'string' || value === null)) return <IconPicker value={value} onChange={(v) => onChange(v ?? '')} />;
  if (isImageId(k) && (typeof value === 'number' || value === null || value === '')) return <ImageField value={value || null} onChange={onChange} />;
  if (isImageIds(k) && (Array.isArray(value) || value === null)) return <GalleryField value={value ?? []} onChange={onChange} />;
  if (k === 'ids' && Array.isArray(value) && siblings?.source && ctx.sources?.[siblings.source]) {
    return (
      <div>
        <MultiSelect value={value} onChange={onChange} options={ctx.sources[siblings.source]} placeholder={t('Leave empty to show the newest automatically', 'খালি রাখলে স্বয়ংক্রিয়ভাবে নতুনগুলো দেখাবে')} />
        <p className="mt-1 text-xs muted">{t('Pick and order items, or leave empty for automatic.', 'আইটেম বাছাই ও সাজান, অথবা স্বয়ংক্রিয়ের জন্য খালি রাখুন।')}</p>
      </div>
    );
  }
  if (typeof value === 'number' || (value === null && NUMERIC.test(k))) {
    return <input type="number" step="any" className={cx('input', err && 'is-invalid')} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} aria-label={humanize(k)} />;
  }
  if (typeof value === 'string' || value === null || value === undefined) {
    const s = value ?? '';
    if (LONG.test(k) || s.length > 90) return <textarea rows={3} className={cx('input', err && 'is-invalid')} value={s} onChange={(e) => onChange(e.target.value)} aria-label={humanize(k)} />;
    const type = /countdown|_at$|_to$/.test(k) && /T\d\d:/.test(s) ? 'text' : /(^|_)date$/.test(k) ? 'date' : /(^|_)url$|^href$/.test(k) ? 'text' : /(^|_)color$/.test(k) ? 'text' : 'text';
    return <input type={type} className={cx('input', err && 'is-invalid', /url|href|source|key/.test(k) && 'font-mono text-xs')} value={s} onChange={(e) => onChange(e.target.value)} aria-label={humanize(k)} placeholder={/url|href/.test(k) ? '/page or https://…' : undefined} />;
  }
  if (Array.isArray(value)) {
    if (value.length && value.every(isTr)) return <TrList value={value} onChange={onChange} errors={ctx.errors} path={ctx.path} />;
    if (value.length && value.every((x) => x === null || typeof x !== 'object')) return <ListEdit value={value} onChange={onChange} numeric={value.every((x) => typeof x === 'number')} />;
    if (!value.length && /features|items|lines|points|bullets|highlights|story|paragraphs/.test(k) && !/s$/.test('x')) return <EmptyArray k={k} onPick={onChange} />;
    return <ObjList k={k} value={value} onChange={onChange} ctx={ctx} depth={depth} />;
  }
  if (typeof value === 'object') return <ObjFields value={value} onChange={onChange} ctx={ctx} depth={depth} />;
  return null;
}

/** An empty list has no shape to follow: let the editor choose what a row is. */
function EmptyArray({ k, onPick }: { k: string; onPick: (v: any) => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-ink-200 p-3 text-sm dark:border-ink-700">
      <span className="muted">{t('Empty list. Add:', 'খালি তালিকা। যোগ করুন:')}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick([{ en: '', bn: '' }])}>{t('Bilingual line', 'দ্বিভাষিক লাইন')}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick([{ icon: '', title: { en: '', bn: '' }, text: { en: '', bn: '' } }])}>{t('Card (icon, title, text)', 'কার্ড (আইকন, শিরোনাম, লেখা)')}</button>
      <span className="sr-only">{k}</span>
    </div>
  );
}

function ObjFields({ value, onChange, ctx, depth }: { value: Record<string, any>; onChange: (v: any) => void; ctx: JsonCtx; depth: number }) {
  const entries = Object.entries(value);
  const order = (a: [string, any], b: [string, any]) => rank(a) - rank(b);
  return (
    <div className={cx('grid grid-cols-12 gap-x-4 gap-y-4', depth > 0 && 'rounded-xl border border-ink-100 p-3 dark:border-ink-800')}>
      {entries.sort(order).map(([k, v]) => {
        const wide = isTr(v) || (v && typeof v === 'object') || LONG.test(k) || isImageId(k);
        return (
          <div key={k} className={wide ? 'col-span-12' : 'col-span-12 sm:col-span-6 lg:col-span-4'}>
            <div className={cx('label', ctx.errors[ctx.path + '.' + k] && 'text-rose-600')}>{humanize(k)}</div>
            <JsonNode k={k} value={v} siblings={value} depth={depth + 1} ctx={{ ...ctx, path: ctx.path + '.' + k }} onChange={(x) => onChange({ ...value, [k]: x })} />
          </div>
        );
      })}
    </div>
  );
}
// simple fields first, then texts, then nested groups
function rank([k, v]: [string, any]): number {
  if (k === 'source' || k === 'limit') return 0;
  if (k === 'eyebrow') return 1;
  if (k === 'title') return 2;
  if (k === 'subtitle') return 3;
  if (v === null || typeof v !== 'object') return 1.5;
  if (isTr(v)) return 4;
  return Array.isArray(v) ? 6 : 5;
}

function ObjList({ k, value, onChange, ctx, depth }: { k: string; value: any[]; onChange: (v: any[]) => void; ctx: JsonCtx; depth: number }) {
  const { t } = useT();
  const keys = useKeys(value.length);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const title = (row: any) => {
    const c = row?.title ?? row?.label ?? row?.name ?? row?.q ?? row?.question;
    return typeof c === 'string' ? c : c?.en || '';
  };
  const move = (i: number, j: number) => { const a = [...value]; const [x] = a.splice(i, 1); a.splice(j, 0, x); keys.move(i, j); onChange(a); };
  const blank = value.length ? emptied(value[0]) : {};
  const many = value.length > 3;
  return (
    <div className="space-y-2">
      {value.map((row, i) => {
        const kk = keys.keys[i];
        const isOpen = open[kk] ?? !many;
        return (
          <div key={kk} className="row-card">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left text-sm" onClick={() => setOpen({ ...open, [kk]: !isOpen })} aria-expanded={isOpen}>
                <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={15} className="shrink-0 text-ink-400" />
                <span className="text-xs font-bold tabular-nums text-ink-400">{i + 1}</span>
                {row?.icon ? <span className="shrink-0 text-brand-700"><SiteIcon name={row.icon} size={15} /></span> : null}
                <span className="truncate font-medium">{title(row) || humanize(k)}</span>
              </button>
              <button type="button" className="icon-btn h-8 w-8" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={t('Move up', 'উপরে')}><Icon name="arrow-up" size={14} /></button>
              <button type="button" className="icon-btn h-8 w-8" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} aria-label={t('Move down', 'নিচে')}><Icon name="arrow-down" size={14} /></button>
              <button type="button" className="icon-btn h-8 w-8" onClick={() => { const a = [...value]; a.splice(i + 1, 0, structuredClone(row)); keys.insert(i + 1); onChange(a); }} aria-label={t('Duplicate', 'কপি')}><Icon name="copy" size={14} /></button>
              <button type="button" className="icon-btn h-8 w-8 hover:text-rose-600" onClick={() => { keys.remove(i); onChange(value.filter((_, j) => j !== i)); }} aria-label={t('Remove', 'সরান')}><Icon name="trash-2" size={14} /></button>
            </div>
            {isOpen ? <div className="border-t border-ink-100 p-3 dark:border-ink-800">
              <JsonNode k={k + '_item'} value={row} depth={depth} ctx={{ ...ctx, path: `${ctx.path}.${i}` }} onChange={(x) => onChange(value.map((y, j) => (j === i ? x : y)))} />
            </div> : null}
          </div>
        );
      })}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onChange([...value, structuredClone(blank)]); }}><Icon name="plus" size={15} />{t('Add item', 'আইটেম যোগ')}</button>
    </div>
  );
}

/** Raw JSON text editor with parse checking. */
export function RawJson({ value, onChange, rows = 10 }: { value: any; onChange: (v: any) => void; rows?: number }) {
  const { t } = useT();
  const [text, setText] = useState(() => (value === null || value === undefined ? '' : JSON.stringify(value, null, 2)));
  const [bad, setBad] = useState<string | null>(null);
  useEffect(() => {
    try { if (JSON.stringify(text.trim() ? JSON.parse(text) : null) !== JSON.stringify(value ?? null)) setText(value === null || value === undefined ? '' : JSON.stringify(value, null, 2)); } catch { /* keep the user's draft */ }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <textarea rows={rows} spellCheck={false} className={cx('input font-mono text-xs leading-5', bad && 'is-invalid')} value={text} aria-label="JSON"
        onChange={(e) => {
          const s = e.target.value; setText(s);
          if (!s.trim()) { setBad(null); onChange(null); return; }
          try { onChange(JSON.parse(s)); setBad(null); } catch (x: any) { setBad(String(x.message || x)); }
        }} />
      {bad ? <p className="mt-1 text-xs text-rose-600" role="alert">{t('Invalid JSON:', 'অবৈধ JSON:')} {bad}</p> : null}
    </div>
  );
}

/** json field: structured editor when the value has a shape, raw text otherwise / on demand. */
export function JsonField({ value, onChange, ctx, template, raw: forceRaw }: { value: any; onChange: (v: any) => void; ctx: JsonCtx; template?: any; raw?: boolean }) {
  const { t } = useT();
  const shaped = value && typeof value === 'object' && Object.keys(value).length > 0;
  const [raw, setRaw] = useState(!!forceRaw || (!shaped && !template));
  return (
    <div>
      {!forceRaw ? (
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
          {!shaped && template ? <button type="button" className="btn btn-outline btn-sm" onClick={() => { onChange(structuredClone(template)); setRaw(false); }}><Icon name="wand-sparkles" size={15} />{t('Start from the standard layout', 'মানক লেআউট থেকে শুরু')}</button> : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRaw(!raw)} aria-pressed={raw}><Icon name="braces" size={15} />{raw ? t('Form view', 'ফর্ম ভিউ') : t('Edit as JSON', 'JSON হিসেবে সম্পাদনা')}</button>
        </div>
      ) : null}
      {raw || !shaped ? <RawJson value={value} onChange={onChange} rows={shaped ? 16 : 6} /> : <JsonNode k="" value={value} onChange={onChange} ctx={ctx} />}
    </div>
  );
}
