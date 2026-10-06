import type * as React from 'react';
import { AlertTriangle, CalendarClock, CalendarX, CheckCircle2, Copy, MinusCircle, XCircle, type LucideIcon } from 'lucide-react';
import { Status } from '@/lib/types';
import type { Key } from '@/i18n';
import { useT } from '@/store';
import { Stamp, type Tone } from './ui';

/** Single source of truth: every status = colour + icon + text (never colour alone). */
export const STATUS_META: Record<Status, { icon: LucideIcon; tone: Tone; key: Key; text: string }> = {
  [Status.OK]: { icon: CheckCircle2, tone: 'ok', key: 'status.ok', text: 'text-st-ok' },
  [Status.Missing]: { icon: XCircle, tone: 'missing', key: 'status.missing', text: 'text-st-missing' },
  [Status.Expired]: { icon: CalendarX, tone: 'expired', key: 'status.expired', text: 'text-st-expired' },
  [Status.ExpiryNeeded]: { icon: CalendarClock, tone: 'need', key: 'status.expiry_needed', text: 'text-st-need' },
  [Status.NotProvided]: { icon: MinusCircle, tone: 'none', key: 'status.not_provided', text: 'text-st-none' },
  [Status.Duplicate]: { icon: Copy, tone: 'dup', key: 'status.duplicate', text: 'text-st-dup' },
  [Status.Error]: { icon: AlertTriangle, tone: 'error', key: 'status.error', text: 'text-tape' },
};

export function StatusBadge({ status, label, className }: { status: Status; label?: React.ReactNode; className?: string }) {
  const t = useT();
  const m = STATUS_META[status];
  return (
    <Stamp tone={m.tone} className={className}>
      <m.icon className="h-4 w-4" aria-hidden />
      <span className="min-w-0">{label ?? t(m.key)}</span>
    </Stamp>
  );
}
