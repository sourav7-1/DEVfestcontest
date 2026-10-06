// Step 0 inspector: node scripts/inspect-pack.mjs [packDir]
// Prints per-file magic bytes, SHA-256, pages, encrypted/corrupt status, text snippet and detected dates.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseRequirements } from '../src/lib/requirements.ts';

const dir = process.argv[2] ?? 'sample-pack';
const raw = JSON.parse(fs.readFileSync(path.join(dir, 'requirements.json'), 'utf8'));
console.log('orders in file order:', (raw.requirements ?? []).map((r) => r.order).join(', '));
const { tender, requirements } = parseRequirements(fs.readFileSync(path.join(dir, 'requirements.json'), 'utf8'));
console.log('tender:', tender.tender_id, '| deadline:', tender.deadline);
for (const r of requirements) console.log(`  ${r.order}. ${r.id} ${r.mandatory ? 'M' : 'O'}${r.expiry_required ? ' +expiry' : ''}`);

const docs = path.join(dir, 'documents');
const hashes = {};
for (const name of fs.readdirSync(docs).sort()) {
  const bytes = fs.readFileSync(path.join(docs, name));
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  (hashes[hash] ??= []).push(name);
  const head = bytes.subarray(0, 8).toString('hex');
  const isPdf = bytes.subarray(0, 1024).toString('latin1').includes('%PDF-');
  let status = 'ok', pages = '-', text = '';
  if (!isPdf) status = 'NOT_PDF';
  else {
    try {
      const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
      pages = doc.numPages;
      for (let i = 1; i <= doc.numPages; i++) {
        const c = await (await doc.getPage(i)).getTextContent();
        text += c.items.map((it) => it.str).join(' ') + ' | ';
      }
    } catch (e) {
      status = e?.name === 'PasswordException' ? 'ENCRYPTED' : `CORRUPT (${e?.name}: ${e?.message})`;
    }
  }
  const dates = text.match(/(valid until|valid till|valid up to|until|expiry date|expires?)[^|]*?(\d{1,2}[ /-][A-Za-z0-9]+[ /-]\d{4}|\d{4}-\d{2}-\d{2})/gi);
  console.log(`\n## ${name}\n size=${bytes.length} head=${head} sha256=${hash.slice(0, 16)}… status=${status} pages=${pages}`);
  if (text) console.log(' text:', text.slice(0, 220));
  if (dates) console.log(' dates:', dates.join(' ; '));
}
for (const [h, n] of Object.entries(hashes)) if (n.length > 1) console.log(`\nDUPLICATE ${h.slice(0, 16)}…: ${n.join(', ')}`);
