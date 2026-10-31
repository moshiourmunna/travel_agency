import { icons, type LucideProps } from 'lucide-react';

const ALIAS: Record<string, string> = { 'trash-2': 'trash', 'building-2': 'building', 'bar-chart-3': 'chart-column', bold: 'type', filter: 'funnel', home: 'house', 'file-check-2': 'file-check', 'file-warning': 'file-exclamation-point', palmtree: 'tree-palm', stars: 'sparkles', waves: 'waves-horizontal', heading: 'heading-1', grid: 'grid-3x3', rows: 'rows-3', text: 'type' };

const pascal = (s: string) => s.replace(/(^|[-_ ])([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

/** Lucide icon by kebab-case name (names come from the server: nav, resources, actions). */
export function Icon({ name, ...props }: { name?: string | null } & LucideProps) {
  const I = (name && (icons as Record<string, any>)[pascal(ALIAS[name] ?? name)]) || icons.Circle;
  return <I size={18} strokeWidth={1.9} aria-hidden="true" {...props} />;
}
