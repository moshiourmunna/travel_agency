import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Layout';
import { Badge, Card, Empty, Modal, PageHeader, Pager, Spinner, cx, useConfirm } from '@/components/ui';
import { Input, Select } from '@/fields/basic';
import { TrPair } from '@/fields/bilingual';
import { useAdminUrl } from '@/lib/http';
import { bytes, useT } from '@/lib/i18n';
import type { Media, Pagination, Shared } from '@/lib/types';

type Folder = { id: number; name: string; parent_id: number | null; count: number };
type Props = { assets: Media[]; pagination: Pagination; folders: Folder[]; unfiled: number; query: { q: string; folder: string; sort: string; trashed: string }; can: { manage: boolean }; limits: { max_mb: number; mimes: string } };

export default function MediaIndex({ assets, pagination, folders, unfiled, query, can, limits }: Props) {
  const { t, num } = useT();
  const url = useAdminUrl();
  const toast = useToast();
  const confirm = useConfirm();
  const errors = (usePage().props as unknown as Shared).errors;
  const base = url('/media');
  const [q, setQ] = useState(query.q);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [current, setCurrent] = useState<Media | null>(null);
  const [folderModal, setFolderModal] = useState<{ id?: number; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const total = folders.reduce((s, f) => s + f.count, 0) + unfiled;

  const go = (over: Record<string, any>) => {
    const p: Record<string, any> = { ...query, ...over };
    Object.keys(p).forEach((k) => (p[k] === '' || p[k] == null) && delete p[k]);
    router.get(base, p, { preserveState: true, preserveScroll: true, replace: true });
  };
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } const h = setTimeout(() => q !== query.q && go({ q, page: undefined }), 300); return () => clearTimeout(h); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (current) setCurrent(assets.find((a) => a.id === current.id) ?? null); }, [assets]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (errors.media) toast('error', errors.media); }, [errors.media]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const tooBig = list.filter((f) => f.size > limits.max_mb * 1048576);
    if (tooBig.length) { toast('error', t(`Too large (max ${limits.max_mb} MB): ${tooBig.map((f) => f.name).join(', ')}`, `অনেক বড় (সর্বোচ্চ ${limits.max_mb} MB): ${tooBig.map((f) => f.name).join(', ')}`)); return; }
    router.post(base, { files: list.slice(0, 20), folder_id: /^\d+$/.test(query.folder) ? Number(query.folder) : null }, {
      forceFormData: true, preserveScroll: true,
      onProgress: (e) => setProgress(e?.percentage ?? null), onFinish: () => setProgress(null),
      onError: (e) => toast('error', Object.values(e).join(' ')),
    });
  };

  return (
    <>
      <Head title={t('Media library', 'মিডিয়া লাইব্রেরি')} />
      <PageHeader title={t('Media library', 'মিডিয়া লাইব্রেরি')} icon="images" crumbs={[[t('Media', 'মিডিয়া')]]} subtitle={t(`${num(total)} files`, `${num(total)}টি ফাইল`)}
        actions={can.manage ? <>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setFolderModal({ name: '' })}><Icon name="folder-plus" size={16} />{t('New folder', 'নতুন ফোল্ডার')}</button>
          <input ref={fileRef} type="file" multiple accept={limits.mimes.split(',').map((m) => '.' + m).join(',')} className="hidden" data-upload-input onChange={(e) => { if (e.target.files) send(e.target.files); e.target.value = ''; }} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={progress !== null}>{progress !== null ? <Spinner /> : <Icon name="upload" size={16} />}{t('Upload', 'আপলোড')}</button>
        </> : null} />

      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="card p-2 lg:self-start" aria-label={t('Folders', 'ফোল্ডার')}>
          {[{ v: '', l: t('All files', 'সব ফাইল'), n: total, icon: 'images' }, { v: 'none', l: t('Not in a folder', 'ফোল্ডার ছাড়া'), n: unfiled, icon: 'inbox' }].map((x) => (
            <button key={x.v} type="button" className="side-link w-full" aria-current={query.folder === x.v && !query.trashed ? 'page' : undefined} onClick={() => go({ folder: x.v, trashed: '', page: undefined })}>
              <Icon name={x.icon} size={16} /><span className="flex-1 text-left">{x.l}</span><span className="text-xs tabular-nums muted">{num(x.n)}</span>
            </button>
          ))}
          <div className="my-2 border-t border-ink-100 dark:border-ink-800" />
          {folders.map((f) => (
            <div key={f.id} className="group flex items-center">
              <button type="button" className="side-link min-w-0 flex-1" aria-current={query.folder === String(f.id) ? 'page' : undefined} onClick={() => go({ folder: String(f.id), trashed: '', page: undefined })}>
                <Icon name="folder" size={16} /><span className="flex-1 truncate text-left">{f.name}</span><span className="text-xs tabular-nums muted">{num(f.count)}</span>
              </button>
              {can.manage ? <button type="button" className="icon-btn h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => setFolderModal({ id: f.id, name: f.name })} aria-label={t('Rename folder', 'ফোল্ডারের নাম বদলান')}><Icon name="pencil" size={13} /></button> : null}
            </div>
          ))}
          <div className="my-2 border-t border-ink-100 dark:border-ink-800" />
          <button type="button" className="side-link w-full" aria-current={query.trashed === 'only' ? 'page' : undefined} onClick={() => go({ trashed: 'only', folder: '', page: undefined })}><Icon name="trash-2" size={16} />{t('Bin', 'বিন')}</button>
        </nav>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input type="search" className="input h-10 pl-9" placeholder={t('Search name, key, alt text, credit…', 'নাম, কী, বিকল্প লেখা, ক্রেডিট খুঁজুন…')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Search', 'খুঁজুন')} />
            </div>
            <select className="input h-10 w-auto" value={query.sort} onChange={(e) => go({ sort: e.target.value, page: undefined })} aria-label={t('Sort', 'সাজান')}>
              <option value="">{t('Newest first', 'নতুন আগে')}</option><option value="oldest">{t('Oldest first', 'পুরোনো আগে')}</option><option value="name">{t('Name A–Z', 'নাম অনুযায়ী')}</option>
            </select>
          </div>

          <div className={cx('relative rounded-2xl transition', drag && 'drop-target')}
            onDragOver={(e) => { if (can.manage && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (can.manage) send(e.dataTransfer.files); }}>
            {progress !== null ? <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"><div className="h-full bg-brand-600 transition-all" style={{ width: progress + '%' }} /></div> : null}
            {assets.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6" data-media-grid>
                {assets.map((m) => (
                  <button key={m.id} type="button" onClick={() => setCurrent(m)} data-asset={m.id}
                    className={cx('group overflow-hidden rounded-2xl border bg-white text-left transition hover:shadow-lift dark:bg-ink-900', current?.id === m.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-ink-100 dark:border-ink-800')}>
                    <div className="relative aspect-[4/3] bg-ink-100 dark:bg-ink-800">
                      {m.thumb ? <img src={m.thumb} alt={m.alt.en || m.name} loading="lazy" className="h-full w-full object-cover" /> : <Icon name="image" className="absolute inset-0 m-auto text-ink-400" />}
                      {!m.alt.en ? <span className="absolute left-2 top-2 badge badge-gold" title={t('Missing alt text', 'বিকল্প লেখা নেই')}>alt</span> : null}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{m.name}</p>
                      <p className="truncate text-xs muted">{m.width ? `${m.width}×${m.height} · ` : ''}{bytes(m.size)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Card><Empty icon="image" title={query.trashed ? t('The bin is empty', 'বিন খালি') : t('No files here', 'এখানে কোনো ফাইল নেই')}>{can.manage && !query.trashed ? t(`Drop images here or use Upload. JPG, PNG, WebP, AVIF, GIF or SVG up to ${limits.max_mb} MB.`, `ছবি এখানে টেনে আনুন বা আপলোড ব্যবহার করুন। সর্বোচ্চ ${limits.max_mb} MB।`) : null}</Empty></Card>
            )}
          </div>
          <div className="mt-3"><Pager p={pagination} onPage={(page) => go({ page })} /></div>
          {can.manage ? <p className="mt-1 text-center text-xs muted">{t(`Drag and drop up to 20 images at once · max ${limits.max_mb} MB each`, `একসাথে সর্বোচ্চ ২০টি ছবি · প্রতিটি সর্বোচ্চ ${limits.max_mb} MB`)}</p> : null}
        </div>
      </div>

      {current ? <AssetPanel key={current.id} m={current} folders={folders} canManage={can.manage} base={base} onClose={() => setCurrent(null)} confirm={confirm} /> : null}

      <Modal open={!!folderModal} onClose={() => setFolderModal(null)} title={folderModal?.id ? t('Rename folder', 'ফোল্ডারের নাম বদলান') : t('New folder', 'নতুন ফোল্ডার')} size="sm"
        footer={<>
          {folderModal?.id ? <button type="button" className="btn btn-ghost btn-sm mr-auto text-rose-700" onClick={async () => { if (await confirm({ title: t('Delete this folder?', 'এই ফোল্ডার মুছবেন?'), body: t('Files inside are kept and moved out of the folder.', 'ভেতরের ফাইল থাকবে, শুধু ফোল্ডার থেকে বের হবে।'), danger: true, confirm: t('Delete', 'মুছুন') })) { router.post(`${base}/folders`, { action: 'delete', id: folderModal.id }, { onSuccess: () => setFolderModal(null) }); } }}>{t('Delete', 'মুছুন')}</button> : null}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setFolderModal(null)}>{t('Cancel', 'বাতিল')}</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!folderModal?.name.trim()} onClick={() => router.post(`${base}/folders`, { action: folderModal?.id ? 'rename' : 'create', id: folderModal?.id, name: folderModal?.name }, { preserveScroll: true, onSuccess: () => setFolderModal(null) })}>{t('Save', 'সংরক্ষণ')}</button>
        </>}>
        <Input label={t('Folder name', 'ফোল্ডারের নাম')} value={folderModal?.name ?? ''} onChange={(v) => setFolderModal((f) => (f ? { ...f, name: v } : f))} error={errors.name} required />
      </Modal>
    </>
  );
}

function AssetPanel({ m, folders, canManage, base, onClose, confirm }: { m: Media; folders: Folder[]; canManage: boolean; base: string; onClose: () => void; confirm: ReturnType<typeof useConfirm> }) {
  const { t } = useT();
  const toast = useToast();
  const errors = (usePage().props as unknown as Shared).errors;
  const [d, setD] = useState({ name: m.name, alt: m.alt, credit: m.credit ?? '', credit_url: m.credit_url ?? '', license: m.license ?? '', folder_id: m.folder_id, focal: m.focal ?? [0.5, 0.5] });
  const [busy, setBusy] = useState(false);
  const rep = useRef<HTMLInputElement>(null);
  const save = () => router.put(`${base}/${m.id}`, d as any, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  const del = async () => {
    if (!(await confirm({ title: t(`Delete “${m.name}”?`, `“${m.name}” মুছবেন?`), body: t('It moves to the bin. Pages that use it will lose the image.', 'এটি বিনে যাবে। যেসব পেজে ব্যবহৃত, সেখানে ছবি থাকবে না।'), danger: true, confirm: t('Delete', 'মুছুন') }))) return;
    router.delete(`${base}/${m.id}`, {
      preserveScroll: true, onSuccess: onClose,
      onError: async (e) => {
        if (e.media && (await confirm({ title: t('This image is in use', 'ছবিটি ব্যবহৃত হচ্ছে'), body: <>{e.media}<br /><br />{t('Delete it anyway?', 'তবুও মুছবেন?')}</>, danger: true, confirm: t('Delete anyway', 'তবুও মুছুন') }))) {
          router.delete(`${base}/${m.id}`, { data: { force: 1 }, preserveScroll: true, onSuccess: onClose });
        }
      },
    });
  };
  return (
    <Modal open onClose={onClose} title={m.name} size="xl"
      footer={canManage ? <>
        {m.trashed ? <button type="button" className="btn btn-outline btn-sm mr-auto" onClick={() => router.put(`${base}/${m.id}`, { ...d, restore: true } as any, { preserveScroll: true })}><Icon name="undo-2" size={15} />{t('Restore', 'ফেরত আনুন')}</button>
          : <button type="button" className="btn btn-ghost btn-sm mr-auto text-rose-700 dark:text-rose-300" onClick={del} data-asset-delete><Icon name="trash-2" size={15} />{t('Delete', 'মুছুন')}</button>}
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>{t('Close', 'বন্ধ')}</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy} data-asset-save>{busy ? <Spinner /> : null}{t('Save', 'সংরক্ষণ')}</button>
      </> : undefined}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="relative overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800" onClick={(e) => {
            if (!canManage) return;
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            setD({ ...d, focal: [Math.round(((e.clientX - r.left) / r.width) * 100) / 100, Math.round(((e.clientY - r.top) / r.height) * 100) / 100] });
          }}>
            {m.card || m.url ? <img src={m.card || m.url || ''} alt={m.alt.en || m.name} className="block w-full cursor-crosshair" /> : null}
            <span className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-2 ring-brand-600" style={{ left: d.focal[0] * 100 + '%', top: d.focal[1] * 100 + '%' }} />
          </div>
          <p className="mt-1.5 text-xs muted">{t('Click the photo to set the focal point used when it is cropped.', 'ক্রপ করার সময় কেন্দ্রবিন্দু ঠিক করতে ছবিতে ক্লিক করুন।')}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="muted">{t('Size', 'আকার')}</dt><dd className="font-medium">{m.width ? `${m.width}×${m.height}px` : '—'} · {bytes(m.size)}</dd></div>
            <div><dt className="muted">{t('Type', 'ধরন')}</dt><dd className="font-medium">{m.mime ?? '—'}</dd></div>
            <div><dt className="muted">{t('Key', 'কী')}</dt><dd className="font-mono">{m.key ?? '—'}</dd></div>
            <div><dt className="muted">{t('Uploaded', 'আপলোড')}</dt><dd className="font-medium">{m.created_at ?? '—'}</dd></div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.url ? <button type="button" className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(new URL(m.url!, window.location.href).href); toast('success', t('Link copied', 'লিংক কপি হয়েছে')); }}><Icon name="link" size={15} />{t('Copy link', 'লিংক কপি')}</button> : null}
            {m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Icon name="external-link" size={15} />{t('Original', 'মূল ফাইল')}</a> : null}
            {canManage ? <>
              <input ref={rep} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) router.post(`${base}/${m.id}/replace`, { file: f }, { forceFormData: true, preserveScroll: true }); e.target.value = ''; }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => rep.current?.click()}><Icon name="replace" size={15} />{t('Replace file', 'ফাইল বদলান')}</button>
            </> : null}
            {m.trashed ? <Badge color="red">{t('In bin', 'বিনে')}</Badge> : null}
          </div>
        </div>
        <fieldset disabled={!canManage} className="space-y-4">
          <Input label={t('Name', 'নাম')} value={d.name} onChange={(v) => setD({ ...d, name: v })} error={errors.name} required />
          <div>
            <span className="label">{t('Alt text (describes the photo for screen readers and Google)', 'বিকল্প লেখা (স্ক্রিন রিডার ও গুগলের জন্য ছবির বর্ণনা)')}</span>
            <TrPair value={d.alt} onChange={(v) => setD({ ...d, alt: v })} kind="text" rows={2} errors={{ en: errors['alt.en'], bn: errors['alt.bn'] }} />
          </div>
          <Select label={t('Folder', 'ফোল্ডার')} value={d.folder_id} onChange={(v) => setD({ ...d, folder_id: v })} options={folders.map((f) => ({ value: f.id, label: f.name }))} placeholder={t('No folder', 'ফোল্ডার ছাড়া')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('Credit', 'ক্রেডিট')} value={d.credit} onChange={(v) => setD({ ...d, credit: v })} error={errors.credit} />
            <Input label={t('Licence', 'লাইসেন্স')} value={d.license} onChange={(v) => setD({ ...d, license: v })} error={errors.license} />
          </div>
          <Input type="url" label={t('Credit link', 'ক্রেডিট লিংক')} value={d.credit_url} onChange={(v) => setD({ ...d, credit_url: v })} error={errors.credit_url} placeholder="https://" />
        </fieldset>
      </div>
    </Modal>
  );
}
