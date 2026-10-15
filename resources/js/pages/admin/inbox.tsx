import { Link } from '@inertiajs/react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';
import { ucfirst } from '@/lib/utils';
import type { Paged } from '@/types';
import { preTone } from './preregs/index';

type Inq = { id: number; date: string; type: string; name: string; phone: string; interest: string; message: string };
type Pre = { id: number; ref: string; name: string; phone: string; district: string | null; class: string; pilgrims: number; tracking: string | null; status: string };
type Visa = { id: number; ref: string; applicant: string; type: string; provider: string | null; provider_ref: string | null; status: string };

export default function Inbox({ inquiries, preregs, visas }: { inquiries: Paged<Inq>; preregs: Paged<Pre>; visas: Visa[] }) {
  const t = useT();
  const icols: Column<Inq>[] = [
    { key: 'date', label: t('Date'), main: true, render: (i) => <span className="whitespace-nowrap">{i.date}</span> },
    { key: 'type', label: t('Type'), render: (i) => <Badge tone="inf">{t(ucfirst(i.type))}</Badge> },
    { key: 'name', label: t('Name'), render: (i) => <div>{i.name}<div className="text-xs"><a href={`tel:${i.phone}`} className="text-brand-600 dark:text-brand-100">{i.phone}</a></div></div> },
    { key: 'interest', label: t('Interest'), render: (i) => i.interest || '—' },
    { key: 'message', label: t('Message'), render: (i) => <span className="block max-w-[360px] break-words">{i.message || '—'}</span> },
  ];
  const pcols: Column<Pre>[] = [
    { key: 'ref', label: t('Ref'), main: true, render: (p) => <Link href={`/admin/pre-registrations/${p.id}`} className="font-semibold text-brand-600 dark:text-brand-100">{p.ref}</Link> },
    { key: 'name', label: t('Name'), render: (p) => <div>{p.name}<div className="text-xs text-[var(--muted)]">{p.phone}</div></div> },
    { key: 'district', label: t('District'), render: (p) => p.district ?? '—' },
    { key: 'class', label: t('Package'), render: (p) => `${t(p.class)} · ${p.pilgrims}` },
    { key: 'tracking', label: t('Tracking'), render: (p) => p.tracking ?? '—' },
    { key: 'status', label: t('Status'), render: (p) => <Badge tone={preTone(p.status)}>{t(ucfirst(p.status))}</Badge> },
  ];
  const vcols: Column<Visa>[] = [
    { key: 'ref', label: t('Ref'), main: true, render: (v) => <b>{v.ref}</b> },
    { key: 'applicant', label: t('Applicant'), render: (v) => v.applicant },
    { key: 'type', label: t('Type'), render: (v) => t(ucfirst(v.type)) },
    { key: 'provider', label: t('Provider'), render: (v) => `${v.provider ?? '—'}${v.provider_ref ? ' · ' + v.provider_ref : ''}` },
    { key: 'status', label: t('Status'), render: (v) => <Badge tone={v.status === 'approved' ? 'ok' : v.status === 'rejected' ? 'no' : 'pen'}>{t(ucfirst(v.status))}</Badge> },
  ];
  return (
    <>
      <PageHeader title={t('Inbox')} sub={t('Website inquiries, pre-registrations and visa applications')} />
      <Panel title={`${t('Inquiries')} (${inquiries.meta.total})`}><DataTable columns={icols} rows={inquiries.data} rowKey={(i) => i.id} small empty={t('No inquiries yet.')} /><Pagination meta={inquiries.meta} param="ip" /></Panel>
      <Panel title={`${t('Pre-registrations')} (${preregs.meta.total})`} className="mt-5"><DataTable columns={pcols} rows={preregs.data} rowKey={(p) => p.id} small empty={t('No pre-registrations yet.')} /><Pagination meta={preregs.meta} param="pp" /></Panel>
      {visas.length > 0 && <Panel title={t('Visa applications')} className="mt-5"><DataTable columns={vcols} rows={visas} rowKey={(v) => v.id} small /></Panel>}
    </>
  );
}
