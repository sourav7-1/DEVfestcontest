import { useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { toast } from 'sonner';
import { ChevronUp, PackageCheck } from 'lucide-react';
import { buildPackage, PackageError, packageFileName } from '@/lib/package';
import { todayISO } from '@/lib/requirements';
import { Status } from '@/lib/types';
import type { Blocker } from '@/lib/status';
import { focusRow } from '@/actions';
import { reqCode, reqTitle, tr, useEvaluation, useStore, useT } from '@/store';
import { localizeDigits } from '@/i18n';
import { STATUS_META } from './status';
import { GenerateDialogs, type GenState } from './Dialogs';
import { Button, cn, dialogClass } from './ui';

const BLOCKER_STATUS: Record<Blocker['kind'], Status> = {
  missing: Status.Missing,
  expiry_needed: Status.ExpiryNeeded,
  expired: Status.Expired,
  duplicate_match: Status.Duplicate,
};

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function generate(setGen: (g: GenState) => void): Promise<GenState['result']> {
  const { tender, requirements, matches, files, lang } = useStore.getState();
  if (!tender) return;
  const items = requirements
    .filter((r) => matches[r.id])
    .map((r) => ({ req: r, file: files.find((f) => f.id === matches[r.id])! }))
    .filter((it) => it.file && !it.file.error);
  setGen({ phase: 'building', done: 0, total: items.length * 2 + 1 });
  const res = await buildPackage({
    tender,
    generatedOn: todayISO(),
    items: items.map((it) => ({ req: it.req, file: { name: it.file.name, bytes: it.file.bytes } })),
    // Yield to the browser between steps so the progress bar repaints.
    onProgress: (done, total) => (setGen({ phase: 'building', done, total }), new Promise((r) => setTimeout(r, 0))),
  });
  const name = packageFileName(tender.tender_id);
  const url = URL.createObjectURL(new Blob([res.bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }));
  return {
    url,
    name,
    totalPages: res.totalPages,
    docs: res.docs.map((d, i) => ({ order: d.order, title: reqTitle(items[i].req, lang), fileName: d.fileName, pages: d.pages })),
  };
}

export function GenerateBar() {
  const t = useT();
  const { requirements, lang, tender } = useStore();
  const ev = useEvaluation();
  const [gen, setGen] = useState<GenState>({ phase: 'idle', done: 0, total: 0 });
  const [open, setOpen] = useState(false);
  const lastUrl = useRef<string | null>(null);
  const n = ev.blockers.length;
  const title = (id: string) => {
    const r = requirements.find((q) => q.id === id);
    return r ? reqTitle(r, lang) : id;
  };
  const reason = (b: Blocker) =>
    b.kind === 'expired'
      ? t('why.expired', { doc: title(b.reqId), expiry: b.expiry, deadline: tender?.deadline ?? '' })
      : b.kind === 'duplicate_match'
        ? t('why.duplicate_match', { doc: title(b.reqId), other: title(b.otherReqId) })
        : t(`why.${b.kind}`, { doc: title(b.reqId) });

  const run = async () => {
    try {
      const result = await generate(setGen);
      if (!result) return setGen({ phase: 'idle', done: 0, total: 0 });
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = result.url;
      download(result.url, result.name);
      setGen({ phase: 'done', done: 1, total: 1, result });
      toast.success(tr('toast.generated', { name: result.name }));
    } catch (e) {
      setGen({ phase: 'idle', done: 0, total: 0 });
      toast.error(e instanceof PackageError ? tr('toast.gen_failed_file', { name: e.fileName }) : tr('toast.gen_failed'));
    }
  };

  const Warn = STATUS_META[Status.Error].icon;
  const total = requirements.length;
  const allOk = ev.canGenerate; // nothing blocks submission (optional docs may be "not provided")
  return (
    <div className="sticky bottom-0 z-20 border-t-2 border-khaki bg-sheet">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="min-w-48 flex-1">
          <p className="flex items-baseline gap-2 text-ink">
            <span className="font-mono text-lg font-semibold tabular">
              {localizeDigits(`${ev.ready} / ${total}`, lang)}
            </span>
            <span className="text-sm text-ink-muted">{t('bar.ready_label')}</span>
            <span className="sr-only">{t('bar.progress', { done: ev.ready, total })}</span>
          </p>
          <div className="mt-1.5 h-[3px] bg-rule" role="progressbar" aria-label={t('bar.progress', { done: ev.ready, total })} aria-valuemin={0} aria-valuemax={total} aria-valuenow={ev.ready}>
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${total ? (ev.ready / total) * 100 : 0}%` }} />
          </div>
        </div>

        {n === 0 ? (
          allOk ? (
            <span key="stamp" className="stamp animate-stamp border-2 bg-st-ok-bg px-3 py-1 text-sm text-st-ok" role="status">
              <STATUS_META.ok.icon className="h-5 w-5" aria-hidden />
              {t('bar.stamp_ready')}
            </span>
          ) : (
            <p className="flex items-center gap-2 font-medium text-st-ok" role="status">
              <STATUS_META.ok.icon className="h-5 w-5" aria-hidden />
              {t('bar.ready_to_go')}
            </p>
          )
        ) : (
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <Button variant="destructive">
                <Warn aria-hidden />
                <span className="font-semibold">{n === 1 ? t('bar.problem') : t('bar.problems', { n })}</span>
                <span className="hidden text-ink-muted sm:inline">{t('why.title')}</span>
                <ChevronUp className={cn('transition-transform', !open && 'rotate-180')} aria-hidden />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content side="top" align="end" sideOffset={10} className={cn(dialogClass, 'z-50 w-[min(30rem,calc(100vw-2rem))] overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0')}>
                <p className="border-b-2 border-khaki px-4 py-3 font-serif text-lg font-semibold text-ink">{t('why.title')}</p>
                <ol className="max-h-[50vh] overflow-y-auto">
                  {ev.blockers.map((b, i) => {
                    const m = STATUS_META[BLOCKER_STATUS[b.kind]];
                    const req = requirements.find((q) => q.id === b.reqId);
                    return (
                      <li key={i} className="border-b border-rule last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setTimeout(() => focusRow(b.reqId), 50);
                          }}
                          className="grid min-h-11 w-full grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-khaki-soft/60"
                        >
                          <span className="font-mono text-sm font-semibold tabular text-khaki-deep">{req ? localizeDigits(reqCode(req), lang) : ''}</span>
                          <m.icon className={cn('mt-0.5 h-[18px] w-[18px]', m.text)} aria-hidden />
                          <span className="text-ink">{reason(b)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}

        <Button size="lg" className="ml-auto" disabled={!ev.canGenerate || gen.phase === 'building'} onClick={run}>
          <PackageCheck aria-hidden />
          {t('bar.generate')}
        </Button>
      </div>
      <GenerateDialogs
        gen={gen}
        onClose={() => setGen({ phase: 'idle', done: 0, total: 0 })}
        onDownload={() => gen.result && download(gen.result.url, gen.result.name)}
      />
    </div>
  );
}
