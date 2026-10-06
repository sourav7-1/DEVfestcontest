// Verifies a generated package with pdfjs.
//   node scripts/verify-package.mjs <package.pdf> [requirements.json]
//   node scripts/verify-package.mjs --sample      (builds a package from ./sample-pack's valid docs, then verifies it)
// Checks: page count, per-page text, every footer "<tender_id> | Page X of Y", cover has all required fields.
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

let [file, reqPath] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/verify-package.mjs <package.pdf> [requirements.json] | --sample');
  process.exit(2);
}

if (file === '--sample') {
  // Node >= 22.18 strips TypeScript types natively.
  const { buildPackage, packageFileName } = await import('../src/lib/package.ts');
  reqPath = 'sample-pack/requirements.json';
  const r = JSON.parse(fs.readFileSync(reqPath, 'utf8'));
  const mapping = { // the usable docs from SAMPLE_PACK_NOTES.md
    trade_license: '01_trade_license.pdf', tin: 'tin_certificate.pdf', vat_bin: 'tax_certificate.pdf', tax_clearance: 'IT-2026.pdf',
    bank_solvency: 'bank_solvency.pdf', experience: 'experience_certificate.pdf', audited_financials: 'audited_financials_FY23-FY25.pdf',
  };
  const items = r.requirements.filter((q) => mapping[q.id]).map((q) => ({
    req: q, file: { name: mapping[q.id], bytes: new Uint8Array(fs.readFileSync(path.join('sample-pack/documents', mapping[q.id]))) },
  }));
  const tender = { tender_id: r.tender_id, title: r.title, procuring_entity: r.procuring_entity, bidder: r.bidder, deadline: r.submission_deadline };
  const res = await buildPackage({ tender, items, generatedOn: new Date().toISOString().slice(0, 10) });
  fs.mkdirSync('out', { recursive: true });
  file = path.join('out', packageFileName(tender.tender_id));
  fs.writeFileSync(file, res.bytes);
  console.log(`built ${file}`);
}

const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
const N = doc.numPages;
console.log(`${file}: ${N} pages`);
const texts = [];
const overlaps = [];
for (let i = 1; i <= N; i++) {
  const page = await doc.getPage(i);
  const c = await page.getTextContent();
  texts.push(c.items.map((it) => it.str).join(' ').replace(/\s+/g, ' '));
  // Geometry: only the footer may sit inside the 28pt band at the bottom of the (unrotated) page.
  if (page.rotate !== 0) overlaps.push(`p${i}: /Rotate ${page.rotate} left in output`);
  for (const it of c.items) {
    if (!it.str.trim() || /Page \d+ of \d+/.test(it.str)) continue;
    if (it.transform[5] - page.view[1] < 28) overlaps.push(`p${i}: "${it.str.slice(0, 30)}" at y=${it.transform[5].toFixed(1)} is inside the footer band`);
  }
  console.log(`  p${i}: ${texts[i - 1].slice(0, 110)}${texts[i - 1].length > 110 ? '…' : ''}`);
}

const fails = [...overlaps];
const tid = (texts[0].match(/Tender ID (\S+)/) ?? [])[1];
if (!tid) fails.push('cover: "Tender ID" not found');
texts.forEach((t, i) => {
  const want = `${tid} | Page ${i + 1} of ${N}`;
  if (!t.includes(want)) fails.push(`p${i + 1}: footer "${want}" missing`);
  const all = [...t.matchAll(/Page (\d+) of (\d+)/g)];
  if (all.length !== 1) fails.push(`p${i + 1}: expected exactly one footer, found ${all.length}`);
});
for (const label of ['Tender ID', 'Title', 'Procuring entity', 'Bidder', 'Submission deadline', 'Package generated', 'Contents'])
  if (!texts[0].includes(label)) fails.push(`cover: label "${label}" missing`);
if (!/Package generated \d{4}-\d{2}-\d{2}/.test(texts[0])) fails.push('cover: generated date not YYYY-MM-DD');

if (reqPath) {
  const r = JSON.parse(fs.readFileSync(reqPath, 'utf8'));
  const cover = texts.slice(0, 3).join(' ');
  for (const v of [r.tender_id, r.procuring_entity, r.bidder, r.submission_deadline ?? r.deadline])
    if (v && !cover.includes(v)) fails.push(`cover: value "${v}" missing`);
}

if (fails.length) {
  console.error(`\nFAIL (${fails.length}):\n - ${fails.join('\n - ')}`);
  process.exit(1);
}
console.log('\nOK: all footers correct, cover complete.');
