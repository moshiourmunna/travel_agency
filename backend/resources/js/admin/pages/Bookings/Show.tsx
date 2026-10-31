import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { useRunAction } from '@/components/ActionModal';
import { Icon } from '@/components/Icon';
import { Badge, Card, Modal, PageHeader, Spinner, Switch, cx } from '@/components/ui';
import { Input, Select, Textarea } from '@/fields/basic';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Opt, Shared } from '@/lib/types';

type Pay = { id: number; gateway: string; method: string | null; amount: number; status: string; status_label: string; status_color: string; txn: string | null; paid_at: string | null; created_at: string; href: string | null; verifiable: boolean };
type Props = {
  booking: any; items: { id: number; label: string; qty: number; unit: number; total: number }[]; travellers: { id: number; name: string; type: string; ticket_no: string | null; seat: string | null }[];
  payments: Pay[]; refunds: { id: number; amount: number; reason: string; status: string; status_label: string; status_color: string; created_at: string; processed_at: string | null }[];
  instalments: { seq: number; due_date: string | null; amount: number; status: string }[]; timeline: { id: number; type: string; body: string; internal: boolean; by: string | null; at: string }[];
  options: { transitions: Opt[]; staff: Opt[]; refundable: { id: number; label: string; max: number }[]; refund_suggestion: number; cancellation_fee: number; notify: Opt[]; methods: Opt[] };
  can: { update: boolean; cancel: boolean; record: boolean; refund: boolean; reconcile: boolean };
};

const TL_ICON: Record<string, string> = { status: 'flag', payment: 'banknote', note: 'sticky-note', refund: 'rotate-ccw', notify: 'send', assign: 'user-check', created: 'sparkles' };

export default function BookingShow({ booking: b, items, travellers, payments, refunds, instalments, timeline, options, can }: Props) {
  const { t, money, date, ago, num } = useT();
  const url = useAdminUrl();
  const errors = (usePage().props as unknown as Shared).errors;
  const base = url('/bookings/' + b.id);
  const { run, modal } = useRunAction();
  const [dlg, setDlg] = useState<null | 'status' | 'payment' | 'refund' | 'notify'>(null);
  const [busy, setBusy] = useState(false);
  const [st, setSt] = useState({ status: '', reason: '', notify: true });
  const [pay, setPay] = useState({ amount: b.balance as number | null, method: 'cash', reference: '', note: '' });
  const [rf, setRf] = useState({ payment_id: options.refundable[0]?.id ?? null, amount: Math.min(options.refund_suggestion, options.refundable[0]?.max ?? 0) as number | null, reason: '', to: 'original', process_now: false });
  const [nt, setNt] = useState({ body: '', internal: true });
  const [notifyKey, setNotifyKey] = useState(options.notify[0]?.value ?? '');
  const post = (path: string, data: Record<string, any>, done?: () => void) => router.post(base + path, data, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => { setDlg(null); done?.(); } });
  const footer = (label: string, onClick: () => void, danger = false) => <>
    <button type="button" className="btn btn-outline btn-sm" onClick={() => setDlg(null)}>{t('Cancel', 'বাতিল')}</button>
    <button type="button" className={cx('btn btn-sm', danger ? 'btn-danger' : 'btn-primary')} onClick={onClick} disabled={busy} data-dialog-submit>{busy ? <Spinner /> : null}{label}</button>
  </>;
  const c = b.contact ?? {};
  const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-3 py-1.5 text-sm"><dt className="muted">{k}</dt><dd className="text-right font-medium text-ink-900 dark:text-ink-100">{v}</dd></div>;

  return (
    <>
      <Head title={b.ref} />
      <PageHeader title={<span className="flex flex-wrap items-center gap-3">{b.ref}<Badge color={b.status_color}>{b.status_label}</Badge><Badge color={b.payment_color}>{b.payment_label}</Badge></span>}
        subtitle={<>{b.kind_label} · {b.title}{b.subtitle ? ` · ${b.subtitle}` : ''}</>} icon="briefcase" crumbs={[[t('Bookings', 'বুকিং'), url('/bookings')], [b.ref]]}
        actions={<>
          {b.public_url ? <a href={b.public_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Icon name="external-link" size={16} />{t('Product page', 'পণ্যের পেজ')}</a> : null}
          {b.product_edit ? <Link href={b.product_edit} className="btn btn-ghost btn-sm"><Icon name="pencil" size={16} />{t('Edit product', 'পণ্য সম্পাদনা')}</Link> : null}
          <a href={b.receipt_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><Icon name="receipt" size={16} />{t('Receipt', 'রসিদ')}</a>
          {can.update && options.transitions.length ? <button type="button" className="btn btn-primary btn-sm" onClick={() => { setSt({ status: String(options.transitions[0].value), reason: '', notify: true }); setDlg('status'); }} data-change-status><Icon name="flag" size={16} />{t('Change status', 'অবস্থা পরিবর্তন')}</button> : null}
        </>} />

      {b.hold_expires_at && b.status === 'pending' ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-900 dark:border-accent-700 dark:bg-ink-900 dark:text-accent-100"><Icon name="timer" size={16} />{t('Seat hold expires', 'সিট হোল্ড শেষ হবে')} {date(b.hold_expires_at, true)}</div> : null}
      {b.cancelled_at ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100"><Icon name="ban" size={16} />{t('Cancelled', 'বাতিল')} {date(b.cancelled_at, true)}{b.cancel_reason ? ` — ${b.cancel_reason}` : ''}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[[t('Total', 'মোট'), money(b.total)], [t('Paid', 'পরিশোধিত'), money(b.paid)], [t('Balance due', 'বাকি'), money(b.balance)], [t('Travel', 'যাত্রা'), b.travel_start ? date(b.travel_start) : '—']].map(([k, v]) => (
              <div key={k} className="card p-4"><p className="text-xs muted">{k}</p><p className="mt-1 text-lg font-extrabold text-ink-900 dark:text-white">{v}</p></div>
            ))}
          </div>

          <Card title={t('Price breakdown', 'মূল্যের বিবরণ')} pad={false}>
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>{t('Item', 'আইটেম')}</th><th className="text-right">{t('Qty', 'সংখ্যা')}</th><th className="text-right">{t('Unit', 'একক')}</th><th className="text-right">{t('Amount', 'পরিমাণ')}</th></tr></thead>
              <tbody>
                {items.map((i) => <tr key={i.id}><td>{i.label}</td><td className="text-right tabular-nums">{num(i.qty)}</td><td className="text-right tabular-nums">{money(i.unit)}</td><td className="text-right tabular-nums">{money(i.total)}</td></tr>)}
                {b.discount ? <tr><td colSpan={3} className="text-right muted">{t('Discount', 'ছাড়')}{b.coupon ? ` (${b.coupon})` : ''}</td><td className="text-right tabular-nums text-emerald-700">−{money(b.discount)}</td></tr> : null}
                <tr><td colSpan={3} className="text-right font-bold">{t('Total', 'মোট')}</td><td className="text-right font-bold tabular-nums">{money(b.total)}</td></tr>
                {b.cost !== null ? <tr><td colSpan={3} className="text-right text-xs muted">{t('Supplier cost · margin', 'সরবরাহকারী খরচ · মার্জিন')}</td><td className="text-right text-xs tabular-nums muted">{money(b.cost)} · {money(b.total - b.cost)}</td></tr> : null}
              </tbody>
            </table></div>
          </Card>

          <Card title={t('Payments', 'পেমেন্ট')} pad={false} actions={<>
            {can.record && b.balance > 0 && b.status !== 'cancelled' ? <button type="button" className="btn btn-outline btn-sm" onClick={() => { setPay({ amount: b.balance, method: 'cash', reference: '', note: '' }); setDlg('payment'); }} data-record-payment><Icon name="plus" size={15} />{t('Record payment', 'পেমেন্ট রেকর্ড')}</button> : null}
            {can.refund && options.refundable.length ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setDlg('refund')} data-refund><Icon name="rotate-ccw" size={15} />{t('Refund', 'রিফান্ড')}</button> : null}
          </>}>
            {payments.length ? (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5" data-payment={p.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{p.gateway}{p.method ? ` · ${p.method}` : ''}</p>
                      <p className="text-xs muted">{p.txn ? `${p.txn} · ` : ''}{date(p.paid_at ?? p.created_at, true)}</p>
                    </div>
                    <span className="font-bold tabular-nums">{money(p.amount)}</span>
                    <Badge color={p.status_color}>{p.status_label}</Badge>
                    {p.verifiable && can.reconcile ? <>
                      <button type="button" className="btn btn-primary btn-sm" data-verify={p.id} onClick={() => run({ key: 'verify', label: t('Verify transfer & confirm', 'ট্রান্সফার যাচাই ও নিশ্চিত'), icon: 'badge-check', confirm: t('Confirm that this amount has arrived in the bank account.', 'নিশ্চিত করুন যে টাকা ব্যাংক অ্যাকাউন্টে এসেছে।'), fields: [{ type: 'text', name: 'note', label: t('Bank reference / note', 'ব্যাংক রেফারেন্স / নোট'), span: 12 }], blank: { note: '' } }, url(`/payments/${p.id}/action/verify`))}><Icon name="badge-check" size={15} />{t('Verify', 'যাচাই')}</button>
                      <button type="button" className="btn btn-ghost btn-sm text-rose-700" onClick={() => run({ key: 'reject', label: t('Reject transfer', 'ট্রান্সফার প্রত্যাখ্যান'), tone: 'danger', fields: [{ type: 'text', name: 'reason', label: t('Reason', 'কারণ'), required: true, span: 12 }], blank: { reason: '' } }, url(`/payments/${p.id}/action/reject`))}>{t('Reject', 'প্রত্যাখ্যান')}</button>
                    </> : null}
                    {p.href ? <Link href={p.href} className="icon-btn h-8 w-8" aria-label={t('Open payment', 'পেমেন্ট খুলুন')}><Icon name="chevron-right" size={16} /></Link> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-6 text-sm muted">{t('No payments yet.', 'এখনও কোনো পেমেন্ট নেই।')}</p>}
            {refunds.length ? (
              <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800 sm:px-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide muted">{t('Refunds', 'রিফান্ড')}</p>
                {refunds.map((r) => <div key={r.id} className="flex items-center gap-3 py-1 text-sm"><span className="flex-1">{r.reason} <span className="text-xs muted">· {ago(r.created_at)}</span></span><span className="tabular-nums">{money(r.amount)}</span><Badge color={r.status_color}>{r.status_label}</Badge></div>)}
              </div>
            ) : null}
            {instalments.length ? (
              <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800 sm:px-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide muted">{t('Instalment plan', 'কিস্তি পরিকল্পনা')}</p>
                {instalments.map((i) => <div key={i.seq} className="flex items-center gap-3 py-1 text-sm"><span className="w-6 muted">#{i.seq}</span><span className="flex-1">{date(i.due_date)}</span><span className="tabular-nums">{money(i.amount)}</span><Badge color={i.status === 'paid' ? 'green' : 'gold'}>{i.status}</Badge></div>)}
              </div>
            ) : null}
          </Card>

          {travellers.length ? (
            <Card title={t(`Travellers (${travellers.length})`, `ভ্রমণকারী (${travellers.length})`)} pad={false}>
              <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Name', 'নাম')}</th><th>{t('Type', 'ধরন')}</th><th>{t('Ticket', 'টিকিট')}</th><th>{t('Seat', 'সিট')}</th></tr></thead>
                <tbody>{travellers.map((x) => <tr key={x.id}><td className="font-medium">{x.name}</td><td>{x.type}</td><td className="font-mono text-xs">{x.ticket_no ?? '—'}</td><td>{x.seat ?? '—'}</td></tr>)}</tbody></table></div>
            </Card>
          ) : null}

          <Card title={t('Timeline', 'টাইমলাইন')}>
            {can.update ? (
              <form className="mb-5 space-y-2" onSubmit={(e) => { e.preventDefault(); if (nt.body.trim()) post('/note', nt, () => setNt({ body: '', internal: true })); }}>
                <Textarea value={nt.body} onChange={(v) => setNt({ ...nt, body: v })} rows={2} placeholder={t('Add a note for the team…', 'দলের জন্য নোট লিখুন…')} error={errors.body} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs"><Switch checked={!nt.internal} onChange={(v) => setNt({ ...nt, internal: !v })} label={t('Visible to traveller', 'ভ্রমণকারী দেখবেন')} />{t('Visible to the traveller in their account', 'ভ্রমণকারী তাঁর অ্যাকাউন্টে দেখবেন')}</label>
                  <button type="submit" className="btn btn-outline btn-sm" disabled={!nt.body.trim() || busy} data-add-note>{t('Add note', 'নোট যোগ')}</button>
                </div>
              </form>
            ) : null}
            <ol className="relative space-y-4 border-l-2 border-ink-100 pl-5 dark:border-ink-800" data-timeline>
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[1.95rem] grid h-6 w-6 place-items-center rounded-full bg-white ring-2 ring-ink-100 dark:bg-ink-900 dark:ring-ink-800"><Icon name={TL_ICON[e.type] ?? 'circle-dot'} size={13} className="text-brand-700" /></span>
                  <p className="text-sm text-ink-800 dark:text-ink-100">{e.body}{e.internal ? <Badge className="ml-2">{t('internal', 'অভ্যন্তরীণ')}</Badge> : null}</p>
                  <p className="text-xs muted">{e.by ?? t('System', 'সিস্টেম')} · {date(e.at, true)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Card title={t('Customer', 'গ্রাহক')}>
            <dl className="divide-y divide-ink-100 dark:divide-ink-800">
              <Row k={t('Name', 'নাম')} v={b.customer?.href ? <Link href={b.customer.href} className="text-brand-700 hover:underline dark:text-brand-300">{c.name ?? b.customer.name}</Link> : c.name ?? b.customer?.name ?? '—'} />
              <Row k={t('Phone', 'ফোন')} v={c.phone ? <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a> : '—'} />
              <Row k={t('Email', 'ইমেইল')} v={c.email ? <a href={`mailto:${c.email}`} className="break-all hover:underline">{c.email}</a> : '—'} />
              {b.customer?.code ? <Row k={t('Member', 'সদস্য')} v={b.customer.code} /> : null}
              {b.agent ? <Row k={t('Agent', 'এজেন্ট')} v={`${b.agent.name} (${b.agent.code})`} /> : null}
              <Row k={t('Channel', 'চ্যানেল')} v={b.channel} />
              <Row k={t('Booked', 'বুক করা')} v={date(b.created_at, true)} />
              {b.travel_end ? <Row k={t('Return', 'ফেরা')} v={date(b.travel_end)} /> : null}
              <Row k={t('Travellers', 'ভ্রমণকারী')} v={num(b.pax_count)} />
              {b.miles_earned ? <Row k={t('Miles', 'মাইলস')} v={num(b.miles_earned)} /> : null}
            </dl>
            {b.notes ? <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-950">{b.notes}</p> : null}
          </Card>
          {can.update ? (
            <Card title={t('Handled by', 'দায়িত্বে')}>
              <Select value={b.owner?.id ?? null} onChange={(v) => post('/assign', { owner_staff_id: v })} options={options.staff} placeholder={t('Unassigned', 'কেউ নেই')} />
            </Card>
          ) : null}
          {can.update && options.notify.length ? (
            <Card title={t('Send to traveller', 'ভ্রমণকারীকে পাঠান')}>
              <div className="flex gap-2">
                <select className="input h-10 py-1 text-sm" value={notifyKey} onChange={(e) => setNotifyKey(e.target.value)} aria-label={t('Message', 'বার্তা')}>{options.notify.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}</select>
                <button type="button" className="btn btn-outline btn-sm h-10" disabled={busy} onClick={() => post('/notify', { key: notifyKey })} data-notify><Icon name="send" size={15} /></button>
              </div>
              <p className="mt-2 text-xs muted">{t('Email + SMS using the notification templates.', 'নোটিফিকেশন টেমপ্লেট দিয়ে ইমেইল + এসএমএস।')}</p>
            </Card>
          ) : null}
        </div>
      </div>

      <Modal open={dlg === 'status'} onClose={() => setDlg(null)} title={t('Change status', 'অবস্থা পরিবর্তন')} size="sm" footer={footer(t('Update', 'হালনাগাদ'), () => post('/status', st), st.status === 'cancelled')}>
        <div className="space-y-4">
          <Select label={t('New status', 'নতুন অবস্থা')} value={st.status} onChange={(v) => setSt({ ...st, status: v })} options={options.transitions} allowEmpty={false} error={errors.status} />
          {st.status === 'cancelled' ? <>
            <Textarea label={t('Reason', 'কারণ')} value={st.reason} onChange={(v) => setSt({ ...st, reason: v })} rows={2} error={errors.reason} required />
            <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-900 dark:bg-ink-900 dark:text-accent-100">{t(`Seats are released. Cancellation fee per policy: ${money(options.cancellation_fee)}. Refund separately from Payments.`, `সিট ছেড়ে দেওয়া হবে। নীতিমালা অনুযায়ী বাতিল ফি: ${money(options.cancellation_fee)}। রিফান্ড আলাদাভাবে পেমেন্ট থেকে দিন।`)}</p>
          </> : null}
          <label className="flex items-center gap-2 text-sm"><Switch checked={st.notify} onChange={(v) => setSt({ ...st, notify: v })} label={t('Notify traveller', 'ভ্রমণকারীকে জানান')} />{t('Notify the traveller', 'ভ্রমণকারীকে জানান')}</label>
        </div>
      </Modal>

      <Modal open={dlg === 'payment'} onClose={() => setDlg(null)} title={t('Record an offline payment', 'অফলাইন পেমেন্ট রেকর্ড')} size="sm" footer={footer(t('Record payment', 'পেমেন্ট রেকর্ড'), () => post('/payment', pay))}>
        <div className="space-y-4">
          <Input type="number" label={t('Amount', 'পরিমাণ')} prefix="৳" value={pay.amount ?? ''} onChange={(v) => setPay({ ...pay, amount: v === '' ? null : Number(v) })} error={errors.amount} help={t(`Balance due ${money(b.balance)}`, `বাকি ${money(b.balance)}`)} required />
          <Select label={t('Method', 'মাধ্যম')} value={pay.method} onChange={(v) => setPay({ ...pay, method: v })} options={options.methods} allowEmpty={false} error={errors.method} />
          <Input label={t('Reference (receipt / txn no.)', 'রেফারেন্স (রসিদ / লেনদেন নং)')} value={pay.reference} onChange={(v) => setPay({ ...pay, reference: v })} error={errors.reference} />
          <Input label={t('Note', 'নোট')} value={pay.note} onChange={(v) => setPay({ ...pay, note: v })} error={errors.note} />
        </div>
      </Modal>

      <Modal open={dlg === 'refund'} onClose={() => setDlg(null)} title={t('Refund', 'রিফান্ড')} size="sm" footer={footer(rf.process_now ? t('Refund now', 'এখনই রিফান্ড') : t('Create refund request', 'রিফান্ড অনুরোধ তৈরি'), () => post('/refund', rf), true)}>
        <div className="space-y-4">
          <Select label={t('From payment', 'যে পেমেন্ট থেকে')} value={rf.payment_id} onChange={(v) => { const p = options.refundable.find((x) => x.id === v); setRf({ ...rf, payment_id: v, amount: p ? Math.min(rf.amount ?? p.max, p.max) : rf.amount }); }} options={options.refundable.map((p) => ({ value: p.id, label: `${p.label} (max ৳${Math.round(p.max).toLocaleString('en-IN')})` }))} allowEmpty={false} error={errors.payment_id} />
          <Input type="number" label={t('Amount', 'পরিমাণ')} prefix="৳" value={rf.amount ?? ''} onChange={(v) => setRf({ ...rf, amount: v === '' ? null : Number(v) })} error={errors.amount} help={t(`Suggested: paid minus the ${money(options.cancellation_fee)} cancellation fee = ${money(options.refund_suggestion)}`, `প্রস্তাবিত: পরিশোধিত থেকে ${money(options.cancellation_fee)} বাতিল ফি বাদে = ${money(options.refund_suggestion)}`)} required />
          <Textarea label={t('Reason', 'কারণ')} value={rf.reason} onChange={(v) => setRf({ ...rf, reason: v })} rows={2} error={errors.reason} required />
          <Select label={t('Refund to', 'রিফান্ড যাবে')} value={rf.to} onChange={(v) => setRf({ ...rf, to: v })} allowEmpty={false} error={errors.to}
            options={[{ value: 'original', label: t('Original payment method', 'মূল পেমেন্ট মাধ্যম') }, ...(b.customer ? [{ value: 'wallet', label: t('Musafir wallet (instant)', 'মুসাফির ওয়ালেট (তাৎক্ষণিক)') }] : [])]} />
          <label className="flex items-center gap-2 text-sm"><Switch checked={rf.process_now} onChange={(v) => setRf({ ...rf, process_now: v })} label={t('Process now', 'এখনই প্রসেস')} />{t('Approve and process immediately', 'এখনই অনুমোদন ও প্রসেস করুন')}</label>
        </div>
      </Modal>
      {modal}
    </>
  );
}
