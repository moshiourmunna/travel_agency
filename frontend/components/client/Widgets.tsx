'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './SiteContext';
import { KEYS, toast, useStored, useToasts, write } from './store';

export function Toaster() {
  const list = useToasts();
  return (
    <div id="toasts" className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="true">
      {list.map((t) => (
        <div key={t.id} role="status" className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift animate-fadeUp ${t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'}`}>{t.msg}</div>
      ))}
    </div>
  );
}

type BarItem = { key: string; href: string; label: string; icon: React.ReactNode; feature?: boolean };
export function MobileBar({ label, items }: { label: string; items: BarItem[] }) {
  const p = usePathname() || '';
  const isOn = (h: string) => (h.split('/').length <= 2 ? p === h : p === h || p.startsWith(h + '/'));
  return (
    <nav id="mbar" className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/95 lg:hidden" aria-label={label}>
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 text-[11px] font-semibold">
        {items.map((it) =>
          it.feature ? (
            <Link key={it.key} href={it.href} className="relative -mt-5 flex flex-col items-center justify-end gap-1 pb-2 text-ink-600 dark:text-ink-300" aria-current={isOn(it.href) ? 'page' : undefined}><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-ink-950 shadow-lift ring-4 ring-white dark:ring-ink-950">{it.icon}</span>{it.label}</Link>
          ) : (
            <Link key={it.key} href={it.href} className={`flex flex-col items-center justify-center gap-1 ${isOn(it.href) ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-300'}`} aria-current={isOn(it.href) ? 'page' : undefined}>{it.icon}{it.label}</Link>
          ),
        )}
      </div>
    </nav>
  );
}

export function Chat({ s, waNumber, tel, icons }: {
  s: Record<'title' | 'online' | 'close' | 'hello' | 'message' | 'placeholder' | 'send' | 'call' | 'open' | 'dialog', string> & { quick: string[] };
  waNumber: string; tel: string; icons: { close: React.ReactNode; send: React.ReactNode; wa: React.ReactNode; phone: React.ReactNode; fab: React.ReactNode };
}) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<{ me: boolean; text: string }[]>([]);
  const { msg } = useSite();
  const input = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e6 }); }, [log]);
  // any `[data-open-chat]` link on the page (help centre, contact) opens the panel
  useEffect(() => {
    const on = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('[data-open-chat]')) { e.preventDefault(); setOpen(true); } };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, []);
  const send = (text: string) => {
    if (!text.trim()) return;
    setLog((l) => [...l, { me: true, text }]);
    setTimeout(() => setLog((l) => [...l, { me: false, text: msg.reply }]), 700);
  };
  return (
    <div id="chat" className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      <div id="chat-panel" hidden={!open} className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900" role="dialog" aria-label={s.dialog} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-800 to-brand-600 p-4 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon.svg" alt="" className="h-10 w-10 rounded-xl ring-2 ring-white/30" width={40} height={40} />
          <div className="flex-1"><p className="font-bold leading-tight">{s.title}</p><p className="flex items-center gap-1.5 text-xs text-brand-100"><span className="h-2 w-2 animate-pulseDot rounded-full bg-emerald-300" />{s.online}</p></div>
          <button type="button" className="icon-btn h-8 w-8 text-white hover:bg-white/10 hover:text-white dark:text-white" aria-label={s.close} onClick={() => setOpen(false)}>{icons.close}</button>
        </div>
        <div id="chat-log" ref={logRef} className="max-h-72 space-y-3 overflow-y-auto bg-ink-50 p-4 text-sm dark:bg-ink-950" aria-live="polite">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm dark:bg-ink-800 dark:text-ink-100">{s.hello}</div>
          {log.length === 0 ? (
            <div className="flex flex-wrap gap-2" id="chat-quick">{s.quick.map((q) => <button key={q} type="button" className="chip text-xs" onClick={() => send(q)}>{q}</button>)}</div>
          ) : null}
          {log.map((m, k) => (
            <div key={k} className={m.me ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-700 p-3 text-white' : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm dark:bg-ink-800 dark:text-ink-100'}>{m.text}</div>
          ))}
        </div>
        <form id="chat-form" className="flex items-center gap-2 border-t border-ink-100 p-3 dark:border-ink-800" onSubmit={(e) => { e.preventDefault(); send(input.current!.value); input.current!.value = ''; }}>
          <label htmlFor="chat-input" className="sr-only">{s.message}</label>
          <input ref={input} id="chat-input" className="input py-2" placeholder={s.placeholder} autoComplete="off" maxLength={500} />
          <button className="btn btn-primary h-10 w-10 shrink-0 p-0" aria-label={s.send}>{icons.send}</button>
        </form>
        <div className="grid grid-cols-2 gap-2 border-t border-ink-100 p-3 text-xs dark:border-ink-800">
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener" className="btn btn-sm bg-[#1FAF38] text-white hover:bg-[#1a9a31]">{icons.wa} WhatsApp</a>
          <a href={`tel:${tel}`} className="btn btn-outline btn-sm">{icons.phone} {s.call}</a>
        </div>
      </div>
      <button id="chat-fab" type="button" className="group relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-white shadow-lift transition hover:scale-105 hover:bg-brand-800" aria-expanded={open} aria-controls="chat-panel" aria-label={s.open} onClick={() => setOpen((o) => !o)}>
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-accent-500 dark:border-ink-950" />{icons.fab}
      </button>
    </div>
  );
}

type Consent = { analytics: boolean; marketing: boolean; at: number } | null;
const OPEN_EVT = 'musafir:cookie-settings';

export function CookieSettingsButton({ label }: { label: string }) {
  return <button type="button" className="hover:text-white" data-cookie-settings onClick={() => window.dispatchEvent(new Event(OPEN_EVT))}>{label}</button>;
}

export function CookieBanner({ s, privacyHref, icon }: { s: Record<'region' | 'text' | 'privacy' | 'custom' | 'reject' | 'accept' | 'essential' | 'analytics' | 'marketing' | 'save', string>; privacyHref: string; icon: React.ReactNode }) {
  const consent = useStored<Consent>(KEYS.consent, null);
  const [mounted, setMounted] = useState(false);
  const [force, setForce] = useState(false);
  const [custom, setCustom] = useState(false);
  const [an, setAn] = useState(true);
  const [mk, setMk] = useState(false);
  const { msg } = useSite();
  useEffect(() => {
    setMounted(true);
    const f = () => { setForce(true); setCustom(true); };
    window.addEventListener(OPEN_EVT, f);
    return () => window.removeEventListener(OPEN_EVT, f);
  }, []);
  const save = (c: { analytics: boolean; marketing: boolean }) => {
    write(KEYS.consent, { ...c, at: Date.now() });
    document.cookie = `musafir-consent=${c.analytics ? 'a' : ''}${c.marketing ? 'm' : ''}-;path=/;max-age=15552000;samesite=lax`;
    setForce(false); setCustom(false);
    toast(msg.saved);
    window.dispatchEvent(new Event('musafir:consent'));
  };
  if (!mounted || (consent && !force)) return null;
  return (
    <div id="cookie" className="fixed inset-x-3 bottom-20 z-[55] mx-auto max-w-3xl rounded-2xl border border-ink-100 bg-white p-4 shadow-2xl dark:border-ink-800 dark:bg-ink-900 sm:p-5 lg:bottom-6" role="region" aria-label={s.region}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">{icon}</span>
          <p className="text-sm text-ink-600 dark:text-ink-300">{s.text} <Link href={privacyHref} className="link">{s.privacy}</Link></p></div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCustom((c) => !c)} aria-expanded={custom}>{s.custom}</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => save({ analytics: false, marketing: false })}>{s.reject}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => save({ analytics: true, marketing: true })}>{s.accept}</button>
        </div>
      </div>
      {custom ? (
        <div id="cookie-custom" className="mt-4 grid gap-2 border-t border-ink-100 pt-4 text-sm dark:border-ink-800 sm:grid-cols-3">
          <label className="flex items-center gap-2"><input type="checkbox" className="check" checked disabled /> {s.essential}</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="check" checked={an} onChange={(e) => setAn(e.target.checked)} /> {s.analytics}</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="check" checked={mk} onChange={(e) => setMk(e.target.checked)} /> {s.marketing}</label>
          <button type="button" className="btn btn-primary btn-sm sm:col-span-3 sm:justify-self-end" onClick={() => save({ analytics: an, marketing: mk })}>{s.save}</button>
        </div>
      ) : null}
    </div>
  );
}
