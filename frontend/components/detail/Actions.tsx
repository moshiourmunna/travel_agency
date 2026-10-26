'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/client/store';

export function ShareButton({ label, copied, className, children }: { label: string; copied: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} aria-label={label} onClick={async () => {
      const url = location.href.split('#')[0];
      try {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ url, title: document.title });
        else { await navigator.clipboard.writeText(url); toast(copied); }
      } catch {}
    }}>{children}</button>
  );
}

export function PrintButton({ label, className, children }: { label: string; className: string; children: React.ReactNode }) {
  return <button type="button" className={className} aria-label={label} onClick={() => window.print()}>{children}</button>;
}

/** Toggles every <details> inside the closest section. */
export function ExpandAll({ label, collapse, target }: { label: string; collapse: string; target: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className="text-sm font-semibold text-brand-700 dark:text-brand-300" aria-controls={target} onClick={() => {
      const next = !open;
      document.querySelectorAll<HTMLDetailsElement>(`#${target} details`).forEach((d) => { d.open = next; });
      setOpen(next);
    }}>{open ? collapse : label}</button>
  );
}

/** Bottom sheet (mobile) with its own trigger button. */
export function Sheet({ trigger, triggerClass, title, closeLabel, closeIcon, children }: { trigger: React.ReactNode; triggerClass: string; title: string; closeLabel: string; closeIcon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('select,input,button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => { document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <>
      <button type="button" className={triggerClass} aria-expanded={open} onClick={() => setOpen(true)}>{trigger}</button>
      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <div ref={panel} className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-4 dark:bg-ink-900">
            <div className="mb-2 flex justify-end"><button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={closeLabel}>{closeIcon}</button></div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Copy a value (e.g. a booking reference) to the clipboard with a toast. */
export function CopyButton({ value, label, copied, className, children }: { value: string; label: string; copied: string; className: string; children: React.ReactNode }) {
  return <button type="button" className={className} aria-label={label} onClick={async () => { try { await navigator.clipboard.writeText(value); toast(copied); } catch { /* clipboard blocked */ } }}>{children}</button>;
}
