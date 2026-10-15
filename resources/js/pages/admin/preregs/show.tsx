import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { ConfirmDelete } from '@/components/admin/confirm-dialog';
import { Field } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { PostButton } from '@/components/admin/post-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import type { Option, SharedProps } from '@/types';
import { preTone } from './index';

type P = { id: number; ref: string; name: string; phone: string; dob: string | null; nid: string | null; passport: string | null; district: string | null; class: string; pilgrims: number; received: string; booking: string | null; converted_at: string | null; status: string; govt_tracking_no: string; notes: string };

export default function PreregShow({ prereg: p, options }: { prereg: P; options: { statuses: Option[] } }) {
  const t = useT();
  const { auth } = usePage<SharedProps>().props;
  const f = useForm({ status: p.status, govt_tracking_no: p.govt_tracking_no, notes: p.notes, pilgrims: String(p.pilgrims) });
  const row = (k: string, v: React.ReactNode) => <><dt className="text-[var(--muted)]">{k}</dt><dd className="min-w-0 break-words">{v ?? '—'}</dd></>;
  return (
    <>
      <PageHeader title={`${t('Pre-registration')} ${p.ref}`} sub={`${p.name} · ${p.phone}`}
        actions={<>
          {p.booking ? <Button asChild variant="gold" size="sm"><Link href={`/admin/bookings/${p.booking}`}>{t('Open booking')} {p.booking}</Link></Button>
            : <PostButton variant="gold" size="sm" href={`/admin/pre-registrations/${p.id}/convert`}><ArrowRightLeft />{t('Convert to booking')}</PostButton>}
          {auth.user?.isOwner && !p.booking && <ConfirmDelete action={`/admin/pre-registrations/${p.id}`} message={t('This permanently deletes the pre-registration.')} />}
          <Button asChild variant="outline" size="sm"><Link href="/admin/pre-registrations"><ArrowLeft className="rtl:rotate-180" />{t('Back')}</Link></Button>
        </>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t('Applicant')}>
          <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-3 gap-y-2 text-[13px]">
            {row(t('Status'), <Badge tone={preTone(p.status)}>{t(options.statuses.find((s) => s.value === p.status)?.label ?? p.status)}</Badge>)}
            {row(t('Date of birth'), p.dob)}{row(t('NID'), p.nid)}{row(t('Passport'), p.passport)}{row(t('District'), p.district)}
            {row(t('Package'), t(p.class))}{row(t('Pilgrims'), p.pilgrims)}{row(t('Received'), p.received)}
            {p.converted_at && row(t('Converted'), p.converted_at)}
          </dl>
        </Panel>
        <Panel title={t('Update')}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); f.put(`/admin/pre-registrations/${p.id}`, { preserveScroll: true }); }}>
            <Field label={t('Status')} error={f.errors.status}><Select name="status" value={f.data.status} onChange={(e) => f.setData('status', e.target.value)} options={options.statuses.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
            <Field label={t('Govt. tracking no.')} error={f.errors.govt_tracking_no}><Input name="govt_tracking_no" value={f.data.govt_tracking_no} onChange={(e) => f.setData('govt_tracking_no', e.target.value)} /></Field>
            <Field label={t('Pilgrims')} error={f.errors.pilgrims}><Input type="number" min={1} max={20} name="pilgrims" value={f.data.pilgrims} onChange={(e) => f.setData('pilgrims', e.target.value)} /></Field>
            <Field label={t('Notes')} error={f.errors.notes}><Textarea name="notes" rows={3} value={f.data.notes} onChange={(e) => f.setData('notes', e.target.value)} /></Field>
            <Button type="submit" disabled={f.processing}>{t('Save')}</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
