import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { daysUntil, normalizeDate, parseRequirements, RequirementsError } from './requirements';
import { applyLimits, isPdfHeader, MAX_FILES, MAX_TOTAL_BYTES, readUpload, sha256, type PageCounter } from './files';
import { duplicateGroups, duplicateOf } from './duplicates';
import type { UploadedFile } from './types';

const reqJson = (reqs: unknown[], extra: object = {}) =>
  JSON.stringify({ tender_id: 'T-1', title: 'X', procuring_entity: 'PE', bidder: 'B', submission_deadline: '2026-10-20', requirements: reqs, ...extra });
const errKey = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as RequirementsError).key;
  }
  return null;
};

describe('requirements', () => {
  it('sorts by order regardless of array order', () => {
    const { requirements } = parseRequirements(
      reqJson([
        { id: 'c', order: 3, title_en: 'C' },
        { id: 'a', order: 1, title_en: 'A' },
        { id: 'b', order: 2, title_en: 'B', title_bn: 'বি' },
      ]),
    );
    expect(requirements.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(requirements[0].title_bn).toBe('A'); // falls back to English
  });

  it('reads mandatory/expiry flags and aliases', () => {
    const { tender, requirements } = parseRequirements(
      JSON.stringify({ tender_id: 'T', deadline: '2026-01-05', requirements: [{ id: 'x', order: '1', title: 'X', required: false, expiry_check: true }] }),
    );
    expect(tender.deadline).toBe('2026-01-05');
    expect(requirements[0]).toMatchObject({ order: 1, mandatory: false, expiry_required: true });
  });

  it('defaults mandatory to true when absent', () => {
    expect(parseRequirements(reqJson([{ id: 'x', order: 1, title_en: 'X' }])).requirements[0].mandatory).toBe(true);
  });

  it('gives clear error keys', () => {
    expect(errKey(() => parseRequirements('{ bad json'))).toBe('err.json_syntax');
    expect(errKey(() => parseRequirements('[]'))).toBe('err.json_not_object');
    expect(errKey(() => parseRequirements(reqJson([])))).toBe('err.no_requirements');
    expect(errKey(() => parseRequirements(reqJson([{ id: 'a', title_en: 'A' }])))).toBe('err.req_order');
    expect(errKey(() => parseRequirements(reqJson([{ id: 'a', order: 1 }])))).toBe('err.req_title');
    expect(errKey(() => parseRequirements(reqJson([{ id: 'a', order: 1, title_en: 'A' }, { id: 'a', order: 2, title_en: 'B' }])))).toBe('err.req_dup_id');
    expect(errKey(() => parseRequirements(reqJson([{ id: 'a', order: 1, title_en: 'A' }], { submission_deadline: '20/10/2026' })))).toBe('err.bad_deadline');
  });

  it('validates dates and counts days', () => {
    expect(normalizeDate('2026-02-30')).toBe('');
    expect(normalizeDate('2026-10-20T00:00:00Z')).toBe('2026-10-20');
    expect(daysUntil('2026-10-20', '2026-10-06')).toBe(14);
    expect(daysUntil('2026-10-01', '2026-10-06')).toBe(-5);
  });
});

describe('file validation', () => {
  const file = (name: string, bytes: Uint8Array) => ({ name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer });
  const pages: PageCounter = async () => 2;

  it('detects PDFs by magic bytes, not extension', async () => {
    const pdf = await (await PDFDocument.create()).save();
    expect(isPdfHeader(pdf)).toBe(true);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    expect(isPdfHeader(png)).toBe(false);
    expect(isPdfHeader(new TextEncoder().encode('junk\n%PDF-1.4\n'))).toBe(true); // header within first 1024 bytes
    const late = new Uint8Array(2000);
    late.set(new TextEncoder().encode('%PDF-'), 1500);
    expect(isPdfHeader(late)).toBe(false);
    expect((await readUpload(file('fake.pdf', png), pages)).error).toBe('not_pdf');
    const ok = await readUpload(file('ok.bin', pdf), pages);
    expect(ok.error).toBeUndefined();
    expect(ok).toMatchObject({ pageCount: 2 });
  });

  it('maps unreadable PDFs to friendly errors and never throws', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.7 ...');
    expect((await readUpload(file('a.pdf', pdf), async () => 'encrypted')).error).toBe('encrypted');
    expect((await readUpload(file('b.pdf', pdf), async () => { throw new Error('boom'); })).error).toBe('corrupt');
    expect((await readUpload(file('c.pdf', pdf), async () => 0)).error).toBe('corrupt');
  });

  it('enforces 30 files / 50 MB', () => {
    const existing = Array.from({ length: 29 }, () => ({ size: 1 }));
    const r = applyLimits(existing, [{ size: 1 }, { size: 1 }]);
    expect([r.accepted.length, r.overLimit.length, r.reason]).toEqual([1, 1, 'count']);
    expect(applyLimits([{ size: 1, error: 'not_pdf' as const }], [{ size: 1 }]).accepted).toHaveLength(1); // rejected don't count
    const s = applyLimits([{ size: MAX_TOTAL_BYTES - 10 }], [{ size: 20 }, { size: 5 }]);
    expect([s.accepted.length, s.reason]).toEqual([1, 'size']);
    expect(MAX_FILES).toBe(30);
  });

  it('hashes with SHA-256', async () => {
    expect(await sha256(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('duplicates', () => {
  const f = (id: string, hash: string, error?: UploadedFile['error']): UploadedFile => ({ id, name: `${id}.pdf`, size: 1, bytes: new Uint8Array(), pageCount: 1, hash, error });
  it('groups identical hashes and ignores errored files', () => {
    const files = [f('a', 'h1'), f('b', 'h2'), f('c', 'h1'), f('d', 'h2', 'corrupt'), f('e', 'h3')];
    expect(duplicateGroups(files).map((g) => g.map((x) => x.id))).toEqual([['a', 'c']]);
    const map = duplicateOf(files);
    expect(map.a.id).toBe('c');
    expect(map.c.id).toBe('a');
    expect(map.b).toBeUndefined();
  });
});

// Official sample pack regression: its traps must be detected end-to-end with the same pdfjs the app uses.
const pack = path.resolve('sample-pack/documents');
describe.runIf(fs.existsSync(pack))('sample pack', () => {
  const nodeCounter: PageCounter = async (bytes) => {
    try {
      return (await getDocument({ data: bytes.slice(), verbosity: 0 }).promise).numPages;
    } catch (e) {
      return (e as { name?: string }).name === 'PasswordException' ? 'encrypted' : 'corrupt';
    }
  };
  it('classifies every document', async () => {
    const out: Record<string, string | number> = {};
    const files: UploadedFile[] = [];
    for (const name of fs.readdirSync(pack)) {
      const bytes = new Uint8Array(fs.readFileSync(path.join(pack, name)));
      const u = await readUpload({ name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer }, nodeCounter);
      out[name] = u.error ?? u.pageCount;
      files.push(u);
    }
    expect(out).toEqual({
      'company_logo.png': 'not_pdf',
      'scan_0042.pdf': 1, // image-only scan (the signed declaration)
      '01_financial_proposal.pdf': 2,
      '02_technical_proposal.pdf': 6,
      '03_tin_certificate.pdf': 1,
      '04_vat_certificate.pdf': 1,
      'bank_solvency.pdf': 1,
      'experience_cert.pdf': 2,
      'experience_cert (1).pdf': 2,
      'trade_license_2025.pdf': 1,
      'trade_license_2026.pdf': 1,
    });
    expect(duplicateGroups(files).map((g) => g.map((x) => x.name).sort())).toEqual([['experience_cert (1).pdf', 'experience_cert.pdf']]);
  });
});
