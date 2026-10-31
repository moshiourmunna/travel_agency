import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunAction } from '@/components/ActionModal';
import { Detail } from '@/components/Detail';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Layout';
import { Badge, Card, Menu, PageHeader, Spinner, cx, menuItem, useConfirm } from '@/components/ui';
import { FormCtx, hasErrorUnder } from '@/fields/ctx';
import { FieldInput, spanClass } from '@/fields/Field';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { ActionDef, DetailRow, ResourceMeta, Section, Shared } from '@/lib/types';

type Rec = { id: number; title: string; url: string | null; trashed: boolean; created_at: string | null; updated_at: string | null; actions: ActionDef[]; detail: DetailRow[] | null; deletable: boolean };
type Props = { resource: ResourceMeta; sections: Section[]; values: Record<string, any>; record: Rec | null; can: { update: boolean; delete: boolean }; showOnly?: boolean };

export default function ResourceForm({ resource: r, sections, values, record, can, showOnly }: Props) {
  const { t } = useT();
  const url = useAdminUrl();
  const toast = useToast();
  const confirm = useConfirm();
  const page = usePage();
  const serverErrors = (page.props as unknown as Shared).errors ?? {};
  const base = url('/' + r.slug);
  const creating = !record;
  const readOnly = !can.update || !!showOnly;
  const [data, setData] = useState<Record<string, any>>(() => structuredClone(values));
  const baseline = useRef(JSON.stringify(values));
  const [busy, setBusy] = useState(false);
  const { run, modal } = useRunAction();
  const dirty = !readOnly && JSON.stringify(data) !== baseline.current;

  // a different record (or a fresh one after create) resets the form
  useEffect(() => { setData(structuredClone(values)); baseline.current = JSON.stringify(values); }, [record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const main = sections.filter((s) => !s.aside);
  const aside = sections.filter((s) => s.aside);
  const tabs = useMemo(() => { const l: string[] = []; main.forEach((s) => { const k = s.tab ?? t('Content', 'কনটেন্ট'); if (!l.includes(k)) l.push(k); }); return l; }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState(0);
  const tabOf = (s: Section) => tabs.indexOf(s.tab ?? t('Content', 'কনটেন্ট'));
  const sectionHasError = (s: Section) => s.fields.some((f) => hasErrorUnder(serverErrors, f.name));

  // unsaved-changes guard
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    const off = router.on('before', (ev) => {
      const v = ev.detail.visit;
      if (!dirty || v.method !== 'get' || v.url.pathname === window.location.pathname) return;
      if (!window.confirm(t('You have unsaved changes. Leave without saving?', 'সংরক্ষণ না করা পরিবর্তন আছে। সংরক্ষণ না করে চলে যাবেন?'))) ev.preventDefault();
    });
    return () => { window.removeEventListener('beforeunload', h); off(); };
  }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (close = false) => {
    if (readOnly || busy) return;
    const opts = {
      preserveScroll: true,
      onStart: () => setBusy(true),
      onFinish: () => setBusy(false),
      onSuccess: (p: any) => { const v = p.props.values; if (v && !close) { setData(structuredClone(v)); baseline.current = JSON.stringify(v); } else baseline.current = JSON.stringify(data); },
      onError: (errs: Record<string, string>) => {
        const n = Object.keys(errs).length;
        toast('error', t(`Please fix ${n} ${n === 1 ? 'problem' : 'problems'} before saving.`, `সংরক্ষণের আগে ${n}টি সমস্যা ঠিক করুন।`));
        const s = main.find((sec) => sec.fields.some((f) => hasErrorUnder(errs, f.name)));
        if (s) setTab(tabOf(s));
        setTimeout(() => document.querySelector('[data-field-error="true"], .is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      },
    };
    const payload = { ...data, ...(close ? { _close: 1 } : {}) };
    if (creating) router.post(base, payload, opts); else router.put(`${base}/${record!.id}`, payload, opts);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const del = async () => {
    if (!record || !(await confirm({ title: t(`Delete “${record.title}”?`, `“${record.title}” মুছবেন?`), body: r.softDeletes ? t('It moves to the bin and can be restored.', 'এটি বিনে যাবে, পরে ফেরত আনা যাবে।') : t('This cannot be undone.', 'এটি আর ফেরানো যাবে না।'), danger: true, confirm: t('Delete', 'মুছুন') }))) return;
    baseline.current = JSON.stringify(data);
    router.delete(`${base}/${record.id}`);
  };

  const set = (name: string, v: any) => setData((d) => ({ ...d, [name]: v }));
  const renderSection = (s: Section, i: number, isAside = false) => (
    <Card key={s.title + i} title={<span className="flex items-center gap-2">{s.title}{sectionHasError(s) ? <Icon name="circle-alert" size={16} className="text-rose-600" /> : null}</span>} className={cx(isAside && 'lg:shadow-none')}>
      <fieldset disabled={readOnly} className="field-grid">
        {s.fields.map((f) => <div key={f.name} className={isAside ? 'col-span-12' : spanClass(f.span)}><FieldInput f={f} value={data[f.name]} onChange={(v) => set(f.name, v)} path={f.name} editing={!creating} /></div>)}
      </fieldset>
    </Card>
  );

  const title = creating ? t(`New ${r.singular.toLowerCase()}`, `নতুন ${r.singular}`) : record!.title;
  const saveButtons = !readOnly ? (
    <>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => save(true)} disabled={busy} data-save-close>{t('Save & close', 'সংরক্ষণ ও বন্ধ')}</button>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => save()} disabled={busy} data-save>{busy ? <Spinner /> : <Icon name="save" size={16} />}{creating ? t('Create', 'তৈরি করুন') : t('Save', 'সংরক্ষণ')}</button>
    </>
  ) : null;

  return (
    <FormCtx.Provider value={{ errors: serverErrors, creating, data }}>
      <Head title={title} />
      <PageHeader title={title} icon={r.icon} crumbs={[[r.label, base], [creating ? t('New', 'নতুন') : `#${record!.id}`]]}
        subtitle={record ? <span className="flex flex-wrap items-center gap-2">{record.trashed ? <Badge color="red">{t('In bin', 'বিনে')}</Badge> : null}{dirty ? <Badge color="gold">{t('Unsaved changes', 'সংরক্ষণ হয়নি')}</Badge> : null}<span>{t('Updated', 'হালনাগাদ')} {record.updated_at}</span></span> : null}
        actions={<>
          {record?.url ? <a href={record.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" data-view-site><Icon name="external-link" size={16} />{t('View on site', 'সাইটে দেখুন')}</a> : null}
          {record && (record.actions.length || (can.delete && r.deletable)) ? (
            <Menu label={t('More actions', 'আরও')} button={<Icon name="ellipsis" />}>
              {(close) => <>
                {record.actions.map((a) => <button key={a.key} type="button" role="menuitem" className={cx(menuItem, a.tone === 'danger' && 'text-rose-700 dark:text-rose-300')} onClick={() => { close(); run(a, `${base}/${record.id}/action/${a.key}`); }} data-action={a.key}><Icon name={a.icon ?? 'zap'} size={15} />{a.label}</button>)}
                {record.trashed && can.delete ? <button type="button" role="menuitem" className={menuItem} onClick={() => { close(); router.post(`${base}/${record.id}/restore`); }}><Icon name="undo-2" size={15} />{t('Restore', 'ফেরত আনুন')}</button> : null}
                {!record.trashed && can.delete && r.deletable && record.deletable ? <button type="button" role="menuitem" className={cx(menuItem, 'text-rose-700 dark:text-rose-300')} onClick={() => { close(); del(); }} data-delete><Icon name="trash-2" size={15} />{t('Delete', 'মুছুন')}</button> : null}
              </>}
            </Menu>
          ) : null}
          {saveButtons}
        </>} />

      {record?.actions.length && showOnly ? (
        <div className="mb-4 flex flex-wrap gap-2">{record.actions.map((a) => <button key={a.key} type="button" className={cx('btn btn-sm', a.tone === 'danger' ? 'btn-outline text-rose-700' : 'btn-outline')} onClick={() => run(a, `${base}/${record.id}/action/${a.key}`)} data-action={a.key}><Icon name={a.icon ?? 'zap'} size={15} />{a.label}</button>)}</div>
      ) : null}

      {record?.detail?.length ? <Card title={t('Overview', 'সারসংক্ষেপ')} className="mb-5"><Detail rows={record.detail} /></Card> : null}

      {showOnly ? null : (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          {tabs.length > 1 ? (
            <div className="mb-5 flex gap-6 overflow-x-auto border-b border-ink-100 dark:border-ink-800" role="tablist">
              {tabs.map((tb, i) => {
                const bad = main.some((s) => tabOf(s) === i && sectionHasError(s));
                return <button key={tb} type="button" role="tab" aria-selected={tab === i} className="tab-line" onClick={() => setTab(i)} data-tab={i}>{tb}{bad ? <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" aria-label={t('has errors', 'ত্রুটি আছে')} /> : null}</button>;
              })}
            </div>
          ) : null}
          <div className={cx('grid gap-5', aside.length > 0 && 'lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]')}>
            <div className="min-w-0 space-y-5">{main.map((s, i) => (tabOf(s) === tab ? renderSection(s, i) : null))}</div>
            {aside.length ? <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">{aside.map((s, i) => renderSection(s, i, true))}
              {record ? <p className="px-1 text-xs muted">{t('Created', 'তৈরি')} {record.created_at} · ID {record.id}</p> : null}
            </div> : null}
          </div>
          {!readOnly ? (
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-end gap-2 border-t border-ink-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <span className="mr-auto hidden text-xs muted sm:block">{dirty ? t('Unsaved changes · Ctrl+S to save', 'সংরক্ষণ হয়নি · Ctrl+S চাপুন') : t('All changes saved', 'সব সংরক্ষিত')}</span>
              <Link href={base} className="btn btn-ghost btn-sm">{t('Cancel', 'বাতিল')}</Link>
              {saveButtons}
            </div>
          ) : null}
          <button type="submit" className="hidden" />
        </form>
      )}
      {modal}
    </FormCtx.Provider>
  );
}
