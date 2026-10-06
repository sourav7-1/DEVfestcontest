// Presentational primitives for the "tender file desk" theme (hand-written; Radix only where behaviour matters).
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

const button = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover disabled:bg-disabled disabled:text-disabled-fg',
        outline: 'border border-rule bg-sheet text-ink hover:border-khaki hover:bg-khaki-soft/50 disabled:text-disabled-fg',
        ghost: 'text-ink-muted hover:bg-khaki-soft/60 hover:text-ink disabled:text-disabled-fg',
        destructive: 'border border-tape/60 bg-sheet text-tape hover:bg-tape-soft disabled:text-disabled-fg',
      },
      size: { md: 'px-4 py-2 text-base', lg: 'px-6 py-2.5 text-base', icon: 'h-10 w-10 [&_svg]:h-[18px] [&_svg]:w-[18px]' },
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

/** A sheet on the desk: flat paper, ruled border, 8px corners, no drop shadow. */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
  <div ref={ref} className={cn('rounded-lg border border-rule bg-sheet', className)} {...p} />
));

/** Small uppercase text tag (mandatory/optional, expiry checked). */
export const Tag = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.06em]', className)} {...p} />
);

const stamp = cva('stamp', {
  variants: {
    tone: {
      ok: 'bg-st-ok-bg text-st-ok',
      missing: 'bg-st-missing-bg text-st-missing',
      expired: 'bg-st-expired-bg text-st-expired',
      need: 'bg-st-need-bg text-st-need',
      none: 'bg-st-none-bg text-st-none',
      dup: 'bg-st-dup-bg text-st-dup',
      error: 'bg-st-missing-bg text-tape',
    },
  },
  defaultVariants: { tone: 'none' },
});
export type Tone = NonNullable<VariantProps<typeof stamp>['tone']>;
/** Rubber-stamp status label: always colour + icon + text. */
export const Stamp = ({ className, tone, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof stamp>) => (
  <span className={cn(stamp({ tone }), className)} {...p} />
);

export const Alert = ({
  className,
  tone = 'red',
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { tone?: 'red' | 'amber' | 'info' }) => (
  <div
    role={tone === 'red' ? 'alert' : 'status'}
    className={cn(
      'flex gap-3 rounded-md border border-l-4 p-4 text-base text-ink [&>svg]:h-5 [&>svg]:w-5',
      tone === 'red' && 'border-rule border-l-tape bg-sheet [&>svg]:text-tape',
      tone === 'amber' && 'border-rule border-l-st-need bg-st-need-bg [&>svg]:text-st-need',
      tone === 'info' && 'border-rule border-l-khaki bg-sheet [&>svg]:text-khaki-deep',
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
          className="z-50 max-w-xs rounded-sm border border-rule bg-sheet px-3 py-1.5 text-sm text-ink shadow-lift animate-in fade-in-0"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const Separator = ({ className }: { className?: string }) => (
  <div role="separator" className={cn('h-px w-full bg-rule', className)} />
);

/** Shared dialog surfaces. */
export const overlayClass = 'fixed inset-0 z-40 bg-[rgba(30,43,42,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0';
export const dialogClass = 'rounded-lg border border-rule bg-sheet shadow-lift focus:outline-none';

/** Empty state: icon + one line of guidance. */
export function Empty({ icon: Icon, children, className }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-muted', className)}>
      <Icon className="h-7 w-7 text-khaki-deep" aria-hidden />
      <p className="max-w-xs">{children}</p>
    </div>
  );
}
