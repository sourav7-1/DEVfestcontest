// Captures the 4 submission screenshots with the official sample pack, using the locally installed Chrome.
//   node scripts/screenshots.mjs [url]     (default: the live Vercel URL)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'https://de-vfestcontest.vercel.app/';
const docs = path.resolve('sample-pack/documents');
const out = path.resolve('screenshots');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', (e) => (errors.push(e.message), console.error('PAGE ERROR:', e.message)));
page.on('console', (m) => m.type() === 'error' && console.error('CONSOLE:', m.text().slice(0, 300)));
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('tpb.lang', 'en'));
await page.reload({ waitUntil: 'networkidle' });

await page.setInputFiles('input[type=file][accept*="json"]', path.resolve('sample-pack/requirements.json'));
await page.waitForSelector('#req-R01');
await page.setInputFiles('input[type=file][accept*="pdf"]', fs.readdirSync(docs).map((f) => path.join(docs, f)));
await page.waitForFunction(() => document.body.innerText.includes('company_logo.png') && !document.body.innerText.includes('Reading'));

const match = async (reqId, fileName) => {
  const value = await page.$eval(`#req-${reqId} select`, (s, n) => [...s.options].find((o) => o.text.startsWith(n))?.value, fileName);
  if (!value) throw new Error(`no option ${fileName} for ${reqId}`);
  await page.selectOption(`#req-${reqId} select`, value);
};
// tall = render the whole checklist in one viewport (a full-page capture would freeze the sticky bar mid-page)
const shot = async (name, tall = false) => {
  if (tall) await page.setViewportSize({ width: 1440, height: 2450 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, name) });
  if (tall) await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('saved', name);
};
// Hide toasts with CSS for clean shots (never remove React-owned nodes; clicking them would also close dialogs).
const dismissToasts = () => page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important}' });

// (a) problems: the expired 2025 trade license chosen, other mandatory docs still missing.
await match('R01', 'trade_license_2025.pdf');
await page.fill('#exp-R01', '2025-06-30');
await match('R05', 'experience_cert.pdf');
await dismissToasts();
await page.locator('button', { hasText: 'blocking problem' }).click();
await shot('a-statuses-with-problems.png');
await page.keyboard.press('Escape');

// (b) all statuses OK with the correct files.
await page.locator('#req-R01 button', { hasText: 'Change' }).click();
await match('R01', 'trade_license_2026.pdf');
await page.fill('#exp-R01', '2027-06-30');
for (const [r, f] of [['R02', '03_tin'], ['R03', '04_vat'], ['R04', 'bank_solvency'], ['R08', '02_technical'], ['R09', '01_financial'], ['R10', 'scan_0042']]) await match(r, f);
await page.fill('#exp-R04', '2026-12-31');
await dismissToasts();
await page.evaluate(() => window.scrollTo(0, 0));
await shot('b-all-statuses-ok.png', true);

// (c) Bangla UI.
await page.locator('header button', { hasText: 'বাংলা' }).click();
await dismissToasts();
await shot('c-bangla-ui.png', true);
await page.locator('header button', { hasText: 'English' }).click();

// (d) generate → success dialog.
const download = page.waitForEvent('download');
await page.locator('button', { hasText: 'Generate package' }).click();
const d = await download;
await page.waitForSelector('text=Your package is ready');
await dismissToasts();
await shot('d-generate-success.png');
console.log('downloaded', d.suggestedFilename());

await browser.close();
if (errors.length) {
  console.error('page errors:', errors);
  process.exit(1);
}
