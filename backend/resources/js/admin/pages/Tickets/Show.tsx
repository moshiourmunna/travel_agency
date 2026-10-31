import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Badge, Card, PageHeader, Spinner, Switch, cx } from '@/components/ui';
import { Select } from '@/fields/basic';
import { useAdminUrl } from '@/lib/http';
import { bytes, useT } from '@/lib/i18n';
import type { Opt, Shared } from '@/lib/types';

type Msg = { id: number; author_type: 'customer' | 'staff' | 'system'; author: string; body: string; internal: boolean; at: string; attachments: { name: string; size: number | null; url: string | null }[] };
type Props = {
  ticket: { id: number; ref: string; subject: string; status: string; priority: string; assignee_id: number | null; booking_id: number | null; customer: { name: string; email?: string; phone?: string; href?: string | null }; booking: { ref: string; title: string; href: string | null } | null; created_at: string; last_activity_at: string | null };
  messages: Msg[]; options: { status: (Opt & { color?: string })[]; priority: (Opt & { color?: string })[]; staff: Opt[]; bookings: Opt[] }; can: { manage: boolean };
};

export default function TicketShow({ ticket: tk, messages, options, can }: Props) {
  const { t, date, ago } = useT();
  const url = useAdminUrl();
  const errors = (usePage().props as unknown as Shared).errors;
  const base = url('/tickets/' + tk.id);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState({ status: tk.status, priority: tk.priority, assignee_id: tk.assignee_id, booking_id: tk.booking_id });
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMeta({ status: tk.status, priority: tk.priority, assignee_id: tk.assignee_id, booking_id: tk.booking_id }), [tk]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages.length]);
  const st = options.status.find((o) => o.value === tk.status);
  const pr = options.priority.find((o) => o.value === tk.priority);
  const send = (status?: string) => router.post(`${base}/reply`, { body, internal: internal ? 1 : 0, ...(status ? { status } : {}), files }, {
    forceFormData: true, preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => { setBody(''); setFiles([]); setInternal(false); },
  });
  const saveMeta = (patch: Partial<typeof meta>) => { const m = { ...meta, ...patch }; setMeta(m); router.post(`${base}/update`, m, { preserveScroll: true }); };

  return (
    <>
      <Head title={tk.ref} />
      <PageHeader title={tk.subject} icon="life-buoy" crumbs={[[t('Support tickets', 'সাপোর্ট টিকিট'), url('/tickets')], [tk.ref]]}
        subtitle={<span className="flex flex-wrap items-center gap-2">{tk.ref}{st ? <Badge color={st.color ?? 'gray'}>{st.label}</Badge> : null}{pr ? <Badge color={pr.color ?? 'gray'}>{pr.label}</Badge> : null}<span>{t('opened', 'খোলা')} {ago(tk.created_at)}</span></span>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div className="space-y-3" data-thread>
            {messages.map((m) => {
              const mine = m.author_type !== 'customer';
              return (
                <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cx('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.internal ? 'border border-dashed border-accent-300 bg-accent-50 text-accent-950 dark:border-accent-700 dark:bg-ink-900 dark:text-accent-100' : mine ? 'bg-brand-700 text-white' : 'border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900')}>
                    <p className={cx('mb-1 text-xs font-semibold', mine && !m.internal ? 'text-brand-100' : 'muted')}>{m.author}{m.internal ? ` · ${t('internal note', 'অভ্যন্তরীণ নোট')}` : ''} · {date(m.at, true)}</p>
                    <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                    {m.attachments.length ? <ul className="mt-2 space-y-1">{m.attachments.map((a, i) => <li key={i}>{a.url ? <a href={a.url} target="_blank" rel="noreferrer" className={cx('inline-flex items-center gap-1 text-xs underline', mine && !m.internal ? 'text-white' : 'text-brand-700 dark:text-brand-300')}><Icon name="paperclip" size={12} />{a.name} {a.size ? `(${bytes(a.size)})` : ''}</a> : a.name}</li>)}</ul> : null}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {can.manage ? (
            <Card>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-3">
                <textarea className={cx('input leading-6', errors.body && 'is-invalid', internal && 'border-accent-300 bg-accent-50/50 dark:bg-ink-900')} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={internal ? t('Internal note — the customer will not see this', 'অভ্যন্তরীণ নোট — গ্রাহক দেখবেন না') : t('Reply to the customer…', 'গ্রাহককে উত্তর দিন…')} aria-label={t('Reply', 'উত্তর')} data-reply
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) send(); }} />
                {errors.body ? <p className="text-xs text-rose-600">{errors.body}</p> : null}
                {errors['files.0'] || errors.files ? <p className="text-xs text-rose-600">{errors['files.0'] || errors.files}</p> : null}
                {files.length ? <ul className="flex flex-wrap gap-2">{files.map((f, i) => <li key={i} className="chip px-2 py-1 text-xs">{f.name}<button type="button" className="ml-1" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={t('Remove', 'সরান')}><Icon name="x" size={12} /></button></li>)}</ul> : null}
                <div className="flex flex-wrap items-center gap-3">
                  <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 5)); e.target.value = ''; }} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Icon name="paperclip" size={15} />{t('Attach', 'সংযুক্ত')}</button>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={internal} onChange={setInternal} label={t('Internal note', 'অভ্যন্তরীণ নোট')} />{t('Internal note', 'অভ্যন্তরীণ নোট')}</label>
                  <span className="flex-1" />
                  {!internal ? <button type="button" className="btn btn-outline btn-sm" disabled={!body.trim() || busy} onClick={() => send('resolved')}>{t('Send & resolve', 'পাঠান ও সমাধান')}</button> : null}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!body.trim() || busy} data-send>{busy ? <Spinner /> : <Icon name="send" size={15} />}{internal ? t('Add note', 'নোট যোগ') : t('Send reply', 'উত্তর পাঠান')}</button>
                </div>
              </form>
            </Card>
          ) : null}
        </div>
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Card title={t('Ticket', 'টিকিট')}>
            <fieldset disabled={!can.manage} className="space-y-4">
              <Select label={t('Status', 'অবস্থা')} value={meta.status} onChange={(v) => saveMeta({ status: v })} options={options.status} allowEmpty={false} />
              <Select label={t('Priority', 'অগ্রাধিকার')} value={meta.priority} onChange={(v) => saveMeta({ priority: v })} options={options.priority} allowEmpty={false} />
              <Select label={t('Assigned to', 'দায়িত্বে')} value={meta.assignee_id} onChange={(v) => saveMeta({ assignee_id: v })} options={options.staff} placeholder={t('Unassigned', 'কেউ নেই')} />
              {options.bookings.length ? <Select label={t('Linked booking', 'সংযুক্ত বুকিং')} value={meta.booking_id} onChange={(v) => saveMeta({ booking_id: v })} options={options.bookings} placeholder={t('None', 'নেই')} /> : null}
            </fieldset>
          </Card>
          <Card title={t('Customer', 'গ্রাহক')}>
            <p className="font-semibold">{tk.customer.href ? <Link href={tk.customer.href} className="text-brand-700 hover:underline dark:text-brand-300">{tk.customer.name}</Link> : tk.customer.name}</p>
            {tk.customer.email ? <p className="text-sm"><a href={`mailto:${tk.customer.email}`} className="break-all hover:underline">{tk.customer.email}</a></p> : null}
            {tk.customer.phone ? <p className="text-sm"><a href={`tel:${tk.customer.phone}`} className="hover:underline">{tk.customer.phone}</a></p> : null}
            {tk.booking ? <p className="mt-3 text-sm">{t('Booking', 'বুকিং')}: {tk.booking.href ? <Link href={tk.booking.href} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">{tk.booking.ref}</Link> : tk.booking.ref}<span className="block text-xs muted">{tk.booking.title}</span></p> : null}
          </Card>
        </div>
      </div>
    </>
  );
}
