import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { ChevronDown, Eye, FileText, FileWarning, FolderOpen, GripVertical, Inbox, Loader2, Trash2, Upload, X } from 'lucide-react';
import { applyLimits, formatSize, newId, readUpload } from '@/lib/files';
import { duplicateOf } from '@/lib/duplicates';
import { countPages } from '@/lib/pdf';
import { Status, type UploadedFile } from '@/lib/types';
import { localizeDigits, translate } from '@/i18n';
import { reqCode, reqTitle, tr, useStore, useT } from '@/store';
import { StatusBadge } from './status';
import { Button, Card, Empty, Tooltip, cn } from './ui';

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
  // Tablet/phone: the tray is a drawer under the register (always open on desktop).
  const [drawerOpen, setDrawerOpen] = useState(true);
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
    <Card {...getRootProps()} className={cn('flex flex-col overflow-hidden transition-colors lg:sticky lg:top-20', isDragActive && 'border-primary')}>
      <input {...getInputProps({ accept: '.pdf,application/pdf' })} />
      <div className="flex items-center justify-between gap-3 border-b-2 border-khaki px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-ink">
            <button
              type="button"
              className="flex items-center gap-1.5 text-left lg:pointer-events-none"
              aria-expanded={drawerOpen}
              aria-controls="files-drawer"
              onClick={() => setDrawerOpen((o) => !o)}
            >
              <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-muted transition-transform lg:hidden', !drawerOpen && '-rotate-90')} aria-hidden />
              {t('files.heading')}
            </button>
          </h2>
          <p className="font-mono text-sm tabular text-ink-muted">
            {t('files.count', { n: ok.length, max: 30, size: localizeDigits(formatSize(totalSize), lang) })}
          </p>
        </div>
        <Button variant="outline" onClick={open} className="shrink-0">
          <Upload aria-hidden />
          {t('files.choose')}
        </Button>
      </div>
      <div id="files-drawer" className={cn('flex-col', drawerOpen ? 'flex' : 'hidden lg:flex')}>

      <button
        type="button"
        onClick={open}
        className={cn(
          'mx-5 mt-4 flex items-center gap-3 rounded-md border-2 border-dashed px-4 py-3 text-left transition-colors',
          isDragActive ? 'border-primary bg-khaki-soft' : 'border-rule bg-paper/60 hover:border-khaki',
        )}
      >
        <FolderOpen className="h-6 w-6 shrink-0 text-khaki-deep" aria-hidden />
        <span className="min-w-0">
          <span className="block font-medium text-ink">{isDragActive ? t('files.drop_active') : t('files.drop')}</span>
          <span className="block text-sm text-ink-muted">{t('files.drop_hint')}</span>
        </span>
      </button>

      {files.length > 0 && (
        <div role="group" aria-label={t('filter.label')} className="mx-5 mt-4 flex border-b border-rule">
          {(['all', 'unmatched', 'problems'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn(
                '-mb-px flex min-h-10 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-sm font-medium transition-colors',
                filter === k ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {t(`filter.${k}`)}
              <span className={cn('font-mono text-xs tabular', k === 'problems' && counts.problems ? 'font-semibold text-tape' : '')}>
                {localizeDigits(String(counts[k]), lang)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-2 p-5 lg:max-h-[max(20rem,calc(100vh-26rem))] lg:overflow-y-auto" aria-live="polite">
        {readingCount > 0 && (
          <div className="flex items-center gap-3 rounded-sm border border-rule bg-paper/60 px-3 py-3 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            {t('files.reading', { n: readingCount })}
          </div>
        )}
        {files.length === 0 && readingCount === 0 && <Empty icon={Inbox}>{t('files.empty')}</Empty>}
        {files.length > 0 && shownOk.length + shownRejected.length === 0 && <Empty icon={Inbox} className="py-6">{t('filter.empty')}</Empty>}

        <ul className="space-y-2">
          {shownOk.map((f) => (
            <FileCard key={f.id} file={f} dupeOf={dupes[f.id]?.name} matchedReqId={matchedTo[f.id]} onRemove={() => remove(f)} />
          ))}
        </ul>

        {shownRejected.length > 0 && (
          <div className="pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-tape">{t('files.rejected')}</h3>
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
        'sheet-fold group flex cursor-grab touch-none items-start gap-2 rounded-sm border border-rule bg-sheet py-2.5 pl-1.5 pr-4 transition-colors active:cursor-grabbing',
        bad ? 'border-l-[3px] border-l-tape' : 'hover:border-khaki',
        req && 'bg-paper/70',
        isDragging && 'opacity-40',
      )}
    >
      <GripVertical className="mt-0.5 h-[18px] w-[18px] shrink-0 text-rule group-hover:text-ink-muted" aria-hidden />
      {bad ? <FileWarning className="mt-0.5 h-[18px] w-[18px] shrink-0 text-tape" aria-hidden /> : <FileText className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', req ? 'text-ink-muted' : 'text-tape')} aria-hidden />}
      <div className="min-w-0 flex-1">
        <Tooltip content={f.name}>
          <p className={cn('truncate font-medium', req ? 'text-ink-muted' : 'text-ink')} tabIndex={0}>
            {f.name}
          </p>
        </Tooltip>
        {!bad && (
          <p className="font-mono text-sm tabular text-ink-muted">
            {f.pageCount === 1 ? t('files.page') : t('files.pages', { n: f.pageCount })} · {localizeDigits(formatSize(f.size), lang)}
          </p>
        )}
        {req && (
          <p className="mt-1 truncate text-sm text-primary" title={t('tray.matched_to', { code: reqCode(req), doc: reqTitle(req, lang) })}>
            <span className="font-mono font-semibold">→ {localizeDigits(reqCode(req), lang)}</span> {reqTitle(req, lang)}
          </p>
        )}
        {dupeOf && (
          <div className="mt-1">
            <StatusBadge
              status={Status.Duplicate}
              className="max-w-full whitespace-normal"
              label={t('files.same_as', { name: '\u0000' })
                .split('\u0000')
                .flatMap((part, i) => (i ? [<span key={i} className="break-all normal-case tracking-normal">{dupeOf}</span>, part] : [part]))}
            />
          </div>
        )}
        {bad && (
          <>
            <div className="mt-1">
              <StatusBadge status={Status.Error} label={t(`ferr.short.${f.error!}`)} />
            </div>
            <p className="mt-1 text-sm text-ink">{t(`ferr.${f.error!}`)}</p>
          </>
        )}
      </div>
      {!bad && (
        <Button variant="ghost" size="icon" aria-label={`${t('slot.preview')}: ${f.name}`} onClick={() => setPreview(f.id)}>
          <Eye aria-hidden />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="hover:text-tape" aria-label={t(bad ? 'files.dismiss' : 'files.remove', { name: f.name })} onClick={onRemove}>
        {bad ? <X aria-hidden /> : <Trash2 aria-hidden />}
      </Button>
    </li>
  );
}
