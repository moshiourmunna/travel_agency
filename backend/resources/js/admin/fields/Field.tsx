import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Switch, cx, useConfirm } from '@/components/ui';
import { useT } from '@/lib/i18n';
import type { FieldDef, Opt } from '@/lib/types';
import { FieldWrap, Input, MultiSelect, Select, Textarea } from './basic';
import { ListEdit, TrList, TrPair, useKeys } from './bilingual';
import { errorAt, hasErrorUnder, slugify, useFormCtx } from './ctx';
import { IconPicker } from './icons';
import { JsonField } from './json';
import { GalleryField, ImageField } from './media';

type Props = { f: FieldDef; value: any; onChange: (v: any) => void; path: string; row?: Record<string, any>; parentMeta?: Record<string, any>; editing?: boolean };

export const spanClass = (n?: number) => ({ 12: 'col-span-12', 8: 'col-span-12 md:col-span-8', 6: 'col-span-12 md:col-span-6', 4: 'col-span-12 sm:col-span-6 lg:col-span-4', 3: 'col-span-6 lg:col-span-3' } as Record<number, string>)[n ?? 12] ?? 'col-span-12';

/** One resource field, rendered from its server definition (App\Admin\Field::toArray). */
export function FieldInput({ f, value, onChange, path, row, parentMeta, editing }: Props) {
  const { t } = useT();
  const { errors, creating, data } = useFormCtx();
  const ro = !!f.readonly || (!!f.createOnly && !creating);
  const err = errorAt(errors, path);
  const nestedErr = errorAt(errors, path, true);
  const m = f.meta ?? {};
  const common = { label: f.label, help: f.help, required: f.required, error: err };

  switch (f.type) {
    case 'text':
      if (m.mediaKey) return <FieldWrap {...common}><ImageField byKey value={value} onChange={onChange} /></FieldWrap>;
      return <Input {...common} value={value} onChange={onChange} readOnly={ro} counter={m.counter} />;
    case 'email': return <Input {...common} type="email" value={value} onChange={onChange} readOnly={ro} />;
    case 'url': return <Input {...common} type="url" value={value} onChange={onChange} readOnly={ro} placeholder="https://" />;
    case 'password': return <Input {...common} type="password" value={value} onChange={onChange} readOnly={ro} autoComplete="new-password" help={f.help ?? (!creating ? t('Leave empty to keep the current password.', 'বর্তমান পাসওয়ার্ড রাখতে খালি রাখুন।') : null)} />;
    case 'number':
    case 'money':
      return <Input {...common} type="number" step={f.type === 'money' ? '0.01' : 'any'} min={m.allowNegative ? undefined : 0} prefix={f.type === 'money' ? '৳' : undefined} readOnly={ro}
        value={value ?? ''} onChange={(v) => onChange(v === '' ? null : Number(v))} />;
    case 'date': return <Input {...common} type="date" value={value ?? ''} onChange={(v) => onChange(v || null)} readOnly={ro} />;
    case 'datetime': return <Input {...common} type="datetime-local" value={value ?? ''} onChange={(v) => onChange(v || null)} readOnly={ro} help={f.help ?? t('Dhaka time', 'ঢাকা সময়')} />;
    case 'color':
      return (
        <FieldWrap {...common}>
          <div className="flex gap-2"><input type="color" className="h-11 w-14 cursor-pointer rounded-xl border border-ink-200 bg-white p-1 dark:border-ink-700 dark:bg-ink-900" value={/^#[0-9a-f]{6}$/i.test(value ?? '') ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={f.label} disabled={ro} />
            <input className="input font-mono" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} placeholder="#0d9488" readOnly={ro} aria-label={f.label} /></div>
        </FieldWrap>
      );
    case 'textarea': return <Textarea {...common} value={value} onChange={onChange} readOnly={ro} counter={m.counter} rows={m.rows ?? 4} />;
    case 'switch':
      return <div className="pt-1"><Switch checked={!!value} onChange={onChange} label={f.label} disabled={ro} />{f.help ? <p className="mt-1 pl-14 text-xs muted">{f.help}</p> : null}{err ? <p className="mt-1 text-xs text-rose-600">{err}</p> : null}</div>;
    case 'icon': return <FieldWrap {...common}><IconPicker value={value} onChange={onChange} /></FieldWrap>;
    case 'tr':
    case 'trtext':
    case 'trhtml': {
      const vars: string[] = m.variablesFrom ? toList(data[m.variablesFrom]) : [];
      return (
        <FieldWrap {...common} error={err}>
          <TrPair value={value} onChange={onChange} kind={f.type === 'tr' ? 'line' : f.type === 'trtext' ? 'text' : 'html'} counter={m.counter} required={f.required} rows={m.rows ?? 4}
            errors={{ en: errors[path + '.en'], bn: errors[path + '.bn'] }}
            insert={vars.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs"><span className="muted">{t('Variables:', 'ভেরিয়েবল:')}</span>
                {vars.map((v) => <button key={v} type="button" className="chip px-2 py-0.5 font-mono text-[11px]" title={t('Copy', 'কপি')} onClick={() => navigator.clipboard?.writeText(`{${v}}`)}>{`{${v}}`}</button>)}
              </div>) : null} />
        </FieldWrap>
      );
    }
    case 'trlist': return <FieldWrap {...common} error={err ?? nestedErr}><TrList value={value ?? []} onChange={onChange} errors={errors} path={path} /></FieldWrap>;
    case 'list': return <FieldWrap {...common} error={err ?? nestedErr}><ListEdit value={value ?? []} onChange={onChange} numeric={m.numeric} /></FieldWrap>;
    case 'checks':
      return (
        <FieldWrap {...common} error={err ?? nestedErr}>
          <div className="grid gap-2 rounded-xl border border-ink-100 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-ink-800">
            {(f.options ?? []).map((o) => {
              const on = (value ?? []).map(String).includes(String(o.value));
              return <label key={String(o.value)} className="flex items-center gap-2 text-sm"><input type="checkbox" className="check" checked={on} disabled={ro}
                onChange={() => onChange(on ? (value ?? []).filter((x: any) => String(x) !== String(o.value)) : [...(value ?? []), o.value])} />{o.label}</label>;
            })}
          </div>
        </FieldWrap>
      );
    case 'image': return <FieldWrap {...common}><ImageField value={value} onChange={onChange} /></FieldWrap>;
    case 'gallery': return <FieldWrap {...common} error={err ?? nestedErr}><GalleryField value={value ?? []} onChange={onChange} /></FieldWrap>;
    case 'json': {
      const template = m.sectionData && row?.type ? parentMeta?.templates?.[row.type] : undefined;
      return <FieldWrap {...common} error={err ?? nestedErr}><JsonField key={m.sectionData ? row?.type : 'j'} value={value} onChange={onChange} raw={m.raw} template={template} ctx={{ sources: parentMeta?.sources, errors, path }} /></FieldWrap>;
    }
    case 'slug': return <SlugField f={f} value={value} onChange={onChange} error={err} source={data[m.from ?? 'title']} creating={creating} readOnly={ro} />;
    case 'select': return <Select {...common} value={value} onChange={onChange} options={f.options ?? []} readOnly={ro} allowEmpty={!f.required} />;
    case 'multi': return <FieldWrap {...common} error={err ?? nestedErr}><MultiSelect value={value ?? []} onChange={onChange} options={f.options ?? []} /></FieldWrap>;
    case 'repeater':
    case 'children':
      return <FieldWrap label={f.label} help={f.help} error={err}><Rows f={f} value={value ?? []} onChange={onChange} path={path} editing={editing} /></FieldWrap>;
    case 'seo': return <SeoField value={value} onChange={onChange} path={path} />;
    default:
      return <Input {...common} value={typeof value === 'object' && value !== null ? JSON.stringify(value) : value} onChange={onChange} readOnly={ro} />;
  }
}

const toList = (v: any): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.en ?? x?.name ?? '')).filter(Boolean) : typeof v === 'string' ? v.split(/[\s,]+/).filter(Boolean) : []);

function SlugField({ f, value, onChange, error, source, creating, readOnly }: { f: FieldDef; value: any; onChange: (v: any) => void; error: string | null; source: any; creating: boolean; readOnly: boolean }) {
  const { t } = useT();
  const touched = useRef(!!value && !creating);
  const from = typeof source === 'object' && source ? source.en ?? '' : String(source ?? '');
  useEffect(() => { if (creating && !touched.current && from) onChange(slugify(from)); }, [from]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FieldWrap label={f.label} help={f.help} error={error} required={f.required}
      extra={!readOnly && from ? <button type="button" className="mb-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300" onClick={() => { touched.current = false; onChange(slugify(from)); }}>{t('Generate from title', 'শিরোনাম থেকে তৈরি')}</button> : null}>
      <div className="flex">
        <span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3 text-sm text-ink-500 dark:border-ink-700 dark:bg-ink-900">/</span>
        <input className="input rounded-l-none font-mono text-sm" value={value ?? ''} readOnly={readOnly} aria-label={f.label} aria-invalid={!!error || undefined}
          onChange={(e) => { touched.current = true; onChange(e.target.value.toLowerCase().replace(/\s+/g, '-')); }} onBlur={() => value && onChange(slugify(String(value)))} />
      </div>
    </FieldWrap>
  );
}

/** repeater (json rows) and children (hasMany rows, keep `id`). */
function Rows({ f, value, onChange, path, editing }: { f: FieldDef; value: any[]; onChange: (v: any[]) => void; path: string; editing?: boolean }) {
  const { t } = useT();
  const confirm = useConfirm();
  const { errors } = useFormCtx();
  const m = f.meta ?? {};
  const keys = useKeys(value.length);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [dragI, setDragI] = useState<number | null>(null);
  const [overI, setOverI] = useState<number | null>(null);
  const fields = f.fields ?? [];
  const typeField = fields.find((x) => x.name === 'type' && x.type === 'select');
  const templates: Record<string, any> = m.templates ?? {};
  const collapsible = !!m.collapsible || value.length > 4;
  const compact = !!m.compact;

  const move = (i: number, j: number) => { if (j < 0 || j >= value.length || i === j) return; const a = [...value]; const [x] = a.splice(i, 1); a.splice(j, 0, x); keys.move(i, j); onChange(a); };
  const add = (extra: Record<string, any> = {}) => {
    const blank = { ...structuredClone(f.blank ?? {}), ...extra };
    keys.insert(value.length);
    onChange([...value, blank]);
    setTimeout(() => setOpen((o) => ({ ...o, [keys.keys[keys.keys.length - 1]]: true })), 0);
  };
  const remove = async (i: number) => {
    const r = value[i];
    if (r?.id && !(await confirm({ title: t('Remove this row?', 'এই সারিটি সরাবেন?'), body: t('It is deleted when you save.', 'সংরক্ষণ করলে মুছে যাবে।'), danger: true, confirm: t('Remove', 'সরান') }))) return;
    keys.remove(i);
    onChange(value.filter((_, j) => j !== i));
  };
  const titleOf = (r: any, i: number) => {
    if (m.titleFrom && typeField && m.titleFrom === 'type') return (typeField.options ?? []).find((o: Opt) => String(o.value) === String(r.type))?.label ?? r.type;
    const first = fields.find((x) => ['tr', 'text', 'trtext'].includes(x.type));
    const v = first ? r[first.name] : null;
    const s = typeof v === 'object' && v ? v.en : v;
    return s || `${m.itemLabel ?? t('Item', 'আইটেম')} ${i + 1}`;
  };

  return (
    <div className={cx(m.grid ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
      {value.map((r, i) => {
        const k = keys.keys[i];
        const isOpen = collapsible ? open[k] ?? (!r?.id && !editing) : true;
        const rowPath = `${path}.${i}`;
        const bad = hasErrorUnder(errors, rowPath);
        const set = (name: string, v: any) => {
          const next = { ...r, [name]: v };
          // choosing a section type fills its standard layout when the content is still empty
          if (name === 'type' && templates[v] && (!r.data || !Object.keys(r.data).length)) next.data = structuredClone(templates[v]);
          onChange(value.map((x, j) => (j === i ? next : x)));
        };
        return (
          <div key={k} className={cx('row-card', bad && 'border-rose-300 dark:border-rose-800', overI === i && dragI !== null && dragI !== i && 'drop-target', dragI === i && 'opacity-50')}
            onDragOver={(e) => { if (dragI !== null) { e.preventDefault(); setOverI(i); } }} onDrop={(e) => { e.preventDefault(); if (dragI !== null) move(dragI, i); setDragI(null); setOverI(null); }}>
            <div className="flex items-center gap-1 px-2 py-1.5">
              <span draggable onDragStart={(e) => { setDragI(i); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDragI(null); setOverI(null); }}
                className="grid h-8 w-6 cursor-grab place-items-center text-ink-400 hover:text-ink-700 active:cursor-grabbing" title={t('Drag to reorder', 'ক্রম বদলাতে টানুন')}><Icon name="grip-vertical" size={16} /></span>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left" onClick={() => collapsible && setOpen({ ...open, [k]: !isOpen })} aria-expanded={isOpen} disabled={!collapsible}>
                {collapsible ? <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={15} className="shrink-0 text-ink-400" /> : null}
                <span className="text-xs font-bold tabular-nums text-ink-400">{m.numbered ? `${m.itemLabel ?? ''} ${i + 1}` : i + 1}</span>
                <span className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{titleOf(r, i)}</span>
                {'is_active' in (r ?? {}) && !r.is_active ? <span className="badge badge-gray">{t('Hidden', 'লুকানো')}</span> : null}
                {bad ? <Icon name="circle-alert" size={15} className="shrink-0 text-rose-600" /> : null}
              </button>
              <button type="button" className="icon-btn h-8 w-8" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={t('Move up', 'উপরে')}><Icon name="arrow-up" size={14} /></button>
              <button type="button" className="icon-btn h-8 w-8" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} aria-label={t('Move down', 'নিচে')}><Icon name="arrow-down" size={14} /></button>
              <button type="button" className="icon-btn h-8 w-8" onClick={() => { const c = structuredClone(r); delete c.id; const a = [...value]; a.splice(i + 1, 0, c); keys.insert(i + 1); onChange(a); }} aria-label={t('Duplicate', 'কপি')}><Icon name="copy" size={14} /></button>
              <button type="button" className="icon-btn h-8 w-8 hover:text-rose-600" onClick={() => remove(i)} aria-label={t('Remove', 'সরান')} data-row-remove><Icon name="trash-2" size={14} /></button>
            </div>
            {isOpen ? (
              <div className={cx('border-t border-ink-100 p-3 dark:border-ink-800', compact ? 'grid grid-cols-12 gap-3' : 'field-grid')}>
                {fields.map((sf) => (
                  <div key={sf.name} data-field={sf.name} className={compact ? spanClass(sf.span && sf.span < 12 ? sf.span : 6) : spanClass(sf.span)}>
                    <FieldInput f={sf} value={r?.[sf.name]} onChange={(v) => set(sf.name, v)} path={`${rowPath}.${sf.name}`} row={r} parentMeta={m} editing={editing} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className={m.grid ? 'flex items-center' : ''}>
        {typeField && Object.keys(templates).length ? (
          <AddTyped options={typeField.options ?? []} onAdd={(type) => add({ type, data: structuredClone(templates[type] ?? {}) })} label={t(`Add ${f.label.toLowerCase().replace(/s$/, '')}`, `${f.label} যোগ`)} />
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => add()} data-row-add><Icon name="plus" size={15} />{t('Add', 'যোগ')} {m.itemLabel ? m.itemLabel.toLowerCase() : t('row', 'সারি')}</button>
        )}
      </div>
    </div>
  );
}

function AddTyped({ options, onAdd, label }: { options: Opt[]; onAdd: (v: string) => void; label: string }) {
  const [v, setV] = useState('');
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input h-9 w-auto py-1 text-sm" value={v} onChange={(e) => setV(e.target.value)} aria-label={t('Section type', 'সেকশনের ধরন')}>
        <option value="">{t('Choose type…', 'ধরন বাছাই…')}</option>
        {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
      <button type="button" className="btn btn-outline btn-sm" disabled={!v} onClick={() => { onAdd(v); setV(''); }} data-row-add><Icon name="plus" size={15} />{label}</button>
    </div>
  );
}

/** Search-engine fields with a live result preview. */
function SeoField({ value, onChange, path }: { value: any; onChange: (v: any) => void; path: string }) {
  const { t } = useT();
  const { errors, data } = useFormCtx();
  const v = value ?? {};
  const set = (k: string, x: any) => onChange({ ...v, [k]: x });
  const title = v.meta_title?.en || data.title?.en || data.name?.en || '';
  const desc = v.meta_description?.en || data.summary?.en || data.excerpt?.en || '';
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900" aria-label={t('Google preview', 'গুগল প্রিভিউ')}>
        <p className="text-xs text-emerald-700 dark:text-emerald-400">musafir.com.bd › {data.slug || '…'}</p>
        <p className="mt-0.5 truncate text-lg text-[#1a0dab] dark:text-sky-300">{(title || t('Page title', 'পেজের শিরোনাম')).slice(0, 60)} | Musafir</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{desc.slice(0, 160) || t('Description shown under the title in search results.', 'সার্চ ফলাফলে শিরোনামের নিচে দেখানো বিবরণ।')}</p>
      </div>
      <FieldWrap label={t('Meta title', 'মেটা শিরোনাম')} help={t('Leave empty to use the page title. About 60 characters.', 'খালি রাখলে পেজের শিরোনাম ব্যবহার হবে। প্রায় ৬০ অক্ষর।')}>
        <TrPair value={v.meta_title} onChange={(x) => set('meta_title', x)} counter={60} errors={{ en: errors[path + '.meta_title.en'], bn: errors[path + '.meta_title.bn'] }} />
      </FieldWrap>
      <FieldWrap label={t('Meta description', 'মেটা বিবরণ')} help={t('About 150–160 characters.', 'প্রায় ১৫০–১৬০ অক্ষর।')}>
        <TrPair value={v.meta_description} onChange={(x) => set('meta_description', x)} kind="text" rows={2} counter={160} errors={{ en: errors[path + '.meta_description.en'], bn: errors[path + '.meta_description.bn'] }} />
      </FieldWrap>
      <div className="field-grid">
        <div className="col-span-12"><FieldWrap label={t('Social share image', 'সোশ্যাল শেয়ার ছবি')} help={t('1200×630 works best. Defaults to the main photo.', '১২০০×৬৩০ ভালো। না দিলে মূল ছবি।')}><ImageField value={v.og_image_id} onChange={(x) => set('og_image_id', x)} /></FieldWrap></div>
        <div className="col-span-12 md:col-span-6"><Input label={t('Canonical URL', 'ক্যানোনিকাল ইউআরএল')} value={v.canonical} onChange={(x) => set('canonical', x || null)} error={errors[path + '.canonical']} placeholder="https://" /></div>
        <div className="col-span-12 md:col-span-6"><Select label={t('Robots', 'রোবটস')} value={v.robots} onChange={(x) => set('robots', x)} allowEmpty={false} error={errors[path + '.robots']}
          options={[{ value: 'index,follow', label: t('Index, follow (normal)', 'ইনডেক্স, ফলো (সাধারণ)') }, { value: 'noindex,follow', label: t('Hide from search (noindex)', 'সার্চে লুকান (noindex)') }, { value: 'noindex,nofollow', label: 'noindex, nofollow' }, { value: 'index,nofollow', label: 'index, nofollow' }]} /></div>
        <div className="col-span-12 sm:col-span-4"><div className="pt-7"><Switch checked={!!v.in_sitemap} onChange={(x) => set('in_sitemap', x)} label={t('In sitemap', 'সাইটম্যাপে')} /></div></div>
        <div className="col-span-6 sm:col-span-4"><Input type="number" step="0.1" min={0} max={1} label={t('Sitemap priority', 'সাইটম্যাপ অগ্রাধিকার')} value={v.sitemap_priority} onChange={(x) => set('sitemap_priority', x === '' ? null : Number(x))} error={errors[path + '.sitemap_priority']} /></div>
        <div className="col-span-6 sm:col-span-4"><Select label={t('Change frequency', 'পরিবর্তনের হার')} value={v.sitemap_changefreq} onChange={(x) => set('sitemap_changefreq', x)} allowEmpty={false}
          options={['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((x) => ({ value: x, label: x }))} /></div>
      </div>
    </div>
  );
}
