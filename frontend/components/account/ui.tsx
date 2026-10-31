import { Icon } from '@/components/icons/Icon';
import type { I18n } from '@/lib/i18n';

type T = I18n['t'];

/** Status pill — same palette as the mockup (data_app.ST). */
export function Status({ t, s, className = '' }: { t: T; s: string | null | undefined; className?: string }) {
  const ok = 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300';
  const amber = 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300';
  const sky = 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300';
  const ink = 'bg-ink-100 text-ink-700 ring-ink-500/20 dark:bg-ink-800 dark:text-ink-200';
  const rose = 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300';
  const violet = 'bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-300';
  const M: Record<string, [string, string]> = {
    confirmed: [t('Confirmed', 'নিশ্চিত'), ok], pending: [t('Pending payment', 'পেমেন্ট বাকি'), amber], partial: [t('Part-paid', 'আংশিক পরিশোধিত'), sky],
    completed: [t('Completed', 'সম্পন্ন'), ink], cancelled: [t('Cancelled', 'বাতিল'), rose], refunded: [t('Refunded', 'রিফান্ড হয়েছে'), violet],
    won: [t('Travelled', 'ভ্রমণ করেছেন'), ok], joined: [t('Joined', 'যোগ দিয়েছেন'), sky], invited: [t('Invited', 'আমন্ত্রিত'), ink], lost: [t('Expired', 'মেয়াদোত্তীর্ণ'), ink],
    published: [t('Published', 'প্রকাশিত'), ok], pending_review: [t('In review', 'পর্যালোচনায়'), amber], rejected: [t('Not published', 'প্রকাশিত হয়নি'), rose],
    open: [t('Open', 'খোলা'), amber], resolved: [t('Resolved', 'সমাধান হয়েছে'), ok], closed: [t('Closed', 'বন্ধ'), ink], awaiting: [t('Awaiting reply', 'উত্তরের অপেক্ষায়'), sky],
    success: [t('Successful', 'সফল'), ok], paid: [t('Paid', 'পরিশোধিত'), ok], failed: [t('Failed', 'ব্যর্থ'), rose], due: [t('Due', 'বাকি'), amber], upcoming: [t('Upcoming', 'আসন্ন'), ink],
    overdue: [t('Overdue', 'মেয়াদোত্তীর্ণ'), rose], review: [t('In review', 'পর্যালোচনায়'), amber], approved: [t('Approved', 'অনুমোদিত'), ok], submitted: [t('Submitted', 'জমা হয়েছে'), sky],
    docs: [t('Documents needed', 'কাগজ প্রয়োজন'), amber], verified: [t('Documents verified', 'কাগজ যাচাই হয়েছে'), sky], visa_rejected: [t('Rejected', 'প্রত্যাখ্যাত'), rose], embassy: [t('At embassy', 'দূতাবাসে'), violet], decision: [t('Decision due', 'সিদ্ধান্তের অপেক্ষায়'), violet],
    delivered: [t('Delivered', 'হস্তান্তরিত'), ok], issued: [t('Issued', 'ইস্যু হয়েছে'), ok], unpaid: [t('Unpaid', 'অপরিশোধিত'), rose],
  };
  const key = s ?? '';
  const [label, cls] = M[key] ?? [key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : '—', ink];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls} ${className}`} data-status={key}>{label}</span>;
}

export const kinds = (t: T): Record<string, [string, string]> => ({
  tour: ['map', t('Holiday package', 'হলিডে প্যাকেজ')], cruise: ['ship', t('Cruise', 'ক্রুজ')], flight: ['plane', t('Flight', 'ফ্লাইট')],
  hotel: ['hotel', t('Hotel', 'হোটেল')], visa: ['stamp', t('Visa', 'ভিসা')], activity: ['ticket', t('Activity', 'অ্যাক্টিভিটি')], gift_card: ['gift', t('Gift card', 'গিফট কার্ড')],
});

export function KindChip({ t, k }: { t: T; k: string }) {
  const [ic, label] = kinds(t)[k] ?? ['circle', k];
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200"><Icon name={ic} className="h-3.5 w-3.5" /> {label}</span>;
}

export function PageHead({ title, sub, children }: { title: string; sub?: string | null; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0"><h1 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">{title}</h1>{sub ? <p className="mt-1 text-sm muted">{sub}</p> : null}</div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300', accent: 'bg-accent-100 text-accent-800 dark:bg-accent-400/15 dark:text-accent-200',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};
export function Kpi({ label, value, icon, note, delta, tone = 'brand' }: { label: string; value: string; icon: string; note?: string; delta?: string; tone?: keyof typeof TONES | string }) {
  return (
    <div className="card p-4 sm:p-5" data-kpi>
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium muted">{label}</p><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONES[tone] ?? TONES.brand}`}><Icon name={icon} className="h-[18px] w-[18px]" /></span></div>
      <p className="mt-2 text-xl font-extrabold tracking-tight text-ink-900 [overflow-wrap:anywhere] dark:text-white sm:text-2xl">{value}</p>
      {delta ? <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><Icon name="arrow-up-right" className="inline h-3.5 w-3.5" /> {delta} <span className="font-normal muted">{note}</span></p> : note ? <p className="mt-1 text-xs muted">{note}</p> : null}
    </div>
  );
}

export function Progress({ pct, label, className = '' }: { pct: number; label: string; className?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return <div className={`h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800 ${className}`} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div className="h-full rounded-full bg-brand-600" style={{ width: `${p}%` }} /></div>;
}

export function Empty({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center" data-empty>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={icon} className="h-6 w-6" /></span>
      <p className="mt-3 font-bold">{title}</p>{sub ? <p className="mt-1 text-sm muted">{sub}</p> : null}
      {children ? <div className="mt-4 flex justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Thumb({ img, className }: { img: any; className: string }) {
  const src = img?.srcset?.[0]?.url ?? img?.src;
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className={className} loading="lazy" width={224} height={160} /> : <span className={`${className} block bg-gradient-to-br from-brand-100 to-brand-300 dark:from-brand-900 dark:to-brand-700`} aria-hidden="true" />;
}
