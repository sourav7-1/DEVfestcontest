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
import { Button, Card, Tag, cn } from './ui';

export function Checklist() {
  const t = useT();
  const requirements = useStore((s) => s.requirements);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b-2 border-khaki px-6 py-4">
        <h2 className="text-xl font-semibold text-ink">{t('req.heading')}</h2>
        <span className="text-sm text-ink-muted">{t('req.count', { n: requirements.length })}</span>
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
        'grid scroll-mt-28 grid-cols-[3.25rem_minmax(0,1fr)] border-b border-rule transition-colors last:border-b-0 hover:bg-khaki-soft/35',
        isOver && 'bg-khaki-soft/60 hover:bg-khaki-soft/60',
        anim === 'error' && 'animate-shake bg-tape-soft hover:bg-tape-soft',
        anim === 'focus' && 'bg-khaki-soft hover:bg-khaki-soft',
      )}
    >
      {/* register margin: order number */}
      <span
        className="border-r border-khaki/70 pt-4 text-center font-mono text-base font-semibold tabular text-khaki-deep"
        aria-label={t('req.order', { n: req.order })}
      >
        {localizeDigits(String(req.order).padStart(2, '0'), lang)}
      </span>
      <div className="min-w-0 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-56">
              <p className="font-medium text-ink [overflow-wrap:anywhere]">{reqTitle(req, lang)}</p>
              <p className="text-sm text-ink-muted [overflow-wrap:anywhere]">{lang === 'bn' ? req.title_en : req.title_bn}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <Tag className={req.mandatory ? 'text-primary' : 'text-ink-muted'}>{req.mandatory ? t('req.mandatory') : t('req.optional')}</Tag>
                {req.expiry_required && (
                  <Tag className="text-ink-muted">
                    <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
                    {t('req.expiry')}
                  </Tag>
                )}
              </p>
            </div>
            <span aria-live="polite">
              <StatusBadge status={status} />
            </span>
          </div>

          {/* Slot */}
          <div className="mt-3">
            {file && !editing ? (
              <div key={file.id} className="flex animate-settle flex-wrap items-center gap-x-2 gap-y-1 rounded-sm border border-rule border-l-[3px] border-l-primary bg-sheet px-3 py-1.5">
                <FileText className="h-[18px] w-[18px] shrink-0 text-tape" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium text-ink" title={file.name}>
                  {file.name}
                </span>
                <span className="font-mono text-sm tabular text-ink-muted">
                  {file.pageCount === 1 ? t('files.page') : t('files.pages', { n: file.pageCount })}
                </span>
                <span className="flex items-center">
                  <Button variant="ghost" className="min-h-9 px-2 text-sm [&_svg]:h-[18px] [&_svg]:w-[18px]" onClick={() => useStore.getState().setPreview(file.id)}>
                    <Eye aria-hidden />
                    {t('slot.preview')}
                  </Button>
                  <Button variant="ghost" className="min-h-9 px-2 text-sm [&_svg]:h-[18px] [&_svg]:w-[18px]" onClick={() => setEditing(true)}>
                    <Replace aria-hidden />
                    {t('slot.change')}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:text-tape" aria-label={t('slot.unmatch', { doc: reqTitle(req, lang) })} onClick={() => unmatch(req.id)}>
                    <X aria-hidden />
                  </Button>
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-sm border-2 border-dashed px-3 py-2 transition-colors',
                  isOver ? 'border-primary bg-khaki-soft' : dragging ? 'border-khaki bg-sheet' : 'border-rule bg-sheet',
                )}
              >
                <span className={cn('text-sm', isOver ? 'font-medium text-primary' : 'text-ink-muted')}>
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
            {!file && !req.mandatory && <p className="mt-1.5 text-sm text-ink-muted">{t('slot.optional_skip')}</p>}
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
  if (usable.length === 0) return <span className="text-sm text-ink-muted">{t('slot.no_files')}</span>;
  return (
    <select
      aria-label={t('slot.choose_label', { doc: docTitle })}
      className="min-h-10 w-0 min-w-[12rem] flex-1 rounded-sm border border-rule bg-sheet px-3 text-base text-ink hover:border-khaki"
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
            'mt-1 min-h-10 rounded-sm border bg-sheet px-3 font-mono text-base tabular',
            expired ? 'border-st-expired text-st-expired' : 'border-rule text-ink hover:border-khaki',
          )}
        />
      </div>
      <p id={`${id}-help`} className={cn('pb-2 text-sm', expired ? 'font-medium text-st-expired' : onDeadline ? 'font-medium text-st-need' : 'text-ink-muted')}>
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
