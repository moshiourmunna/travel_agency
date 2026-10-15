import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Field, FormGrid } from '@/components/admin/field';
import { PageHeader } from '@/components/admin/page-header';
import { TravellerFields, type TravellerForm } from '@/components/admin/traveller-fields';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/card';
import { Checkbox, Select } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';

type P = TravellerForm & { id: number; mahram_traveller_id: string; passport_verified: boolean };

export default function PilgrimForm({ pilgrim, mahrams, options }: { pilgrim: P; mahrams: Option[]; options: { relations: Option[]; blood: string[] } }) {
  const t = useT();
  const f = useForm<P>({ ...pilgrim });
  const errors = f.errors as Record<string, string>;
  return (
    <>
      <PageHeader title={`${t('Edit pilgrim')} – ${pilgrim.full_name}`} actions={<Button asChild variant="outline" size="sm"><Link href={`/admin/pilgrims/${pilgrim.id}`}><ArrowLeft className="rtl:rotate-180" />{t('Back')}</Link></Button>} />
      <form noValidate onSubmit={(e) => { e.preventDefault(); f.transform((d) => ({ ...d, needs_wheelchair: d.needs_wheelchair ? 1 : 0, passport_verified: d.passport_verified ? 1 : 0 })); f.put(`/admin/pilgrims/${pilgrim.id}`); }}>
        <Panel>
          <TravellerFields value={f.data} onChange={(v) => f.setData((d) => ({ ...d, ...v, id: d.id }))} errors={errors} prefix="" relations={options.relations} blood={options.blood} />
          <FormGrid className="mt-4">
            {f.data.gender === 'female' && <Field label={t('Mahram')} error={errors.mahram_traveller_id}><Select name="mahram_traveller_id" value={f.data.mahram_traveller_id} onChange={(e) => f.setData('mahram_traveller_id', e.target.value)} placeholder="—" options={mahrams} /></Field>}
            <div className="flex items-end"><Checkbox label={t('Passport verified')} name="passport_verified" checked={f.data.passport_verified} onChange={(e) => f.setData('passport_verified', e.target.checked)} /></div>
          </FormGrid>
        </Panel>
        <div className="sticky bottom-0 z-10 mt-5 flex justify-end border-t border-[var(--border)] bg-[var(--bg)]/95 py-3 backdrop-blur">
          <Button type="submit" variant="gold" disabled={f.processing}>{t('Save changes')}</Button>
        </div>
      </form>
    </>
  );
}
