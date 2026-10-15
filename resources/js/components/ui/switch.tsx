import { Switch as S } from 'radix-ui';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-brand-600 dark:bg-slate-600', className)} {...props}>
      <S.Thumb className="block size-5 rounded-full bg-white shadow transition-transform ltr:translate-x-0.5 ltr:data-[state=checked]:translate-x-[22px] rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-[22px]" />
    </S.Root>
  );
}
