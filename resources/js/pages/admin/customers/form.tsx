import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Field, FormGrid } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';

type C = { id: number; name: string; phone: string; email: string; locale: string; status: string; gender: string; dob: string; nid_hint: string; district: string; address: string; emergency_contact: string; agent_id: string };

export default function CustomerForm({ customer, agents }: { customer: C | null; agents: Option[] }) {
  const t = useT();
  const f = useForm({
    name: customer?.name ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', password: '', locale: customer?.locale ?? 'bn', status: customer?.status ?? 'active',
    gender: customer?.gender ?? '', dob: customer?.dob ?? '', nid: '', district: customer?.district ?? '', address: customer?.address ?? '', emergency_contact: customer?.emergency_contact ?? '', agent_id: customer?.agent_id ?? '',
  });
  const inp = (k: keyof typeof f.data, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, cls?: string) => (
    <Field label={label} error={f.errors[k]} required={props.required} className={cls}><Input name={k} value={f.data[k]} onChange={(e) => f.setData(k, e.target.value)} {...props} /></Field>
  );
  const submit = (e: React.FormEvent) => { e.preventDefault(); customer ? f.put(`/admin/customers/${customer.id}`) : f.post('/admin/customers'); };
  return (
    <>
      <PageHeader title={customer ? `${t('Edit customer')} – ${customer.name}` : t('New customer')}
        actions={<Button asChild variant="outline" size="sm"><Link href={customer ? `/admin/customers/${customer.id}` : '/admin/customers'}><ArrowLeft className="rtl:rotate-180" />{t('Back')}</Link></Button>} />
      <form onSubmit={submit} noValidate>
        <Panel title={t('Account')}>
          <FormGrid>
            {inp('name', t('Full name'), { required: true, maxLength: 120 })}
            {inp('phone', t('Mobile'), { required: true, inputMode: 'tel', placeholder: '01XXXXXXXXX' })}
            {inp('email', t('Email'), { type: 'email' })}
            {inp('password', customer ? t('New password (leave blank to keep)') : t('Password (optional)'), { type: 'password', autoComplete: 'new-password' })}
            <Field label={t('Language')} error={f.errors.locale}><Select name="locale" value={f.data.locale} onChange={(e) => f.setData('locale', e.target.value)} options={[{ value: 'bn', label: 'বাংলা' }, { value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} /></Field>
            <Field label={t('Status')} error={f.errors.status}><Select name="status" value={f.data.status} onChange={(e) => f.setData('status', e.target.value)} options={[{ value: 'active', label: t('Active') }, { value: 'blocked', label: t('Blocked') }]} /></Field>
          </FormGrid>
        </Panel>
        <Panel title={t('Profile')} className="mt-5">
          <FormGrid>
            <Field label={t('Gender')} error={f.errors.gender}><Select name="gender" value={f.data.gender} onChange={(e) => f.setData('gender', e.target.value)} placeholder="—" options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]} /></Field>
            {inp('dob', t('Date of birth'), { type: 'date' })}
            {inp('nid', customer?.nid_hint ? `${t('NID')} (${customer.nid_hint})` : t('NID'), { inputMode: 'numeric' })}
            {inp('district', t('District'))}
            {inp('address', t('Address'), {}, 'sm:col-span-2')}
            {inp('emergency_contact', t('Emergency contact'))}
            {agents.length > 0 && <Field label={t('Agent')} error={f.errors.agent_id}><Select name="agent_id" value={f.data.agent_id} onChange={(e) => f.setData('agent_id', e.target.value)} placeholder={t('Direct (no agent)')} options={agents} /></Field>}
          </FormGrid>
        </Panel>
        <div className="sticky bottom-0 z-10 mt-5 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg)]/95 py-3 backdrop-blur">
          <Button type="submit" variant="gold" disabled={f.processing}>{customer ? t('Save changes') : t('Create customer')}</Button>
        </div>
      </form>
    </>
  );
}
