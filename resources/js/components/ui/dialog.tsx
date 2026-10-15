import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export const DialogRoot = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Centered dialog on desktop, bottom sheet on phones. */
export function DialogContent({ title, description, children, className }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in" />
      <D.Content
        className={cn('fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--fg)] shadow-xl',
          'sm:inset-auto sm:start-1/2 sm:top-1/2 sm:w-[min(520px,calc(100vw-2rem))] sm:-translate-y-1/2 sm:rounded-2xl ltr:sm:-translate-x-1/2 rtl:sm:translate-x-1/2', className)}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <D.Title className="text-base font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-[var(--muted)]">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10" aria-label={t('Close')}><X className="size-4" /></D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/** Side drawer (mobile navigation). */
export function SheetContent({ children, label, side = 'start' }: { children: React.ReactNode; label: string; side?: 'start' | 'end' }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/45" />
      <D.Content className={cn('fixed inset-y-0 z-50 flex w-[min(300px,86vw)] flex-col overflow-y-auto bg-brand-900 text-white shadow-2xl', side === 'start' ? 'start-0' : 'end-0')}>
        <D.Title className="sr-only">{label}</D.Title>
        <D.Description className="sr-only">{label}</D.Description>
        {children}
      </D.Content>
    </D.Portal>
  );
}
