import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogRoot, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';

/** Destructive confirm (focus-trapped dialog). Server still requires confirm=accepted. */
export function ConfirmDelete({ action, label, message, reason = false, trigger }: { action: string; label?: string; message?: string; reason?: boolean; trigger?: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const form = useForm({ confirm: false as boolean, reason: '' });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    form.transform((d) => ({ ...d, confirm: d.confirm ? '1' : '' }));
    form.delete(action, { preserveScroll: true, onSuccess: () => setOpen(false) });
  };
  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline-destructive" size="sm" data-testid="delete-trigger"><Trash2 />{label ?? t('Delete')}</Button>}</DialogTrigger>
      <DialogContent title={label ?? t('Delete')} description={message ?? t('This moves the record to trash. It can be restored later.')}>
        <form onSubmit={submit} className="space-y-3">
          {reason && <Input name="reason" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} placeholder={t('Reason (optional)')} aria-label={t('Reason (optional)')} />}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" className="size-4 accent-red-600" checked={form.data.confirm} onChange={(e) => form.setData('confirm', e.target.checked)} required />
            {t('Yes, I understand')}
          </label>
          {form.errors.confirm && <p role="alert" className="text-xs text-red-600">{form.errors.confirm}</p>}
          <Button type="submit" variant="destructive" className="w-full" disabled={!form.data.confirm || form.processing}>{t('Confirm delete')}</Button>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

/** Generic modal form wrapper (refund, reject, visa update…). */
export function ActionDialog({ trigger, title, description, children, open, onOpenChange }: { trigger: React.ReactNode; title: string; description?: string; children: React.ReactNode; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>{children}</DialogContent>
    </DialogRoot>
  );
}
