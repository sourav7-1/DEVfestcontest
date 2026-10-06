import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { AlertTriangle, CalendarDays, FileJson, RefreshCw } from 'lucide-react';
import { parseRequirements, RequirementsError, daysUntil, todayISO } from '@/lib/requirements';
import { localizeDigits, translate, type Key } from '@/i18n';
import { useStore, useT } from '@/store';
import { Alert, Button, Card, cn } from './ui';

/** Reads + validates a requirements file; returns an error message or loads it into the store. */
function useRequirementsLoader() {
  const [error, setError] = useState<string | null>(null);
  const setTender = useStore((s) => s.setTender);
  const load = async (file: File | undefined) => {
    const lang = useStore.getState().lang;
    if (!file) return;
    const fail = (msg: string) => {
      setError(msg);
      toast.error(translate(lang, 'toast.req_failed'));
    };
    if (!/\.json$/i.test(file.name) && file.type !== 'application/json') return fail(translate(lang, 'err.not_json', { name: file.name }));
    let text: string;
    try {
      text = await file.text();
    } catch {
      return fail(translate(lang, 'err.read'));
    }
    try {
      const { tender, requirements } = parseRequirements(text);
      setError(null);
      setTender(tender, requirements);
      toast.success(translate(lang, 'toast.req_loaded', { n: requirements.length, id: tender.tender_id }));
    } catch (e) {
      if (e instanceof RequirementsError) fail(translate(lang, e.key as Key, e.params));
      else fail(translate(lang, 'err.read'));
    }
  };
  return { error, load };
}

export function RequirementsHero() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const { error, load } = useRequirementsLoader();
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: (files) => load(files[0]),
  });
  return (
    <Card className="mt-2 grid overflow-hidden md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="p-8">
        <h1 className="max-w-[34ch] text-2xl font-semibold text-ink">{t('hero.title')}</h1>
        <p className="mt-3 max-w-[60ch] text-ink-muted">{t('hero.lead')}</p>
        <div
          {...getRootProps({
            onClick: open,
            role: 'button',
            tabIndex: 0,
            'aria-label': t('hero.drop'),
            onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()),
          })}
          className={cn(
            'mt-6 flex cursor-pointer items-center gap-4 rounded-md border-2 border-dashed px-5 py-6 transition-colors',
            isDragActive ? 'border-primary bg-khaki-soft' : 'border-rule bg-paper/60 hover:border-khaki',
          )}
        >
          <input {...getInputProps({ accept: '.json,application/json' })} />
          <FileJson className="h-8 w-8 shrink-0 text-khaki-deep" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{isDragActive ? t('hero.drop_active') : t('hero.drop')}</p>
            <p className="text-sm text-ink-muted">{t('hero.drop_hint')}</p>
          </div>
          <Button type="button" variant="outline" tabIndex={-1} className="hidden shrink-0 sm:inline-flex">
            {t('hero.choose')}
          </Button>
        </div>
        {error && (
          <Alert className="mt-4 animate-in fade-in-0">
            <AlertTriangle className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{t('err.title')}</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          </Alert>
        )}
      </div>
      <div className="border-t border-rule bg-paper/50 p-8 md:border-l md:border-t-0">
        <h2 className="text-lg font-semibold text-ink">{t('hero.how')}</h2>
        <ol className="mt-4 border-t border-rule">
          {(['hero.how1', 'hero.how2', 'hero.how3', 'hero.how4'] as const).map((k, i) => (
            <li key={k} className="grid grid-cols-[2rem_1fr] border-b border-rule py-3">
              <span className="font-mono text-sm font-semibold tabular text-khaki-deep">{localizeDigits(String(i + 1), lang)}</span>
              <span className="text-ink">{t(k)}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

/** The front of the tender file: khaki cover, labeled fields, deadline. */
export function TenderSummary() {
  const t = useT();
  const { tender, lang } = useStore();
  const { load } = useRequirementsLoader();
  const { getInputProps, open } = useDropzone({ multiple: false, noDrag: true, onDrop: (f) => load(f[0]) });
  if (!tender) return null;
  const days = daysUntil(tender.deadline, todayISO());
  const dateText = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(tender.deadline),
  );
  const countdown =
    days < 0 ? t('tender.passed') : days === 0 ? t('tender.today') : days === 1 ? t('tender.day_left') : t('tender.days_left', { n: days });
  const rows: [Key, string][] = [
    ['tender.entity', tender.procuring_entity],
    ['tender.bidder', tender.bidder],
  ];
  return (
    <section aria-label={t('tender.summary')} className="relative overflow-hidden rounded-r-lg border border-l-4 border-rule border-l-khaki bg-khaki-soft">
      {/* lal fita: the red tape across the file corner */}
      <span aria-hidden className="pointer-events-none absolute -right-10 top-5 h-2.5 w-40 rotate-45 bg-tape/85" />
      <div className="grid gap-6 p-6 pr-14 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="label-caps">
            {t('tender.file_no')} <span className="font-mono font-medium normal-case text-ink [font-variant-caps:normal]">{tender.tender_id}</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink">{tender.title || t('tender.not_given')}</h1>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="min-w-0 border-b border-khaki/60 pb-1">
                <dt className="label-caps">{t(k)}</dt>
                <dd className="text-ink">{v || t('tender.not_given')}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="self-start rounded-md border border-khaki/70 bg-sheet px-4 py-3 md:min-w-56">
          <p className="label-caps flex items-center gap-1.5">
            <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
            {t('tender.deadline')}
          </p>
          <p className="mt-0.5 font-mono text-lg font-medium tabular text-ink">{dateText}</p>
          <p className={cn('text-sm font-semibold', days < 0 ? 'text-tape' : days <= 3 ? 'text-st-need' : 'text-primary')}>{countdown}</p>
        </div>
      </div>
      <div className="border-t border-khaki/60 px-6 py-2">
        <input {...getInputProps({ accept: '.json,application/json' })} />
        <Button variant="ghost" className="-ml-3 min-h-9 text-sm text-ink hover:bg-sheet/70 [&_svg]:h-[18px] [&_svg]:w-[18px]" onClick={open}>
          <RefreshCw aria-hidden />
          {t('tender.replace')}
        </Button>
      </div>
    </section>
  );
}
