import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
        gold: 'bg-gold-500 text-white hover:bg-gold-600 shadow-sm',
        outline: 'border border-[var(--border)] bg-[var(--card)] hover:bg-black/5 dark:hover:bg-white/5',
        ghost: 'hover:bg-black/5 dark:hover:bg-white/10',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        'outline-destructive': 'border border-red-200 text-red-700 bg-[var(--card)] hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950',
        link: 'text-brand-600 underline-offset-4 hover:underline dark:text-brand-100 px-0',
      },
      size: { default: 'h-10 px-4', sm: 'h-9 px-3 text-[13px]', xs: 'h-8 px-2.5 text-xs', lg: 'h-11 px-6', icon: 'size-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';
