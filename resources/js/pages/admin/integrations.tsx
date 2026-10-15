import { DataTable, type Column } from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/card';
import { useT } from '@/lib/i18n';

type CardT = { key: string; label: string; contract: string; driver: string; live: boolean };
type Log = { id: number; at: string; provider: string; operation: string; status: string; ms: number | null };

export default function Integrations({ cards, logs }: { cards: CardT[]; logs: Log[] }) {
  const t = useT();
  const cols: Column<Log>[] = [
    { key: 'at', label: t('When'), main: true, render: (l) => <span className="whitespace-nowrap">{l.at}</span> },
    { key: 'provider', label: t('Provider'), render: (l) => l.provider },
    { key: 'op', label: t('Operation'), render: (l) => l.operation },
    { key: 'status', label: t('Status'), render: (l) => <Badge tone={l.status === 'ok' || l.status === 'success' ? 'ok' : 'no'}>{l.status}</Badge> },
    { key: 'ms', label: 'ms', align: 'end', render: (l) => l.ms ?? '—' },
  ];
  return (
    <>
      <PageHeader title={t('Integrations')} sub={t('Drivers are set in .env; stubs simulate the provider for testing.')} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4" data-testid={`integration-${c.key}`}>
            <div className="flex items-start justify-between gap-2"><b className="text-sm">{t(c.label)}</b><Badge tone={c.live ? 'ok' : 'pen'}>{c.live ? t('Live') : t('Stub')}</Badge></div>
            <p className="mt-1 break-all text-xs text-[var(--muted)]">{c.contract} → {c.driver}</p>
          </div>
        ))}
      </div>
      <Panel title={t('Recent calls')}><DataTable columns={cols} rows={logs} rowKey={(l) => l.id} small empty={t('No integration calls yet.')} /></Panel>
    </>
  );
}
