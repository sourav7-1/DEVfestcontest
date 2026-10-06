import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Lang, Requirement, Tender, UploadedFile } from './lib/types';
import { assign, removeFileFromMatches, unassign, type AssignResult } from './lib/matching';
import { evaluate, type Evaluation } from './lib/status';
import { loadLang, saveLang, translate, type Key } from './i18n';

interface State {
  tender: Tender | null;
  requirements: Requirement[];
  files: UploadedFile[];
  /** reqId → fileId */
  matches: Record<string, string>;
  /** reqId → YYYY-MM-DD */
  expiries: Record<string, string>;
  lang: Lang;
  step: 1 | 2 | 3 | 4;
  readingCount: number;
  /** transient UI: row to shake (error) or highlight (focus); `n` retriggers the animation */
  flash: { reqId: string; kind: 'error' | 'focus'; n: number } | null;
  previewFileId: string | null;
  /** drop onto an occupied slot waits here for confirmation */
  pendingReplace: { reqId: string; fileId: string } | null;

  setTender(tender: Tender, requirements: Requirement[]): void;
  addFiles(files: UploadedFile[]): void;
  removeFile(id: string): void;
  assign(reqId: string, fileId: string): AssignResult;
  unassign(reqId: string): void;
  setExpiry(reqId: string, date: string): void;
  setLang(lang: Lang): void;
  setStep(step: State['step']): void;
  setReading(delta: number): void;
  setFlash(reqId: string, kind: 'error' | 'focus'): void;
  setPreview(fileId: string | null): void;
  setPendingReplace(p: State['pendingReplace']): void;
}

export const useStore = create<State>((set, get) => ({
  tender: null,
  requirements: [],
  files: [],
  matches: {},
  expiries: {},
  lang: loadLang(),
  step: 1,
  readingCount: 0,
  flash: null,
  previewFileId: null,
  pendingReplace: null,

  setTender: (tender, requirements) => set({ tender, requirements, matches: {}, expiries: {}, step: 2 }),
  addFiles: (files) => set((s) => ({ files: [...s.files, ...files] })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id), ...removeFileFromMatches(s, id) })),
  assign: (reqId, fileId) => {
    const s = get();
    const r = assign(s, reqId, fileId, s.files);
    if (r.ok) set({ ...r.state, step: s.step < 3 ? 3 : s.step });
    return r;
  },
  unassign: (reqId) => set((s) => unassign(s, reqId)),
  setExpiry: (reqId, date) =>
    set((s) => {
      const expiries = { ...s.expiries };
      if (date) expiries[reqId] = date;
      else delete expiries[reqId];
      return { expiries };
    }),
  setLang: (lang) => {
    saveLang(lang);
    document.documentElement.lang = lang;
    set({ lang });
  },
  setStep: (step) => set({ step }),
  setReading: (delta) => set((s) => ({ readingCount: Math.max(0, s.readingCount + delta) })),
  setFlash: (reqId, kind) => set((s) => ({ flash: { reqId, kind, n: (s.flash?.n ?? 0) + 1 } })),
  setPreview: (previewFileId) => set({ previewFileId }),
  setPendingReplace: (pendingReplace) => set({ pendingReplace }),
}));

/** Translation hook: re-renders on language change. */
export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: Key, params?: Record<string, string | number>) => translate(lang, key, params);
}

/** Live statuses + blocking reasons, recomputed whenever inputs change. */
export function useEvaluation(): Evaluation {
  const { requirements, matches, expiries, tender, files } = useStore(
    useShallow((s) => ({ requirements: s.requirements, matches: s.matches, expiries: s.expiries, tender: s.tender, files: s.files })),
  );
  return useMemo(() => evaluate(requirements, matches, expiries, tender?.deadline ?? '', files), [requirements, matches, expiries, tender, files]);
}

/** Non-hook access for event handlers. */
export const tr = (key: Key, params?: Record<string, string | number>) => translate(useStore.getState().lang, key, params);
export const reqTitle = (r: Requirement, lang: Lang) => (lang === 'bn' ? r.title_bn : r.title_en);
export const reqCode = (r: Requirement) => `R${String(r.order).padStart(2, '0')}`;
