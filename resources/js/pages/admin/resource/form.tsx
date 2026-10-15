import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import * as React from 'react';
import { Field } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

type FieldDef = { name: string; key: string; type: string; label: string; required: boolean; options: Option[] | null; preview: string | null };
type Val = string | boolean | null | File | Record<string, string>;
const TR = ['tr', 'trtext', 'trlines'];

export default function ResourceForm({ resource, label, id, fields, values, languages }: { resource: string; label: string; id: number | null; fields: FieldDef[]; values: Record<string, Val>; languages: { code: string; native: string; dir: string }[] }) {
  const t = useT();
  const init = React.useMemo(() => {
    const v: Record<string, Val> = {};
    fields.forEach((f) => { v[f.key] = TR.includes(f.type) ? { ...Object.fromEntries(languages.map((l) => [l.code, ''])), ...((values[f.key] as Record<string, string>) ?? {}) } : values[f.key] ?? ''; });
    return v;
  }, [fields, values, languages]);
  const form = useForm<Record<string, Val>>(init);
  const errors = form.errors as Record<string, string>;
  const base = `/admin/manage/${resource}`;
  const hasFile = fields.some((f) => f.type === 'image');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      form.transform((d) => ({ ...d, _method: 'put' }));
      form.post(`${base}/${id}`, { forceFormData: hasFile });
    } else form.post(base, { forceFormData: hasFile });
  };
  const set = (k: string, v: Val) => form.setData(k, v);
  const one = (f: FieldDef) => {
    const v = form.data[f.key];
    const common = { name: f.key, id: `f-${f.key}`, required: f.required };
    switch (f.type) {
      case 'textarea': case 'lines':
        return <Textarea {...common} rows={f.type === 'lines' ? 4 : 5} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />;
      case 'select':
        return <Select {...common} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} options={(f.options ?? []).map((o) => ({ ...o, label: t(o.label) }))} />;
      case 'number':
        return <Input {...common} type="number" step="any" value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />;
      case 'date': case 'datetime':
        return <Input {...common} type={f.type === 'date' ? 'date' : 'datetime-local'} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />;
      case 'password':
        return <Input {...common} type="password" autoComplete="new-password" required={false} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />;
      case 'image':
        return <Input {...common} required={f.required && !id} type="file" accept="image/*" onChange={(e) => set(f.key, e.target.files?.[0] ?? null)} />;
      default:
        return <Input {...common} type={f.key === 'email' ? 'email' : 'text'} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />;
    }
  };
  return (
    <>
      <PageHeader title={`${id ? t('Edit') : t('Add new')} – ${t(label)}`} actions={<Button asChild variant="outline" size="sm"><Link href={base}><ArrowLeft className="rtl:rotate-180" />{t('Back')}</Link></Button>} />
      <form onSubmit={submit} noValidate>
        <Panel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map((f) => {
              if (f.type === 'checkbox') return <div key={f.key} className="flex items-end"><Checkbox name={f.key} label={t(f.label)} checked={!!form.data[f.key]} onChange={(e) => set(f.key, e.target.checked)} /></div>;
              if (TR.includes(f.type)) {
                const tv = (form.data[f.key] as Record<string, string>) ?? {};
                return (
                  <fieldset key={f.key} className="rounded-lg border border-[var(--border)] p-3 md:col-span-2">
                    <legend className="px-1 text-sm font-medium">{t(f.label)}{f.required && <span className="text-red-600"> *</span>}</legend>
                    <div className={cn('grid gap-3', f.type === 'tr' ? 'sm:grid-cols-2 xl:grid-cols-3' : '')}>
                      {languages.map((l) => {
                        const ek = `${f.key}.${l.code}`;
                        const p = { name: `${f.key}[${l.code}]`, dir: l.dir, lang: l.code, value: tv[l.code] ?? '', 'aria-label': `${t(f.label)} (${l.native})` };
                        return (
                          <Field key={l.code} label={<span className="text-xs">{l.native}</span>} error={errors[ek] ?? (l.code === 'en' ? errors[f.key] : undefined)} required={f.required && l.code === 'en'}>
                            {f.type === 'tr' ? <Input {...p} onChange={(e) => set(f.key, { ...tv, [l.code]: e.target.value })} />
                              : <Textarea {...p} rows={f.type === 'trlines' ? 4 : 6} onChange={(e) => set(f.key, { ...tv, [l.code]: e.target.value })} />}
                          </Field>
                        );
                      })}
                    </div>
                    {f.type === 'trlines' && <p className="mt-1 text-xs text-[var(--muted)]">{t('One item per line.')}</p>}
                  </fieldset>
                );
              }
              return (
                <Field key={f.key} label={t(f.label)} error={errors[f.key]} required={f.required} className={cn((f.type === 'textarea' || f.type === 'lines') && 'md:col-span-2')}
                  hint={f.type === 'lines' ? t('One item per line.') : f.preview ? <img src={f.preview} alt="" className="mt-1 h-16 rounded border border-[var(--border)] object-cover" /> : undefined}>
                  {one(f)}
                </Field>
              );
            })}
          </div>
        </Panel>
        <div className="sticky bottom-0 z-10 mt-5 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg)]/95 py-3 backdrop-blur">
          <Button asChild variant="outline"><Link href={base}>{t('Cancel')}</Link></Button>
          <Button type="submit" variant="gold" disabled={form.processing}>{t('Save')}</Button>
        </div>
      </form>
    </>
  );
}
