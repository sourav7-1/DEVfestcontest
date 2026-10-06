import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { toast } from 'sonner';
import { CalendarCheck, Eye, FileText, Replace, X } from 'lucide-react';
import { Status, type Requirement } from '@/lib/types';
import { duplicateOf } from '@/lib/duplicates';
import { localizeDigits } from '@/i18n';
import { commitMatch, requestMatch, unmatch } from '@/actions';
import { reqTitle, tr, useEvaluation, useStore, useT } from '@/store';
import { StatusBadge } from './status';
import { Badge, Button, Card, cn } from './ui';

export function Checklist() {
  const t = useT();
  const requirements = useStore((s) => s.requirements);
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold text-ink">{t('req.heading')}</h2>
        <span className="text-sm text-slate-500">{t('req.count', { n: requirements.length })}</span>
      </div>
      <ol>
        {requirements.map((r) => (
          <RequirementRow key={r.id} req={r} />
        ))}
      </ol>
    </Card>
  );
}

function RequirementRow({ req }: { req: Requirement }) {
  const t = useT();
  const { lang, files, matches, expiries, tender, flash } = useStore();
  const status = useEvaluation().byReq[req.id] ?? Status.Missing;
  const file = files.find((f) => f.id === matches[req.id]);
  const { setNodeRef, isOver, active } = useDroppable({ id: `req:${req.id}`, data: { reqId: req.id } });
  const [editing, setEditing] = useState(false);

  // Re-trigger shake/highlight animation on every flash for this row.
  const [anim, setAnim] = useState<'' | 'error' | 'focus'>('');
  useEffect(() => {
    if (flash?.reqId !== req.id) return;
    setAnim('');
    const start = setTimeout(() => setAnim(flash.kind), 16);
    const end = setTimeout(() => setAnim(''), 1600);
    return () => (clearTimeout(start), clearTimeout(end));
  }, [flash, req.id]);

  const dragging = !!active;
  return (
    <li
      id={`req-${req.id}`}
      ref={setNodeRef}
      className={cn(
        'scroll-mt-24 border-b border-line px-6 py-4 transition-colors last:border-b-0',
        isOver && 'bg-primary-soft',
        anim === 'error' && 'animate-shake bg-red-50',
        anim === 'focus' && 'animate-pulse-ring bg-amber-50',
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-semibold tabular-nums text-primary-dark"
          aria-label={t('req.order', { n: req.order })}
        >
          {localizeDigits(String(req.order), lang)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="font-medium text-ink">{reqTitle(req, lang)}</p>
              <p className="truncate text-sm text-slate-500">{lang === 'bn' ? req.title_en : req.title_bn}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {req.expiry_required && (
                <Badge tone="neutral">
                  <CalendarCheck className="h-4 w-4" aria-hidden />
                  {t('req.expiry')}
                </Badge>
              )}
              <Badge tone={req.mandatory ? 'primary' : 'gray'}>{req.mandatory ? t('req.mandatory') : t('req.optional')}</Badge>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Slot */}
          <div className="mt-3">
            {file && !editing ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2">
                <FileText className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium text-ink" title={file.name}>
                  {file.name}
                </span>
                <span className="text-sm text-slate-500">
                  {file.pageCount === 1 ? t('files.page') : t('files.pages', { n: file.pageCount })}
                </span>
                <Button variant="ghost" className="min-h-9 px-2 text-sm" onClick={() => useStore.getState().setPreview(file.id)}>
                  <Eye className="h-4 w-4" aria-hidden />
                  {t('slot.preview')}
                </Button>
                <Button variant="ghost" className="min-h-9 px-2 text-sm" onClick={() => setEditing(true)}>
                  <Replace className="h-4 w-4" aria-hidden />
                  {t('slot.change')}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('slot.unmatch', { doc: reqTitle(req, lang) })} onClick={() => unmatch(req.id)}>
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed px-3 py-2 transition-colors',
                  isOver ? 'border-primary bg-white' : dragging ? 'border-primary/50' : 'border-slate-300',
                )}
              >
                <span className={cn('text-sm', isOver ? 'font-medium text-primary-dark' : 'text-slate-500')}>
                  {isOver ? t('slot.drop_now') : t('slot.drop')}
                </span>
                <FileSelect
                  reqId={req.id}
                  onPicked={(id) => {
                    setEditing(false);
                    // "Change" from a filled slot is an explicit choice: no extra confirmation.
                    if (editing) commitMatch(req.id, id);
                    else requestMatch(req.id, id);
                  }}
                />
                {editing && (
                  <Button variant="ghost" className="min-h-9 text-sm" onClick={() => setEditing(false)}>
                    {t('slot.cancel')}
                  </Button>
                )}
              </div>
            )}
            {!file && !req.mandatory && <p className="mt-1.5 text-sm text-slate-500">{t('slot.optional_skip')}</p>}
          </div>

          {file && req.expiry_required && tender && (
            <ExpiryField reqId={req.id} value={expiries[req.id] ?? ''} deadline={tender.deadline} status={status} title={reqTitle(req, lang)} />
          )}
        </div>
      </div>
    </li>
  );
}

function FileSelect({ reqId, onPicked }: { reqId: string; onPicked: (fileId: string) => void }) {
  const t = useT();
  const { files, matches, requirements, lang } = useStore();
  const usable = files.filter((f) => !f.error);
  const owner = Object.fromEntries(Object.entries(matches).map(([r, f]) => [f, r]));
  const dupes = duplicateOf(files);
  const title = (rid: string) => {
    const r = requirements.find((q) => q.id === rid);
    return r ? reqTitle(r, lang) : rid;
  };
  const docTitle = title(reqId);
  if (usable.length === 0) return <span className="text-sm text-slate-500">· {t('slot.no_files')}</span>;
  return (
    <select
      aria-label={t('slot.choose_label', { doc: docTitle })}
      className="min-h-10 w-0 min-w-[12rem] flex-1 rounded-lg border border-line bg-white px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      value=""
      onChange={(e) => e.target.value && onPicked(e.target.value)}
    >
      <option value="">{t('slot.choose')}</option>
      {usable.map((f) => {
        const usedBy = owner[f.id];
        const notes = [
          usedBy && usedBy !== reqId ? t('slot.used_for', { doc: title(usedBy) }) : '',
          dupes[f.id] ? `⚠ ${t('slot.dup_warn', { name: dupes[f.id].name })}` : '',
        ].filter(Boolean);
        return (
          <option key={f.id} value={f.id} disabled={!!usedBy}>
            {f.name}
            {notes.length ? ` — ${notes.join(' · ')}` : ''}
          </option>
        );
      })}
    </select>
  );
}

function ExpiryField({ reqId, value, deadline, status, title }: { reqId: string; value: string; deadline: string; status: Status; title: string }) {
  const t = useT();
  const id = `exp-${reqId}`;
  const expired = status === Status.Expired;
  const onDeadline = value === deadline;
  return (
    <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {t('slot.expiry')}
        </label>
        <input
          id={id}
          type="date"
          value={value}
          aria-invalid={expired || undefined}
          aria-describedby={`${id}-help`}
          onChange={(e) => useStore.getState().setExpiry(reqId, e.target.value)}
          onBlur={(e) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) return;
            if (e.target.value < deadline) toast.error(tr('toast.expiry_expired', { doc: title }));
            else toast.success(tr('toast.expiry_ok', { doc: title }));
          }}
          className={cn(
            'mt-1 min-h-10 rounded-lg border bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            expired ? 'border-red-400 text-red-800' : 'border-line text-ink',
          )}
        />
      </div>
      <p id={`${id}-help`} className={cn('pb-2 text-sm', expired ? 'font-medium text-red-700' : onDeadline ? 'text-amber-800' : 'text-slate-500')}>
        {expired
          ? t('slot.expired_on', { expiry: value, deadline })
          : onDeadline
            ? t('slot.on_deadline')
            : status === Status.OK
              ? `${t('slot.valid_until', { expiry: value })} ${t('slot.expiry_help', { deadline })}`
              : t('slot.expiry_help', { deadline })}
      </p>
    </div>
  );
}
