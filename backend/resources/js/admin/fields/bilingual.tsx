import { useRef, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { cx } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { LangTag } from './basic';
import { RichText } from './rich';

type Tr = { en: string; bn: string };
const norm = (v: any): Tr => (v && typeof v === 'object' ? { en: v.en ?? '', bn: v.bn ?? '' } : { en: v ?? '', bn: '' });

/** English and Bangla side by side (stacked on small screens). */
export function TrPair({ value, onChange, kind = 'line', errors = {}, rows = 3, counter, required, insert }: { value: any; onChange: (v: Tr) => void; kind?: 'line' | 'text' | 'html'; errors?: { en?: string | null; bn?: string | null }; rows?: number; counter?: number; required?: boolean; insert?: ReactNode }) {
  const { t } = useT();
  const v = norm(value);
  const set = (l: 'en' | 'bn', x: string) => onChange({ ...v, [l]: x });
  const one = (l: 'en' | 'bn') => {
    const err = errors[l];
    const len = v[l].length;
    const missing = l === 'bn' && !v.bn.trim() && !!v.en.trim();
    return (
      <div className={cx('min-w-0', err && 'is-invalid')}>
        <div className="mb-1 flex items-center gap-2">
          <LangTag l={l} />
          {missing ? <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300" title={t('Bangla visitors will see the English text.', 'বাংলা ভিজিটর ইংরেজি লেখা দেখবেন।')}>{t('missing — English will show', 'নেই — ইংরেজি দেখাবে')}</span> : null}
          {counter ? <span className={cx('ml-auto text-[11px] tabular-nums', len > counter ? 'text-rose-600' : 'muted')}>{len}/{counter}</span> : null}
        </div>
        {kind === 'html' ? <RichText value={v[l]} onChange={(x) => set(l, x)} lang={l} invalid={!!err} />
          : kind === 'text' ? <textarea lang={l} rows={rows} className="input leading-6" value={v[l]} onChange={(e) => set(l, e.target.value)} aria-label={l === 'en' ? 'English' : 'Bangla'} aria-invalid={!!err || undefined} required={required && l === 'en'} />
          : <input lang={l} className="input" value={v[l]} onChange={(e) => set(l, e.target.value)} aria-label={l === 'en' ? 'English' : 'Bangla'} aria-invalid={!!err || undefined} required={required && l === 'en'} />}
        {err ? <p className="mt-1 text-xs font-medium text-rose-600" role="alert">{err}</p> : null}
      </div>
    );
  };
  return (
    <div>
      <div className={cx('grid gap-3', kind === 'html' ? '2xl:grid-cols-2' : 'md:grid-cols-2')}>{one('en')}{one('bn')}</div>
      {insert}
    </div>
  );
}

function useKeys(n: number) {
  const keys = useRef<number[]>([]);
  const seq = useRef(0);
  while (keys.current.length < n) keys.current.push(++seq.current);
  if (keys.current.length > n) keys.current.length = n;
  return {
    keys: keys.current,
    move(i: number, j: number) { const k = keys.current; const [x] = k.splice(i, 1); k.splice(j, 0, x); },
    remove(i: number) { keys.current.splice(i, 1); },
    insert(i: number) { keys.current.splice(i, 0, ++seq.current); },
  };
}
export { useKeys };

function RowTools({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (to: number) => void; onRemove: () => void }) {
  const { t } = useT();
  return (
    <div className="flex shrink-0 items-start gap-0.5 pt-1">
      <button type="button" className="icon-btn h-8 w-8" disabled={i === 0} onClick={() => onMove(i - 1)} aria-label={t('Move up', 'উপরে')}><Icon name="arrow-up" size={14} /></button>
      <button type="button" className="icon-btn h-8 w-8" disabled={i === n - 1} onClick={() => onMove(i + 1)} aria-label={t('Move down', 'নিচে')}><Icon name="arrow-down" size={14} /></button>
      <button type="button" className="icon-btn h-8 w-8 hover:text-rose-600" onClick={onRemove} aria-label={t('Remove', 'সরান')}><Icon name="trash-2" size={14} /></button>
    </div>
  );
}

/** List of bilingual lines (inclusions, highlights…). */
export function TrList({ value, onChange, errors = {}, path = '' }: { value: any[]; onChange: (v: Tr[]) => void; errors?: Record<string, string>; path?: string }) {
  const { t } = useT();
  const rows = (value ?? []).map(norm);
  const k = useKeys(rows.length);
  const move = (i: number, j: number) => { const a = [...rows]; const [x] = a.splice(i, 1); a.splice(j, 0, x); k.move(i, j); onChange(a); };
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={k.keys[i]} className="flex gap-2">
          <span className="mt-3 w-5 shrink-0 text-right text-xs tabular-nums muted">{i + 1}</span>
          <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-2">
            {(['en', 'bn'] as const).map((l) => (
              <div key={l} className={cx('relative', errors[`${path}.${i}.${l}`] && 'is-invalid')}>
                <input lang={l} className="input pr-12" value={r[l]} placeholder={l === 'en' ? 'English' : 'বাংলা'} aria-label={`${i + 1} ${l}`}
                  onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [l]: e.target.value } : x)))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const a = [...rows]; a.splice(i + 1, 0, { en: '', bn: '' }); k.insert(i + 1); onChange(a); } }} />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"><LangTag l={l} /></span>
              </div>
            ))}
          </div>
          <RowTools i={i} n={rows.length} onMove={(j) => move(i, j)} onRemove={() => { k.remove(i); onChange(rows.filter((_, j) => j !== i)); }} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...rows, { en: '', bn: '' }])}><Icon name="plus" size={15} />{t('Add line', 'লাইন যোগ')}</button>
    </div>
  );
}

/** List of plain values (codes, amounts, URLs). */
export function ListEdit({ value, onChange, numeric }: { value: any[]; onChange: (v: any[]) => void; numeric?: boolean }) {
  const { t } = useT();
  const rows = value ?? [];
  const k = useKeys(rows.length);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={k.keys[i]} className="flex gap-2">
          <input className="input" type={numeric ? 'number' : 'text'} step="any" value={r ?? ''} aria-label={String(i + 1)}
            onChange={(e) => onChange(rows.map((x, j) => (j === i ? (numeric ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value) : x)))} />
          <RowTools i={i} n={rows.length} onMove={(j) => { const a = [...rows]; const [x] = a.splice(i, 1); a.splice(j, 0, x); k.move(i, j); onChange(a); }} onRemove={() => { k.remove(i); onChange(rows.filter((_, j) => j !== i)); }} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...rows, numeric ? null : ''])}><Icon name="plus" size={15} />{t('Add', 'যোগ')}</button>
    </div>
  );
}
