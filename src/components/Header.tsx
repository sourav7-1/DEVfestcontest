import { Check, FileStack, ShieldCheck } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { translate } from '@/i18n';
import { useEvaluation, useStore, useT } from '@/store';
import { toast } from 'sonner';
import { Badge, cn } from './ui';

export function TopBar() {
  const t = useT();
  const { tender, lang, setLang } = useStore();
  const choose = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    toast.success(translate(l, 'toast.lang'));
  };
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white" aria-hidden>
            <FileStack className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-ink">{t('app.name')}</span>
        </div>
        {tender && <Badge tone="primary" className="font-mono text-sm">{tender.tender_id}</Badge>}
        <span className="ml-auto hidden items-center gap-1.5 text-sm text-slate-500 md:flex">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          {t('app.privacy')}
        </span>
        <div role="group" aria-label={t('lang.label')} className="flex rounded-lg border border-line bg-slate-50 p-1">
          {(['bn', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => choose(l)}
              className={cn(
                'min-h-9 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                lang === l ? 'bg-white text-primary-dark shadow-sm' : 'text-slate-600 hover:text-ink',
              )}
            >
              {l === 'bn' ? 'বাংলা' : 'English'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export function Stepper() {
  const t = useT();
  const { step, setStep, tender, files } = useStore();
  const { canGenerate } = useEvaluation();
  const done = [!!tender, files.some((f) => !f.error), canGenerate, false];
  return (
    <nav aria-label={t('step.nav')} className="mx-auto max-w-7xl px-6 pt-6">
      <ol className="flex items-center gap-2">
        {([1, 2, 3, 4] as const).map((n, i) => {
          const active = step === n;
          const isDone = done[i] && !active;
          return (
            <li key={n} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(n)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active ? 'bg-white shadow-sm ring-1 ring-line' : 'hover:bg-white/60',
                )}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    active && 'bg-primary text-white',
                    isDone && 'bg-emerald-600 text-white',
                    !active && !isDone && 'bg-slate-200 text-slate-600',
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" aria-label={t('step.done')} /> : n}
                </span>
                <span className={cn('text-base', active ? 'font-semibold text-ink' : 'text-slate-600')}>{t(`step.${n}`)}</span>
              </button>
              {n < 4 && <span className="hidden h-px w-6 shrink-0 bg-line lg:block" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
