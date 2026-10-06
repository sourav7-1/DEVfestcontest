import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { evaluate, requirementStatus } from './status';
import { assign, move, removeFileFromMatches, unassign, type MatchState } from './matching';
import { buildPackage, FOOTER_BAND, packageFileName } from './package';
import { Status, type Requirement, type UploadedFile } from './types';

const DL = '2026-10-20';
const req = (id: string, order: number, mandatory = true, expiry_required = false): Requirement => ({
  id, order, title_en: `Doc ${id}`, title_bn: `ডক ${id}`, mandatory, expiry_required,
});

describe('status engine', () => {
  const m = req('m', 1, true, false);
  const mx = req('mx', 2, true, true);
  const ox = req('ox', 3, false, true);
  it('covers every branch in order', () => {
    expect(requirementStatus(m, false, undefined, DL)).toBe(Status.Missing);
    expect(requirementStatus(ox, false, undefined, DL)).toBe(Status.NotProvided);
    expect(requirementStatus(ox, false, '2020-01-01', DL)).toBe(Status.NotProvided); // stale expiry ignored without file
    expect(requirementStatus(mx, true, undefined, DL)).toBe(Status.ExpiryNeeded);
    expect(requirementStatus(mx, true, '', DL)).toBe(Status.ExpiryNeeded);
    expect(requirementStatus(mx, true, '2026-1-5', DL)).toBe(Status.ExpiryNeeded); // malformed = not entered
    expect(requirementStatus(mx, true, '2026-10-19', DL)).toBe(Status.Expired); // one day before
    expect(requirementStatus(mx, true, '2026-10-20', DL)).toBe(Status.OK); // same day
    expect(requirementStatus(mx, true, '2026-10-21', DL)).toBe(Status.OK);
    expect(requirementStatus(mx, true, '2025-12-31', '2026-01-01')).toBe(Status.Expired); // year boundary
    expect(requirementStatus(ox, true, '2026-09-30', DL)).toBe(Status.Expired); // optional-with-expiry still checked once provided
    expect(requirementStatus(ox, true, undefined, DL)).toBe(Status.ExpiryNeeded);
    expect(requirementStatus(m, true, undefined, DL)).toBe(Status.OK); // mandatory-without-expiry
    expect(requirementStatus(m, true, '2000-01-01', DL)).toBe(Status.OK); // expiry irrelevant when not checked
  });

  it('evaluates blockers, readiness and gating', () => {
    const files = [file('a', 'h1'), file('b', 'h2'), file('bad', 'h3', 'corrupt')];
    const reqs = [m, mx, ox, req('o2', 4, false)];
    const e = evaluate(reqs, { m: 'a', mx: 'b' }, { mx: '2026-09-30' }, DL, files);
    expect(e.byReq).toEqual({ m: Status.OK, mx: Status.Expired, ox: Status.NotProvided, o2: Status.NotProvided });
    expect(e.blockers).toEqual([{ kind: 'expired', reqId: 'mx', expiry: '2026-09-30' }]);
    expect([e.ready, e.canGenerate]).toEqual([1, false]);
    expect(evaluate(reqs, { m: 'a', mx: 'b' }, { mx: DL }, DL, files).canGenerate).toBe(true);
    // a matched error file counts as no file
    expect(evaluate([m], { m: 'bad' }, {}, DL, files).byReq.m).toBe(Status.Missing);
    // illegal duplicate match is a blocker even if it slipped in
    const dup = evaluate([m, req('n', 2)], { m: 'a', n: 'a2' }, {}, DL, [...files, file('a2', 'h1')]);
    expect(dup.blockers).toEqual([{ kind: 'duplicate_match', reqId: 'n', otherReqId: 'm' }]);
    expect(dup.canGenerate).toBe(false);
  });
});

function file(id: string, hash: string, error?: UploadedFile['error']): UploadedFile {
  return { id, name: `${id}.pdf`, size: 1, bytes: new Uint8Array(), pageCount: 1, hash, error };
}

describe('matching', () => {
  const files = [file('a', 'h1'), file('a2', 'h1'), file('b', 'h2'), file('x', 'h9', 'not_pdf')];
  const empty: MatchState = { matches: {}, expiries: {} };
  const ok = (r: ReturnType<typeof assign>) => {
    if (!r.ok) throw new Error(r.reason);
    return r.state;
  };

  it('assigns, replaces and moves keeping 1:1', () => {
    let s = ok(assign(empty, 'r1', 'a', files));
    s = { ...s, expiries: { r1: '2027-01-01' } };
    const replaced = assign(s, 'r1', 'b', files);
    expect(replaced.ok && replaced.replaced).toBe('a');
    expect(ok(replaced)).toEqual({ matches: { r1: 'b' }, expiries: {} }); // new document → expiry cleared
    const moved = assign(s, 'r2', 'a', files); // file a moves from r1 to r2, keeping its expiry
    expect(moved.ok && moved.movedFrom).toBe('r1');
    expect(ok(moved)).toEqual({ matches: { r2: 'a' }, expiries: { r2: '2027-01-01' } });
    expect(ok(move(s, 'r1', 'r3', files)).matches).toEqual({ r3: 'a' });
    expect(move(empty, 'r1', 'r3', files)).toEqual({ ok: false, reason: 'unknown_file' });
  });

  it('rejects error files and duplicates in other requirements', () => {
    expect(assign(empty, 'r1', 'x', files)).toEqual({ ok: false, reason: 'error_file' });
    expect(assign(empty, 'r1', 'nope', files)).toEqual({ ok: false, reason: 'unknown_file' });
    const s = ok(assign(empty, 'r1', 'a', files));
    expect(assign(s, 'r2', 'a2', files)).toEqual({ ok: false, reason: 'duplicate_elsewhere', conflictReqId: 'r1' });
    // swapping the duplicate into the same requirement is fine
    expect(ok(assign(s, 'r1', 'a2', files)).matches).toEqual({ r1: 'a2' });
  });

  it('unassigns and removes files with their expiry', () => {
    const s: MatchState = { matches: { r1: 'a', r2: 'b' }, expiries: { r1: '2027-01-01', r2: '2027-02-02' } };
    expect(unassign(s, 'r1')).toEqual({ matches: { r2: 'b' }, expiries: { r2: '2027-02-02' } });
    expect(removeFileFromMatches(s, 'b')).toEqual({ matches: { r1: 'a' }, expiries: { r1: '2027-01-01' } });
  });
});

// ---------- package ----------
async function makePdf(build: (d: PDFDocument) => Promise<void>) {
  const d = await PDFDocument.create();
  await build(d);
  return d.save();
}
async function pagesText(bytes: Uint8Array) {
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const c = await p.getTextContent();
    const items = c.items.filter((it): it is Extract<typeof it, { str: string }> => 'str' in it);
    out.push({ text: items.map((it) => it.str).join(' '), items, view: p.view, rotate: p.rotate });
  }
  return out;
}
const tender = { tender_id: 'T-42', title: 'A very long tender title '.repeat(6).trim(), procuring_entity: 'PWD', bidder: 'Rahman Ltd', deadline: DL };

describe('package builder', () => {
  it('builds cover + ordered docs with correct footers, handling rotation, origins and mixed sizes', async () => {
    const plain = await makePdf(async (d) => {
      const f = await d.embedFont(StandardFonts.Helvetica);
      d.addPage([595, 842]).drawText('PLAIN-ONE', { x: 50, y: 5, size: 12, font: f }); // text near the very bottom
      d.addPage([400, 300]).drawText('PLAIN-TWO', { x: 50, y: 100, size: 12, font: f });
    });
    const rotated = await makePdf(async (d) => {
      const f = await d.embedFont(StandardFonts.Helvetica);
      for (const angle of [90, 180, 270]) {
        const p = d.addPage([600, 400]);
        p.setRotation(degrees(angle));
        p.drawText(`ROT-${angle}`, { x: 20, y: 20, size: 12, font: f });
      }
    });
    const offset = await makePdf(async (d) => {
      const f = await d.embedFont(StandardFonts.Helvetica);
      const p = d.addPage([700, 900]);
      p.setMediaBox(100, 200, 300, 300); // non-zero origin (x, y, width, height)
      p.drawText('OFFSET-ORIGIN', { x: 150, y: 210, size: 12, font: f }); // 10pt above the box bottom
    });

    const progress: number[] = [];
    const res = await buildPackage({
      tender,
      generatedOn: '2026-10-06',
      // deliberately out of order
      items: [
        { req: { id: 'c', order: 3, title_en: 'Offset doc' }, file: { name: 'offset.pdf', bytes: offset } },
        { req: { id: 'a', order: 1, title_en: 'Plain doc' }, file: { name: 'plain.pdf', bytes: plain } },
        { req: { id: 'b', order: 2, title_en: 'Rotated doc' }, file: { name: 'rotated.pdf', bytes: rotated } },
      ],
      onProgress: (d) => void progress.push(d),
    });
    expect(res.coverPages).toBe(1);
    expect(res.totalPages).toBe(1 + 2 + 3 + 1);
    expect(res.docs.map((d) => [d.order, d.startPage, d.pages])).toEqual([[1, 2, 2], [2, 4, 3], [3, 7, 1]]);
    expect(progress.at(-1)).toBe(7);

    const pages = await pagesText(res.bytes);
    expect(pages).toHaveLength(7);
    pages.forEach((p, i) => {
      expect(p.text).toContain(`T-42 | Page ${i + 1} of 7`);
      expect(p.rotate).toBe(0); // rotation baked in, footer at visual bottom
    });
    const cover = pages[0].text.replace(/\s+/g, ' ');
    for (const s of ['T-42', 'PWD', 'Rahman Ltd', DL, '2026-10-06', 'Plain doc', 'Rotated doc', 'Offset doc', 'plain.pdf']) expect(cover).toContain(s);
    expect(cover.indexOf('Plain doc')).toBeLessThan(cover.indexOf('Rotated doc'));
    expect(cover.indexOf('Rotated doc')).toBeLessThan(cover.indexOf('Offset doc'));

    // Order of documents and content placed above the footer band.
    const y = (pi: number, s: string) => pages[pi].items.find((it) => it.str.includes(s))!.transform[5];
    expect(pages[1].text).toContain('PLAIN-ONE');
    expect(y(1, 'PLAIN-ONE')).toBeCloseTo(FOOTER_BAND + 5, 0);
    expect(pages[2].view.slice(2)).toEqual([400, 300 + FOOTER_BAND]); // mixed size kept
    expect(pages[3].view.slice(2)).toEqual([400, 600 + FOOTER_BAND]); // 90°: sideways
    expect(pages[4].view.slice(2)).toEqual([600, 400 + FOOTER_BAND]); // 180°
    expect(pages[5].view.slice(2)).toEqual([400, 600 + FOOTER_BAND]); // 270°
    for (const pi of [3, 4, 5]) {
      const it = pages[pi].items.find((x) => x.str.startsWith('ROT-'))!;
      const [, , , , tx, ty] = it.transform;
      expect(ty).toBeGreaterThan(FOOTER_BAND); // content stays above footer band
      expect(tx).toBeGreaterThanOrEqual(0);
      expect(tx).toBeLessThanOrEqual(pages[pi].view[2]);
      expect(ty).toBeLessThanOrEqual(pages[pi].view[3]);
    }
    expect(pages[6].view.slice(2)).toEqual([300, 300 + FOOTER_BAND]);
    expect(y(6, 'OFFSET-ORIGIN')).toBeCloseTo(FOOTER_BAND + 10, 0);
  });

  it('overflows the cover onto more pages and keeps footers right', async () => {
    const one = await makePdf(async (d) => void d.addPage([300, 300]));
    const items = Array.from({ length: 45 }, (_, i) => ({
      req: { id: `r${i}`, order: i + 1, title_en: `Requirement number ${i + 1} with a fairly long descriptive title` },
      file: { name: `file_${i + 1}_with_a_long_name_that_needs_wrapping_দলিল.pdf`, bytes: one },
    }));
    const res = await buildPackage({ tender, generatedOn: '2026-10-06', items });
    expect(res.coverPages).toBeGreaterThan(1);
    expect(res.totalPages).toBe(res.coverPages + 45);
    const pages = await pagesText(res.bytes);
    pages.forEach((p, i) => expect(p.text).toContain(`Page ${i + 1} of ${res.totalPages}`));
    expect(pages[res.coverPages - 1].text).toContain('Requirement number 45');
  });

  it('names the file after the tender', () => {
    expect(packageFileName('PWD-DHK-2026-0417')).toBe('PWD-DHK-2026-0417_Package.pdf');
    expect(packageFileName('A/B C')).toBe('A_B_C_Package.pdf');
  });

  const pack = path.resolve('sample-pack/documents');
  it.runIf(fs.existsSync(pack))('builds from the sample pack', async () => {
    const rd = (n: string) => new Uint8Array(fs.readFileSync(path.join(pack, n)));
    const res = await buildPackage({
      tender: { ...tender, tender_id: 'PWD-DHK-2026-0417' },
      generatedOn: '2026-10-06',
      items: [
        { req: { id: 'trade', order: 1, title_en: 'Trade License' }, file: { name: '01_trade_license.pdf', bytes: rd('01_trade_license.pdf') } },
        { req: { id: 'fin', order: 7, title_en: 'Audited' }, file: { name: 'a.pdf', bytes: rd('audited_financials_FY23-FY25.pdf') } },
      ],
    });
    expect(res.totalPages).toBe(5);
  });
});
