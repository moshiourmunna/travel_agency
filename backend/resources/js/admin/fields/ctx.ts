import { createContext, useContext } from 'react';

export type FormCtxValue = {
  errors: Record<string, string>;
  creating: boolean;
  /** Top-level form data (slug source, sibling lookups). */
  data: Record<string, any>;
};
export const FormCtx = createContext<FormCtxValue>({ errors: {}, creating: false, data: {} });
export const useFormCtx = () => useContext(FormCtx);

/** Error for exactly this path, or the first nested error under it. */
export function errorAt(errors: Record<string, string>, path: string, nested = false): string | null {
  if (errors[path]) return errors[path];
  if (!nested) return null;
  const k = Object.keys(errors).find((e) => e.startsWith(path + '.'));
  return k ? errors[k] : null;
}
export const hasErrorUnder = (errors: Record<string, string>, path: string) => !!errors[path] || Object.keys(errors).some((e) => e.startsWith(path + '.'));

export const humanize = (k: string) => k.replace(/_ids?$/, (m) => (m === '_ids' ? ' (list)' : '')).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const slugify = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

export const isTr = (v: any): v is { en: string; bn: string } => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => k === 'en' || k === 'bn');

/** Same shape with texts blanked (new row template). */
export function emptied(v: any): any {
  if (Array.isArray(v)) return v.length && v[0] && typeof v[0] === 'object' ? [] : [];
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'source' || k === 'limit' ? x : emptied(x)]));
  if (typeof v === 'string') return '';
  if (typeof v === 'boolean') return v;
  return null;
}
