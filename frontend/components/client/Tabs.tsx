'use client';
import { useRef, useState } from 'react';

/** Accessible tabs (roving tabindex, arrow keys / Home / End) — panels are server-rendered children. */
export function Tabs({ label, tabs, listClass, tabClass = 'tab flex-1 justify-center', children }: {
  label: string; tabs: { id: string; label: React.ReactNode }[]; listClass: string; tabClass?: string; children: React.ReactNode[];
}) {
  const [cur, setCur] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (k: number) => { const n = (k + tabs.length) % tabs.length; setCur(n); refs.current[n]?.focus(); };
  return (
    <>
      <div role="tablist" aria-label={label} className={listClass}>
        {tabs.map((t, k) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[k] = el; }}
            type="button"
            role="tab"
            id={`${t.id}-tab`}
            aria-controls={t.id}
            aria-selected={k === cur}
            tabIndex={k === cur ? 0 : -1}
            className={tabClass}
            onClick={() => setCur(k)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(k + 1); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); move(k - 1); }
              if (e.key === 'Home') { e.preventDefault(); move(0); }
              if (e.key === 'End') { e.preventDefault(); move(tabs.length - 1); }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {children.map((c, k) => <div key={k} role="tabpanel" id={tabs[k].id} aria-labelledby={`${tabs[k].id}-tab`} hidden={k !== cur}>{c}</div>)}
    </>
  );
}

/** Swap the values of two inputs (flight origin/destination). */
export function SwapButton({ a, b, label, className, children }: { a: string; b: string; label: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} aria-label={label} onClick={() => {
      const x = document.querySelector<HTMLInputElement>(a), y = document.querySelector<HTMLInputElement>(b);
      if (x && y) [x.value, y.value] = [y.value, x.value];
    }}>{children}</button>
  );
}
