import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Layout';
import { Badge, Card, Empty, Modal, PageHeader, Pager, Spinner, cx, useConfirm } from '@/components/ui';
import { Input, LangTag, Textarea } from '@/fields/basic';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Pagination, Shared } from '@/lib/types';

type Row = { id: number; group: string; key: string; en: string; bn: string; updated_at: string | null; edited: boolean };
type Props = { rows: Row[]; pagination: Pagination; query: { q: string; f: string; sort: string; group: string }; groups: string[]; stats: { total: number; missing: number } };

/** Inline-editable grid of website texts (EN | BN). Saves a row on blur. */
export default function Translations({ rows, pagination, query, groups, stats }: Props) {
  const { t, num, ago } = useT();
  const url = useAdminUrl();
  const toast = useToast();
  const confirm = useConfirm();
  const errors = (usePage().props as unknown as Shared).errors;
  const base = url('/translations');
  const [q, setQ] = useState(query.q);
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState({ key: '', group: 'ui', en: '', bn: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const go = (over: Record<string, any>) => {
    const p: Record<string, any> = { ...query, ...over };
    Object.keys(p).forEach((k) => (p[k] === '' || p[k] == null) && delete p[k]);
    router.get(base, p, { preserveState: true, preserveScroll: true, replace: true });
  };
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const h = setTimeout(() => q !== query.q && go({ q, page: undefined }), 300); return () => clearTimeout(h); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head title={t('Website texts', 'ওয়েবসাইটের লেখা')} />
      <PageHeader title={t('Website texts', 'ওয়েবসাইটের লেখা')} icon="languages" crumbs={[[t('Translations', 'অনুবাদ')]]}
        subtitle={t(`${num(stats.total)} texts · ${num(stats.missing)} missing Bangla`, `${num(stats.total)}টি লেখা · ${num(stats.missing)}টিতে বাংলা নেই`)}
        actions={<>
          <a href={`${base}/export`} className="btn btn-outline btn-sm"><Icon name="download" size={16} />CSV</a>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) router.post(`${base}/import`, { file: f }, { forceFormData: true, preserveScroll: true, onError: (er) => toast('error', Object.values(er).join(' ')) }); e.target.value = ''; }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} />{t('Import CSV', 'CSV ইমপোর্ট')}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t('New text', 'নতুন লেখা')}</button>
        </>} />

      <Card pad={false}>
        <div className="flex flex-col gap-2 border-b border-ink-100 p-3 dark:border-ink-800 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input type="search" className="input h-10 pl-9" placeholder={t('Search English, Bangla or key…', 'ইংরেজি, বাংলা বা কী খুঁজুন…')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Search', 'খুঁজুন')} data-tr-search />
          </div>
          <div className="flex flex-wrap gap-2">
            {[['', t('All', 'সব')], ['missing', t('Missing', 'অনুপস্থিত')], ['edited', t('Edited', 'সম্পাদিত')]].map(([v, l]) => (
              <button key={v} type="button" className={cx('chip px-3 py-1.5 text-sm', query.f === v && 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200')} onClick={() => go({ f: v, page: undefined })}>{l}</button>
            ))}
            {groups.length > 1 ? <select className="input h-10 w-auto py-1 text-sm" value={query.group} onChange={(e) => go({ group: e.target.value, page: undefined })} aria-label={t('Group', 'গ্রুপ')}><option value="">{t('All groups', 'সব গ্রুপ')}</option>{groups.map((g) => <option key={g}>{g}</option>)}</select> : null}
            <select className="input h-10 w-auto py-1 text-sm" value={query.sort} onChange={(e) => go({ sort: e.target.value, page: undefined })} aria-label={t('Sort', 'সাজান')}><option value="">{t('A–Z', 'ক–হ')}</option><option value="recent">{t('Recently changed', 'সম্প্রতি পরিবর্তিত')}</option></select>
          </div>
        </div>
        {rows.length ? (
          <div className="divide-y divide-ink-100 dark:divide-ink-800" data-tr-grid>
            <div className="hidden grid-cols-2 gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide muted md:grid"><span className="flex items-center gap-2"><LangTag l="en" /> English</span><span className="flex items-center gap-2"><LangTag l="bn" /> বাংলা</span></div>
            {rows.map((r) => <TrRow key={r.id} r={r} base={base} onDelete={async () => { if (await confirm({ title: t('Delete this text?', 'এই লেখা মুছবেন?'), body: t('The website then shows the built-in English text.', 'তখন ওয়েবসাইটে মূল ইংরেজি লেখা দেখাবে।'), danger: true, confirm: t('Delete', 'মুছুন') })) router.delete(`${base}/${r.id}`, { preserveScroll: true }); }} ago={ago} />)}
          </div>
        ) : <Empty icon="languages" title={t('No texts match', 'কোনো লেখা মেলেনি')} />}
        <div className="border-t border-ink-100 dark:border-ink-800"><Pager p={pagination} onPage={(page) => go({ page })} /></div>
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title={t('New text', 'নতুন লেখা')}
        footer={<><button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>{t('Cancel', 'বাতিল')}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => router.post(base, nw, { preserveScroll: true, onSuccess: () => { setAdding(false); setNw({ key: '', group: 'ui', en: '', bn: '' }); } })}>{t('Add', 'যোগ')}</button></>}>
        <div className="space-y-4">
          <Input label={t('Key (usually the English text itself)', 'কী (সাধারণত ইংরেজি লেখাটিই)')} value={nw.key} onChange={(v) => setNw({ ...nw, key: v, en: nw.en || v })} error={errors.key} required />
          <Textarea label="English" value={nw.en} onChange={(v) => setNw({ ...nw, en: v })} error={errors.en} rows={2} />
          <Textarea label="বাংলা" lang="bn" value={nw.bn} onChange={(v) => setNw({ ...nw, bn: v })} error={errors.bn} rows={2} />
        </div>
      </Modal>
    </>
  );
}

function TrRow({ r, base, onDelete, ago }: { r: Row; base: string; onDelete: () => void; ago: (s: string | null) => string }) {
  const { t } = useT();
  const [v, setV] = useState({ en: r.en, bn: r.bn });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setV({ en: r.en, bn: r.bn }), [r.en, r.bn]);
  const dirty = v.en !== r.en || v.bn !== r.bn;
  const save = () => {
    if (!dirty) return;
    setState('saving');
    router.put(`${base}/${r.id}`, v, { preserveScroll: true, preserveState: true, onSuccess: () => { setState('saved'); setErr(null); }, onError: (e) => { setState('error'); setErr(Object.values(e).join(' ')); } });
  };
  const area = (l: 'en' | 'bn') => (
    <textarea lang={l} rows={Math.min(5, Math.max(1, Math.ceil(Math.max(v.en.length, v.bn.length) / 70)))} className={cx('input resize-y py-2 text-sm leading-6', l === 'bn' && !v.bn && 'border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-900/10')}
      value={v[l]} onChange={(e) => setV({ ...v, [l]: e.target.value })} onBlur={save} aria-label={`${r.key} ${l}`} placeholder={l === 'bn' ? t('Bangla missing — English shows', 'বাংলা নেই — ইংরেজি দেখাবে') : ''}
      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } if (e.key === 'Escape') setV({ en: r.en, bn: r.bn }); }} />
  );
  return (
    <div className="group px-4 py-3" data-tr-row={r.id}>
      <div className="grid gap-2 md:grid-cols-2 md:gap-3">{area('en')}{area('bn')}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px] muted">
        <span className="truncate font-mono" title={r.key}>{r.group !== 'ui' ? `${r.group} · ` : ''}{r.key.length > 80 ? r.key.slice(0, 80) + '…' : r.key}</span>
        {r.edited ? <Badge color="blue">{t('edited', 'সম্পাদিত')} {ago(r.updated_at)}</Badge> : null}
        <span className="ml-auto flex items-center gap-2">
          {state === 'saving' ? <Spinner className="h-3 w-3" /> : state === 'saved' && !dirty ? <span className="text-emerald-600" data-tr-saved>{t('Saved', 'সংরক্ষিত')}</span> : dirty ? <button type="button" className="font-semibold text-brand-700 hover:underline dark:text-brand-300" onClick={save}>{t('Save', 'সংরক্ষণ')}</button> : null}
          {err ? <span className="text-rose-600">{err}</span> : null}
          <button type="button" className="opacity-0 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100" onClick={onDelete} aria-label={t('Delete', 'মুছুন')}><Icon name="trash-2" size={13} /></button>
        </span>
      </div>
    </div>
  );
}
