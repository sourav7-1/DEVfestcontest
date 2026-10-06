// Verifies a generated package with pdfjs.
//   node scripts/verify-package.mjs <package.pdf> [requirements.json]
// Checks: page count, per-page text, exactly one footer "<tender_id> | Page X of Y" per page inside the bottom band,
// no other content in that band, cover labels present, and (with requirements.json) cover values + document order.
import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseRequirements } from '../src/lib/requirements.ts';

const [file, reqPath] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/verify-package.mjs <package.pdf> [requirements.json]');
  process.exit(2);
}

const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
const N = doc.numPages;
console.log(`${file}: ${N} pages`);
const texts = [];
const overlaps = [];
const pageItems = [];
for (let i = 1; i <= N; i++) {
  const page = await doc.getPage(i);
  const c = await page.getTextContent();
  texts.push(c.items.map((it) => it.str).join(' ').replace(/\s+/g, ' '));
  // Geometry: only the footer may sit inside the 28pt band at the bottom of the (unrotated) page.
  if (page.rotate !== 0) overlaps.push(`p${i}: /Rotate ${page.rotate} left in output`);
  pageItems.push(c.items.map((it) => ({ str: it.str, y: it.transform[5] - page.view[1] })));
  console.log(`  p${i}: ${texts[i - 1].slice(0, 110)}${texts[i - 1].length > 110 ? '…' : ''}`);
}

const fails = [...overlaps];
const tid = (texts[0].match(/Tender ID (\S+)/) ?? [])[1];
if (!tid) fails.push('cover: "Tender ID" not found');
// Only OUR footer counts: source documents may print their own "Page 1 of 2".
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const footerRe = new RegExp(`${esc(tid ?? '')} \\| Page \\d+ of \\d+`);
texts.forEach((t, i) => {
  const want = `${tid} | Page ${i + 1} of ${N}`;
  const footers = pageItems[i].filter((it) => footerRe.test(it.str));
  if (footers.length !== 1 || footers[0].str.trim() !== want) fails.push(`p${i + 1}: expected one footer "${want}", found ${JSON.stringify(footers.map((f) => f.str))}`);
  else if (footers[0].y >= 28) fails.push(`p${i + 1}: footer is not in the bottom band`);
  // Geometry: nothing but our footer may sit inside the 28pt band at the bottom of the page.
  for (const it of pageItems[i]) if (it.str.trim() && !footerRe.test(it.str) && it.y < 28) fails.push(`p${i + 1}: "${it.str.slice(0, 30)}" at y=${it.y.toFixed(1)} is inside the footer band`);
});
for (const label of ['Tender ID', 'Title', 'Procuring entity', 'Bidder', 'Submission deadline', 'Package generated', 'Contents'])
  if (!texts[0].includes(label)) fails.push(`cover: label "${label}" missing`);
if (!/Package generated \d{4}-\d{2}-\d{2}/.test(texts[0])) fails.push('cover: generated date not YYYY-MM-DD');

if (reqPath) {
  const { tender, requirements } = parseRequirements(fs.readFileSync(reqPath, 'utf8'));
  const cover = texts.slice(0, 3).join(' ');
  for (const v of [tender.tender_id, tender.title, tender.procuring_entity, tender.bidder, tender.deadline])
    if (v && !cover.includes(v)) fails.push(`cover: value "${v}" missing`);
  if (tid !== tender.tender_id) fails.push(`footer tender ID "${tid}" != requirements "${tender.tender_id}"`);
  // Contents list must follow `order` (titles listed on the cover appear in ascending order).
  const pos = requirements.map((r) => cover.indexOf(r.title_en)).filter((p) => p >= 0);
  if (pos.some((p, k) => k && p < pos[k - 1])) fails.push('cover: contents not in `order` sequence');
}

if (fails.length) {
  console.error(`\nFAIL (${fails.length}):\n - ${fails.join('\n - ')}`);
  process.exit(1);
}
console.log('\nOK: all footers correct, no content inside the footer band, cover complete.');
