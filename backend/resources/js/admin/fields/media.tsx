import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Modal, Spinner, cx } from '@/components/ui';
import { getJson, upload, useAdminUrl, useCan } from '@/lib/http';
import { bytes, useT } from '@/lib/i18n';
import type { Media } from '@/lib/types';

const cache = new Map<number, Media>();
const pending = new Map<number, Promise<void>>();

/** Previews for chosen media ids (batched, cached across fields). */
export function useMedia(ids: (number | null | undefined)[]): Record<number, Media> {
  const url = useAdminUrl();
  const key = ids.filter(Boolean).join(',');
  const [, tick] = useState(0);
  useEffect(() => {
    const need = ids.filter((i): i is number => !!i && !cache.has(+i) && !pending.has(+i)).map(Number);
    if (!need.length) return;
    const p = getJson<{ data: Media[] }>(url('/media/lookup?ids=' + need.join(','))).then((r) => { r.data.forEach((m) => cache.set(m.id, m)); }).catch(() => {}).finally(() => { need.forEach((i) => pending.delete(i)); tick((n) => n + 1); });
    need.forEach((i) => pending.set(i, p));
    // re-render once any outstanding lookup for our ids settles
    const waits = ids.filter((i): i is number => !!i && pending.has(+i)).map((i) => pending.get(+i)!);
    Promise.all(waits).then(() => tick((n) => n + 1));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const out: Record<number, Media> = {};
  ids.forEach((i) => { if (i && cache.has(+i)) out[+i] = cache.get(+i)!; });
  return out;
}
export const rememberMedia = (m: Media[]) => m.forEach((x) => cache.set(x.id, x));

type Folder = { id: number; name: string; count: number };

/** Library browser with search, folders and drag-and-drop upload. */
export function MediaPicker({ open, onClose, onPick, multiple = false, selected = [] }: { open: boolean; onClose: () => void; onPick: (m: Media[]) => void; multiple?: boolean; selected?: number[] }) {
  const { t } = useT();
  const url = useAdminUrl();
  const can = useCan();
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ data: Media[]; last: number; total: number; folders: Folder[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<Media[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (q) p.set('q', q);
    if (folder) p.set('folder', folder);
    getJson(url('/media/browse?' + p)).then((r) => { setData(r); rememberMedia(r.data); }).catch(() => setErr(t('Could not load the library.', 'লাইব্রেরি লোড হয়নি।'))).finally(() => setLoading(false));
  }, [page, q, folder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) { const h = setTimeout(load, q ? 250 : 0); return () => clearTimeout(h); } }, [open, load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setChosen([]); setErr(null); } }, [open]);

  const send = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 20);
    if (!list.length) return;
    const f = new FormData();
    list.forEach((x) => f.append('files[]', x));
    if (folder && folder !== 'none') f.append('folder_id', folder);
    setErr(null);
    setProgress(0);
    upload<{ data: Media[] }>(url('/media'), f, setProgress)
      .then((r) => { rememberMedia(r.data); setChosen((c) => (multiple ? [...c, ...r.data] : r.data.slice(0, 1))); setPage(1); load(); })
      .catch((e) => setErr(Object.values(e.errors || {}).flat().join(' ') || e.message))
      .finally(() => setProgress(null));
  };
  const toggle = (m: Media) => setChosen((c) => (c.some((x) => x.id === m.id) ? c.filter((x) => x.id !== m.id) : multiple ? [...c, m] : [m]));

  return (
    <Modal open={open} onClose={onClose} size="xl" title={t('Media library', 'মিডিয়া লাইব্রেরি')}
      footer={<>
        <span className="mr-auto text-sm muted">{chosen.length ? t(`${chosen.length} selected`, `${chosen.length}টি বাছাই`) : multiple ? t('Click photos to select several.', 'একাধিক ছবি বাছাই করতে ক্লিক করুন।') : t('Click a photo to select it.', 'ছবি বাছাই করতে ক্লিক করুন।')}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t('Cancel', 'বাতিল')}</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!chosen.length} data-media-use onClick={() => { onPick(chosen); onClose(); }}>{t('Use selected', 'বাছাইকৃত ব্যবহার করুন')}</button>
      </>}>
      <div className={cx('relative', drag && 'ring-2 ring-brand-500 ring-offset-4 rounded-xl')}
        onDragOver={(e) => { if (can('media.manage')) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (can('media.manage')) send(e.dataTransfer.files); }}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input type="search" className="input h-10 pl-9" placeholder={t('Search name, key, alt text…', 'নাম, কী, বিকল্প লেখা খুঁজুন…')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="input h-10 w-auto" value={folder} onChange={(e) => { setFolder(e.target.value); setPage(1); }} aria-label={t('Folder', 'ফোল্ডার')}>
            <option value="">{t('All folders', 'সব ফোল্ডার')}</option>
            <option value="none">{t('No folder', 'ফোল্ডার ছাড়া')}</option>
            {data?.folders.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.count})</option>)}
          </select>
          {can('media.manage') ? (
            <>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" data-media-file onChange={(e) => { if (e.target.files) send(e.target.files); e.target.value = ''; }} />
              <button type="button" className="btn btn-outline btn-sm h-10" onClick={() => fileRef.current?.click()} disabled={progress !== null}><Icon name="upload" size={16} />{t('Upload', 'আপলোড')}</button>
            </>
          ) : null}
        </div>
        {progress !== null ? <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"><div className="h-full bg-brand-600 transition-all" style={{ width: progress + '%' }} /></div> : null}
        {err ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200" role="alert">{err}</p> : null}
        {loading && !data ? <div className="grid place-items-center py-16"><Spinner /></div> : null}
        {data && !data.data.length ? <p className="py-16 text-center text-sm muted">{t('Nothing here yet. Drop photos to upload.', 'এখানে কিছু নেই। আপলোড করতে ছবি টেনে আনুন।')}</p> : null}
        <div className={cx('grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6', loading && 'opacity-60')}>
          {data?.data.map((m) => {
            const on = chosen.some((x) => x.id === m.id);
            const was = selected.includes(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggle(m)} onDoubleClick={() => { onPick(multiple ? [...chosen.filter((x) => x.id !== m.id), m] : [m]); onClose(); }} data-media-id={m.id}
                className={cx('group relative aspect-square overflow-hidden rounded-xl border-2 bg-ink-100 text-left dark:bg-ink-800', on ? 'border-brand-600 ring-2 ring-brand-500/30' : 'border-transparent hover:border-ink-300')} title={`${m.name}${m.width ? ` · ${m.width}×${m.height}` : ''} · ${bytes(m.size)}`}>
                {m.thumb ? <img src={m.thumb} alt={m.alt.en || m.name} loading="lazy" className="h-full w-full object-cover" /> : <Icon name="image" className="m-auto mt-8 text-ink-400" />}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[11px] text-white">{m.key || m.name}</span>
                {on ? <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white"><Icon name="check" size={14} /></span> : was ? <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[10px] text-white">{t('in use', 'ব্যবহৃত')}</span> : null}
              </button>
            );
          })}
        </div>
        {data && data.last > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevron-left" size={16} /></button>
            <span className="tabular-nums">{page} / {data.last}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page >= data.last} onClick={() => setPage(page + 1)}><Icon name="chevron-right" size={16} /></button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function Thumb({ m, id, onRemove, onReplace, big }: { m?: Media; id: number; onRemove: () => void; onReplace?: () => void; big?: boolean }) {
  const { t } = useT();
  return (
    <div className={cx('group relative overflow-hidden rounded-xl border border-ink-100 bg-ink-100 dark:border-ink-700 dark:bg-ink-800', big ? 'aspect-[16/9] w-full max-w-md' : 'aspect-square')}>
      {m?.card || m?.thumb ? <img src={(big ? m.card : m.thumb) || m.thumb || ''} alt={m.alt.en || m.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs muted">#{id}</div>}
      {m?.trashed ? <span className="absolute left-2 top-2 badge badge-red">{t('Deleted', 'মুছে ফেলা')}</span> : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <span className="min-w-0 flex-1 truncate px-1 text-[11px] text-white">{m?.key || m?.name}</span>
        {onReplace ? <button type="button" className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-ink-800" onClick={onReplace} aria-label={t('Change', 'পরিবর্তন')}><Icon name="replace" size={14} /></button> : null}
        <button type="button" className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-rose-700" onClick={onRemove} aria-label={t('Remove', 'সরান')}><Icon name="x" size={14} /></button>
      </div>
    </div>
  );
}

/** Single image (media asset id, or the asset key when byKey). */
export function ImageField({ value, onChange, byKey }: { value: number | string | null; onChange: (v: any) => void; byKey?: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [keyed, setKeyed] = useState<Media | null>(null);
  const url = useAdminUrl();
  const id = byKey ? keyed?.id ?? null : (value ? Number(value) : null);
  const media = useMedia(byKey ? [] : [id]);
  useEffect(() => {
    if (!byKey || !value) { setKeyed(null); return; }
    getJson<{ data: Media[] }>(url('/media/browse?q=' + encodeURIComponent(String(value)))).then((r) => setKeyed(r.data.find((m) => m.key === value) ?? null)).catch(() => {});
  }, [byKey, value]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = byKey ? keyed ?? undefined : id ? media[id] : undefined;
  return (
    <div>
      {value ? <Thumb big m={m} id={id ?? 0} onRemove={() => onChange(null)} onReplace={() => setOpen(true)} /> : (
        <button type="button" onClick={() => setOpen(true)} data-media-choose className="flex aspect-[16/9] w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 text-sm text-ink-500 transition hover:border-brand-500 hover:text-brand-700 dark:border-ink-700">
          <Icon name="image-plus" size={26} />{t('Choose or upload a photo', 'ছবি বাছাই বা আপলোড করুন')}
        </button>
      )}
      {byKey && value ? <p className="mt-1 font-mono text-xs muted">{String(value)}</p> : null}
      <MediaPicker open={open} onClose={() => setOpen(false)} selected={id ? [id] : []} onPick={(l) => l[0] && onChange(byKey ? l[0].key ?? null : l[0].id)} />
    </div>
  );
}

/** Ordered list of media ids. */
export function GalleryField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ids = (value ?? []).map(Number);
  const media = useMedia(ids);
  const [dragI, setDragI] = useState<number | null>(null);
  const move = (from: number, to: number) => { if (from === to) return; const a = [...ids]; const [x] = a.splice(from, 1); a.splice(to, 0, x); onChange(a); };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {ids.map((id, i) => (
          <div key={id + '-' + i} draggable onDragStart={() => setDragI(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragI !== null) move(dragI, i); setDragI(null); }} className={cx('relative cursor-grab', dragI === i && 'opacity-40')}>
            <Thumb m={media[id]} id={id} onRemove={() => onChange(ids.filter((_, j) => j !== i))} />
            {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">{t('Cover', 'কভার')}</span> : null}
          </div>
        ))}
        <button type="button" onClick={() => setOpen(true)} data-media-choose className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-200 text-xs text-ink-500 hover:border-brand-500 hover:text-brand-700 dark:border-ink-700">
          <Icon name="plus" size={20} />{t('Add photos', 'ছবি যোগ')}
        </button>
      </div>
      {ids.length > 1 ? <p className="mt-1.5 text-xs muted">{t('Drag to reorder. The first photo is the cover.', 'ক্রম বদলাতে টেনে আনুন। প্রথম ছবিটি কভার।')}</p> : null}
      <MediaPicker multiple open={open} onClose={() => setOpen(false)} selected={ids} onPick={(l) => onChange([...ids, ...l.map((m) => m.id).filter((x) => !ids.includes(x))])} />
    </div>
  );
}
