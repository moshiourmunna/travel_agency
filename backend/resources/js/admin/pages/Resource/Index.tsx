import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunAction } from '@/components/ActionModal';
import { Cell } from '@/components/Cell';
import { Icon } from '@/components/Icon';
import { Badge, Empty, Menu, PageHeader, Pager, Spinner, cx, menuItem, useConfirm } from '@/components/ui';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { ActionDef, ColDef, FilterDef, Pagination, ResourceMeta, Row } from '@/lib/types';

type Query = { q: string; f: Record<string, string>; sort: string; trashed: string; per: number };
type Props = { resource: ResourceMeta; columns: ColDef[]; filters: FilterDef[]; actions: ActionDef[]; rows: Row[]; pagination: Pagination; query: Query; can: { create: boolean; update: boolean; delete: boolean; show: boolean } };

export default function ResourceIndex({ resource: r, columns, filters, actions, rows, pagination, query, can }: Props) {
  const { t, num } = useT();
  const url = useAdminUrl();
  const confirm = useConfirm();
  const base = url('/' + r.slug);
  const [q, setQ] = useState(query.q);
  const [sel, setSel] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Row[]>(rows);
  const [dragI, setDragI] = useState<number | null>(null);
  const { run, modal } = useRunAction();
  useEffect(() => { setOrder(rows); setSel((s) => s.filter((id) => rows.some((x) => x.id === id))); }, [rows]);

  const params = (over: Partial<Query & { page: number }>) => {
    const p: Record<string, any> = { q: query.q, sort: query.sort, trashed: query.trashed, per: query.per !== 25 ? query.per : undefined, f: query.f, ...over };
    Object.keys(p).forEach((k) => (p[k] === '' || p[k] === undefined || p[k] === null) && delete p[k]);
    if (p.f) { p.f = Object.fromEntries(Object.entries(p.f).filter(([, v]) => v !== '' && v != null)); if (!Object.keys(p.f).length) delete p.f; }
    return p;
  };
  const go = (over: Partial<Query & { page: number }>) => router.get(base, params(over), { preserveState: true, preserveScroll: true, replace: true, onStart: () => setLoading(true), onFinish: () => setLoading(false) });

  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const h = setTimeout(() => q !== query.q && go({ q, page: 1 }), 300); return () => clearTimeout(h); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkActions = actions.filter((a) => a.bulk);
  const byKey = useMemo(() => Object.fromEntries(actions.map((a) => [a.key, a])), [actions]);
  const selectable = (can.delete && r.deletable) || bulkActions.length > 0;
  const filtered = !!(query.q || Object.values(query.f).some((v) => v) || query.trashed);
  const reorderable = !!r.reorder && can.update && !filtered && !query.sort && pagination.last === 1 && order.length > 1;
  const visible = columns;

  const rowHref = (row: Row) => row.href ?? (r.editable && can.update ? `${base}/${row.id}/edit` : can.show ? `${base}/${row.id}` : null);
  const sortBy = (c: ColDef) => { if (!c.sortable) return; const cur = query.sort; go({ sort: cur === c.key ? '-' + c.key : cur === '-' + c.key ? '' : c.key, page: 1 }); };
  const del = async (row: Row) => {
    if (!(await confirm({ title: t(`Delete “${row.title}”?`, `“${row.title}” মুছবেন?`), body: r.softDeletes ? t('It moves to the bin and can be restored.', 'এটি বিনে যাবে, পরে ফেরত আনা যাবে।') : t('This cannot be undone.', 'এটি আর ফেরানো যাবে না।'), danger: true, confirm: t('Delete', 'মুছুন') }))) return;
    router.delete(`${base}/${row.id}`, { preserveScroll: true });
  };
  const bulkDelete = async () => {
    if (!(await confirm({ title: t(`Delete ${sel.length} selected?`, `${num(sel.length)}টি বাছাইকৃত মুছবেন?`), body: r.softDeletes ? t('They move to the bin.', 'এগুলো বিনে যাবে।') : t('This cannot be undone.', 'এটি আর ফেরানো যাবে না।'), danger: true, confirm: t('Delete', 'মুছুন') }))) return;
    router.post(`${base}/bulk-delete`, { ids: sel }, { preserveScroll: true, onSuccess: () => setSel([]) });
  };
  const saveOrder = (next: Row[]) => { setOrder(next); router.post(`${base}/reorder`, { ids: next.map((x) => x.id) }, { preserveScroll: true, preserveState: true }); };
  const exportHref = `${base}/export?` + new URLSearchParams(Object.entries(params({})).flatMap(([k, v]) => (k === 'f' ? Object.entries(v as Record<string, string>).map(([fk, fv]) => [`f[${fk}]`, fv]) : [[k, String(v)]]))).toString();

  const rowMenu = (row: Row) => {
    const acts = row.actions.map((k) => byKey[k]).filter(Boolean);
    const href = rowHref(row);
    return (
      <div className="flex items-center justify-end gap-0.5">
        {row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="icon-btn h-8 w-8" title={t('View on website', 'ওয়েবসাইটে দেখুন')} aria-label={t('View on website', 'ওয়েবসাইটে দেখুন')}><Icon name="external-link" size={15} /></a> : null}
        {href ? <Link href={href} className="icon-btn h-8 w-8" aria-label={r.editable && can.update ? t('Edit', 'সম্পাদনা') : t('Open', 'খুলুন')} data-row-edit><Icon name={r.editable && can.update && !row.href ? 'pencil' : 'eye'} size={15} /></Link> : null}
        {acts.length || (can.delete && r.deletable) ? (
          <Menu label={t('More actions', 'আরও')} button={<Icon name="ellipsis-vertical" size={16} />}>
            {(close) => (
              <>
                {acts.map((a) => <button key={a.key} type="button" role="menuitem" className={cx(menuItem, a.tone === 'danger' && 'text-rose-700 dark:text-rose-300')} onClick={() => { close(); run(a, `${base}/${row.id}/action/${a.key}`); }} data-action={a.key}><Icon name={a.icon ?? 'zap'} size={15} />{a.label}</button>)}
                {row.trashed && can.delete ? <button type="button" role="menuitem" className={menuItem} onClick={() => { close(); router.post(`${base}/${row.id}/restore`, {}, { preserveScroll: true }); }}><Icon name="undo-2" size={15} />{t('Restore', 'ফেরত আনুন')}</button> : null}
                {!row.trashed && can.delete && r.deletable ? (row.deletable
                  ? <button type="button" role="menuitem" className={cx(menuItem, 'text-rose-700 dark:text-rose-300')} onClick={() => { close(); del(row); }} data-row-delete><Icon name="trash-2" size={15} />{t('Delete', 'মুছুন')}</button>
                  : <span className={cx(menuItem, 'cursor-not-allowed opacity-50')} title={t('In use or protected', 'ব্যবহৃত বা সুরক্ষিত')}><Icon name="lock" size={15} />{t('Cannot delete', 'মোছা যাবে না')}</span>) : null}
              </>
            )}
          </Menu>
        ) : null}
      </div>
    );
  };

  const allOnPage = order.length > 0 && order.every((x) => sel.includes(x.id));
  return (
    <>
      <Head title={r.label} />
      <PageHeader title={r.label} icon={r.icon} crumbs={[[r.label]]}
        subtitle={t(`${num(pagination.total)} ${pagination.total === 1 ? r.singular.toLowerCase() : 'records'}`, `${num(pagination.total)}টি`)}
        actions={<>
          <a href={exportHref} className="btn btn-outline btn-sm"><Icon name="download" size={16} />{t('Export CSV', 'CSV এক্সপোর্ট')}</a>
          {can.create && r.creatable ? <Link href={`${base}/create`} className="btn btn-primary btn-sm" data-create><Icon name="plus" size={16} />{t(`New ${r.singular.toLowerCase()}`, `নতুন ${r.singular}`)}</Link> : null}
        </>} />

      <div className="card overflow-visible">
        <div className="flex flex-col gap-2 border-b border-ink-100 p-3 dark:border-ink-800 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input type="search" className="input h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(`Search ${r.label.toLowerCase()}…`, `${r.label} খুঁজুন…`)} aria-label={t('Search', 'খুঁজুন')} data-index-search />
            {loading ? <Spinner className="absolute right-3 top-3 text-brand-600" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <select key={f.key} className={cx('input h-10 w-auto min-w-[8rem] py-1.5 text-sm', query.f[f.key] && 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20')} value={query.f[f.key] ?? ''} aria-label={f.label} data-filter={f.key}
                onChange={(e) => go({ f: { ...query.f, [f.key]: e.target.value }, page: 1 })}>
                <option value="">{f.label}: {t('All', 'সব')}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
            {r.softDeletes ? (
              <select className="input h-10 w-auto py-1.5 text-sm" value={query.trashed} onChange={(e) => go({ trashed: e.target.value, page: 1 })} aria-label={t('Deleted items', 'মুছে ফেলা')}>
                <option value="">{t('Active', 'সক্রিয়')}</option><option value="with">{t('Active + bin', 'সক্রিয় + বিন')}</option><option value="only">{t('Bin only', 'শুধু বিন')}</option>
              </select>
            ) : null}
            {filtered ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQ(''); router.get(base, {}, { preserveState: false }); }}><Icon name="x" size={15} />{t('Clear', 'মুছুন')}</button> : null}
          </div>
        </div>

        {sel.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50/70 px-3 py-2 text-sm dark:border-brand-900 dark:bg-brand-900/20" data-bulk-bar>
            <span className="font-semibold">{t(`${sel.length} selected`, `${num(sel.length)}টি বাছাই`)}</span>
            <button type="button" className="text-xs underline" onClick={() => setSel([])}>{t('Clear', 'মুছুন')}</button>
            <span className="flex-1" />
            {bulkActions.map((a) => <button key={a.key} type="button" className="btn btn-outline btn-sm" onClick={() => run(a, `${base}/bulk/${a.key}`, sel)} data-bulk={a.key}><Icon name={a.icon ?? 'zap'} size={15} />{a.label}</button>)}
            {can.delete && r.deletable ? <button type="button" className="btn btn-danger btn-sm" onClick={bulkDelete} data-bulk-delete><Icon name="trash-2" size={15} />{t('Delete', 'মুছুন')}</button> : null}
          </div>
        ) : null}

        {!order.length ? (
          <Empty icon={filtered ? 'search-x' : r.icon} title={filtered ? t('Nothing matches these filters', 'এই ফিল্টারে কিছু মেলেনি') : t(`No ${r.label.toLowerCase()} yet`, `এখনও কোনো ${r.label} নেই`)}>
            {!filtered && can.create && r.creatable ? <Link href={`${base}/create`} className="btn btn-primary btn-sm mt-3"><Icon name="plus" size={16} />{t(`Add the first ${r.singular.toLowerCase()}`, `প্রথম ${r.singular} যোগ করুন`)}</Link> : null}
          </Empty>
        ) : (
          <>
            {/* desktop table */}
            <div className={cx('hidden overflow-x-auto md:block', loading && 'opacity-60')}>
              <table className="table" data-index-table>
                <thead>
                  <tr>
                    {reorderable ? <th className="w-8" aria-label={t('Order', 'ক্রম')} /> : null}
                    {selectable ? <th className="w-10"><input type="checkbox" className="check" checked={allOnPage} onChange={() => setSel(allOnPage ? [] : order.map((x) => x.id))} aria-label={t('Select all on this page', 'এই পৃষ্ঠার সব বাছাই')} /></th> : null}
                    {visible.map((c) => (
                      <th key={c.key} className={cx(c.type === 'money' || c.type === 'number' ? 'text-right' : '', c.type === 'image' && 'w-16')} aria-sort={query.sort === c.key ? 'ascending' : query.sort === '-' + c.key ? 'descending' : undefined}>
                        {c.sortable ? (
                          <button type="button" className="inline-flex items-center gap-1 hover:text-ink-900 dark:hover:text-white" onClick={() => sortBy(c)}>
                            {c.label}<Icon name={query.sort === c.key ? 'arrow-up' : query.sort === '-' + c.key ? 'arrow-down' : 'arrow-up-down'} size={13} className={query.sort.replace('-', '') === c.key ? 'text-brand-600' : 'opacity-40'} />
                          </button>
                        ) : c.label}
                      </th>
                    ))}
                    <th className="w-28"><span className="sr-only">{t('Actions', 'অ্যাকশন')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {order.map((row, i) => {
                    const href = rowHref(row);
                    return (
                      <tr key={row.id} className={cx(row.trashed && 'opacity-60', sel.includes(row.id) && 'bg-brand-50/50 dark:bg-brand-900/10', dragI === i && 'opacity-40')} data-row={row.id}
                        onDragOver={(e) => reorderable && dragI !== null && e.preventDefault()}
                        onDrop={() => { if (dragI === null || dragI === i) return; const a = [...order]; const [x] = a.splice(dragI, 1); a.splice(i, 0, x); setDragI(null); saveOrder(a); }}>
                        {reorderable ? <td className="cursor-grab text-ink-400" draggable onDragStart={() => setDragI(i)} onDragEnd={() => setDragI(null)} title={t('Drag to reorder', 'ক্রম বদলাতে টানুন')}><Icon name="grip-vertical" size={16} /></td> : null}
                        {selectable ? <td><input type="checkbox" className="check" checked={sel.includes(row.id)} onChange={() => setSel(sel.includes(row.id) ? sel.filter((x) => x !== row.id) : [...sel, row.id])} aria-label={t(`Select ${row.title}`, `${row.title} বাছাই`)} /></td> : null}
                        {visible.map((c, ci) => (
                          <td key={c.key} className={cx(c.type === 'money' || c.type === 'number' ? 'text-right' : '', ci === (visible[0]?.type === 'image' ? 1 : 0) && 'font-semibold text-ink-900 dark:text-white')}>
                            {ci === (visible[0]?.type === 'image' ? 1 : 0) && href ? <Link href={href} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300"><Cell c={c} v={row.cells[c.key]} /></Link> : <Cell c={c} v={row.cells[c.key]} />}
                            {ci === 0 && row.trashed ? <Badge color="red" className="ml-2">{t('In bin', 'বিনে')}</Badge> : null}
                          </td>
                        ))}
                        <td>{rowMenu(row)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* mobile cards */}
            <ul className={cx('divide-y divide-ink-100 dark:divide-ink-800 md:hidden', loading && 'opacity-60')}>
              {order.map((row) => {
                const href = rowHref(row);
                const img = visible.find((c) => c.type === 'image');
                const rest = visible.filter((c) => c.type !== 'image' && !c.hideMobile).slice(1);
                return (
                  <li key={row.id} className={cx('flex gap-3 p-3', row.trashed && 'opacity-60')}>
                    {selectable ? <input type="checkbox" className="check mt-1" checked={sel.includes(row.id)} onChange={() => setSel(sel.includes(row.id) ? sel.filter((x) => x !== row.id) : [...sel, row.id])} aria-label={row.title} /> : null}
                    {img && row.cells[img.key] ? <img src={row.cells[img.key]} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" loading="lazy" /> : null}
                    <div className="min-w-0 flex-1">
                      {href ? <Link href={href} className="font-semibold text-ink-900 dark:text-white">{row.title}</Link> : <p className="font-semibold">{row.title}</p>}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs muted">
                        {rest.map((c) => row.cells[c.key] !== null && row.cells[c.key] !== '' ? <span key={c.key} className="inline-flex items-center gap-1">{c.type !== 'badge' ? <span className="text-ink-400">{c.label}:</span> : null}<Cell c={c} v={row.cells[c.key]} /></span> : null)}
                      </div>
                    </div>
                    {rowMenu(row)}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="flex flex-col items-center justify-between border-t border-ink-100 dark:border-ink-800 sm:flex-row">
          <Pager p={pagination} onPage={(page) => go({ page })} />
          <label className="flex items-center gap-2 px-4 pb-3 text-xs muted sm:pb-0">{t('Per page', 'প্রতি পৃষ্ঠায়')}
            <select className="input h-8 w-auto py-0 text-xs" value={query.per} onChange={(e) => go({ per: Number(e.target.value), page: 1 })}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
        </div>
        {r.reorder && !reorderable && can.update && order.length > 1 ? <p className="border-t border-ink-100 px-4 py-2 text-xs muted dark:border-ink-800"><Icon name="info" size={13} className="mr-1 inline" />{t('Clear search, filters and sorting (and show all on one page) to drag rows into order.', 'ক্রম বদলাতে খোঁজ, ফিল্টার ও সাজানো মুছুন (এক পৃষ্ঠায় সব দেখান)।')}</p> : null}
      </div>
      {modal}
    </>
  );
}
