// Builds a pack's package with the SAME logic as the app (src/lib), from a documented resolution file.
//   node scripts/build-package.mjs <packDir> [resolution.json] [--out=dir]   (defaults: <packDir>/resolution.json, output/)
// resolution.json: { "<reqId>": { "file": "x.pdf", "expiry": "YYYY-MM-DD", "exclude": "reason" }, "expect": { "<reqId>": "<status>" } }
// - every expiry must appear in the document's own text (no invented dates)
// - "expect" asserts the statuses BEFORE exclusions (judge-mode checks)
// - refuses to build while any blocking status remains; never fills gaps with fake data
// Output: output/<tender_id>_Package.pdf, then runs scripts/verify-package.mjs on it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseRequirements } from '../src/lib/requirements.ts';
import { readUpload } from '../src/lib/files.ts';
import { assign } from '../src/lib/matching.ts';
import { evaluate } from '../src/lib/status.ts';
import { duplicateGroups } from '../src/lib/duplicates.ts';
import { buildPackage, packageFileName } from '../src/lib/package.ts';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--out='));
const outDir = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'output';
const pack = args[0];
if (!pack) {
  console.error('usage: node scripts/build-package.mjs <packDir> [resolution.json]');
  process.exit(2);
}
const resolution = JSON.parse(fs.readFileSync(args[1] ?? path.join(pack, 'resolution.json'), 'utf8'));
const { tender, requirements } = parseRequirements(fs.readFileSync(path.join(pack, 'requirements.json'), 'utf8'));
const today = new Date();
const generatedOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const texts = {};
const countPages = async (bytes) => {
  try {
    const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
    return doc.numPages;
  } catch (e) {
    return e?.name === 'PasswordException' ? 'encrypted' : 'corrupt';
  }
};
async function textOf(bytes) {
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  let t = '';
  for (let i = 1; i <= doc.numPages; i++) t += (await (await doc.getPage(i)).getTextContent()).items.map((it) => it.str).join(' ') + ' ';
  return t;
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** All dates printed in a text, as YYYY-MM-DD (formats: 2026-09-30, 20/10/2026 (D/M/Y), 30 June 2027). */
function datesIn(text) {
  const out = new Set();
  const p = (n) => String(n).padStart(2, '0');
  for (const m of text.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) out.add(`${m[1]}-${m[2]}-${m[3]}`);
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) out.add(`${m[3]}-${p(m[2])}-${p(m[1])}`);
  for (const m of text.matchAll(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/g)) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    if (mi >= 0) out.add(`${m[3]}-${p(mi + 1)}-${p(m[1])}`);
  }
  return out;
}

// 1. Read every file exactly like the app does.
const files = [];
for (const name of fs.readdirSync(path.join(pack, 'documents')).sort()) {
  const bytes = new Uint8Array(fs.readFileSync(path.join(pack, 'documents', name)));
  const f = await readUpload({ name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer }, countPages);
  files.push(f);
  if (!f.error) texts[f.id] = await textOf(bytes);
}
const byName = Object.fromEntries(files.map((f) => [f.name, f]));
console.log(`Tender ${tender.tender_id} · deadline ${tender.deadline} · ${requirements.length} requirements · ${files.length} files`);
for (const f of files) if (f.error) console.log(`  rejected  ${f.name}: ${f.error}`);
for (const g of duplicateGroups(files)) console.log(`  duplicate ${g.map((f) => f.name).join(' = ')}`);

// 2. Apply the documented resolution through the matching rules.
let state = { matches: {}, expiries: {} };
const problems = [];
for (const r of requirements) {
  const res = resolution[r.id];
  if (!res?.file) continue;
  const f = byName[res.file];
  if (!f) { problems.push(`${r.id}: file "${res.file}" not in pack`); continue; }
  const a = assign(state, r.id, f.id, files);
  if (!a.ok) { console.log(`  cannot match ${res.file} → ${r.id}: ${a.reason}`); continue; }
  state = a.state;
  if (res.expiry) {
    if (!datesIn(texts[f.id]).has(res.expiry)) problems.push(`${r.id}: expiry ${res.expiry} is not printed in ${res.file}`);
    state.expiries[r.id] = res.expiry;
  }
}
if (problems.length) {
  console.error(`\nREFUSED — resolution does not match the documents:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}

const show = (ev, title) => {
  console.log(`\n${title}`);
  for (const r of requirements) {
    const f = files.find((x) => x.id === state.matches[r.id]);
    console.log(`  ${String(r.order).padStart(3)}  ${r.id.padEnd(20)} ${r.mandatory ? 'M' : 'O'}  ${ev.byReq[r.id].padEnd(14)} ${f ? f.name : '-'}${state.expiries[r.id] ? ` (exp ${state.expiries[r.id]})` : ''}`);
  }
};
let ev = evaluate(requirements, state.matches, state.expiries, tender.deadline, files);
show(ev, 'Statuses (all documented matches applied):');

// 3. Judge-mode expectations.
const wrong = Object.entries(resolution.expect ?? {}).filter(([id, s]) => ev.byReq[id] !== s);
if (wrong.length) {
  console.error(`\nFAIL — unexpected statuses: ${wrong.map(([id, s]) => `${id} is ${ev.byReq[id]}, expected ${s}`).join('; ')}`);
  process.exit(1);
}
if (resolution.expect) console.log(`  ✓ ${Object.keys(resolution.expect).length} expected statuses confirmed`);

// 4. Documented exclusions (e.g. an expired OPTIONAL document is left out rather than submitted).
const excluded = requirements.filter((r) => resolution[r.id]?.exclude);
if (excluded.length) {
  for (const r of excluded) {
    console.log(`  exclude ${r.id}: ${resolution[r.id].exclude}`);
    delete state.matches[r.id];
    delete state.expiries[r.id];
  }
  ev = evaluate(requirements, state.matches, state.expiries, tender.deadline, files);
  show(ev, 'Statuses after exclusions:');
}

if (!ev.canGenerate) {
  console.error(`\nSTOP — cannot generate; blocking: ${ev.blockers.map((b) => `${b.kind} ${b.reqId}`).join(', ')}`);
  console.error('Not building a package with missing/expired mandatory documents (no fake data).');
  process.exit(3);
}

// 5. Build + verify.
const items = requirements
  .filter((r) => state.matches[r.id])
  .map((r) => ({ req: r, file: { name: files.find((f) => f.id === state.matches[r.id]).name, bytes: files.find((f) => f.id === state.matches[r.id]).bytes } }));
const out = await buildPackage({ tender, items, generatedOn });
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, packageFileName(tender.tender_id));
fs.writeFileSync(outPath, out.bytes);
console.log(`\nBuilt ${outPath}: ${out.totalPages} pages (${out.coverPages} cover + ${out.docs.map((d) => `${d.order}:${d.pages}p`).join(', ')})`);
execFileSync(process.execPath, ['scripts/verify-package.mjs', outPath, path.join(pack, 'requirements.json')], { stdio: 'inherit' });
