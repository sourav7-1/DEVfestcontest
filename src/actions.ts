// User-level actions shared by drag-and-drop and the dropdowns: confirmations, toasts, row feedback.
import { toast } from 'sonner';
import { reqTitle, tr, useStore } from './store';

const docName = (reqId: string) => {
  const s = useStore.getState();
  const r = s.requirements.find((q) => q.id === reqId);
  return r ? reqTitle(r, s.lang) : reqId;
};
const fileName = (fileId: string) => useStore.getState().files.find((f) => f.id === fileId)?.name ?? '';

/** Ask before replacing a different file already in the slot; otherwise match straight away. */
export function requestMatch(reqId: string, fileId: string) {
  const current = useStore.getState().matches[reqId];
  if (current && current !== fileId) useStore.getState().setPendingReplace({ reqId, fileId });
  else commitMatch(reqId, fileId);
}

export function commitMatch(reqId: string, fileId: string) {
  const s = useStore.getState();
  const r = s.assign(reqId, fileId);
  if (!r.ok) {
    s.setFlash(reqId, 'error');
    if (r.reason === 'duplicate_elsewhere') toast.error(tr('match.duplicate_elsewhere', { file: fileName(fileId), doc: docName(r.conflictReqId!) }));
    else toast.error(tr(r.reason === 'error_file' ? 'match.error_file' : 'match.unknown_file', { file: fileName(fileId) }));
    return;
  }
  if (r.movedFrom) toast.success(tr('toast.moved', { file: fileName(fileId), from: docName(r.movedFrom), doc: docName(reqId) }));
  else toast.success(tr('toast.matched', { file: fileName(fileId), doc: docName(reqId) }));
}

export function unmatch(reqId: string) {
  useStore.getState().unassign(reqId);
  toast(tr('toast.unmatched', { doc: docName(reqId) }));
}

/** Scroll a requirement row into view and highlight it. */
export function focusRow(reqId: string) {
  const el = document.getElementById(`req-${reqId}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  useStore.getState().setFlash(reqId, 'focus');
  el?.querySelector<HTMLElement>('select, input, button')?.focus({ preventScroll: true });
}
