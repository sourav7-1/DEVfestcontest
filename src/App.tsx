import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { FileText, Info } from 'lucide-react';
import { useEvaluation, useStore, useT } from '@/store';
import { requestMatch } from '@/actions';
import { TopBar, Stepper } from '@/components/Header';
import { RequirementsHero, TenderSummary } from '@/components/Requirements';
import { Checklist } from '@/components/Checklist';
import { FilesTray } from '@/components/FilesTray';
import { GenerateBar } from '@/components/GenerateBar';
import { PreviewSheet, ReplaceDialog } from '@/components/Dialogs';
import { Alert, TooltipProvider } from '@/components/ui';

function StepGuidance() {
  const t = useT();
  const { step, tender, files } = useStore();
  const { canGenerate } = useEvaluation();
  const msg =
    step >= 2 && !tender
      ? t('step.need_req')
      : step >= 3 && !files.some((f) => !f.error)
        ? t('step.need_files')
        : step === 3
          ? t('step.match_hint')
          : step === 4
            ? t(canGenerate ? 'step.gen_ready' : 'step.need_fix')
            : null;
  if (!msg) return null;
  return (
    <Alert tone="info" className="mb-6">
      <Info className="mt-0.5 shrink-0" aria-hidden />
      <p>{msg}</p>
    </Alert>
  );
}

function Workspace() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragId, setDragId] = useState<string | null>(null);
  const dragFile = useStore((s) => s.files.find((f) => f.id === dragId));
  const onStart = (e: DragStartEvent) => setDragId((e.active.data.current?.fileId as string) ?? null);
  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    const fileId = e.active.data.current?.fileId as string | undefined;
    const reqId = e.over?.data.current?.reqId as string | undefined;
    if (fileId && reqId) requestMatch(reqId, fileId);
  };
  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Checklist />
        <FilesTray />
      </div>
      <DragOverlay dropAnimation={null}>
        {dragFile && (
          <div className="sheet-fold flex max-w-xs -rotate-1 items-center gap-2 rounded-sm border border-primary bg-sheet py-2 pl-3 pr-5 shadow-lift">
            <FileText className="h-[18px] w-[18px] shrink-0 text-tape" aria-hidden />
            <span className="truncate font-medium text-ink">{dragFile.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
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
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <TopBar />
        <Stepper />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-10 pt-6">
          <StepGuidance />
          {!tender ? (
            <RequirementsHero />
          ) : (
            <div className="space-y-6">
              <TenderSummary />
              <Workspace />
            </div>
          )}
        </main>
        {tender && <GenerateBar />}
      </div>
      <PreviewSheet />
      <ReplaceDialog />
      <Toaster
        position="top-right"
        offset={72}
        closeButton
        toastOptions={{
          classNames: {
            toast: '!rounded-md !border !border-rule !border-l-4 !bg-sheet !font-sans !text-base !text-ink !shadow-lift',
            success: '!border-l-st-ok [&_[data-icon]]:!text-st-ok',
            error: '!border-l-tape [&_[data-icon]]:!text-tape',
            warning: '!border-l-st-need [&_[data-icon]]:!text-st-need',
            info: '!border-l-khaki',
            default: '!border-l-khaki',
            closeButton: '!border-rule !bg-sheet !text-ink-muted',
          },
        }}
      />
    </TooltipProvider>
  );
}
