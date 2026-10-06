// Generates ./sample-pack/ (requirements.json + documents/) with deliberate traps.
// Run: node scripts/make-sample-pack.mjs && python scripts/make-sample-pack.py (encrypts ISO cert + zips)
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

const root = 'sample-pack';
const docs = path.join(root, 'documents');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(docs, { recursive: true });

const requirements = {
  tender_id: 'PWD-DHK-2026-0417',
  title: 'Construction of 3-Storey Upazila Health Complex Annex, Savar',
  procuring_entity: 'Public Works Department, Dhaka Division-2',
  bidder: 'Rahman Builders & Engineers Ltd.',
  submission_deadline: '2026-10-20',
  requirements: [
    { id: 'bank_solvency', order: 5, title_en: 'Bank Solvency Certificate', title_bn: 'ব্যাংক সচ্ছলতা সনদ', mandatory: true, expiry_required: true },
    { id: 'trade_license', order: 1, title_en: 'Valid Trade License', title_bn: 'হালনাগাদ ট্রেড লাইসেন্স', mandatory: true, expiry_required: true },
    { id: 'iso_cert', order: 11, title_en: 'ISO 9001 Certificate', title_bn: 'আইএসও ৯০০১ সনদ', mandatory: false, expiry_required: true },
    { id: 'tin', order: 2, title_en: 'TIN Certificate', title_bn: 'টিআইএন সনদ', mandatory: true, expiry_required: false },
    { id: 'experience', order: 6, title_en: 'Similar Work Experience Certificate', title_bn: 'অনুরূপ কাজের অভিজ্ঞতার সনদ', mandatory: true, expiry_required: false },
    { id: 'tax_clearance', order: 4, title_en: 'Income Tax Clearance Certificate', title_bn: 'আয়কর পরিশোধ সনদ', mandatory: true, expiry_required: true },
    { id: 'manufacturer_auth', order: 10, title_en: 'Manufacturer Authorization Letter', title_bn: 'প্রস্তুতকারকের অনুমোদনপত্র', mandatory: true, expiry_required: false },
    { id: 'vat_bin', order: 3, title_en: 'VAT Registration (BIN) Certificate', title_bn: 'ভ্যাট নিবন্ধন (বিআইএন) সনদ', mandatory: true, expiry_required: false },
    { id: 'power_of_attorney', order: 9, title_en: 'Power of Attorney', title_bn: 'পাওয়ার অব অ্যাটর্নি', mandatory: true, expiry_required: false },
    { id: 'audited_financials', order: 7, title_en: 'Audited Financial Statement (last 3 years)', title_bn: 'নিরীক্ষিত আর্থিক বিবরণী (গত ৩ বছর)', mandatory: true, expiry_required: false },
    { id: 'bid_security', order: 8, title_en: 'Bid Security (Bank Guarantee)', title_bn: 'বিড সিকিউরিটি (ব্যাংক গ্যারান্টি)', mandatory: true, expiry_required: true },
  ],
};
fs.writeFileSync(path.join(root, 'requirements.json'), JSON.stringify(requirements, null, 2));

async function pdf(file, pages) {
  const d = await PDFDocument.create();
  d.setCreationDate(new Date('2026-09-01T00:00:00Z')); // deterministic bytes
  d.setModificationDate(new Date('2026-09-01T00:00:00Z'));
  const f = await d.embedFont(StandardFonts.Helvetica);
  const b = await d.embedFont(StandardFonts.HelveticaBold);
  for (const lines of pages) {
    const p = d.addPage([595, 842]);
    let y = 780;
    lines.forEach((l, i) => {
      p.drawText(l, { x: 60, y, size: i === 0 ? 18 : 12, font: i === 0 ? b : f, color: rgb(0.1, 0.1, 0.2) });
      y -= i === 0 ? 36 : 22;
    });
  }
  const bytes = await d.save({ useObjectStreams: false });
  if (file) fs.writeFileSync(path.join(docs, file), bytes);
  return bytes;
}
const co = 'Rahman Builders & Engineers Ltd.';

await pdf('01_trade_license.pdf', [[
  'TRADE LICENSE', 'Dhaka North City Corporation', `Licensee: ${co}`, 'License No: TRAD/DNCC/045812/2026',
  'Issue Date: 01 July 2026', 'Valid until: 30 June 2027',
]]);
await pdf('tin_certificate.pdf', [[
  'TAXPAYER IDENTIFICATION NUMBER (TIN) CERTIFICATE', 'National Board of Revenue', `Name: ${co}`,
  'TIN: 4417-2290-8812', 'Date of Issue: 12 March 2019',
]]);
// misleading name: says "tax" but is the VAT/BIN registration
await pdf('tax_certificate.pdf', [[
  'VAT REGISTRATION CERTIFICATE (Mushak-2.3)', 'National Board of Revenue - Business Identification Number',
  `Registered Person: ${co}`, 'BIN: 000418827-0102', 'Effective Date: 05 January 2020',
]]);
// opaque name + expires EXACTLY on the deadline
await pdf('IT-2026.pdf', [[
  'INCOME TAX CLEARANCE CERTIFICATE', 'Office of the Deputy Commissioner of Taxes, Circle-112',
  `Assessee: ${co}`, 'Assessment Year: 2025-2026', 'Expiry Date: 20/10/2026',
]]);
// expired before deadline
await pdf('bank_solvency.pdf', [[
  'SOLVENCY CERTIFICATE', 'Sonali Bank PLC, Motijheel Corporate Branch',
  `This is to certify that ${co} maintains a satisfactory account with us.`,
  'Issued on: 01 March 2026', 'This certificate is valid up to 2026-09-30.',
]]);
// identical-content duplicate under two different names
const exp = await pdf('experience_certificate.pdf', [[
  'WORK COMPLETION / EXPERIENCE CERTIFICATE', 'Local Government Engineering Department (LGED)',
  `Contractor: ${co}`, 'Work: Construction of Union Parishad Complex, Dhamrai', 'Contract value: BDT 4,25,00,000',
  'Completed: 15 December 2024',
]]);
fs.writeFileSync(path.join(docs, 'scan_0042.pdf'), exp);
await pdf('audited_financials_FY23-FY25.pdf', [
  ['AUDITED FINANCIAL STATEMENTS', co, 'For the year ended 30 June 2023', 'Auditor: Hoque Bhattacharjee Das & Co.'],
  ['AUDITED FINANCIAL STATEMENTS', 'For the year ended 30 June 2024', 'Turnover: BDT 18.4 crore'],
  ['AUDITED FINANCIAL STATEMENTS', 'For the year ended 30 June 2025', 'Turnover: BDT 22.1 crore'],
]);
// fake .pdf: actually a PNG
fs.writeFileSync(path.join(docs, 'bid_security_BG.pdf'), Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2048, 7),
]));
// corrupt: real PDF header but truncated body
const poa = await pdf(null, [['POWER OF ATTORNEY', `${co} hereby authorises Mr. Kamal Hossain`, 'Date: 10 September 2026']]);
fs.writeFileSync(path.join(docs, 'power_of_attorney.pdf'), poa.subarray(0, 300));
// irrelevant extra
await pdf('company_brochure_2026.pdf', [
  ['RAHMAN BUILDERS - COMPANY PROFILE', 'Building Bangladesh since 1998', 'Our projects, our people, our promise.'],
  ['OUR CLIENTS', 'LGED, PWD, RAJUK, Private sector'],
]);
// encrypted by the python step (ISO cert, optional requirement)
await pdf('_iso_plain.pdf', [[
  'CERTIFICATE OF REGISTRATION - ISO 9001:2015', 'Bureau Veritas Certification Bangladesh', co,
  'Certificate No: BD-QMS-22871', 'Valid until: 14 May 2027',
]]);
console.log('sample-pack generated');
