import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { FormCtx } from '@/fields/ctx';
import { FieldInput, spanClass } from '@/fields/Field';
import { useT } from '@/lib/i18n';
import type { ActionDef } from '@/lib/types';
import { Icon } from './Icon';
import { Modal, Spinner, cx, useConfirm } from './ui';

/** Runs a resource action: confirm-only, or a small form in a modal. */
export function useRunAction() {
  const confirm = useConfirm();
  const { t } = useT();
  const [state, setState] = useState<{ a: ActionDef; url: string; ids?: number[] } | null>(null);
  const run = async (a: ActionDef, url: string, ids?: number[]) => {
    if (a.fields?.length) { setState({ a, url, ids }); return; }
    if (a.confirm && !(await confirm({ title: a.label, body: a.confirm, danger: a.tone === 'danger', confirm: a.label }))) return;
    router.post(url, ids ? { ids } : {}, { preserveScroll: true });
  };
  const modal = state ? <ActionForm key={state.a.key + state.url} a={state.a} url={state.url} ids={state.ids} onClose={() => setState(null)} t={t} /> : null;
  return { run, modal };
}

function ActionForm({ a, url, ids, onClose, t }: { a: ActionDef; url: string; ids?: number[]; onClose: () => void; t: (en: string, bn?: string) => string }) {
  const [data, setData] = useState<Record<string, any>>(() => structuredClone(a.blank ?? {}));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => { if (!open) onClose(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    setBusy(true);
    router.post(url, { ...data, ...(ids ? { ids } : {}) }, {
      preserveScroll: true,
      onError: (e) => setErrors(e as Record<string, string>),
      onSuccess: (page) => { if (!Object.keys((page.props as any).errors ?? {}).length) setOpen(false); },
      onFinish: () => setBusy(false),
    });
  };
  const general = errors.action || errors.ids;
  return (
    <Modal open onClose={() => setOpen(false)} title={a.label} size={a.fields!.some((f) => ['trhtml', 'repeater', 'gallery'].includes(f.type)) ? 'lg' : 'md'}
      footer={<>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>{t('Cancel', 'বাতিল')}</button>
        <button type="button" className={cx('btn btn-sm', a.tone === 'danger' ? 'btn-danger' : 'btn-primary')} onClick={submit} disabled={busy} data-action-submit>{busy ? <Spinner /> : a.icon ? <Icon name={a.icon} size={16} /> : null}{a.label}</button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {a.confirm ? <p className="mb-4 text-sm muted">{a.confirm}</p> : null}
        {ids ? <p className="mb-4 text-sm muted">{t(`Applies to ${ids.length} selected.`, `${ids.length}টি বাছাইকৃতে প্রযোজ্য।`)}</p> : null}
        {general ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">{general}</p> : null}
        <FormCtx.Provider value={{ errors, creating: true, data }}>
          <div className="field-grid">
            {a.fields!.map((f) => <div key={f.name} className={spanClass(f.span)}><FieldInput f={f} value={data[f.name]} onChange={(v) => setData((d) => ({ ...d, [f.name]: v }))} path={f.name} /></div>)}
          </div>
        </FormCtx.Provider>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
