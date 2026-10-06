import { useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { toast } from 'sonner';
import { ChevronUp, PackageCheck } from 'lucide-react';
import { buildPackage, PackageError, packageFileName } from '@/lib/package';
import { todayISO } from '@/lib/requirements';
import { Status } from '@/lib/types';
import type { Blocker } from '@/lib/status';
import { focusRow } from '@/actions';
import { reqTitle, tr, useEvaluation, useStore, useT } from '@/store';
import { STATUS_META } from './status';
import { GenerateDialogs, type GenState } from './Dialogs';
import { Button, cn } from './ui';

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
  const Ok = STATUS_META[Status.OK].icon;
  return (
    <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 shadow-[0_-4px_12px_rgba(15,40,60,0.05)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="min-w-48 flex-1">
          <p className="font-medium text-ink">{t('bar.progress', { done: ev.ready, total: requirements.length })}</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={requirements.length} aria-valuenow={ev.ready}>
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${requirements.length ? (ev.ready / requirements.length) * 100 : 0}%` }} />
          </div>
        </div>

        {n === 0 ? (
          <p className="flex items-center gap-2 font-medium text-emerald-700">
            <Ok className="h-5 w-5" aria-hidden />
            {t('bar.ready_to_go')}
          </p>
        ) : (
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <Button variant="outline" className="border-red-200 text-red-800 hover:bg-red-50">
                <Warn className="h-5 w-5" aria-hidden />
                {n === 1 ? t('bar.problem') : t('bar.problems', { n })}
                <span className="hidden text-slate-500 sm:inline">· {t('why.title')}</span>
                <ChevronUp className={cn('h-4 w-4 transition-transform', !open && 'rotate-180')} aria-hidden />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content side="top" align="end" sideOffset={10} className="z-50 w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-2 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2">
                <p className="px-3 pb-2 pt-2 font-semibold text-ink">{t('why.title')}</p>
                <ul className="max-h-[50vh] overflow-y-auto">
                  {ev.blockers.map((b, i) => {
                    const m = STATUS_META[BLOCKER_STATUS[b.kind]];
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setTimeout(() => focusRow(b.reqId), 50);
                          }}
                          className="flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <m.icon className={cn('mt-0.5 h-5 w-5 shrink-0', m.tone === 'amber' ? 'text-amber-600' : m.tone === 'purple' ? 'text-violet-600' : 'text-red-600')} aria-hidden />
                          <span className="text-ink">{reason(b)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}

        <Button size="lg" disabled={!ev.canGenerate || gen.phase === 'building'} onClick={run}>
          <PackageCheck className="h-5 w-5" aria-hidden />
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
