import { AlertTriangle, CalendarClock, CalendarX, CheckCircle2, Copy, MinusCircle, XCircle, type LucideIcon } from 'lucide-react';
import { Status } from '@/lib/types';
import type { Key } from '@/i18n';
import { useT } from '@/store';
import { Badge, type Tone } from './ui';

/** Single source of truth: every status = colour + icon + text (never colour alone). */
export const STATUS_META: Record<Status, { icon: LucideIcon; tone: Tone; key: Key }> = {
  [Status.OK]: { icon: CheckCircle2, tone: 'green', key: 'status.ok' },
  [Status.Missing]: { icon: XCircle, tone: 'red', key: 'status.missing' },
  [Status.Expired]: { icon: CalendarX, tone: 'red', key: 'status.expired' },
  [Status.ExpiryNeeded]: { icon: CalendarClock, tone: 'amber', key: 'status.expiry_needed' },
  [Status.NotProvided]: { icon: MinusCircle, tone: 'gray', key: 'status.not_provided' },
  [Status.Duplicate]: { icon: Copy, tone: 'purple', key: 'status.duplicate' },
  [Status.Error]: { icon: AlertTriangle, tone: 'red', key: 'status.error' },
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const t = useT();
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone}>
      <m.icon className="h-4 w-4" aria-hidden />
      {label ?? t(m.key)}
    </Badge>
  );
}
