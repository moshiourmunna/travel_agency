'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Link that marks itself aria-current="page" when the current path is (or is under) its href. */
export function ActiveLink({ href, className, activeClassName = '', exact = false, children, ...rest }: React.ComponentProps<typeof Link> & { href: string; activeClassName?: string; exact?: boolean }) {
  const p = usePathname() || '';
  const base = href.split('?')[0];
  const on = exact ? p === base : p === base || p.startsWith(base + '/');
  return (
    <Link href={href} className={`${className ?? ''} ${on ? activeClassName : ''}`} aria-current={on ? 'page' : undefined} {...rest}>
      {children}
    </Link>
  );
}

/** Wraps a dropdown trigger: true when the path is under any of the prefixes. */
export function useUnder(prefixes: string[]) {
  const p = usePathname() || '';
  return prefixes.some((x) => p === x || p.startsWith(x + '/'));
}
