import { Status, type Requirement, type UploadedFile } from './types.ts';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Exactly one status per requirement, in this order:
 * missing → not provided → expiry needed → expired → ok.
 * Dates are compared as YYYY-MM-DD strings (lexicographic == chronological; no timezone parsing).
 * Expiry equal to the deadline is OK (still valid on submission day).
 */
export function requirementStatus(req: Requirement, hasFile: boolean, expiry: string | undefined, deadline: string): Status {
  if (!hasFile) return req.mandatory ? Status.Missing : Status.NotProvided;
  if (req.expiry_required) {
    if (!expiry || !ISO.test(expiry)) return Status.ExpiryNeeded;
    if (expiry < deadline) return Status.Expired;
  }
  return Status.OK;
}

export const isBlocking = (s: Status) => s !== Status.OK && s !== Status.NotProvided;

export type Blocker =
  | { kind: 'missing' | 'expiry_needed'; reqId: string }
  | { kind: 'expired'; reqId: string; expiry: string }
  | { kind: 'duplicate_match'; reqId: string; otherReqId: string };

export interface Evaluation {
  byReq: Record<string, Status>;
  blockers: Blocker[];
  ready: number;
  canGenerate: boolean;
}

export function evaluate(
  requirements: Requirement[],
  matches: Record<string, string>,
  expiries: Record<string, string>,
  deadline: string,
  files: UploadedFile[],
): Evaluation {
  const byId = new Map(files.map((f) => [f.id, f]));
  const byReq: Record<string, Status> = {};
  const blockers: Blocker[] = [];
  const hashOwner = new Map<string, string>();
  let ready = 0;
  for (const r of requirements) {
    const file = byId.get(matches[r.id] ?? '');
    const usable = !!file && !file.error;
    const s = requirementStatus(r, usable, expiries[r.id], deadline);
    byReq[r.id] = s;
    if (s === Status.OK) ready++;
    if (s === Status.Missing || s === Status.ExpiryNeeded) blockers.push({ kind: s === Status.Missing ? 'missing' : 'expiry_needed', reqId: r.id });
    if (s === Status.Expired) blockers.push({ kind: 'expired', reqId: r.id, expiry: expiries[r.id] });
    // Defensive: matching.ts already forbids this, but never let identical content into two slots.
    if (usable) {
      const other = hashOwner.get(file.hash);
      if (other) blockers.push({ kind: 'duplicate_match', reqId: r.id, otherReqId: other });
      else hashOwner.set(file.hash, r.id);
    }
  }
  return { byReq, blockers, ready, canGenerate: blockers.length === 0 && requirements.length > 0 };
}
