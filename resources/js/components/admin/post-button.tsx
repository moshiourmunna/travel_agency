import { router } from '@inertiajs/react';
import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

/** One-click server action (POST/PUT/DELETE) with optional native confirm and busy state. */
export function PostButton({ href, data = {}, method = 'post', confirm, children, ...props }: ButtonProps & { href: string; data?: Record<string, unknown>; method?: 'post' | 'put' | 'delete'; confirm?: string }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button {...props} disabled={busy || props.disabled} onClick={() => {
      if (confirm && !window.confirm(confirm)) return;
      router.visit(href, { method, data: data as Record<string, string>, preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    }}>{children}</Button>
  );
}
