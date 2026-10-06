import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { ArrowRight, Eye, FileText, FileWarning, GripVertical, Loader2, Trash2, Upload, X } from 'lucide-react';
import { applyLimits, formatSize, newId, readUpload } from '@/lib/files';
import { duplicateOf } from '@/lib/duplicates';
import { countPages } from '@/lib/pdf';
import { Status, type UploadedFile } from '@/lib/types';
import { localizeDigits, translate } from '@/i18n';
import { reqCode, reqTitle, tr, useStore, useT } from '@/store';
import { StatusBadge } from './status';
import { Button, Card, Tooltip, cn } from './ui';

async function ingest(dropped: File[]) {
  const { files, addFiles, setReading } = useStore.getState();
  const { accepted, overLimit, reason } = applyLimits(files, dropped);
  const limited: UploadedFile[] = overLimit.map((f) => ({
    id: newId(), name: f.name, size: f.size, bytes: new Uint8Array(), pageCount: 0, hash: '', error: 'limit',
  }));
  if (overLimit.length) toast.error(tr(reason === 'count' ? 'toast.limit_count' : 'toast.limit_size', { n: overLimit.length }));

  setReading(accepted.length);
  const read = await Promise.all(
    accepted.map(async (f) => {
      try {
        return await readUpload(f, countPages);
      } finally {
        setReading(-1);
      }
    }),
  );
  const before = duplicateOf(useStore.getState().files);
  addFiles([...read, ...limited]);

  const good = read.filter((f) => !f.error);
  const bad = read.length - good.length;
  if (good.length) toast.success(tr('toast.files_added', { n: good.length }));
  if (bad) toast.warning(tr('toast.files_rejected', { n: bad }));
  const after = duplicateOf(useStore.getState().files);
  for (const f of good) if (after[f.id] && !before[f.id]) toast(tr('toast.duplicate', { a: f.name, b: after[f.id].name }));
}

type Filter = 'all' | 'unmatched' | 'problems';

export function FilesTray() {
  const t = useT();
  const { files, lang, readingCount, removeFile, matches } = useStore();
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ noClick: true, onDrop: (f) => void ingest(f) });
  const [filter, setFilter] = useState<Filter>('all');
  const dupes = useMemo(() => duplicateOf(files), [files]);
  const matchedTo = useMemo(() => Object.fromEntries(Object.entries(matches).map(([r, f]) => [f, r])), [matches]);
  const ok = files.filter((f) => !f.error);
  const rejected = files.filter((f) => f.error);
  const totalSize = ok.reduce((s, f) => s + f.size, 0);
  const shownOk = ok.filter((f) => (filter === 'all' ? true : filter === 'unmatched' ? !matchedTo[f.id] : !!dupes[f.id]));
  const shownRejected = filter === 'unmatched' ? [] : rejected;
  const counts: Record<Filter, number> = {
    all: files.length,
    unmatched: ok.filter((f) => !matchedTo[f.id]).length,
    problems: rejected.length + ok.filter((f) => dupes[f.id]).length,
  };

  const remove = (f: UploadedFile) => {
    removeFile(f.id);
    toast(translate(lang, 'toast.removed', { name: f.name }));
  };

  return (
    <Card {...getRootProps()} className={cn('flex flex-col transition-shadow lg:sticky lg:top-20', isDragActive && 'ring-2 ring-primary')}>
      <input {...getInputProps({ accept: '.pdf,application/pdf' })} />
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t('files.heading')}</h2>
          <p className="text-sm text-slate-500">
            {t('files.count', { n: ok.length, max: 30, size: localizeDigits(formatSize(totalSize), lang) })}
          </p>
        </div>
        <Button variant="outline" onClick={open}>
          <Upload className="h-4 w-4" aria-hidden />
          {t('files.choose')}
        </Button>
      </div>

      <button
        type="button"
        onClick={open}
        className={cn(
          'mx-5 mt-4 flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDragActive ? 'border-primary bg-primary-soft' : 'border-slate-300 bg-slate-50 hover:border-primary/60',
        )}
      >
        <Upload className="h-6 w-6 text-primary" aria-hidden />
        <span className="font-medium text-ink">{isDragActive ? t('files.drop_active') : t('files.drop')}</span>
        <span className="text-sm text-slate-500">{t('files.drop_hint')}</span>
      </button>

      {files.length > 0 && (
        <div role="group" aria-label={t('filter.label')} className="mx-5 mt-4 flex rounded-lg border border-line bg-slate-50 p-1">
          {(['all', 'unmatched', 'problems'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn(
                'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                filter === k ? 'bg-white text-primary-dark shadow-sm' : 'text-slate-600 hover:text-ink',
              )}
            >
              {t(`filter.${k}`)}
              <span className={cn('rounded px-1.5 text-xs tabular-nums', k === 'problems' && counts.problems ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700')}>
                {localizeDigits(String(counts[k]), lang)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-2 p-5 lg:max-h-[calc(100vh-24rem)] lg:overflow-y-auto" aria-live="polite">
        {readingCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            {t('files.reading', { n: readingCount })}
          </div>
        )}
        {files.length === 0 && readingCount === 0 && <p className="py-6 text-center text-slate-500">{t('files.empty')}</p>}
        {files.length > 0 && shownOk.length + shownRejected.length === 0 && <p className="py-4 text-center text-slate-500">{t('filter.empty')}</p>}

        <ul className="space-y-2">
          {shownOk.map((f) => (
            <FileCard key={f.id} file={f} dupeOf={dupes[f.id]?.name} matchedReqId={matchedTo[f.id]} onRemove={() => remove(f)} />
          ))}
        </ul>

        {shownRejected.length > 0 && (
          <div className="pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">{t('files.rejected')}</h3>
              <Button variant="ghost" className="min-h-9 text-sm" onClick={() => rejected.forEach((f) => removeFile(f.id))}>
                {t('files.clear_rejected')}
              </Button>
            </div>
            <ul className="space-y-2">
              {shownRejected.map((f) => (
                <FileCard key={f.id} file={f} onRemove={() => removeFile(f.id)} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function FileCard({ file: f, dupeOf, matchedReqId, onRemove }: { file: UploadedFile; dupeOf?: string; matchedReqId?: string; onRemove(): void }) {
  const t = useT();
  const { lang, requirements, setPreview } = useStore();
  // Error files are draggable too, so dropping one gives a clear "can't use this" reason.
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `file:${f.id}`, data: { fileId: f.id } });
  const req = matchedReqId ? requirements.find((r) => r.id === matchedReqId) : undefined;
  const bad = !!f.error;
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      tabIndex={-1}
      aria-label={t('tray.drag', { name: f.name })}
      className={cn(
        'group flex cursor-grab touch-none items-start gap-2 rounded-lg border px-2 py-2.5 transition-[opacity,box-shadow] active:cursor-grabbing',
        bad ? 'border-red-200 bg-red-50/60' : 'border-line bg-white hover:shadow-sm',
        req && 'opacity-60',
        isDragging && 'opacity-30',
      )}
    >
      <GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />
      {bad ? <FileWarning className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden /> : <FileText className="mt-0.5 h-6 w-6 shrink-0 text-red-600" aria-hidden />}
      <div className="min-w-0 flex-1">
        <Tooltip content={f.name}>
          <p className="truncate font-medium text-ink" tabIndex={0}>
            {f.name}
          </p>
        </Tooltip>
        {!bad && (
          <p className="text-sm text-slate-500">
            {f.pageCount === 1 ? t('files.page') : t('files.pages', { n: f.pageCount })} · {localizeDigits(formatSize(f.size), lang)}
          </p>
        )}
        {req && (
          <p
            className="mt-1 inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary-dark"
            title={t('tray.matched_to', { code: reqCode(req), doc: reqTitle(req, lang) })}
          >
            <ArrowRight className="h-3 w-3" aria-hidden />
            {reqCode(req)} {reqTitle(req, lang)}
          </p>
        )}
        {dupeOf && (
          <div className="mt-1">
            <StatusBadge status={Status.Duplicate} label={t('files.same_as', { name: dupeOf })} />
          </div>
        )}
        {bad && (
          <>
            <div className="mt-1">
              <StatusBadge status={Status.Error} label={t(`ferr.short.${f.error!}`)} />
            </div>
            <p className="mt-1 text-sm text-red-900">{t(`ferr.${f.error!}`)}</p>
          </>
        )}
      </div>
      {!bad && (
        <Button variant="ghost" size="icon" aria-label={`${t('slot.preview')}: ${f.name}`} onClick={() => setPreview(f.id)}>
          <Eye className="h-4 w-4" aria-hidden />
        </Button>
      )}
      <Button variant="ghost" size="icon" aria-label={t(bad ? 'files.dismiss' : 'files.remove', { name: f.name })} onClick={onRemove}>
        {bad ? <X className="h-4 w-4" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
      </Button>
    </li>
  );
}
