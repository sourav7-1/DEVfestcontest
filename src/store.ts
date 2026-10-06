import { create } from 'zustand';
import type { Lang, Requirement, Tender, UploadedFile } from './lib/types';
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

  setTender(tender: Tender, requirements: Requirement[]): void;
  addFiles(files: UploadedFile[]): void;
  removeFile(id: string): void;
  setLang(lang: Lang): void;
  setStep(step: State['step']): void;
  setReading(delta: number): void;
}

export const useStore = create<State>((set) => ({
  tender: null,
  requirements: [],
  files: [],
  matches: {},
  expiries: {},
  lang: loadLang(),
  step: 1,
  readingCount: 0,

  setTender: (tender, requirements) => set({ tender, requirements, matches: {}, expiries: {}, step: 2 }),
  addFiles: (files) => set((s) => ({ files: [...s.files, ...files] })),
  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      matches: Object.fromEntries(Object.entries(s.matches).filter(([, fid]) => fid !== id)),
    })),
  setLang: (lang) => {
    saveLang(lang);
    document.documentElement.lang = lang;
    set({ lang });
  },
  setStep: (step) => set({ step }),
  setReading: (delta) => set((s) => ({ readingCount: Math.max(0, s.readingCount + delta) })),
}));

/** Translation hook: re-renders on language change. */
export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: Key, params?: Record<string, string | number>) => translate(lang, key, params);
}
