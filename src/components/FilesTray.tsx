import { useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { FileText, FileWarning, Loader2, Trash2, Upload, X } from 'lucide-react';
import { applyLimits, formatSize, newId, readUpload } from '@/lib/files';
import { duplicateOf } from '@/lib/duplicates';
import { countPages } from '@/lib/pdf';
import { Status, type UploadedFile } from '@/lib/types';
import { localizeDigits, translate } from '@/i18n';
import { useStore, useT } from '@/store';
import { StatusBadge } from './status';
import { Button, Card, Tooltip, cn } from './ui';

async function ingest(dropped: File[]) {
  const { files, addFiles, setReading } = useStore.getState();
  const tr = (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(useStore.getState().lang, k, p);
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

export function FilesTray() {
  const t = useT();
  const { files, lang, readingCount, removeFile } = useStore();
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ noClick: true, onDrop: (f) => void ingest(f) });
  const dupes = useMemo(() => duplicateOf(files), [files]);
  const ok = files.filter((f) => !f.error);
  const rejected = files.filter((f) => f.error);
  const totalSize = ok.reduce((s, f) => s + f.size, 0);

  const remove = (f: UploadedFile) => {
    removeFile(f.id);
    toast(translate(lang, 'toast.removed', { name: f.name }));
  };

  return (
    <Card {...getRootProps()} className={cn('flex flex-col transition-shadow', isDragActive && 'ring-2 ring-primary')}>
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
          'mx-5 mt-4 flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDragActive ? 'border-primary bg-primary-soft' : 'border-slate-300 bg-slate-50 hover:border-primary/60',
        )}
      >
        <Upload className="h-7 w-7 text-primary" aria-hidden />
        <span className="font-medium text-ink">{isDragActive ? t('files.drop_active') : t('files.drop')}</span>
        <span className="text-sm text-slate-500">{t('files.drop_hint')}</span>
      </button>

      <div className="flex-1 space-y-2 p-5" aria-live="polite">
        {readingCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            {t('files.reading', { n: readingCount })}
          </div>
        )}
        {files.length === 0 && readingCount === 0 && <p className="py-6 text-center text-slate-500">{t('files.empty')}</p>}

        <ul className="space-y-2">
          {ok.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 animate-in fade-in-0">
              <FileText className="h-6 w-6 shrink-0 text-red-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <Tooltip content={f.name}>
                  <p className="truncate font-medium text-ink" tabIndex={0}>
                    {f.name}
                  </p>
                </Tooltip>
                <p className="text-sm text-slate-500">
                  {f.pageCount === 1 ? t('files.page') : t('files.pages', { n: f.pageCount })} · {localizeDigits(formatSize(f.size), lang)}
                </p>
                {dupes[f.id] && (
                  <div className="mt-1">
                    <StatusBadge status={Status.Duplicate} label={t('files.same_as', { name: dupes[f.id].name })} />
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" aria-label={t('files.remove', { name: f.name })} onClick={() => remove(f)}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        {rejected.length > 0 && (
          <div className="pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600">{t('files.rejected')}</h3>
              <Button variant="ghost" className="min-h-9 text-sm" onClick={() => rejected.forEach((f) => removeFile(f.id))}>
                {t('files.clear_rejected')}
              </Button>
            </div>
            <ul className="space-y-2">
              {rejected.map((f) => (
                <li key={f.id} className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5 animate-in fade-in-0">
                  <FileWarning className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Tooltip content={f.name}>
                      <p className="truncate font-medium text-ink" tabIndex={0}>
                        {f.name}
                      </p>
                    </Tooltip>
                    <div className="mt-1">
                      <StatusBadge status={Status.Error} label={t(`ferr.short.${f.error!}`)} />
                    </div>
                    <p className="mt-1 text-sm text-red-900">{t(`ferr.${f.error!}`)}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={t('files.dismiss', { name: f.name })} onClick={() => removeFile(f.id)}>
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
