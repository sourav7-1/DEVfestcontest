import type { UploadedFile } from './types';

/** reqId → fileId, reqId → YYYY-MM-DD */
export interface MatchState {
  matches: Record<string, string>;
  expiries: Record<string, string>;
}

export type RejectReason = 'error_file' | 'unknown_file' | 'duplicate_elsewhere';
export type AssignResult =
  | { ok: true; state: MatchState; movedFrom?: string; replaced?: string }
  | { ok: false; reason: RejectReason; conflictReqId?: string };

const without = <T>(o: Record<string, T>, ...keys: string[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as Record<string, T>;

/**
 * Put `fileId` into requirement `reqId`.
 * - One file per requirement: an existing file in the slot is replaced (caller confirms first).
 * - One requirement per file: if the file sits in another slot it is moved.
 * - Error files never match; identical content may not sit in a *different* requirement.
 * A replaced document's expiry is cleared; a moved document keeps its expiry (same document, same date).
 */
export function assign(state: MatchState, reqId: string, fileId: string, files: UploadedFile[]): AssignResult {
  const file = files.find((f) => f.id === fileId);
  if (!file) return { ok: false, reason: 'unknown_file' };
  if (file.error) return { ok: false, reason: 'error_file' };
  if (state.matches[reqId] === fileId) return { ok: true, state };

  const movedFrom = Object.keys(state.matches).find((r) => state.matches[r] === fileId);
  const byId = new Map(files.map((f) => [f.id, f]));
  const conflictReqId = Object.keys(state.matches).find(
    (r) => r !== reqId && r !== movedFrom && byId.get(state.matches[r])?.hash === file.hash,
  );
  if (conflictReqId) return { ok: false, reason: 'duplicate_elsewhere', conflictReqId };

  const replaced = state.matches[reqId];
  const cleared = movedFrom ? [reqId, movedFrom] : [reqId];
  return {
    ok: true,
    movedFrom,
    replaced,
    state: {
      matches: { ...without(state.matches, ...cleared), [reqId]: fileId },
      expiries: { ...without(state.expiries, ...cleared), ...(movedFrom && state.expiries[movedFrom] ? { [reqId]: state.expiries[movedFrom] } : {}) },
    },
  };
}

/** Move whatever is in `fromReq` to `toReq` (same rules as assign). */
export function move(state: MatchState, fromReq: string, toReq: string, files: UploadedFile[]): AssignResult {
  const fileId = state.matches[fromReq];
  return fileId ? assign(state, toReq, fileId, files) : { ok: false, reason: 'unknown_file' };
}

export function unassign(state: MatchState, reqId: string): MatchState {
  return { matches: without(state.matches, reqId), expiries: without(state.expiries, reqId) };
}

/** Drop a file: its match and that requirement's expiry go with it. */
export function removeFileFromMatches(state: MatchState, fileId: string): MatchState {
  const reqs = Object.keys(state.matches).filter((r) => state.matches[r] === fileId);
  return { matches: without(state.matches, ...reqs), expiries: without(state.expiries, ...reqs) };
}
