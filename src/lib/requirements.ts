import type { Requirement, Tender } from './types';

/** Error carrying an i18n key so the UI can show it in either language. */
export class RequirementsError extends Error {
  key: string;
  params: Record<string, string | number>;
  constructor(key: string, params: Record<string, string | number> = {}) {
    super(`${key} ${JSON.stringify(params)}`);
    this.key = key;
    this.params = params;
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const pick = (o: Record<string, unknown>, ...keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined);
const bool = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

/** Accepts "YYYY-MM-DD" (or an ISO timestamp) and returns YYYY-MM-DD, or '' if invalid. */
export function normalizeDate(v: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(v));
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

export function parseRequirements(text: string): { tender: Tender; requirements: Requirement[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch (e) {
    throw new RequirementsError('err.json_syntax', { detail: (e as Error).message });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new RequirementsError('err.json_not_object');
  const o = raw as Record<string, unknown>;
  const t = (o.tender && typeof o.tender === 'object' ? o.tender : o) as Record<string, unknown>;

  const tender: Tender = {
    tender_id: str(pick(t, 'tender_id', 'tenderId', 'id', 'tender_no')),
    title: str(pick(t, 'title', 'title_en', 'tender_title', 'name')),
    procuring_entity: str(pick(t, 'procuring_entity', 'procuringEntity', 'entity', 'organization')),
    bidder: str(pick(t, 'bidder', 'bidder_name', 'company', 'bidderName')),
    deadline: normalizeDate(pick(t, 'submission_deadline', 'deadline', 'closing_date', 'submissionDeadline')),
  };
  if (!tender.tender_id) throw new RequirementsError('err.missing_field', { field: 'tender_id' });
  if (!tender.deadline) throw new RequirementsError('err.bad_deadline');

  const list = pick(o, 'requirements', 'documents', 'required_documents');
  if (!Array.isArray(list) || list.length === 0) throw new RequirementsError('err.no_requirements');

  const seen = new Set<string>();
  const requirements = list.map((r, i): Requirement => {
    if (!r || typeof r !== 'object') throw new RequirementsError('err.req_invalid', { n: i + 1 });
    const q = r as Record<string, unknown>;
    const id = str(pick(q, 'id', 'code', 'key')) || `req_${i + 1}`;
    if (seen.has(id)) throw new RequirementsError('err.req_dup_id', { id });
    seen.add(id);
    const order = Number(pick(q, 'order', 'sequence', 'position'));
    if (!Number.isFinite(order)) throw new RequirementsError('err.req_order', { n: i + 1, id });
    const title_en = str(pick(q, 'title_en', 'title', 'name_en', 'name'));
    const title_bn = str(pick(q, 'title_bn', 'name_bn')) || title_en;
    if (!title_en && !title_bn) throw new RequirementsError('err.req_title', { n: i + 1, id });
    return {
      id,
      order,
      title_en: title_en || title_bn,
      title_bn,
      mandatory: bool(pick(q, 'mandatory', 'required', 'is_mandatory') ?? true),
      expiry_required: bool(pick(q, 'expiry_required', 'expiry_check', 'requires_expiry', 'check_expiry', 'has_expiry')),
    };
  });
  // Never trust array order: sort by `order`, stable for ties.
  requirements.sort((a, b) => a.order - b.order);
  return { tender, requirements };
}

/** Whole days from `today` to `deadline` (both YYYY-MM-DD). Negative = passed. */
export function daysUntil(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
}

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
