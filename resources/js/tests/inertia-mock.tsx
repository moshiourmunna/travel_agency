import * as React from 'react';
import { vi } from 'vitest';

/** Shared state for the @inertiajs/react mock. Tests mutate `page.props` and inspect `calls`. */
export const page: { props: Record<string, unknown>; url: string } = { props: {}, url: '/admin' };
export const calls: { method: string; url: string; data?: unknown; options?: Record<string, unknown> }[] = [];

export const baseProps = () => ({
  auth: { user: { id: 1, name: 'Admin', email: 'a@x', initials: 'A', role: 'admin', isOwner: true } },
  flash: {}, errors: {}, locale: 'en', dir: 'ltr',
  languages: [{ code: 'en', label: 'EN', native: 'English', dir: 'ltr' }, { code: 'bn', label: 'বাং', native: 'বাংলা', dir: 'ltr' }, { code: 'ar', label: 'ع', native: 'العربية', dir: 'rtl' }],
  modules: { agents: true, visa: true, installments: true, preregistration: true, blog: true },
  t: {}, nav: { resources: [] }, site: { name: 'Blessing Hajj' },
});

export function inertiaMock() {
  const router = {
    get: vi.fn((url: string, data?: unknown, options?: Record<string, unknown>) => calls.push({ method: 'get', url, data, options })),
    post: vi.fn((url: string, data?: unknown, options?: Record<string, unknown>) => calls.push({ method: 'post', url, data, options })),
    visit: vi.fn((url: string, options: Record<string, unknown> = {}) => calls.push({ method: String(options.method ?? 'get'), url, data: options.data, options })), reload: vi.fn(),
  };
  function useForm<T extends Record<string, unknown>>(initial: T) {
    const [data, setDataState] = React.useState<T>(initial);
    const [errors] = React.useState<Record<string, string>>(() => (page.props.errors as Record<string, string>) ?? {});
    const transformRef = React.useRef<(d: T) => unknown>((d) => d);
    const send = (method: string) => (url: string, options: Record<string, unknown> = {}) => {
      calls.push({ method, url, data: transformRef.current(data), options });
      (options.onSuccess as (() => void) | undefined)?.();
    };
    return {
      data, errors, processing: false, hasErrors: Object.keys(errors).length > 0,
      setData: (k: keyof T | T | ((d: T) => T), v?: unknown) => setDataState((d) => typeof k === 'function' ? (k as (d: T) => T)(d) : typeof k === 'object' ? (k as T) : { ...d, [k]: v }),
      transform: (fn: (d: T) => unknown) => { transformRef.current = fn; },
      reset: () => setDataState(initial), clearErrors: () => {},
      get: send('get'), post: send('post'), put: send('put'), patch: send('patch'), delete: send('delete'),
    };
  }
  const Link = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; method?: string; data?: unknown; preserveScroll?: boolean; preserveState?: boolean; replace?: boolean; as?: string }>(
    ({ href, method, data, preserveScroll, preserveState, replace, as, children, ...rest }, ref) => { void method; void data; void preserveScroll; void preserveState; void replace; void as; return <a ref={ref} href={href} {...rest}>{children}</a>; },
  );
  return { router, useForm, Link, usePage: () => page, Head: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
}
