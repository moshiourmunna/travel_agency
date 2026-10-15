import { useForm } from '@inertiajs/react';
import { Field, FormGrid } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';

type Lang = { code: string; native: string; dir: string; enabled: boolean; is_default: boolean };
type Mod = { key: string; label: string; enabled: boolean };
type Lic = { type: string; label: string; number: string; valid_until: string; show: boolean };
type S = Record<string, string>;
const bit = (b: boolean) => (b ? '1' : '0');

export default function Settings({ languages, modules, licences, settings }: { languages: Lang[]; modules: Mod[]; licences: Lic[]; settings: S }) {
  const t = useT();
  const f = useForm({
    languages: Object.fromEntries(languages.map((l) => [l.code, bit(l.enabled)])) as Record<string, string>,
    default_language: languages.find((l) => l.is_default)?.code ?? 'en',
    modules: Object.fromEntries(modules.map((m) => [m.key, bit(m.enabled)])) as Record<string, string>,
    licences: Object.fromEntries(licences.map((l) => [l.type, { number: l.number, valid_until: l.valid_until, show: bit(l.show) }])) as Record<string, { number: string; valid_until: string; show: string }>,
    s: { ...settings } as S,
  });
  const errors = f.errors as Record<string, string>;
  const setS = (k: string, v: string) => f.setData('s', { ...f.data.s, [k]: v });
  const sIn = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} error={errors[`s.${k}`]} required={props.required}><Input name={`s[${k}]`} value={f.data.s[k] ?? ''} onChange={(e) => setS(k, e.target.value)} {...props} /></Field>
  );
  return (
    <>
      <PageHeader title={t('Settings')} sub={t('Changes apply to the website immediately.')} />
      <form noValidate onSubmit={(e) => { e.preventDefault(); f.put('/admin/settings', { preserveScroll: true }); }} className="space-y-5">
        <Panel title={t('Languages')}>
          <ul className="divide-y divide-[var(--border)]">
            {languages.map((l) => {
              const isDef = f.data.default_language === l.code;
              return (
                <li key={l.code} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm"><b>{l.native}</b><span className="text-xs uppercase text-[var(--muted)]">{l.code} · {l.dir}</span>{isDef && <Badge tone="ok">{t('Default')}</Badge>}</span>
                  <span className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="default_language" value={l.code} checked={isDef} onChange={() => f.setData((d) => ({ ...d, default_language: l.code, languages: { ...d.languages, [l.code]: '1' } }))} className="accent-brand-600" />{t('Default')}</label>
                    <Switch aria-label={`${t('Enable')} ${l.native}`} data-testid={`lang-${l.code}`} checked={isDef || f.data.languages[l.code] === '1'} disabled={isDef}
                      onCheckedChange={(c) => f.setData('languages', { ...f.data.languages, [l.code]: bit(c) })} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title={t('Modules')}>
          <ul className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2.5 text-sm">
                <label htmlFor={`mod-${m.key}`}>{t(m.label)}</label>
                <Switch id={`mod-${m.key}`} data-testid={`module-${m.key}`} checked={f.data.modules[m.key] === '1'} onCheckedChange={(c) => f.setData('modules', { ...f.data.modules, [m.key]: bit(c) })} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t('Licences')}>
          <div className="space-y-3">
            {licences.map((l) => {
              const v = f.data.licences[l.type];
              const up = (o: Partial<typeof v>) => f.setData('licences', { ...f.data.licences, [l.type]: { ...v, ...o } });
              return (
                <div key={l.type} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label={`${t(l.label)} – ${t('Number')}`} error={errors[`licences.${l.type}.number`]}><Input name={`licences[${l.type}][number]`} value={v.number} onChange={(e) => up({ number: e.target.value })} /></Field>
                  <Field label={t('Valid until')} error={errors[`licences.${l.type}.valid_until`]}><Input type="date" name={`licences[${l.type}][valid_until]`} value={v.valid_until} onChange={(e) => up({ valid_until: e.target.value })} /></Field>
                  <label className="flex min-h-10 items-center gap-2 text-sm"><Switch aria-label={`${t('Show on website')} – ${t(l.label)}`} checked={v.show === '1'} onCheckedChange={(c) => up({ show: bit(c) })} />{t('Show on website')}</label>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title={t('Contact & business')}>
          <FormGrid>
            {sIn('phone', t('Phone'), { required: true })}{sIn('whatsapp', t('WhatsApp'))}{sIn('email', t('Email'), { type: 'email', required: true })}{sIn('hours', t('Office hours'))}
            {sIn('address_en', `${t('Address')} (English)`, { required: true })}{sIn('address_bn', `${t('Address')} (বাংলা)`)}{sIn('address_ar', `${t('Address')} (العربية)`, { dir: 'rtl' })}
            {sIn('hajj_date', t('Hajj date (countdown)'), { type: 'date', required: true })}
            {sIn('qurbani_price', t('Qurbani price (৳)'), { type: 'number', min: 0, required: true })}{sIn('insurance_price', t('Insurance price (৳)'), { type: 'number', min: 0, required: true })}
            {sIn('early_bird_discount', t('Early-bird discount (৳)'), { type: 'number', min: 0, required: true })}{sIn('hold_hours', t('Booking hold (hours)'), { type: 'number', min: 1, max: 720, required: true })}
            <Field label={t('Bank details')} error={errors['s.bank_details']} className="sm:col-span-2"><Textarea name="s[bank_details]" rows={3} value={f.data.s.bank_details ?? ''} onChange={(e) => setS('bank_details', e.target.value)} /></Field>
          </FormGrid>
        </Panel>
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-[var(--border)] bg-[var(--bg)]/95 py-3 backdrop-blur">
          <Button type="submit" variant="gold" disabled={f.processing}>{t('Save settings')}</Button>
        </div>
      </form>
    </>
  );
}
