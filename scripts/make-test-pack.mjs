// Judge-mode pack: a different tender with the same kinds of traps (plus alternate JSON keys, rotated/landscape pages).
// Run: node scripts/make-test-pack.mjs && python scripts/encrypt-pdf.py test-pack/documents/_safety_plain.pdf test-pack/documents/HSE_policy_signed.pdf
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

const root = 'test-pack';
const docs = path.join(root, 'documents');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(docs, { recursive: true });

// Alternate key names on purpose (deadline / required / expiry_check / tender{...}) to exercise the parser's aliases.
fs.writeFileSync(path.join(root, 'requirements.json'), JSON.stringify({
  tender: {
    tender_id: 'LGED-CTG-2026-1189',
    title: 'Rehabilitation of Rural Roads and Culverts, Package 7, Patiya Upazila, Chattogram',
    procuring_entity: 'Local Government Engineering Department, Chattogram',
    bidder: 'Nirman Associates JV',
    deadline: '2026-11-15',
  },
  requirements: [
    { id: 'work_plan', order: 40, title_en: 'Work Plan and Methodology', title_bn: 'কর্মপরিকল্পনা ও পদ্ধতি', required: true, expiry_check: false },
    { id: 'trade_lic', order: 10, title_en: 'Trade License', title_bn: 'ট্রেড লাইসেন্স', required: true, expiry_check: true },
    { id: 'insurance', order: 50, title_en: 'Contractor All-Risk Insurance', title_bn: 'ঠিকাদারের সর্বঝুঁকি বিমা', required: false, expiry_check: true },
    { id: 'tax_cert', order: 20, title_en: 'Tax Return Acknowledgement', title_bn: 'আয়কর রিটার্ন জমার প্রমাণপত্র', required: true, expiry_check: true },
    { id: 'company_reg', order: 30, title_en: 'Certificate of Incorporation', title_bn: 'নিবন্ধন সনদ (ইনকর্পোরেশন)', required: true, expiry_check: false },
    { id: 'safety_policy', order: 60, title_en: 'Health, Safety and Environment Policy', title_bn: 'স্বাস্থ্য, নিরাপত্তা ও পরিবেশ নীতি', required: false, expiry_check: false },
    { id: 'bank_ref', order: 25, title_en: 'Bank Reference Letter', title_bn: 'ব্যাংক রেফারেন্স পত্র', required: false, expiry_check: false },
  ],
}, null, 2));

async function pdf(file, pages) {
  const d = await PDFDocument.create();
  d.setCreationDate(new Date('2026-10-01T00:00:00Z'));
  d.setModificationDate(new Date('2026-10-01T00:00:00Z'));
  const f = await d.embedFont(StandardFonts.Helvetica);
  for (const { lines, size = [595, 842], rotate = 0 } of pages) {
    const p = d.addPage(size);
    if (rotate) p.setRotation(degrees(rotate));
    lines.forEach((l, i) => p.drawText(l, { x: 50, y: size[1] - 60 - i * 22, size: i ? 12 : 16, font: f }));
    p.drawText('bottom-edge text', { x: 50, y: 4, size: 8, font: f }); // must stay visible above the footer band
  }
  const bytes = await d.save({ useObjectStreams: false });
  if (file) fs.writeFileSync(path.join(docs, file), bytes);
  return bytes;
}
const co = 'Nirman Associates JV';

await pdf('TL_2026.pdf', [{ lines: ['TRADE LICENSE', 'Chattogram City Corporation', `Holder: ${co}`, 'Valid until: 15 November 2026'] }]);
await pdf('scan_17.pdf', [{ lines: ['ACKNOWLEDGEMENT OF RETURN OF INCOME', 'National Board of Revenue', `Taxpayer: ${co}`, 'Valid till: 31/12/2026'] }]);
await pdf('incorporation.pdf', [
  { lines: ['CERTIFICATE OF INCORPORATION', 'RJSC Bangladesh', co, 'Reg. No: C-178223'] },
  { lines: ['MEMORANDUM (extract)', 'Page 2 is landscape'], size: [842, 595] },
]);
const plan = await pdf('methodology_v3.pdf', [
  { lines: ['WORK PLAN AND METHODOLOGY', 'Section 1: Mobilisation'] },
  { lines: ['Section 2: Bar chart (rotated 90)'], rotate: 90 },
  { lines: ['Section 3: Quality control'] },
]);
fs.writeFileSync(path.join(docs, 'Copy of plan (final).pdf'), plan); // identical content, different name
await pdf('CAR_policy_2026.pdf', [{ lines: ['CONTRACTOR ALL RISK INSURANCE POLICY', 'Green Delta Insurance', `Insured: ${co}`, 'Period of cover until 14 November 2026'] }]);
fs.writeFileSync(path.join(docs, 'bank_reference.pdf'), 'To whom it may concern,\nThis is a plain text file renamed to .pdf.\n'); // fake PDF
await pdf('newsletter_oct.pdf', [{ lines: ['NIRMAN NEWS - OCTOBER', 'Team picnic photos inside'] }]); // irrelevant
await pdf('_safety_plain.pdf', [{ lines: ['HSE POLICY', co, 'Signed by Managing Director'] }]); // encrypted by encrypt-pdf.py
console.log('test-pack generated');
