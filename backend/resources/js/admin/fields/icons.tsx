import { useMemo, useState } from 'react';
import { ICONS } from '../../../../../frontend/components/icons/data';
import { Icon } from '@/components/Icon';
import { Modal, cx } from '@/components/ui';
import { useT } from '@/lib/i18n';

/** Icons the public site can draw — the exact SVGs the website uses (frontend/components/icons/data.ts). */
export const SITE_ICONS: string[] = Object.keys(ICONS).sort();

export function SiteIcon({ name, size = 18 }: { name: string; size?: number }) {
  const def = ICONS[name];
  if (!def) return <Icon name={name} size={size} />;
  const [body, filled] = def;
  return filled
    ? <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />
    : <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />;
}

export function IconPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => SITE_ICONS.filter((n) => n.includes(q.trim().toLowerCase())), [q]);
  const unknown = !!value && !SITE_ICONS.includes(value);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" className="input flex h-11 items-center gap-2 text-left" onClick={() => setOpen(true)} aria-label={t('Choose icon', 'আইকন বাছাই')}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">{value ? <SiteIcon name={value} size={16} /> : <Icon name="shapes" size={16} />}</span>
          <span className={cx('truncate font-mono text-xs', !value && 'text-ink-400')}>{value || t('None', 'নেই')}</span>
        </button>
        {value ? <button type="button" className="icon-btn h-9 w-9" onClick={() => onChange(null)} aria-label={t('Clear', 'মুছুন')}><Icon name="x" size={15} /></button> : null}
      </div>
      {unknown ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t('Not in the site icon set — it may not show on the website.', 'সাইটের আইকন সেটে নেই — ওয়েবসাইটে না-ও দেখাতে পারে।')}</p> : null}
      <Modal open={open} onClose={() => setOpen(false)} title={t('Choose an icon', 'আইকন বাছাই করুন')} size="lg">
        <input autoFocus type="search" className="input mb-3" placeholder={t('Search icons…', 'আইকন খুঁজুন…')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid max-h-[55vh] grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6 md:grid-cols-8">
          {list.map((n) => (
            <button key={n} type="button" title={n} onClick={() => { onChange(n); setOpen(false); }}
              className={cx('flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] text-ink-600 hover:bg-brand-50 hover:text-brand-800 dark:text-ink-300 dark:hover:bg-brand-900/30', value === n && 'bg-brand-600 text-white hover:bg-brand-600 hover:text-white')}>
              <SiteIcon name={n} size={20} /><span className="w-full truncate text-center">{n}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
