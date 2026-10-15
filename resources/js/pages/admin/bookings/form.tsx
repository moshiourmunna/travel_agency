import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Plus, Save, Trash2, UserPlus, Users } from 'lucide-react';
import * as React from 'react';
import { Field } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { emptyTraveller, TravellerFields, type TravellerForm } from '@/components/admin/traveller-fields';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn, money } from '@/lib/utils';
import type { Option, SharedProps } from '@/types';

type Pkg = { id: number; title: string; type: string; type_label: string; seats: number | null; departure: string | null; prices: { room_type: string; label: string; price: number; deposit: number }[] };
type Props = {
  packages: Pkg[]; agents: { id: number; code: string; company: string; percent: number }[]; customers: { id: number; name: string; phone: string }[];
  options: { modes: Option[]; methods: Option[]; relations: Option[]; blood: string[] };
  booking: null | { ref: string; customer: string; package_id: string; package: string; room_type: string; children: number; payment_mode: string; payment_method: string; discount: number; agent_id: string; notes: string; admin_note: string; wheelchair: boolean; hold_expires_at: string; travellers: TravellerForm[] };
  prefill: null | { customer_id: string; package_id: string; prereg: { id: number; ref: string } | null; travellers: TravellerForm[] };
};

export default function BookingForm({ packages, agents, customers, options, booking, prefill }: Props) {
  const t = useT();
  const { modules } = usePage<SharedProps>().props;
  const edit = !!booking;
  const [removed, setRemoved] = React.useState<number[]>([]);
  const form = useForm({
    customer_mode: 'existing', customer_id: prefill?.customer_id ?? '', new_name: '', new_phone: '', new_email: '', new_district: '', new_address: '',
    package_id: booking?.package_id ?? prefill?.package_id ?? '', room_type: booking?.room_type ?? '', children: String(booking?.children ?? 0), addons: [] as string[],
    travellers: (booking?.travellers ?? prefill?.travellers ?? [emptyTraveller()]) as TravellerForm[], new_travellers: [] as TravellerForm[],
    payment_mode: booking?.payment_mode ?? 'full', payment_method: booking?.payment_method ?? 'cash', discount: String(booking?.discount ?? 0), agent_id: booking?.agent_id ?? '',
    hold_expires_at: booking?.hold_expires_at ?? '', initial_payment: '', initial_txn: '', notes: booking?.notes ?? '', admin_note: booking?.admin_note ?? '', wheelchair: booking?.wheelchair ?? false,
    prereg_id: prefill?.prereg?.id ? String(prefill.prereg.id) : '',
  });
  const d = form.data;
  const pkg = packages.find((p) => String(p.id) === String(d.package_id));
  React.useEffect(() => {
    if (pkg && !pkg.prices.some((p) => p.room_type === d.room_type)) form.setData('room_type', pkg.prices[0]?.room_type ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.package_id]);
  const price = pkg?.prices.find((p) => p.room_type === d.room_type);
  const count = edit ? d.travellers.filter((x) => !removed.includes(Number(x.id))).length + d.new_travellers.length : d.travellers.length;
  const estimate = price ? Math.max(0, price.price * count - (Number(d.discount) || 0)) : null;

  const listKey = edit ? 'new_travellers' : 'travellers';
  const addPilgrim = () => form.setData(listKey, [...d[listKey], emptyTraveller()]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    form.transform((x) => ({ ...x, remove: removed, wheelchair: x.wheelchair ? 1 : 0, travellers: x.travellers.map((tr) => ({ ...tr, needs_wheelchair: tr.needs_wheelchair ? 1 : 0 })), new_travellers: x.new_travellers.map((tr) => ({ ...tr, needs_wheelchair: tr.needs_wheelchair ? 1 : 0 })) }));
    if (edit) form.put(`/admin/bookings/${booking!.ref}`, { preserveScroll: true });
    else form.post('/admin/bookings', { preserveScroll: true });
  };
  const err = form.errors as Record<string, string>;
  const step = (n: number) => (edit ? n - 1 : n);
  const title = edit ? t('Edit booking :ref', { ref: booking!.ref }) : t('New booking');

  return (
    <>
      <PageHeader title={title} sub={edit ? `${booking!.customer} · ${booking!.package}` : t('Walk-in, phone or converted pre-registration')}
        actions={<Button asChild variant="outline" size="sm"><Link href={edit ? `/admin/bookings/${booking!.ref}` : '/admin/bookings'}><ArrowLeft className="rtl:rotate-180" />{t('Back')}</Link></Button>} />
      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-3" noValidate>
        <div className="space-y-5 xl:col-span-2 min-w-0">
          {!edit && (
            <Panel title={`1 · ${t('Customer')}`}>
              {prefill?.prereg && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{t('Converting pre-registration :ref', { ref: prefill.prereg.ref })}</p>}
              <div role="radiogroup" aria-label={t('Customer')} className="mb-3 inline-flex rounded-lg border border-[var(--border)] p-0.5">
                {[['existing', t('Existing customer'), Users], ['new', t('New customer'), UserPlus]].map(([k, l, Icon]) => {
                  const I = Icon as typeof Users;
                  return (
                    <button key={k as string} type="button" role="radio" aria-checked={d.customer_mode === k} onClick={() => form.setData('customer_mode', k as string)}
                      className={cn('inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm', d.customer_mode === k ? 'bg-brand-600 text-white' : 'text-[var(--muted)]')}><I className="size-4" />{l as string}</button>
                  );
                })}
              </div>
              {d.customer_mode === 'existing' ? (
                <Field label={t('Customer')} required error={err.customer_id}>
                  <Select name="customer_id" value={d.customer_id} onChange={(e) => form.setData('customer_id', e.target.value)} placeholder={t('Select customer…')} options={customers.map((c) => ({ value: String(c.id), label: `${c.name} · ${c.phone}` }))} />
                </Field>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('Name')} required error={err.new_name}><Input name="new_name" value={d.new_name} onChange={(e) => form.setData('new_name', e.target.value)} /></Field>
                  <Field label={t('Mobile')} required error={err.new_phone}><Input name="new_phone" value={d.new_phone} onChange={(e) => form.setData('new_phone', e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" /></Field>
                  <Field label={t('Email')} error={err.new_email}><Input type="email" name="new_email" value={d.new_email} onChange={(e) => form.setData('new_email', e.target.value)} /></Field>
                  <Field label={t('District')} error={err.new_district}><Input name="new_district" value={d.new_district} onChange={(e) => form.setData('new_district', e.target.value)} /></Field>
                  <Field label={t('Address')} error={err.new_address} className="sm:col-span-2"><Input name="new_address" value={d.new_address} onChange={(e) => form.setData('new_address', e.target.value)} /></Field>
                </div>
              )}
            </Panel>
          )}
          <Panel title={`${step(2)} · ${t('Package & room')}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('Package')} required error={err.package_id} className="sm:col-span-2">
                {edit ? <Input value={booking!.package} disabled /> : (
                  <Select name="package_id" value={d.package_id} onChange={(e) => form.setData('package_id', e.target.value)} placeholder={t('Select package…')}
                    options={packages.map((p) => ({ value: String(p.id), label: `${p.title} (${t(p.type_label)})` }))} />
                )}
              </Field>
              <Field label={t('Room type / sharing')} required error={err.room_type}>
                <Select name="room_type" value={d.room_type} onChange={(e) => form.setData('room_type', e.target.value)} options={(pkg?.prices ?? []).map((p) => ({ value: p.room_type, label: `${t(p.label)} – ${money(p.price)}` }))} placeholder={pkg ? undefined : '—'} />
              </Field>
              <Field label={t('Children (of the pilgrims)')} error={err.children}><Input type="number" min={0} name="children" value={d.children} onChange={(e) => form.setData('children', e.target.value)} /></Field>
              {pkg && <p className="text-xs text-[var(--muted)] sm:col-span-2">{t(pkg.type_label)}{pkg.departure && ` · ✈ ${pkg.departure}`}{pkg.seats !== null && ` · ${t(':n seats left', { n: pkg.seats })}`}{price && ` · ${t('Deposit')} ${money(price.deposit)}`}</p>}
              {!edit && (
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                  {[['qurbani', t('Qurbani')], ['insurance', t('Travel insurance')]].map(([k, l]) => (
                    <Checkbox key={k} label={l} name="addons[]" checked={d.addons.includes(k)} onChange={(e) => form.setData('addons', e.target.checked ? [...d.addons, k] : d.addons.filter((a) => a !== k))} />
                  ))}
                </div>
              )}
            </div>
          </Panel>
          <Panel title={`${step(3)} · ${t('Pilgrims')} (${count})`} actions={<Button type="button" variant="outline" size="sm" onClick={addPilgrim}><Plus />{t('Add pilgrim')}</Button>}>
            {err.travellers && <p role="alert" className="mb-2 text-sm text-red-600">{err.travellers}</p>}
            {err.remove && <p role="alert" className="mb-2 text-sm text-red-600">{err.remove}</p>}
            <div className="space-y-4">
              {d.travellers.map((tr, i) => {
                const isRemoved = edit && removed.includes(Number(tr.id));
                return (
                  <fieldset key={tr.id ?? `n${i}`} className={cn('rounded-xl border border-[var(--border)] p-3 sm:p-4', isRemoved && 'opacity-50')} data-testid="pilgrim-row">
                    <legend className="px-1 text-sm font-semibold">{t('Pilgrim')} {i + 1}</legend>
                    <div className="mb-2 flex justify-end">
                      {edit ? <Checkbox className="text-red-700 dark:text-red-400" label={t('Remove')} checked={isRemoved} onChange={(e) => setRemoved(e.target.checked ? [...removed, Number(tr.id)] : removed.filter((x) => x !== Number(tr.id)))} />
                        : d.travellers.length > 1 && <Button type="button" variant="ghost" size="xs" onClick={() => form.setData('travellers', d.travellers.filter((_, j) => j !== i))} aria-label={`${t('Remove')} ${t('Pilgrim')} ${i + 1}`}><Trash2 />{t('Remove')}</Button>}
                    </div>
                    <TravellerFields value={tr} prefix={`travellers.${i}.`} errors={err} relations={options.relations} blood={options.blood} withTicket={edit}
                      onChange={(v) => form.setData('travellers', d.travellers.map((x, j) => (j === i ? v : x)))} />
                  </fieldset>
                );
              })}
              {d.new_travellers.map((tr, i) => (
                <fieldset key={`new${i}`} className="rounded-xl border border-dashed border-brand-500 p-3 sm:p-4" data-testid="pilgrim-row">
                  <legend className="px-1 text-sm font-semibold">{t('New pilgrim')}</legend>
                  <div className="mb-2 flex justify-end"><Button type="button" variant="ghost" size="xs" onClick={() => form.setData('new_travellers', d.new_travellers.filter((_, j) => j !== i))}><Trash2 />{t('Remove')}</Button></div>
                  <TravellerFields value={tr} prefix={`new_travellers.${i}.`} errors={err} relations={options.relations} blood={options.blood}
                    onChange={(v) => form.setData('new_travellers', d.new_travellers.map((x, j) => (j === i ? v : x)))} />
                </fieldset>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">{t('Passport must be valid at least 6 months after return. Women under 45 need a mahram link (set on the pilgrim page).')}</p>
          </Panel>
        </div>
        <div className="min-w-0">
          <Panel title={`${step(4)} · ${t('Payment & assignment')}`} className="xl:sticky xl:top-20">
            <div className="space-y-3">
              <Field label={t('Payment plan')} required error={err.payment_mode}><Select name="payment_mode" value={d.payment_mode} onChange={(e) => form.setData('payment_mode', e.target.value)} options={options.modes.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
              <Field label={t('Payment method')} error={err.payment_method}><Select name="payment_method" value={d.payment_method} onChange={(e) => form.setData('payment_method', e.target.value)} placeholder="—" options={options.methods.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
              <Field label={t('Extra discount (৳)')} error={err.discount}><Input type="number" min={0} name="discount" value={d.discount} onChange={(e) => form.setData('discount', e.target.value)} /></Field>
              {modules.agents && (
                <Field label={t('Agent')} error={err.agent_id}><Select name="agent_id" value={d.agent_id} onChange={(e) => form.setData('agent_id', e.target.value)} placeholder={t('Direct (no agent)')} options={agents.map((a) => ({ value: String(a.id), label: `${a.code} · ${a.company} (${a.percent}%)` }))} /></Field>
              )}
              {edit && d.payment_mode === 'pay_later' && <Field label={t('Hold expires')} error={err.hold_expires_at}><Input type="datetime-local" name="hold_expires_at" value={d.hold_expires_at} onChange={(e) => form.setData('hold_expires_at', e.target.value)} /></Field>}
              {!edit && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('Received now (৳)')} error={err.initial_payment}><Input type="number" min={0} name="initial_payment" value={d.initial_payment} onChange={(e) => form.setData('initial_payment', e.target.value)} /></Field>
                  <Field label={t('TrxID / receipt')} error={err.initial_txn}><Input name="initial_txn" value={d.initial_txn} onChange={(e) => form.setData('initial_txn', e.target.value)} /></Field>
                </div>
              )}
              <Field label={t('Customer notes')} error={err.notes}><Textarea name="notes" rows={2} value={d.notes} onChange={(e) => form.setData('notes', e.target.value)} /></Field>
              {edit && <Field label={t('Internal note')} error={err.admin_note}><Textarea name="admin_note" rows={2} value={d.admin_note} onChange={(e) => form.setData('admin_note', e.target.value)} /></Field>}
              <Checkbox label={`♿ ${t('Wheelchair assistance for group')}`} name="wheelchair" checked={d.wheelchair} onChange={(e) => form.setData('wheelchair', e.target.checked)} />
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-900"><span className="text-sm">{t('Estimate')}</span><b className="tabular-nums" data-testid="estimate">{estimate === null ? '—' : money(estimate)}</b></div>
              <p className="text-xs text-[var(--muted)]">{t('Final price is calculated by the server (early-bird and add-ons included).')}</p>
              <Button type="submit" variant="gold" className="w-full" disabled={form.processing}><Save />{edit ? t('Save changes') : t('Create booking')}</Button>
            </div>
          </Panel>
        </div>
      </form>
    </>
  );
}
