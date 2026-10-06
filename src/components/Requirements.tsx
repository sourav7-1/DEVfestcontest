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
  const { error, load } = useRequirementsLoader();
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: (files) => load(files[0]),
  });
  return (
    <Card className="mx-auto mt-6 max-w-4xl overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
        <div className="p-8">
          <h1 className="text-[1.75rem] font-semibold leading-tight text-ink">{t('hero.title')}</h1>
          <p className="mt-3 max-w-prose text-slate-600">{t('hero.lead')}</p>
          <div
            {...getRootProps({
              onClick: open,
              role: 'button',
              tabIndex: 0,
              'aria-label': t('hero.drop'),
              onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()),
            })}
            className={cn(
              'mt-6 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isDragActive ? 'border-primary bg-primary-soft' : 'border-slate-300 bg-slate-50 hover:border-primary/60',
            )}
          >
            <input {...getInputProps({ accept: '.json,application/json' })} />
            <FileJson className="h-10 w-10 text-primary" aria-hidden />
            <span className="text-lg font-medium text-ink">{isDragActive ? t('hero.drop_active') : t('hero.drop')}</span>
            <span className="text-sm text-slate-500">{t('hero.drop_hint')}</span>
            <Button type="button" variant="outline" tabIndex={-1} className="mt-1">
              {t('hero.choose')}
            </Button>
          </div>
          {error && (
            <Alert className="mt-4 animate-in fade-in-0">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{t('err.title')}</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
            </Alert>
          )}
        </div>
        <div className="border-t border-line bg-slate-50 p-8 md:border-l md:border-t-0">
          <h2 className="text-base font-semibold text-ink">{t('hero.how')}</h2>
          <ol className="mt-4 space-y-5">
            {(['hero.how1', 'hero.how2', 'hero.how3', 'hero.how4'] as const).map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark">
                  {localizeDigits(String(i + 1), useStore.getState().lang)}
                </span>
                <span className="text-slate-700">{t(k)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );
}

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
    <Card className="p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">
            {t('tender.summary')} · <span className="font-mono">{tender.tender_id}</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink">{tender.title || t('tender.not_given')}</h1>
          <dl className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-slate-500">{t(k)}:</dt>
                <dd className="font-medium text-ink">{v || t('tender.not_given')}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3',
            days < 0 ? 'border-red-200 bg-red-50' : days <= 3 ? 'border-amber-200 bg-amber-50' : 'border-line bg-slate-50',
          )}
        >
          <CalendarDays className={cn('h-6 w-6', days < 0 ? 'text-red-700' : 'text-primary')} aria-hidden />
          <div>
            <p className="text-sm text-slate-500">{t('tender.deadline')}</p>
            <p className="font-semibold text-ink">{dateText}</p>
            <p className={cn('text-sm font-medium', days < 0 ? 'text-red-700' : days <= 3 ? 'text-amber-800' : 'text-primary-dark')}>
              {countdown}
            </p>
          </div>
        </div>
      </div>
      <input {...getInputProps({ accept: '.json,application/json' })} />
      <Button variant="ghost" className="mt-3 -ml-2" onClick={open}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        {t('tender.replace')}
      </Button>
    </Card>
  );
}
