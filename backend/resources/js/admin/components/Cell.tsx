import { Icon } from './Icon';
import { Badge } from './ui';
import { useT } from '@/lib/i18n';
import type { ColDef } from '@/lib/types';

export function Cell({ c, v }: { c: ColDef; v: any }) {
  const { money, num, date, t } = useT();
  if (v === null || v === undefined || v === '') return c.type === 'image' ? <span className="block h-10 w-14 rounded-lg bg-ink-100 dark:bg-ink-800" /> : <span className="text-ink-300 dark:text-ink-600">—</span>;
  switch (c.type) {
    case 'money': return <span className="whitespace-nowrap tabular-nums">{money(v)}</span>;
    case 'number': return <span className="tabular-nums">{num(v)}</span>;
    case 'bool': return v ? <Icon name="circle-check" size={17} className="text-emerald-600" aria-label={t('Yes', 'হ্যাঁ')} /> : <Icon name="circle-minus" size={17} className="text-ink-300" aria-label={t('No', 'না')} />;
    case 'date': return <span className="whitespace-nowrap">{date(v)}</span>;
    case 'datetime': return <span className="whitespace-nowrap">{date(v, true)}</span>;
    case 'image': return <img src={v} alt="" loading="lazy" className="h-10 w-14 rounded-lg object-cover" />;
    case 'badge': return <Badge color={v.color}>{v.label}</Badge>;
    default: return <span className="line-clamp-2 [overflow-wrap:anywhere]">{String(v)}</span>;
  }
}
