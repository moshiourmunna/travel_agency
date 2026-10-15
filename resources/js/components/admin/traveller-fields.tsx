import { Field } from '@/components/admin/field';
import { Checkbox, Input, Select } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';

export type TravellerForm = {
  id?: number | null; full_name: string; gender: string; dob: string; relation: string; phone: string; passport_no: string; passport_issue: string; passport_expiry: string;
  passport_place: string; nid: string; blood_group: string; medical_notes: string; needs_wheelchair: boolean; ticket_no?: string; seat?: string; govt_tracking_no?: string;
};

export const emptyTraveller = (): TravellerForm => ({ id: null, full_name: '', gender: 'male', dob: '', relation: '', phone: '', passport_no: '', passport_issue: '', passport_expiry: '', passport_place: '', nid: '', blood_group: '', medical_notes: '', needs_wheelchair: false });

/** One pilgrim's fields. `prefix` is the error key prefix, e.g. "travellers.0." */
export function TravellerFields({ value, onChange, errors, prefix, relations, blood, withTicket }: { value: TravellerForm; onChange: (v: TravellerForm) => void; errors: Record<string, string>; prefix: string; relations: Option[]; blood: string[]; withTicket?: boolean }) {
  const t = useT();
  const set = (k: keyof TravellerForm, v: string | boolean) => onChange({ ...value, [k]: v });
  const e = (k: string) => errors[prefix + k];
  const inp = (k: keyof TravellerForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = '') => (
    <Field label={label} error={e(k)} className={cls}><Input name={prefix + k} value={String(value[k] ?? '')} onChange={(ev) => set(k, ev.target.value)} {...props} /></Field>
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {inp('full_name', t('Full name (as in passport)'), { required: true, maxLength: 120, className: 'uppercase' }, 'sm:col-span-2')}
      <Field label={t('Gender')} required error={e('gender')}><Select name={prefix + 'gender'} value={value.gender} onChange={(ev) => set('gender', ev.target.value)} options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]} /></Field>
      {inp('dob', t('Date of birth'), { type: 'date' })}
      <Field label={t('Relation')} error={e('relation')}><Select name={prefix + 'relation'} value={value.relation} onChange={(ev) => set('relation', ev.target.value)} placeholder="—" options={relations.map((o) => ({ ...o, label: t(o.label) }))} /></Field>
      {inp('phone', t('Mobile'), { inputMode: 'tel' })}
      {inp('passport_no', t('Passport no.'), { pattern: '[A-Za-z0-9]{6,12}', className: 'uppercase' })}
      {inp('passport_issue', t('Issue date'), { type: 'date' })}
      {inp('passport_expiry', t('Expiry date'), { type: 'date' })}
      {inp('passport_place', t('Place of issue'))}
      {inp('nid', t('NID'), { inputMode: 'numeric' })}
      <Field label={t('Blood group')} error={e('blood_group')}><Select name={prefix + 'blood_group'} value={value.blood_group} onChange={(ev) => set('blood_group', ev.target.value)} placeholder="—" options={blood.map((b) => ({ value: b, label: b }))} /></Field>
      {withTicket && <>{inp('ticket_no', t('Ticket no.'))}{inp('seat', t('Seat'))}{inp('govt_tracking_no', t('Govt. tracking no.'))}</>}
      <div className="flex flex-wrap items-end gap-3 sm:col-span-2 xl:col-span-4">
        <Field label={t('Medical needs / notes')} error={e('medical_notes')} className="min-w-[200px] flex-1"><Input name={prefix + 'medical_notes'} value={value.medical_notes} onChange={(ev) => set('medical_notes', ev.target.value)} /></Field>
        <Checkbox label={`♿ ${t('Wheelchair')}`} checked={!!value.needs_wheelchair} onChange={(ev) => set('needs_wheelchair', ev.target.checked)} name={prefix + 'needs_wheelchair'} />
      </div>
    </div>
  );
}
