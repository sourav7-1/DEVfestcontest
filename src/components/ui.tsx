// Minimal shadcn-style primitives (hand-written Tailwind; Radix only where behaviour matters).
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-10',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-dark shadow-sm',
        outline: 'border border-line bg-white text-ink hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
      },
      size: { md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>
>(({ className, variant, size, ...p }, ref) => (
  <button ref={ref} className={cn(button({ variant, size }), className)} {...p} />
));

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,40,60,0.06)]', className)} {...p} />
);

const badge = cva('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-slate-100 text-slate-700',
      primary: 'bg-primary-soft text-primary-dark',
      green: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
      red: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
      amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
      gray: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
      purple: 'bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
export type Tone = NonNullable<VariantProps<typeof badge>['tone']>;
export const Badge = ({ className, tone, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) => (
  <span className={cn(badge({ tone }), className)} {...p} />
);

export const Alert = ({
  className,
  tone = 'red',
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { tone?: 'red' | 'amber' | 'info' }) => (
  <div
    role={tone === 'red' ? 'alert' : 'status'}
    className={cn(
      'flex gap-3 rounded-xl border p-4 text-base',
      tone === 'red' && 'border-red-200 bg-red-50 text-red-900',
      tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-900',
      tone === 'info' && 'border-primary/20 bg-primary-soft text-primary-dark',
      className,
    )}
    {...p}
  />
);

export const TooltipProvider = TooltipPrimitive.Provider;
export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 max-w-xs rounded-md bg-ink px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const Separator = ({ className }: { className?: string }) => (
  <div role="separator" className={cn('h-px w-full bg-line', className)} />
);
