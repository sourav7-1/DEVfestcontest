import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, ExternalLink, Download, Loader2, X } from 'lucide-react';
import { renderThumbnails } from '@/lib/pdf';
import { commitMatch } from '@/actions';
import { reqTitle, useStore, useT } from '@/store';
import { localizeDigits } from '@/i18n';
import { Button, cn } from './ui';

const overlay = 'fixed inset-0 z-40 bg-slate-900/40 data-[state=open]:animate-in data-[state=open]:fade-in-0';

export function PreviewSheet() {
  const t = useT();
  const { previewFileId, files, setPreview } = useStore();
  const file = files.find((f) => f.id === previewFileId);
  const [pages, setPages] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const MAX = 5;

  useEffect(() => {
    setPages([]);
    setFailed(false);
    setTotal(file?.pageCount ?? 0);
    if (!file) return;
    const signal = { cancelled: false };
    renderThumbnails(file.bytes, MAX, 360, (url, _i, n) => {
      setTotal(n);
      setPages((p) => [...p, url]);
    }, signal).catch(() => !signal.cancelled && setFailed(true));
    return () => {
      signal.cancelled = true;
    };
  }, [file]);

  return (
    <Dialog.Root open={!!file} onOpenChange={(o) => !o && setPreview(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-lg font-semibold text-ink">{t('preview.title', { name: file?.name ?? '' })}</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                {t('preview.pages', { n: total, m: Math.min(MAX, total) })}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t('preview.close')}>
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-100 p-5">
            {failed && <p className="text-red-700">{t('preview.failed')}</p>}
            {pages.map((src, i) => (
              <figure key={i} className="animate-in fade-in-0">
                <img src={src} alt={t('preview.page', { n: i + 1 })} className="w-full rounded-md border border-line bg-white shadow-sm" />
                <figcaption className="mt-1 text-center text-sm text-slate-500">{t('preview.page', { n: i + 1 })}</figcaption>
              </figure>
            ))}
            {!failed && pages.length < Math.min(MAX, total || 1) && (
              <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-md bg-white/70 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
                {t('preview.loading')}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ReplaceDialog() {
  const t = useT();
  const { pendingReplace, setPendingReplace, files, matches, requirements, lang } = useStore();
  const req = requirements.find((r) => r.id === pendingReplace?.reqId);
  const oldName = files.find((f) => f.id === matches[pendingReplace?.reqId ?? ''])?.name ?? '';
  const newName = files.find((f) => f.id === pendingReplace?.fileId)?.name ?? '';
  return (
    <Dialog.Root open={!!pendingReplace} onOpenChange={(o) => !o && setPendingReplace(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-semibold text-ink">{t('replace.title')}</Dialog.Title>
          <Dialog.Description className="mt-2 text-slate-600">
            {t('replace.body', { doc: req ? reqTitle(req, lang) : '', old: oldName, new: newName })}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline">{t('replace.cancel')}</Button>
            </Dialog.Close>
            <Button
              onClick={() => {
                const p = useStore.getState().pendingReplace;
                setPendingReplace(null);
                if (p) commitMatch(p.reqId, p.fileId);
              }}
            >
              {t('replace.confirm')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface GenState {
  phase: 'idle' | 'building' | 'done';
  done: number;
  total: number;
  result?: { url: string; name: string; totalPages: number; docs: { order: number; title: string; fileName: string; pages: number }[] };
}

export function GenerateDialogs({ gen, onClose, onDownload }: { gen: GenState; onClose(): void; onDownload(): void }) {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const pct = gen.total ? Math.round((gen.done / gen.total) * 100) : 0;
  return (
    <>
      <Dialog.Root open={gen.phase === 'building'}>
        <Dialog.Portal>
          <Dialog.Overlay className={overlay} />
          <Dialog.Content
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl focus:outline-none"
          >
            <Dialog.Title className="flex items-center gap-3 text-lg font-semibold text-ink">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              {t('gen.building')}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-slate-500">{t('gen.progress', { done: gen.done, total: gen.total || 1 })}</Dialog.Description>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={gen.phase === 'done'} onOpenChange={(o) => !o && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className={overlay} />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95">
            <div className="flex items-start gap-3 p-6 pb-4">
              <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <Dialog.Title className="text-lg font-semibold text-ink">{t('gen.done_title')}</Dialog.Title>
                <Dialog.Description className="mt-1 text-slate-600">
                  {t('gen.done_body', { pages: gen.result?.totalPages ?? 0, name: gen.result?.name ?? '' })}
                </Dialog.Description>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto border-y border-line px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-600">{t('gen.included')}</h3>
              <ol className="mt-2 space-y-1.5">
                {gen.result?.docs.map((d) => (
                  <li key={d.order} className="flex items-baseline gap-3">
                    <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-primary-dark">{localizeDigits(String(d.order), lang)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink">{d.title}</span>
                      <span className="block truncate text-sm text-slate-500">{d.fileName}</span>
                    </span>
                    <span className="shrink-0 text-sm text-slate-500">{t('gen.doc_pages', { n: d.pages })}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className={cn('flex flex-wrap justify-end gap-3 p-6 pt-4')}>
              <Dialog.Close asChild>
                <Button variant="ghost">{t('gen.close')}</Button>
              </Dialog.Close>
              <Button variant="outline" onClick={() => gen.result && window.open(gen.result.url, '_blank', 'noopener')}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                {t('gen.open_tab')}
              </Button>
              <Button onClick={onDownload}>
                <Download className="h-4 w-4" aria-hidden />
                {t('gen.download_again')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
