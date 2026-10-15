import { Head } from '@inertiajs/react';
import * as React from 'react';

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <>
      <Head title={title} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl break-words">{title}</h1>
          {sub && <p className="mt-0.5 text-sm text-[var(--muted)]">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
      </div>
    </>
  );
}
