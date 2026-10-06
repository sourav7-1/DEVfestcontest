// Judge-mode: an unseen-style pack (test-pack/) must produce exactly the statuses the rules demand.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseRequirements } from './requirements';
import { readUpload, type PageCounter } from './files';
import { assign, type MatchState } from './matching';
import { evaluate } from './status';
import { duplicateGroups } from './duplicates';
import type { UploadedFile } from './types';

const pack = path.resolve('test-pack');
const counter: PageCounter = async (bytes) => {
  try {
    return (await getDocument({ data: bytes.slice(), verbosity: 0 }).promise).numPages;
  } catch (e) {
    return (e as { name?: string }).name === 'PasswordException' ? 'encrypted' : 'corrupt';
  }
};

describe.runIf(fs.existsSync(pack))('judge-mode test-pack', () => {
  it('applies every rule', async () => {
    const { tender, requirements } = parseRequirements(fs.readFileSync(path.join(pack, 'requirements.json'), 'utf8'));
    expect(tender.tender_id).toBe('LGED-CTG-2026-1189');
    expect(requirements.map((r) => r.order)).toEqual([10, 20, 25, 30, 40, 50, 60]); // unsorted in file
    const files: UploadedFile[] = [];
    for (const name of fs.readdirSync(path.join(pack, 'documents'))) {
      const b = new Uint8Array(fs.readFileSync(path.join(pack, 'documents', name)));
      files.push(await readUpload({ name, size: b.length, arrayBuffer: async () => b.slice().buffer }, counter));
    }
    const f = (n: string) => files.find((x) => x.name === n)!;
    expect(f('bank_reference.pdf').error).toBe('not_pdf'); // .txt renamed
    expect(f('HSE_policy_signed.pdf').error).toBe('encrypted');
    expect(duplicateGroups(files).map((g) => g.map((x) => x.name).sort())).toEqual([['Copy of plan (final).pdf', 'methodology_v3.pdf']]);

    let s: MatchState = { matches: {}, expiries: {} };
    const put = (req: string, name: string) => {
      const r = assign(s, req, f(name).id, files);
      if (r.ok) s = r.state;
      return r;
    };
    put('trade_lic', 'TL_2026.pdf');
    put('tax_cert', 'scan_17.pdf');
    put('company_reg', 'incorporation.pdf');
    put('work_plan', 'methodology_v3.pdf');
    put('insurance', 'CAR_policy_2026.pdf');
    expect(put('bank_ref', 'bank_reference.pdf')).toEqual({ ok: false, reason: 'error_file' });
    expect(put('safety_policy', 'HSE_policy_signed.pdf')).toEqual({ ok: false, reason: 'error_file' });
    expect(put('company_reg', 'Copy of plan (final).pdf')).toMatchObject({ ok: false, reason: 'duplicate_elsewhere', conflictReqId: 'work_plan' });
    s = { ...s, expiries: { trade_lic: '2026-11-15', tax_cert: '2026-12-31' } };

    let ev = evaluate(requirements, s.matches, s.expiries, tender.deadline, files);
    expect(ev.byReq).toEqual({
      trade_lic: 'ok', // expires exactly on the deadline
      tax_cert: 'ok',
      bank_ref: 'not_provided',
      company_reg: 'ok',
      work_plan: 'ok',
      insurance: 'expiry_needed', // optional with expiry, matched, no date yet → blocking
      safety_policy: 'not_provided',
    });
    expect(ev.canGenerate).toBe(false);
    s.expiries.insurance = '2026-11-14'; // one day before
    ev = evaluate(requirements, s.matches, s.expiries, tender.deadline, files);
    expect(ev.byReq.insurance).toBe('expired');
    expect(ev.blockers).toEqual([{ kind: 'expired', reqId: 'insurance', expiry: '2026-11-14' }]);
  });

  it('builds and verifies the package end-to-end (scripts/build-package.mjs)', () => {
    const out = execFileSync(process.execPath, ['scripts/build-package.mjs', 'test-pack', '--out=test-pack/output'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toContain('7 expected statuses confirmed');
    expect(out).toContain('OK: all footers correct');
  });
});

describe.runIf(fs.existsSync(path.resolve('sample-pack/resolution.json')))('official sample pack', () => {
  it('resolves every requirement and builds a verified package (scripts/build-package.mjs)', () => {
    const out = execFileSync(process.execPath, ['scripts/build-package.mjs', 'sample-pack'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toContain('10 expected statuses confirmed');
    expect(out).toContain('T-2026-0417_Package.pdf: 16 pages');
    expect(out).toContain('OK: all footers correct');
  });
});
