import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Layout';
import { Card, PageHeader, Spinner, Switch, cx, useConfirm } from '@/components/ui';
import { LangTag } from '@/fields/basic';
import { TrPair } from '@/fields/bilingual';
import { IconPicker, SiteIcon } from '@/fields/icons';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Opt, Shared, Tr } from '@/lib/types';

type Item = { id?: number; label: Tr; badge?: Tr | null; description?: Tr | null; url: string | null; icon: string | null; is_active: boolean; new_tab: boolean; meta?: any; children?: Item[]; _k?: number };
type Menu = { id: number; location: string; name: Tr; items: Item[] };
type Props = { menus: Menu[]; active: number; pages: Opt[] };

let seq = 0;
const key = (i: Item): Item => ({ ...i, _k: i._k ?? ++seq, children: (i.children ?? []).map(key) });
const strip = (i: Item): any => { const { _k, ...rest } = i; return { ...rest, children: (i.children ?? []).map(strip) }; };
const blank = (): Item => key({ label: { en: '', bn: '' }, url: '', icon: null, is_active: true, new_tab: false, children: [] });

export default function Menus({ menus, active, pages }: Props) {
  const { t } = useT();
  const url = useAdminUrl();
  const toast = useToast();
  const confirm = useConfirm();
  const errors = (usePage().props as unknown as Shared).errors;
  const [cur, setCur] = useState(menus.some((m) => m.id === active) ? active : menus[0]?.id);
  const menu = menus.find((m) => m.id === cur)!;
  const [name, setName] = useState<Tr>(menu?.name);
  const [items, setItems] = useState<Item[]>(() => (menu?.items ?? []).map(key));
  const [initial, setInitial] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { if (!menu) return; const its = menu.items.map(key); setName(menu.name); setItems(its); setInitial(JSON.stringify({ n: menu.name, i: menu.items.map(strip) })); }, [cur, menus]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!menu && JSON.stringify({ n: name, i: items.map(strip) }) !== initial;

  const pick = async (id: number) => {
    if (id === cur) return;
    if (dirty && !(await confirm({ title: t('Discard unsaved changes?', 'সংরক্ষণ না করা পরিবর্তন বাদ দেবেন?'), danger: true, confirm: t('Discard', 'বাদ দিন') }))) return;
    setCur(id);
  };
  const save = () => router.put(url('/menus/' + menu.id), { name, items: items.map(strip) }, {
    preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false),
    onError: (e) => toast('error', t(`Please fix ${Object.keys(e).length} problem(s).`, `${Object.keys(e).length}টি সমস্যা ঠিক করুন।`)),
  });

  // tree operations on [top index, child index?]
  type P = [number, number?];
  const get = (p: P) => (p[1] === undefined ? items[p[0]] : items[p[0]].children![p[1]]);
  const update = (p: P, patch: Partial<Item>) => setItems((all) => all.map((x, i) => (i !== p[0] ? x : p[1] === undefined ? { ...x, ...patch } : { ...x, children: x.children!.map((c, j) => (j === p[1] ? { ...c, ...patch } : c)) })));
  const remove = async (p: P) => {
    const it = get(p);
    if ((it.children?.length ?? 0) > 0 && !(await confirm({ title: t('Remove this item and its sub-items?', 'এই আইটেম ও এর সাব-আইটেম সরাবেন?'), danger: true, confirm: t('Remove', 'সরান') }))) return;
    setItems((all) => (p[1] === undefined ? all.filter((_, i) => i !== p[0]) : all.map((x, i) => (i === p[0] ? { ...x, children: x.children!.filter((_, j) => j !== p[1]) } : x))));
  };
  const move = (p: P, d: number) => setItems((all) => {
    const a = all.map((x) => ({ ...x, children: [...(x.children ?? [])] }));
    const list = p[1] === undefined ? a : a[p[0]].children!;
    const i = p[1] === undefined ? p[0] : p[1]!; const j = i + d;
    if (j < 0 || j >= list.length) return all;
    [list[i], list[j]] = [list[j], list[i]];
    return a;
  });
  const indent = (p: P) => setItems((all) => { if (p[1] !== undefined || p[0] === 0) return all; const a = [...all]; const [x] = a.splice(p[0], 1); const prev = a[p[0] - 1]; a[p[0] - 1] = { ...prev, children: [...(prev.children ?? []), { ...x, children: [] }, ...(x.children ?? [])] }; return a; });
  const outdent = (p: P) => setItems((all) => { if (p[1] === undefined) return all; const a = all.map((x) => ({ ...x, children: [...(x.children ?? [])] })); const [x] = a[p[0]].children!.splice(p[1], 1); a.splice(p[0] + 1, 0, { ...x, children: [] }); return a; });

  const row = (it: Item, p: P) => {
    const ep = p[1] === undefined ? `items.${p[0]}` : `items.${p[0]}.children.${p[1]}`;
    const bad = Object.keys(errors).some((k) => k.startsWith(ep + '.') && !(p[1] === undefined && k.startsWith(ep + '.children')));
    const isOpen = open === it._k || bad;
    const n = p[1] === undefined ? items.length : items[p[0]].children!.length;
    const i = p[1] ?? p[0];
    return (
      <div className={cx('row-card', !it.is_active && 'opacity-60', bad && 'border-rose-300')} data-menu-item>
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left" onClick={() => setOpen(isOpen ? null : it._k!)} aria-expanded={isOpen}>
            <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={15} className="shrink-0 text-ink-400" />
            {it.icon ? <span className="shrink-0 text-brand-700"><SiteIcon name={it.icon} size={15} /></span> : null}
            <span className="truncate text-sm font-semibold">{it.label.en || t('(no label)', '(লেবেল নেই)')}</span>
            <span className="hidden truncate font-mono text-xs muted sm:inline">{it.url}</span>
          </button>
          {p[1] === undefined && p[0] > 0 ? <button type="button" className="icon-btn h-8 w-8" onClick={() => indent(p)} title={t('Make sub-item of the one above', 'উপরেরটির সাব-আইটেম করুন')} aria-label={t('Indent', 'ভেতরে')}><Icon name="indent-increase" size={14} /></button> : null}
          {p[1] !== undefined ? <button type="button" className="icon-btn h-8 w-8" onClick={() => outdent(p)} title={t('Move to top level', 'প্রধান স্তরে নিন')} aria-label={t('Outdent', 'বাইরে')}><Icon name="indent-decrease" size={14} /></button> : null}
          <button type="button" className="icon-btn h-8 w-8" disabled={i === 0} onClick={() => move(p, -1)} aria-label={t('Move up', 'উপরে')}><Icon name="arrow-up" size={14} /></button>
          <button type="button" className="icon-btn h-8 w-8" disabled={i === n - 1} onClick={() => move(p, 1)} aria-label={t('Move down', 'নিচে')}><Icon name="arrow-down" size={14} /></button>
          <button type="button" className="icon-btn h-8 w-8 hover:text-rose-600" onClick={() => remove(p)} aria-label={t('Remove', 'সরান')}><Icon name="trash-2" size={14} /></button>
        </div>
        {isOpen ? (
          <div className="grid grid-cols-12 gap-4 border-t border-ink-100 p-3 dark:border-ink-800">
            <div className="col-span-12"><span className="label">{t('Label', 'লেবেল')}</span><TrPair value={it.label} onChange={(v) => update(p, { label: v })} required errors={{ en: errors[ep + '.label.en'], bn: errors[ep + '.label.bn'] }} /></div>
            <div className="col-span-12 md:col-span-8">
              <span className="label">{t('Link', 'লিংক')}</span>
              <input className={cx('input font-mono text-sm', errors[ep + '.url'] && 'is-invalid')} list="menu-targets" value={it.url ?? ''} onChange={(e) => update(p, { url: e.target.value })} placeholder="/tours, https://…, tel:…" aria-label={t('Link', 'লিংক')} />
              {errors[ep + '.url'] ? <p className="mt-1 text-xs text-rose-600">{errors[ep + '.url']}</p> : <p className="mt-1 text-xs muted">{t('Start typing to pick a page. Leave empty for a heading that only opens its sub-items.', 'পেজ বাছাই করতে লিখুন। শুধু সাব-আইটেম খোলার জন্য খালি রাখুন।')}</p>}
            </div>
            <div className="col-span-12 md:col-span-4"><span className="label">{t('Icon', 'আইকন')}</span><IconPicker value={it.icon} onChange={(v) => update(p, { icon: v })} /></div>
            <div className="col-span-12"><span className="label">{t('Badge (optional, e.g. “New”)', 'ব্যাজ (ঐচ্ছিক, যেমন “নতুন”)')}</span><TrPair value={it.badge ?? { en: '', bn: '' }} onChange={(v) => update(p, { badge: v })} /></div>
            <div className="col-span-12 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={it.is_active} onChange={(v) => update(p, { is_active: v })} label={t('Visible', 'দৃশ্যমান')} />{t('Visible', 'দৃশ্যমান')}</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={it.new_tab} onChange={(v) => update(p, { new_tab: v })} label={t('Open in new tab', 'নতুন ট্যাবে')} />{t('Open in new tab', 'নতুন ট্যাবে খুলুন')}</label>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (!menu) return null;
  return (
    <>
      <Head title={t('Menus', 'মেনু')} />
      <PageHeader title={t('Menus', 'মেনু')} icon="menu" crumbs={[[t('Menus', 'মেনু')]]} subtitle={t('Header, footer and mobile navigation of the website.', 'ওয়েবসাইটের হেডার, ফুটার ও মোবাইল নেভিগেশন।')}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || busy} data-save>{busy ? <Spinner /> : <Icon name="save" size={16} />}{t('Save menu', 'মেনু সংরক্ষণ')}</button>} />
      <datalist id="menu-targets">{pages.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}</datalist>
      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav className="card p-2 lg:self-start" aria-label={t('Menus', 'মেনু')}>
          {menus.map((m) => <button key={m.id} type="button" className="side-link w-full" aria-current={m.id === cur ? 'page' : undefined} onClick={() => pick(m.id)} data-menu={m.location}><Icon name="list-tree" size={16} /><span className="flex-1 text-left">{m.name.en}</span><span className="font-mono text-[10px] muted">{m.location}</span></button>)}
        </nav>
        <Card title={<span className="flex items-center gap-2">{menu.name.en}{dirty ? <span className="badge badge-gold">{t('Unsaved', 'সংরক্ষণ হয়নি')}</span> : null}</span>}>
          <div className="mb-5"><span className="label">{t('Menu name', 'মেনুর নাম')}</span><TrPair value={name} onChange={setName} errors={{ en: errors['name.en'] }} /></div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it._k}>
                {row(it, [i])}
                {it.children?.length ? <div className="ml-6 mt-2 space-y-2 border-l-2 border-ink-100 pl-3 dark:border-ink-800">{it.children.map((c, j) => <div key={c._k}>{row(c, [i, j])}</div>)}</div> : null}
                <div className="ml-6 mt-1"><button type="button" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300" onClick={() => { const b = blank(); setItems((all) => all.map((x, k) => (k === i ? { ...x, children: [...(x.children ?? []), b] } : x))); setOpen(b._k!); }}>+ {t('sub-item', 'সাব-আইটেম')}</button></div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm mt-4" onClick={() => { const b = blank(); setItems([...items, b]); setOpen(b._k!); }} data-menu-add><Icon name="plus" size={15} />{t('Add menu item', 'মেনু আইটেম যোগ')}</button>
          <p className="mt-4 flex items-center gap-2 text-xs muted"><LangTag l="bn" />{t('Leave Bangla empty to show the English label.', 'বাংলা খালি রাখলে ইংরেজি লেবেল দেখাবে।')}</p>
        </Card>
      </div>
    </>
  );
}
