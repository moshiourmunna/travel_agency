import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, Eye, Pencil, Printer, RotateCcw, Send, Ticket, Undo2, Upload, X } from 'lucide-react';
import * as React from 'react';
import { ActionDialog, ConfirmDelete } from '@/components/admin/confirm-dialog';
import { Field } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { PostButton } from '@/components/admin/post-button';
import { Progress, StatCard } from '@/components/admin/stat-card';
import { PayStatus, StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { money, ucfirst } from '@/lib/utils';
import type { BookingRow, Option, PaymentRow, SharedProps } from '@/types';

type Doc = { id: number; type: string; status: string; has_file: boolean; note: string | null };
type Pilgrim = {
  id: number; traveller_id: number; name: string; lead: boolean; gender: string; age: number | null; passport: string | null; passport_expiry: string | null; passport_verified: boolean; passport_warn: boolean;
  needs_mahram: boolean; mahram: string | null; room_type: string | null; price: number; ticket_no: string | null; govt_tracking_no: string | null; blood_group: string | null; wheelchair: boolean; medical_notes: string | null;
  documents: Doc[]; visa: null | { id: number; ref: string; status: string; visa_no: string | null; provider_ref: string | null };
};
type Payment = PaymentRow & { refundable: number; refunds: { id: number; amount: number; reason: string; status: string; date: string | null }[] };
type Booking = BookingRow & {
  subtotal: number; discount: number; adults: number; children: number; payment_method: string | null; payment_method_label: string | null; package_departure: string | null;
  agent_info: { id: number; code: string; company: string } | null; agent_id: number | null; source: string; created_at: string; deleted_at: string | null; hold_expires_at: string | null;
  items: { label: string; price: number }[]; wheelchair: boolean; notes: string | null; admin_note: string | null; prereg: string | null; docs_total: number; docs_ok: number;
};
type Props = {
  booking: Booking; pilgrims: Pilgrim[]; payments: Payment[];
  installments: { id: number; label: string; due: string; amount: number; status: string; late: boolean }[];
  open_installments: { id: number; label: string; amount: number; due: string }[];
  ledger: { id: number; date: string; type: string; note: string | null; debit: number; credit: number; balance: number }[];
  commissions: { id: number; agent: string; status: string; amount: number }[];
  timeline: { id: number; type: string; icon: string; from: string | null; to: string | null; message: string | null; at: string; user: string | null }[];
  agents: { id: number; code: string; company: string }[];
  options: { statuses: Option[]; methods: Option[]; visa_statuses: Option[] };
  defaults: { first_due: string; last_due: string; now: string };
};

const docTone = (d: Doc) => (!d.has_file ? 'pen' : d.status === 'verified' ? 'ok' : d.status === 'rejected' ? 'no' : 'pen');

function DocRow({ d, readOnly }: { d: Doc; readOnly: boolean }) {
  const t = useT();
  const up = useForm<{ file: File | null }>({ file: null });
  const rej = useForm({ status: 'rejected', note: '' });
  const [open, setOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid={`doc-${d.type}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <b>{t(ucfirst(d.type))}</b>
        <Badge tone={docTone(d)}>{d.has_file ? t(ucfirst(d.status)) : t('Missing')}</Badge>
        {d.has_file && <a className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-100" target="_blank" rel="noreferrer" href={`/admin/documents/${d.id}/file`}><Eye className="size-3" />{t('view')}</a>}
        {d.note && <small className="text-xs text-red-600">{d.note}</small>}
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="sr-only" aria-label={`${t('Upload')} ${t(ucfirst(d.type))}`}
            onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; up.transform(() => ({ file: f })); up.post(`/admin/documents/${d.id}/upload`, { forceFormData: true, preserveScroll: true }); }} />
          <Button size="xs" variant="outline" onClick={() => fileRef.current?.click()} disabled={up.processing} title={t('Upload')} aria-label={`${t('Upload')} ${t(ucfirst(d.type))}`}><Upload /></Button>
          {d.has_file && d.status !== 'verified' && <PostButton size="xs" href={`/admin/documents/${d.id}/review`} data={{ status: 'verified' }} title={t('Verify')} aria-label={`${t('Verify')} ${t(ucfirst(d.type))}`}><Check /></PostButton>}
          {d.has_file && d.status !== 'rejected' && (
            <ActionDialog open={open} onOpenChange={setOpen} title={`${t('Reject')} – ${t(ucfirst(d.type))}`}
              trigger={<Button size="xs" variant="outline" title={t('Reject')} aria-label={`${t('Reject')} ${t(ucfirst(d.type))}`}><X /></Button>}>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); rej.post(`/admin/documents/${d.id}/review`, { preserveScroll: true, onSuccess: () => setOpen(false) }); }}>
                <Field label={t('Reason for rejection')} error={rej.errors.note} required><Input name="note" value={rej.data.note} onChange={(e) => rej.setData('note', e.target.value)} required /></Field>
                <Button type="submit" variant="destructive" className="w-full" disabled={rej.processing}>{t('Reject')}</Button>
              </form>
            </ActionDialog>
          )}
        </div>
      )}
    </li>
  );
}

function VisaBox({ p, statuses }: { p: Pilgrim; statuses: Option[] }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const f = useForm({ status: p.visa?.status ?? 'draft', visa_no: p.visa?.visa_no ?? '', provider_ref: p.visa?.provider_ref ?? '' });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-[13px]">
      <span aria-hidden>🛂</span>
      {p.visa ? <span>{p.visa.ref} · <b>{t(ucfirst(p.visa.status))}</b>{p.visa.visa_no && ` · ${p.visa.visa_no}`}{p.visa.provider_ref && ` · ${p.visa.provider_ref}`}</span> : <span className="text-[var(--muted)]">{t('No visa application')}</span>}
      <span className="flex-1" />
      {p.visa && !p.visa.provider_ref && <PostButton size="xs" variant="outline" href={`/admin/visa/${p.visa.id}/submit`}><Send />{t('Submit to Nusuk')}</PostButton>}
      <ActionDialog open={open} onOpenChange={setOpen} title={`${t('Update visa')} – ${p.name}`} trigger={<Button size="xs" variant="outline">{t('Update visa')}</Button>}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); f.post(`/admin/pilgrim-visa/${p.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) }); }}>
          <Field label={t('Status')} error={f.errors.status}><Select name="status" value={f.data.status} onChange={(e) => f.setData('status', e.target.value)} options={statuses.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
          <Field label={t('Visa no.')} error={f.errors.visa_no}><Input name="visa_no" value={f.data.visa_no} onChange={(e) => f.setData('visa_no', e.target.value)} /></Field>
          <Field label={t('Nusuk / MOFA ref')} error={f.errors.provider_ref}><Input name="provider_ref" value={f.data.provider_ref} onChange={(e) => f.setData('provider_ref', e.target.value)} /></Field>
          <Button type="submit" className="w-full" disabled={f.processing}>{t('Save')}</Button>
        </form>
      </ActionDialog>
    </div>
  );
}

function RefundDialog({ p, methods }: { p: Payment; methods: Option[] }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const f = useForm({ amount: String(p.refundable), reason: '', method: p.method });
  return (
    <ActionDialog open={open} onOpenChange={setOpen} title={`${t('Refund')} #${p.id}`} description={t('Amount (max :m)', { m: money(p.refundable) })}
      trigger={<Button size="xs" variant="outline"><Undo2 />{t('Refund')}</Button>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!window.confirm(t('Record this refund?'))) return; f.post(`/admin/payments/${p.id}/refund`, { preserveScroll: true, onSuccess: () => setOpen(false) }); }}>
        <Field label={t('Amount (৳)')} error={f.errors.amount} required><Input type="number" name="amount" min={1} max={p.refundable} value={f.data.amount} onChange={(e) => f.setData('amount', e.target.value)} /></Field>
        <Field label={t('Reason')} error={f.errors.reason} required><Input name="reason" value={f.data.reason} onChange={(e) => f.setData('reason', e.target.value)} /></Field>
        <Field label={t('Method')} error={f.errors.method}><Select name="method" value={f.data.method} onChange={(e) => f.setData('method', e.target.value)} options={methods.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
        <Button type="submit" variant="destructive" className="w-full" disabled={f.processing}>{t('Record refund')}</Button>
      </form>
    </ActionDialog>
  );
}

function Section({ title, children, open = false, id }: { title: string; children: React.ReactNode; open?: boolean; id?: string }) {
  return (
    <details open={open} id={id} className="group rounded-lg border border-[var(--border)] [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-2 px-3 text-sm font-medium">{title}<span className="text-[var(--muted)] transition group-open:rotate-180" aria-hidden>▾</span></summary>
      <div className="border-t border-[var(--border)] p-3">{children}</div>
    </details>
  );
}

function QuickActions({ b, open_installments, agents, options, defaults }: Props & { b: Booking }) {
  const t = useT();
  const { modules } = usePage<SharedProps>().props;
  const st = useForm({ status: b.status, note: '' });
  const pay = useForm<{ amount: string; method: string; installment_id: string; txn: string; paid_at: string; note: string; slip: File | null }>({ amount: String(open_installments[0]?.amount ?? b.due), method: 'cash', installment_id: '', txn: '', paid_at: '', note: '', slip: null });
  const ag = useForm({ agent_id: b.agent_id ? String(b.agent_id) : '' });
  const note = useForm({ message: '' });
  return (
    <Panel title={t('Quick actions')}>
      <div className="space-y-2">
        <Section title={`🔁 ${t('Change status')}`} open>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); st.post(`/admin/bookings/${b.ref}/status`, { preserveScroll: true, onSuccess: () => st.setData('note', '') }); }}>
            <Select name="status" aria-label={t('Status')} value={st.data.status} onChange={(e) => st.setData('status', e.target.value)} options={options.statuses.map((o) => ({ ...o, label: t(o.label) }))} />
            <Input name="note" aria-label={t('Note for history (optional)')} placeholder={t('Note for history (optional)')} value={st.data.note} onChange={(e) => st.setData('note', e.target.value)} />
            <Button type="submit" className="w-full" size="sm" disabled={st.processing}>{t('Update status')}</Button>
          </form>
        </Section>
        {b.due > 0 && (
          <Section title={`💳 ${t('Record payment')}`} open={!!pay.errors.amount} id="record-payment">
            <form className="grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); pay.post(`/admin/bookings/${b.ref}/payments`, { forceFormData: true, preserveScroll: true, onSuccess: () => pay.reset() }); }}>
              <Field label={t('Amount (৳)')} error={pay.errors.amount} required><Input type="number" name="amount" min={1} max={b.due} value={pay.data.amount} onChange={(e) => pay.setData('amount', e.target.value)} /></Field>
              <Field label={t('Method')} error={pay.errors.method}><Select name="method" value={pay.data.method} onChange={(e) => pay.setData('method', e.target.value)} options={options.methods.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
              {open_installments.length > 0 && (
                <Field label={t('Apply to installment')} className="col-span-2" error={pay.errors.installment_id}>
                  <Select name="installment_id" value={pay.data.installment_id} onChange={(e) => pay.setData('installment_id', e.target.value)} placeholder={t('Auto-allocate')} options={open_installments.map((i) => ({ value: String(i.id), label: `${t(i.label)} · ${money(i.amount)} · ${i.due}` }))} />
                </Field>
              )}
              <Field label={t('TrxID / receipt')} error={pay.errors.txn}><Input name="txn" value={pay.data.txn} onChange={(e) => pay.setData('txn', e.target.value)} /></Field>
              <Field label={t('Paid on')} error={pay.errors.paid_at}><Input type="datetime-local" name="paid_at" max={defaults.now} value={pay.data.paid_at} onChange={(e) => pay.setData('paid_at', e.target.value)} /></Field>
              <Field label={t('Note')} className="col-span-2" error={pay.errors.note}><Input name="note" value={pay.data.note} onChange={(e) => pay.setData('note', e.target.value)} /></Field>
              <Field label={t('Slip (optional)')} className="col-span-2" error={pay.errors.slip}><Input type="file" name="slip" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => pay.setData('slip', e.target.files?.[0] ?? null)} /></Field>
              <Button type="submit" variant="gold" size="sm" className="col-span-2" disabled={pay.processing}>{t('Save payment')}</Button>
            </form>
          </Section>
        )}
        {modules.agents && (
          <Section title={`🤝 ${t('Assign agent')}`}>
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); ag.post(`/admin/bookings/${b.ref}/agent`, { preserveScroll: true }); }}>
              <Select name="agent_id" aria-label={t('Agent')} value={ag.data.agent_id} onChange={(e) => ag.setData('agent_id', e.target.value)} placeholder={t('Direct (no agent)')} options={agents.map((a) => ({ value: String(a.id), label: `${a.code} · ${a.company}` }))} />
              <Button type="submit" variant="outline" size="sm" className="w-full" disabled={ag.processing}>{t('Save')}</Button>
            </form>
          </Section>
        )}
        <Section title={`📝 ${t('Add note')}`}>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); note.post(`/admin/bookings/${b.ref}/note`, { preserveScroll: true, onSuccess: () => note.reset() }); }}>
            <Textarea name="message" aria-label={t('Add note')} rows={2} value={note.data.message} onChange={(e) => note.setData('message', e.target.value)} required />
            {note.errors.message && <p className="text-xs text-red-600" role="alert">{note.errors.message}</p>}
            <Button type="submit" variant="outline" size="sm" className="w-full" disabled={note.processing}>{t('Add to timeline')}</Button>
          </form>
        </Section>
      </div>
    </Panel>
  );
}

function Schedule({ b, installments, defaults }: { b: Booking; installments: Props['installments']; defaults: Props['defaults'] }) {
  const t = useT();
  const { modules } = usePage<SharedProps>().props;
  const f = useForm({ count: '3', first_due: defaults.first_due, last_due: defaults.last_due, deposit: '0' });
  return (
    <Panel title={t('Payment schedule')} id="schedule">
      {installments.length ? (
        <ul className="divide-y divide-[var(--border)] text-sm">
          {installments.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{t(i.label)} <span className="text-xs text-[var(--muted)]">· {i.due}</span></span>
              <span className="flex items-center gap-2"><b className="tabular-nums">{money(i.amount)}</b><Badge tone={i.status === 'paid' ? 'ok' : i.late ? 'no' : 'pen'}>{i.late ? t('Overdue') : t(ucfirst(i.status))}</Badge></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-[var(--muted)]">{t('No installment schedule – :m.', { m: t(b.payment_mode_label) })}</p>}
      {modules.installments && !b.trashed && b.due > 0 && (
        <div className="mt-3"><Section title={`⚙ ${installments.length ? t('Regenerate schedule') : t('Generate installment schedule')}`}>
          <form className="grid grid-cols-2 gap-2 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); f.post(`/admin/bookings/${b.ref}/schedule`, { preserveScroll: true }); }}>
            <Field label={t('Installments')} error={f.errors.count}><Input type="number" name="count" min={1} max={24} value={f.data.count} onChange={(e) => f.setData('count', e.target.value)} /></Field>
            <Field label={t('First due')} error={f.errors.first_due}><Input type="date" name="first_due" value={f.data.first_due} onChange={(e) => f.setData('first_due', e.target.value)} /></Field>
            <Field label={t('Last due')} error={f.errors.last_due}><Input type="date" name="last_due" value={f.data.last_due} onChange={(e) => f.setData('last_due', e.target.value)} /></Field>
            <Field label={t('Deposit now (৳)')} error={f.errors.deposit}><Input type="number" name="deposit" min={0} value={f.data.deposit} onChange={(e) => f.setData('deposit', e.target.value)} /></Field>
            <p className="col-span-2 text-xs text-[var(--muted)] md:col-span-4">{t('Paid stages are kept; unpaid ones are replaced. Balance to schedule:')} <b>{money(b.due)}</b></p>
            <Button type="submit" size="sm" className="col-span-2 md:col-span-1" disabled={f.processing}>{t('Generate')}</Button>
          </form>
        </Section></div>
      )}
    </Panel>
  );
}

export default function BookingShow(props: Props) {
  const { booking: b, pilgrims, payments, ledger, commissions, timeline, options } = props;
  const t = useT();
  const { auth, modules } = usePage<SharedProps>().props;
  const owner = !!auth.user?.isOwner;
  const ro = b.trashed;
  return (
    <>
      <PageHeader title={`${t('Booking')} ${b.ref}`} sub={`${b.package ?? ''} · ${b.customer.name ?? ''} · ${b.customer.phone ?? ''}`}
        actions={<>
          {ro ? (owner && <PostButton variant="gold" size="sm" href={`/admin/bookings/${b.ref}/restore`}><RotateCcw />{t('Restore')}</PostButton>) : <>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/bookings/${b.ref}/edit`}><Pencil />{t('Edit')}</Link></Button>
            <Button asChild variant="outline" size="sm"><a target="_blank" rel="noreferrer" href={`/admin/bookings/${b.ref}/invoice`}><Printer />{t('Invoice')}</a></Button>
            <Button asChild variant="outline" size="sm"><a target="_blank" rel="noreferrer" href={`/admin/bookings/${b.ref}/voucher`}><Ticket />{t('Voucher')}</a></Button>
            {owner && <ConfirmDelete action={`/admin/bookings/${b.ref}`} reason />}
          </>}
          <Button asChild variant="outline" size="sm"><Link href="/admin/bookings"><ArrowLeft className="rtl:rotate-180" />{t('All bookings')}</Link></Button>
        </>} />
      {ro && <div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">🗑 {t('This booking is in trash (deleted :d). Restore it to make changes.', { d: b.deleted_at ?? '' })}</div>}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('Total')} value={money(b.total)} sub={`${t('Subtotal')} ${money(b.subtotal)} − ${money(b.discount)}`} />
        <StatCard label={t('Paid')} value={money(b.paid)}><Progress value={b.progress} /></StatCard>
        <StatCard label={t('Due')} value={money(b.due)} sub={<PayStatus status={b.payment_status} label={b.payment_status_label} />} />
        <StatCard label={t('Status')} value={<StatusBadge status={b.status} label={b.status_label} tone={b.status_tone} />} sub={`${t('Documents')} ${b.docs_ok}/${b.docs_total}`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2 min-w-0">
          <Panel title={`${t('Pilgrims')} (${pilgrims.length})`} id="pilgrims">
            <div className="space-y-3">
              {pilgrims.map((p) => (
                <article key={p.id} className="rounded-xl border border-[var(--border)] p-3 sm:p-4" aria-label={p.name}>
                  <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2"><Link href={`/admin/pilgrims/${p.traveller_id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-100">{p.name}</Link>{p.lead && <Badge tone="inf">{t('Lead')}</Badge>}</span>
                    <span className="text-xs text-[var(--muted)]">{t(ucfirst(p.gender))}{p.age !== null && ` · ${p.age} ${t('yrs')}`}</span>
                  </header>
                  <dl className="grid grid-cols-[minmax(90px,auto)_1fr] gap-x-3 gap-y-1 text-[13px]">
                    <dt className="text-[var(--muted)]">{t('Passport')}</dt>
                    <dd className="break-words">{p.passport ?? '—'}{p.passport_expiry && ` · ${t('exp.')} ${p.passport_expiry}`} {p.passport_warn && <Badge tone="pen">⚠ {t('< 6 months validity')}</Badge>} {p.passport_verified && <Badge tone="ok">✓</Badge>}</dd>
                    {p.needs_mahram && <><dt className="text-[var(--muted)]">{t('Mahram')}</dt><dd>{p.mahram ?? <Badge tone="pen">⚠ {t('Not linked')}</Badge>}</dd></>}
                    <dt className="text-[var(--muted)]">{t('Room')}</dt><dd>{t(ucfirst(p.room_type))} · {money(p.price)}</dd>
                    {(p.ticket_no || p.govt_tracking_no) && <><dt className="text-[var(--muted)]">{t('Ticket / tracking')}</dt><dd>{p.ticket_no ?? '—'} / {p.govt_tracking_no ?? '—'}</dd></>}
                    {(p.medical_notes || p.wheelchair || p.blood_group) && <><dt className="text-[var(--muted)]">{t('Health')}</dt><dd>{p.blood_group} {p.wheelchair && '♿'} {p.medical_notes}</dd></>}
                  </dl>
                  {p.documents.length > 0 && <ul className="mt-2 divide-y divide-[var(--border)] border-t border-[var(--border)]">{p.documents.map((d) => <DocRow key={d.id} d={d} readOnly={ro} />)}</ul>}
                  {modules.visa && !ro && <VisaBox p={p} statuses={options.visa_statuses} />}
                  {modules.visa && ro && p.visa && <p className="mt-2 text-[13px]">🛂 {p.visa.ref} · {t(ucfirst(p.visa.status))}</p>}
                </article>
              ))}
            </div>
          </Panel>
          <Schedule b={b} installments={props.installments} defaults={props.defaults} />
          <Panel title={t('Payments & refunds')} id="payments">
            {payments.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('No payments yet.')}</p> : (
              <ul className="divide-y divide-[var(--border)]">
                {payments.map((p) => (
                  <li key={p.id} className="py-3" data-testid="payment-row">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 text-sm">
                        <span className="font-medium">#{p.id} · {t(p.method_label)}</span>{p.has_slip && <> · <a className="text-xs text-brand-600 hover:underline dark:text-brand-100" target="_blank" rel="noreferrer" href={`/admin/payments/${p.id}/slip`}>{t('slip')}</a></>}
                        <div className="text-xs text-[var(--muted)] break-all">{p.txn ?? '—'} · {p.date}{p.recorder && ` · ${p.recorder}`}</div>
                        {p.note && <div className="text-xs text-[var(--muted)]">{p.note}</div>}
                      </div>
                      <div className="text-end">
                        <b className="tabular-nums">{money(p.amount)}</b>{p.refunded > 0 && <div className="text-xs text-red-600">−{money(p.refunded)}</div>}
                        <div className="mt-1"><StatusBadge status={p.status} label={p.status_label} tone={p.status_tone} /></div>
                      </div>
                    </div>
                    {!ro && (p.status === 'pending' || (owner && p.refundable > 0)) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.status === 'pending' && <>
                          <PostButton size="xs" href={`/admin/payments/${p.id}/verify`} data={{ action: 'approve' }}><Check />{t('Verify')}</PostButton>
                          <PostButton size="xs" variant="outline" href={`/admin/payments/${p.id}/verify`} data={{ action: 'reject' }}><X />{t('Reject')}</PostButton>
                        </>}
                        {owner && p.refundable > 0 && <RefundDialog p={p} methods={options.methods} />}
                      </div>
                    )}
                    {p.refunds.map((r) => (
                      <div key={r.id} className="mt-2 flex flex-wrap justify-between gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-900 dark:bg-red-950 dark:text-red-200">
                        <span>↩ {t('Refund')} · {r.reason} · {r.date}</span><b>−{money(r.amount)}</b>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t('Ledger')} id="ledger">
            <div className="noscrollbar overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead className="text-xs text-[var(--muted)]"><tr><th className="py-1.5 text-start">{t('Date')}</th><th className="text-start">{t('Entry')}</th><th className="text-end">{t('Debit')}</th><th className="text-end">{t('Credit')}</th><th className="text-end">{t('Balance due')}</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr><td className="py-1.5 whitespace-nowrap">{b.created}</td><td>{t('Booking charge')}{b.discount ? ` (${t('after discount')} ${money(b.discount)})` : ''}</td><td className="text-end tabular-nums">{money(b.total)}</td><td /><td className="text-end tabular-nums">{money(b.total)}</td></tr>
                  {ledger.map((e) => (
                    <tr key={e.id}><td className="py-1.5 whitespace-nowrap">{e.date}</td><td>{e.type === 'refund' ? `↩ ${t('Refund')}` : `💳 ${t('Payment')}`} <small className="text-[var(--muted)]">{e.note}</small></td>
                      <td className="text-end tabular-nums">{e.debit ? money(e.debit) : ''}</td><td className="text-end tabular-nums">{e.credit ? money(e.credit) : ''}</td><td className="text-end tabular-nums">{money(e.balance)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ledger.length === 0 && b.paid > 0 && <p className="mt-2 text-xs text-[var(--muted)]">{t('Older payments were made before the ledger was enabled; see the payments table.')}</p>}
          </Panel>
        </div>
        <div className="space-y-5 min-w-0">
          {!ro && <QuickActions {...props} b={b} />}
          <Panel title={t('Details')}>
            <dl className="grid grid-cols-[minmax(96px,auto)_1fr] gap-x-3 gap-y-2 text-[13px]">
              <dt className="text-[var(--muted)]">{t('Customer')}</dt><dd className="min-w-0 break-words"><Link href={`/admin/customers/${b.customer.id}`} className="text-brand-600 hover:underline dark:text-brand-100">{b.customer.name}</Link><br /><small className="text-[var(--muted)]">{b.customer.phone} {b.customer.email}</small></dd>
              <dt className="text-[var(--muted)]">{t('Package')}</dt><dd>{b.package}{b.package_departure && <><br /><small className="text-[var(--muted)]">✈ {b.package_departure}</small></>}</dd>
              <dt className="text-[var(--muted)]">{t('Room')}</dt><dd>{t(ucfirst(b.room_type))} · {b.adults} {t('adults')} / {b.children} {t('children')}</dd>
              <dt className="text-[var(--muted)]">{t('Payment plan')}</dt><dd>{t(b.payment_mode_label)}{b.payment_method_label && ` · ${t(b.payment_method_label)}`}</dd>
              <dt className="text-[var(--muted)]">{t('Agent')}</dt><dd>{b.agent_info ? <>{modules.agents ? <Link href={`/admin/agents/${b.agent_info.id}/statement`} className="text-brand-600 dark:text-brand-100">{b.agent_info.code}</Link> : b.agent_info.code} · {b.agent_info.company}</> : t('Direct')}</dd>
              <dt className="text-[var(--muted)]">{t('Source')}</dt><dd>{b.source} · {b.created_at}</dd>
              {b.hold_expires_at && <><dt className="text-[var(--muted)]">{t('Hold expires')}</dt><dd>{b.hold_expires_at}</dd></>}
              {b.items.map((it, i) => <React.Fragment key={i}><dt className="text-[var(--muted)]">{t('Add-on')}</dt><dd>{it.label} · {money(it.price)}</dd></React.Fragment>)}
              {b.wheelchair && <><dt>♿</dt><dd>{t('Wheelchair assistance')}</dd></>}
              {b.prereg && <><dt className="text-[var(--muted)]">{t('Pre-registration')}</dt><dd>{b.prereg}</dd></>}
              {b.notes && <><dt className="text-[var(--muted)]">{t('Customer notes')}</dt><dd>“{b.notes}”</dd></>}
              {b.admin_note && <><dt className="text-[var(--muted)]">{t('Internal note')}</dt><dd>{b.admin_note}</dd></>}
            </dl>
          </Panel>
          {commissions.length > 0 && (
            <Panel title={t('Commission')}>
              <ul className="space-y-2 text-sm">{commissions.map((c) => <li key={c.id} className="flex justify-between gap-2"><span>{c.agent} <StatusBadge status={c.status} /></span><b className="tabular-nums">{money(c.amount)}</b></li>)}</ul>
            </Panel>
          )}
          <Panel title={t('Timeline')} id="timeline">
            {timeline.length === 0 ? <p className="text-sm text-[var(--muted)]">{t('No activity recorded yet.')}</p> : (
              <ol className="relative space-y-3 border-s border-[var(--border)] ps-4">
                {timeline.map((a) => (
                  <li key={a.id} className="relative text-[13px]">
                    <span aria-hidden className="absolute -start-[27px] flex size-5 items-center justify-center rounded-full bg-[var(--card)] text-[11px] ring-1 ring-[var(--border)]">{a.icon}</span>
                    {a.type === 'status' && <b>{t(a.from ?? '')} → {t(a.to ?? '')}</b>}{a.type === 'status' && a.message && <br />}<span className="break-words">{a.message}</span>
                    <p className="text-xs text-[var(--muted)]">{a.at} · {a.user ?? t('System')}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

