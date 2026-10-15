import { Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { ucfirst } from '@/lib/utils';
import type { Tone } from '@/types';

type P = {
  id: number; name: string; gender: string; dob: string | null; age: number | null; customer_id: number; account: string | null; passport: string | null; issue: string | null; expiry: string | null; expiry_warn: boolean;
  place: string | null; verified: string | null; nid: string | null; phone: string | null; relation: string | null; mahram: string | null; blood_group: string | null; wheelchair: boolean; medical_notes: string | null;
  bookings: { ref: string; status: string; status_label: string; tone: Tone; package: string; room_type: string | null; documents: { type: string; status: string; has_file: boolean }[]; visa: { ref: string; status: string } | null }[];
};

export default function PilgrimShow({ pilgrim: p }: { pilgrim: P }) {
  const t = useT();
  const row = (k: string, v: React.ReactNode) => v ? <><dt className="text-[var(--muted)]">{k}</dt><dd className="min-w-0 break-words">{v}</dd></> : null;
  return (
    <>
      <PageHeader title={p.name} sub={`${t(ucfirst(p.gender))}${p.age !== null ? ` · ${p.age} ${t('yrs')}` : ''}`}
        actions={<>
          <Button asChild variant="outline" size="sm"><Link href={`/admin/pilgrims/${p.id}/edit`}><Pencil />{t('Edit')}</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/pilgrims"><ArrowLeft className="rtl:rotate-180" />{t('All pilgrims')}</Link></Button>
        </>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('Personal')}>
          <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-3 gap-y-2 text-[13px]">
            {row(t('Account'), <Link href={`/admin/customers/${p.customer_id}`} className="text-brand-600 dark:text-brand-100">{p.account ?? '—'}</Link>)}
            {row(t('Date of birth'), p.dob)}{row(t('Relation'), p.relation && t(p.relation))}{row(t('Mobile'), p.phone)}{row(t('NID'), p.nid)}
            {row(t('Mahram'), p.mahram)}{row(t('Blood group'), p.blood_group)}{row(t('Wheelchair'), p.wheelchair && '♿')}{row(t('Medical needs / notes'), p.medical_notes)}
          </dl>
        </Panel>
        <Panel title={t('Passport')}>
          {p.passport ? (
            <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-3 gap-y-2 text-[13px]">
              {row(t('Passport no.'), p.passport)}{row(t('Issue date'), p.issue)}
              {row(t('Expiry date'), <>{p.expiry} {p.expiry_warn && <Badge tone="pen">⚠ {t('< 6 months validity')}</Badge>}</>)}
              {row(t('Place of issue'), p.place)}{row(t('Verified'), p.verified ? <Badge tone="ok">✓ {p.verified}</Badge> : <Badge tone="pen">{t('Not verified')}</Badge>)}
            </dl>
          ) : <p className="text-sm text-[var(--muted)]">{t('No passport on file.')}</p>}
        </Panel>
      </div>
      <Panel title={t('Bookings')} className="mt-5">
        {p.bookings.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('No bookings yet.')}</p> : (
          <ul className="divide-y divide-[var(--border)]">
            {p.bookings.map((b) => (
              <li key={b.ref} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><Link href={`/admin/bookings/${b.ref}`} className="font-semibold text-brand-600 dark:text-brand-100">{b.ref}</Link> · {b.package} · {t(ucfirst(b.room_type))}</span>
                  <StatusBadge status={b.status} label={b.status_label} tone={b.tone} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {b.documents.map((d) => <Badge key={d.type} tone={!d.has_file ? 'muted' : d.status === 'verified' ? 'ok' : d.status === 'rejected' ? 'no' : 'pen'}>{t(ucfirst(d.type))}: {d.has_file ? t(ucfirst(d.status)) : t('Missing')}</Badge>)}
                  {b.visa && <Badge tone="inf">🛂 {b.visa.ref} · {t(ucfirst(b.visa.status))}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
