import { Check, FolderOpen, ShieldCheck } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { translate } from '@/i18n';
import { useEvaluation, useStore, useT } from '@/store';
import { toast } from 'sonner';
import { cn } from './ui';

export function TopBar() {
  const t = useT();
  const { tender, lang, setLang } = useStore();
  const choose = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    toast.success(translate(l, 'toast.lang'));
  };
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-sheet">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <FolderOpen className="h-5 w-5 shrink-0 fill-khaki-soft text-khaki-deep" aria-hidden />
          <span className="truncate font-serif text-lg font-semibold text-ink">{t('app.name')}</span>
        </div>
        {tender && (
          <span className="hidden items-baseline gap-1.5 border-l border-rule pl-4 sm:inline-flex">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{t('tender.file_no')}</span>
            <span className="font-mono text-sm font-medium text-ink">{tender.tender_id}</span>
          </span>
        )}
        <span className="ml-auto hidden items-center gap-1.5 text-sm text-ink-muted lg:flex">
          <ShieldCheck className="h-[18px] w-[18px] text-primary" aria-hidden />
          {t('app.privacy')}
        </span>
        <div role="group" aria-label={t('lang.label')} className="ml-auto flex overflow-hidden rounded-md border border-rule lg:ml-0">
          {(['bn', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => choose(l)}
              className={cn(
                'min-h-9 px-3 text-sm font-medium transition-colors first:border-r first:border-rule',
                lang === l ? 'bg-primary text-primary-fg' : 'bg-sheet text-ink hover:bg-khaki-soft/60',
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

/** Steps as file-divider tabs along the top edge of the workspace. */
export function Stepper() {
  const t = useT();
  const { step, setStep, tender, files } = useStore();
  const { canGenerate } = useEvaluation();
  const done = [!!tender, files.some((f) => !f.error), canGenerate, false];
  return (
    <nav aria-label={t('step.nav')} className="mx-auto w-full max-w-[1280px] px-6 pt-6">
      <ol className="flex gap-1 border-b border-rule">
        {([1, 2, 3, 4] as const).map((n, i) => {
          const active = step === n;
          const isDone = done[i] && !active;
          return (
            <li key={n} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setStep(n)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'relative -mb-px flex min-h-11 w-full items-center gap-2.5 rounded-t-md border border-b-0 px-3 py-2 text-left transition-colors',
                  active
                    ? 'z-10 border-rule border-t-[3px] border-t-khaki bg-sheet text-ink'
                    : 'border-transparent bg-khaki-soft/70 text-ink-muted hover:bg-khaki-soft hover:text-ink',
                )}
              >
                <span className={cn('font-mono text-sm font-semibold tabular', active ? 'text-primary' : isDone ? 'text-st-ok' : '')}>
                  {isDone ? <Check className="h-4 w-4" aria-label={t('step.done')} /> : `${n}`}
                </span>
                <span className={cn('truncate text-sm', active && 'font-semibold')}>{t(`step.${n}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
