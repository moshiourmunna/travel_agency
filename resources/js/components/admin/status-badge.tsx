import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';
import type { Tone } from '@/types';

const PAY: Record<string, Tone> = { paid: 'ok', overdue: 'no', partial: 'inf', unpaid: 'pen' };
const GENERIC: Record<string, Tone> = {
  paid: 'ok', verified: 'ok', issued: 'ok', converted: 'ok', confirmed: 'ok', ticketed: 'ok', completed: 'ok', approved: 'inf', active: 'ok',
  failed: 'no', refunded: 'no', rejected: 'no', void: 'no', cancelled: 'no', blocked: 'no', suspended: 'no',
  pending: 'pen', received: 'pen', hold: 'pen', docs_pending: 'pen', draft: 'pen', contacted: 'inf', registered: 'inf',
};

export function StatusBadge({ status, label, tone }: { status: string; label?: string; tone?: Tone }) {
  const t = useT();
  return <Badge tone={tone ?? GENERIC[status] ?? 'inf'}>{t(label ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '))}</Badge>;
}

export function PayStatus({ status, label }: { status: string; label: string }) {
  const t = useT();
  return <Badge tone={PAY[status] ?? 'muted'}>{t(label)}</Badge>;
}
