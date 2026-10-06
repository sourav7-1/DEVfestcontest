// Pure package builder: bytes + data in → Uint8Array out. Runs in the browser and in Node.
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Requirement, Tender } from './types';

export const FOOTER_BAND = 28; // pt added below every page's original content
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const INK = rgb(0.12, 0.16, 0.23);
const MUTED = rgb(0.4, 0.45, 0.52);
const RULE = rgb(0.8, 0.83, 0.87);
const ACCENT = rgb(0.06, 0.37, 0.39);

export interface PackageItem {
  req: Pick<Requirement, 'id' | 'order' | 'title_en'>;
  file: { name: string; bytes: Uint8Array };
}
export interface PackageInput {
  tender: Tender;
  items: PackageItem[];
  /** YYYY-MM-DD, local date of generation */
  generatedOn: string;
  onProgress?: (done: number, total: number) => void | Promise<void>;
}
export interface PackageResult {
  bytes: Uint8Array;
  totalPages: number;
  coverPages: number;
  docs: { order: number; title_en: string; fileName: string; pages: number; startPage: number }[];
}

export class PackageError extends Error {
  fileName: string;
  constructor(fileName: string, cause: unknown) {
    super(`Cannot read "${fileName}": ${(cause as Error)?.message ?? cause}`);
    this.fileName = fileName;
  }
}

export const packageFileName = (tenderId: string) => `${tenderId.replace(/[^\w.-]+/g, '_') || 'Tender'}_Package.pdf`;

/** Helvetica is WinAnsi-only: replace anything it can't encode (e.g. Bangla in a file name) with '?'. */
function safe(font: PDFFont, s: string): string {
  let out = '';
  for (const ch of s.replace(/[\r\n\t]+/g, ' ')) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next)) { line = next; continue; }
    if (line) lines.push(line);
    // Hard-break words longer than the column (long file names).
    let w = word;
    while (!fits(w)) {
      let i = w.length - 1;
      while (i > 1 && !fits(w.slice(0, i))) i--;
      lines.push(w.slice(0, i));
      w = w.slice(i);
    }
    line = w;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawCover(doc: PDFDocument, f: PDFFont, b: PDFFont, input: PackageInput, docs: PackageResult['docs']): PDFPage[] {
  const [W, H] = A4;
  const contentW = W - 2 * MARGIN;
  const bottom = FOOTER_BAND + 36;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = (continued: boolean) => {
    page = doc.addPage(A4);
    pages.push(page);
    y = H - MARGIN;
    page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: ACCENT });
    if (continued) {
      page.drawText('Tender Submission Package (continued)', { x: MARGIN, y: y - 12, size: 12, font: b, color: MUTED });
      y -= 36;
    }
  };
  const text = (s: string, x: number, size: number, font = f, color = INK) => page.drawText(safe(font, s), { x, y, size, font, color });
  const rule = (thickness = 0.6, color = RULE) => page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness, color });

  newPage(false);
  const t = input.tender;
  // Title block
  y -= 14;
  text('TENDER SUBMISSION PACKAGE', MARGIN, 10, b, ACCENT);
  y -= 30;
  for (const l of wrap(b, safe(b, t.title || t.tender_id), 20, contentW)) {
    text(l, MARGIN, 20, b);
    y -= 26;
  }
  y -= 6;
  rule(1.2, ACCENT);
  y -= 26;

  // Labeled fields table
  const labelW = 150;
  const fields: [string, string][] = [
    ['Tender ID', t.tender_id],
    ['Title', t.title || '-'],
    ['Procuring entity', t.procuring_entity || '-'],
    ['Bidder', t.bidder || '-'],
    ['Submission deadline', t.deadline],
    ['Package generated', input.generatedOn],
    ['Documents included', String(docs.length)],
  ];
  for (const [label, value] of fields) {
    const lines = wrap(f, safe(f, value), 11, contentW - labelW);
    if (y - lines.length * 15 < bottom) newPage(true);
    text(label, MARGIN, 10, b, MUTED);
    for (const l of lines) {
      text(l, MARGIN + labelW, 11);
      y -= 15;
    }
    y -= 5;
    rule();
    y -= 15;
  }

  // Ordered document list
  y -= 10;
  text('Contents', MARGIN, 13, b);
  y -= 22;
  const col = { no: MARGIN, title: MARGIN + 34, file: MARGIN + 250, pages: W - MARGIN - 70 };
  const header = () => {
    text('#', col.no, 9, b, MUTED);
    text('Document', col.title, 9, b, MUTED);
    text('File', col.file, 9, b, MUTED);
    text('Pages', col.pages, 9, b, MUTED);
    y -= 8;
    rule(0.8, MUTED);
    y -= 15;
  };
  header();
  for (const d of docs) {
    const tl = wrap(f, safe(f, d.title_en), 10, col.file - col.title - 12);
    const fl = wrap(f, safe(f, d.fileName), 9, col.pages - col.file - 12);
    const h = Math.max(tl.length, fl.length) * 13;
    if (y - h < bottom) {
      newPage(true);
      header();
    }
    const top = y;
    text(String(d.order), col.no, 10, b);
    text(d.pages === 1 ? '1 (p. ' + d.startPage + ')' : `${d.pages} (pp. ${d.startPage}-${d.startPage + d.pages - 1})`, col.pages, 9);
    tl.forEach((l, i) => ((y = top - i * 13), text(l, col.title, 10)));
    fl.forEach((l, i) => ((y = top - i * 13), text(l, col.file, 9, f, MUTED)));
    y = top - h - 2;
    rule(0.4);
    y -= 13;
  }
  return pages;
}

/** Copies one source page onto a new page with a footer band below it, baking /Rotate so the band is at the visual bottom. */
async function placePage(out: PDFDocument, src: PDFPage) {
  const box = src.getCropBox(); // visible area (defaults to MediaBox); may have a non-zero origin
  const w = box.width;
  const h = box.height;
  const rot = (((src.getRotation().angle ?? 0) % 360) + 360) % 360;
  const sideways = rot === 90 || rot === 270;
  const vw = sideways ? h : w;
  const vh = sideways ? w : h;
  // A page with no content stream is legitimately blank (pdf-lib can't embed it): keep it blank, with footer.
  if (!src.node.Contents()) {
    out.addPage([vw, vh + FOOTER_BAND]);
    return;
  }
  const embedded = await out.embedPage(src, { left: box.x, bottom: box.y, right: box.x + w, top: box.y + h });
  const page = out.addPage([vw, vh + FOOTER_BAND]);
  // /Rotate is clockwise; drawPage rotates counter-clockwise about (x, y). Translate so the rotated box lands at (0, band).
  const at: Record<number, [number, number]> = { 0: [0, 0], 90: [0, w], 180: [w, h], 270: [h, 0] };
  const [dx, dy] = at[rot] ?? [0, 0];
  page.drawPage(embedded, { x: dx, y: FOOTER_BAND + dy, rotate: degrees(-rot) });
}

function drawFooter(page: PDFPage, font: PDFFont, label: string) {
  const { width } = page.getSize();
  const size = 9.5;
  const s = safe(font, label);
  page.drawLine({ start: { x: 24, y: FOOTER_BAND - 4 }, end: { x: width - 24, y: FOOTER_BAND - 4 }, thickness: 0.5, color: RULE });
  page.drawText(s, { x: (width - font.widthOfTextAtSize(s, size)) / 2, y: 9, size, font, color: rgb(0.25, 0.27, 0.3) });
}

export async function buildPackage(input: PackageInput): Promise<PackageResult> {
  const items = [...input.items].sort((a, b) => a.req.order - b.req.order);
  const out = await PDFDocument.create();
  out.setTitle(`${input.tender.tender_id} - Tender Submission Package`);
  out.setProducer('Tender Document Package Builder');
  const f = await out.embedFont(StandardFonts.Helvetica);
  const b = await out.embedFont(StandardFonts.HelveticaBold);

  // Load sources first so the cover can list exact page counts.
  const sources: PDFDocument[] = [];
  for (const [i, it] of items.entries()) {
    try {
      sources.push(await PDFDocument.load(it.file.bytes, { updateMetadata: false }));
    } catch (e) {
      throw new PackageError(it.file.name, e);
    }
    await input.onProgress?.(i + 1, items.length * 2 + 1);
  }

  // Cover length depends only on the list, so lay it out on a scratch doc to learn its page count.
  const draft = items.map((it, i) => ({ order: it.req.order, title_en: it.req.title_en, fileName: it.file.name, pages: sources[i].getPageCount(), startPage: 0 }));
  const scratch = await PDFDocument.create();
  const coverPages = drawCover(scratch, await scratch.embedFont(StandardFonts.Helvetica), await scratch.embedFont(StandardFonts.HelveticaBold), input, draft).length;
  let next = coverPages + 1;
  const docs = draft.map((d) => ({ ...d, startPage: (next += d.pages) - d.pages }));

  // Cover pages are A4; give them the same footer band semantics (content stays above FOOTER_BAND + margin).
  drawCover(out, f, b, input, docs);
  for (const [i, src] of sources.entries()) {
    for (const p of src.getPages()) await placePage(out, p);
    await input.onProgress?.(items.length + i + 1, items.length * 2 + 1);
  }

  // Final pass: footers, now that the total is known.
  const pages = out.getPages();
  const id = input.tender.tender_id;
  pages.forEach((p, i) => drawFooter(p, f, `${id} | Page ${i + 1} of ${pages.length}`));
  const bytes = await out.save();
  await input.onProgress?.(items.length * 2 + 1, items.length * 2 + 1);
  return { bytes, totalPages: pages.length, coverPages, docs };
}
