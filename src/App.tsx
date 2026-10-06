import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Info, PackageCheck } from 'lucide-react';
import { duplicateGroups } from '@/lib/duplicates';
import { useStore, useT } from '@/store';
import { TopBar, Stepper } from '@/components/Header';
import { RequirementsHero, RequirementsList, TenderSummary } from '@/components/Requirements';
import { FilesTray } from '@/components/FilesTray';
import { Alert, Button, TooltipProvider, Tooltip } from '@/components/ui';
import { STATUS_META } from '@/components/status';
import { Status } from '@/lib/types';

function StepGuidance() {
  const t = useT();
  const { step, tender, files } = useStore();
  const msg =
    step >= 2 && !tender ? t('step.need_req') : step >= 3 && !files.some((f) => !f.error) ? t('step.need_files') : step >= 3 ? t('step.coming') : null;
  if (!msg) return null;
  return (
    <Alert tone="info" className="mb-6">
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p>{msg}</p>
    </Alert>
  );
}

function BottomBar() {
  const t = useT();
  const { requirements, files } = useStore();
  const problems = files.filter((f) => f.error).length + duplicateGroups(files).length;
  const ready = 0; // ponytail: real readiness comes with matching/status selectors in stage 2
  const Warn = STATUS_META[Status.Error].icon;
  const Ok = STATUS_META[Status.OK].icon;
  return (
    <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-3">
        <div className="min-w-48 flex-1">
          <p className="font-medium text-ink">{t('bar.progress', { done: ready, total: requirements.length })}</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={requirements.length} aria-valuenow={ready}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${requirements.length ? (ready / requirements.length) * 100 : 0}%` }} />
          </div>
        </div>
        <p className={problems ? 'flex items-center gap-2 font-medium text-red-700' : 'flex items-center gap-2 text-emerald-700'}>
          {problems ? <Warn className="h-5 w-5" aria-hidden /> : <Ok className="h-5 w-5" aria-hidden />}
          {problems === 0 ? t('bar.no_problems') : problems === 1 ? t('bar.problem') : t('bar.problems', { n: problems })}
        </p>
        <Tooltip content={t('bar.generate_hint')}>
          <span tabIndex={0}>
            <Button size="lg" disabled>
              <PackageCheck className="h-5 w-5" aria-hidden />
              {t('bar.generate')}
            </Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

export default function App() {
  const { tender, lang } = useStore();
  const t = useT();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t('app.name');
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-canvas text-ink">
        <TopBar />
        <Stepper />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
          <StepGuidance />
          {!tender ? (
            <RequirementsHero />
          ) : (
            <div className="space-y-6">
              <TenderSummary />
              <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
                <RequirementsList />
                <FilesTray />
              </div>
            </div>
          )}
        </main>
        {tender && <BottomBar />}
      </div>
      <Toaster position="top-right" offset={80} richColors closeButton toastOptions={{ className: 'text-base' }} />
    </TooltipProvider>
  );
}
