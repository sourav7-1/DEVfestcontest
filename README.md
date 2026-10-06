# Tender Document Package Builder

**Live app:** https://sourav7-1.github.io/DEVfestcontest/
**Repository:** https://github.com/sourav7-1/DEVfestcontest
**Generated package (official sample pack):** [`output/T-2026-0417_Package.pdf`](output/T-2026-0417_Package.pdf)

A frontend-only web app, in Bangla and English, for office staff who prepare tender submissions. Staff load the tender's
`requirements.json`, add the PDFs they have and match each one to a required document. They enter expiry dates, see
live statuses, and download **one ordered PDF**. That PDF has an English cover page and a `<tender_id> | Page X of Y` footer on every page.

**Privacy:** documents never leave the computer. All PDF reading, checking and building happens in the browser.

## How to use (4 steps)

| | English | বাংলা |
|---|---|---|
| 1 | **Load requirements** — drop the tender's `requirements.json`. You'll see the tender summary, days left, and the checklist of documents in submission order. | **চাহিদাপত্র লোড** — টেন্ডারের `requirements.json` ফাইলটি টেনে আনুন। টেন্ডারের সারসংক্ষেপ, কত দিন বাকি এবং জমার ক্রম অনুযায়ী কাগজের তালিকা দেখবেন। |
| 2 | **Upload PDFs** — drop all your files at once (up to 30 files / 50 MB). Fake, damaged or password-protected files are shown with the reason. Identical files are flagged. | **পিডিএফ যোগ** — সব ফাইল একসাথে টেনে আনুন (সর্বোচ্চ ৩০টি / ৫০ MB)। নকল, নষ্ট বা পাসওয়ার্ড দেওয়া ফাইল কারণসহ দেখানো হয়; হুবহু একই ফাইল চিহ্নিত হয়। |
| 3 | **Match & check** — drag each file onto its document, or pick it from the row's dropdown. Use *Preview* to see the pages. Enter expiry dates where asked. Each row shows a live status. | **মিলিয়ে যাচাই** — প্রতিটি ফাইল টেনে সঠিক কাগজের ঘরে ছাড়ুন অথবা ড্রপডাউন থেকে বেছে নিন; *দেখুন* চেপে পৃষ্ঠা মিলিয়ে নিন। যেখানে চাওয়া হয়েছে সেখানে মেয়াদ শেষের তারিখ দিন। প্রতিটি সারিতে তাৎক্ষণিক অবস্থা দেখা যায়। |
| 4 | **Generate** — when nothing is blocking, press *Generate package*. `<tender_id>_Package.pdf` downloads. If the button is disabled, *Why can't I generate?* lists each problem; click one to jump to it. | **প্যাকেজ তৈরি** — কোনো বাধা না থাকলে *প্যাকেজ তৈরি করুন* চাপুন; `<tender_id>_Package.pdf` ডাউনলোড হবে। বোতাম বন্ধ থাকলে *কেন প্যাকেজ তৈরি করা যাচ্ছে না?* তালিকায় প্রতিটি সমস্যা দেখুন, ক্লিক করলে সেই সারিতে চলে যাবে। |

## Rules the app enforces
- Requirements are always sorted by `order`, whatever order the JSON lists them in.
- A file counts as a PDF only if its content starts with `%PDF-`. The extension and type are ignored. Damaged and password-protected PDFs are rejected with a friendly reason.
- One file per requirement and one requirement per file. Identical-content files (same SHA-256) can't fill two different requirements.
- Each requirement gets exactly one status, decided in this order:
  1. no file + mandatory → **Missing**
  2. no file + optional → **Not provided**
  3. expiry checked but no date → **Expiry date needed**
  4. expiry date before the deadline → **Expired**
  5. otherwise → **Ready**
- An expiry date **equal to the deadline is Ready**. Dates are compared as `YYYY-MM-DD` text, with no timezone shifts.
- *Generate* stays disabled while anything is Missing, Expired or Expiry date needed. Optional documents without a file are skipped.
- **Package layout:**
  - Page 1 is an English cover. It shows the tender ID, title, procuring entity, bidder, deadline, generation date, and the ordered contents list with page ranges.
  - Then come all pages of every matched document, in `order`.
  - Every page, the cover included, gets `<tender_id> | Page X of Y` in its own 28 pt band added below the original content, so the footer never covers anything.
  - Rotated, landscape, mixed-size and offset pages are handled.

## How the sample-pack problems were resolved
Full details are in [`SAMPLE_PACK_NOTES.md`](SAMPLE_PACK_NOTES.md). The resolution is recorded in `sample-pack/resolution.json`.

| Problem | Resolution |
|---|---|
| Two trade licenses (`trade_license_2025.pdf` expired 2025-06-30) | Used `trade_license_2026.pdf` (valid until 2027-06-30). The 2025 one would show **Expired**. |
| `experience_cert.pdf` and `experience_cert (1).pdf` are identical | Flagged as duplicates; one copy is used, and the app refuses to use the other for a second requirement. |
| `company_logo.png` (not a PDF, irrelevant) | Rejected by content check; never enters the package. |
| `scan_0042.pdf`: image-only scan with an unhelpful name | Identified with the preview as the **Signed Declaration (R10)**. |
| File numbers don't follow `order` (`01_financial…` is #9, `02_technical…` is #8) | The package follows `order`. |
| Optional R06 / R07 have no files | Marked **Not provided**, not blocking, skipped in the package. |
| Source PDFs print their own "Page 1 of 2" | Our footer sits in a separate band. The verifier checks only our footer, and checks that nothing else is in the band. |

Result: `output/T-2026-0417_Package.pdf`, 16 pages (1 cover + 15 document pages), verified by `scripts/verify-package.mjs`.

## Extras
- Page preview drawer (pdfjs thumbnails) to confirm a file before matching it.
- Asks before replacing a file that is already matched.
- Row shake and a reason message for refused actions.
- Filters in the files tray (All / Unmatched / Problems).
- Generation progress dialog, then a success dialog with *Download again* and *Open in new tab*.
- `scripts/build-package.mjs`: builds a package from a pack with the app's own logic. It refuses to build while anything is blocking, and checks that every expiry date it's given is printed in the document.
- `test-pack/`: a second, harder tender used as a judge-style regression test.

The optional stage-3 bonus features (auto-match suggestions, CSV export, index page, save/restore, seal stamping) were **not** built.

## Tech stack
React 18 + TypeScript (strict) + Vite · Tailwind CSS with shadcn-style components (Radix primitives) · lucide-react icons ·
zustand · @dnd-kit/core · react-dropzone · sonner · pdf-lib (package building) · pdfjs-dist (reading, page counts,
previews) · Inter + Noto Sans Bengali · vitest · GitHub Actions → GitHub Pages.

## Run locally
```bash
npm ci
npm run dev                                   # http://localhost:5173
npm test                                      # rules, matching, package builder, both packs end-to-end
npm run build                                 # production build (served under /DEVfestcontest/)
node scripts/build-package.mjs sample-pack    # rebuild output/T-2026-0417_Package.pdf and verify it
node scripts/verify-package.mjs output/T-2026-0417_Package.pdf sample-pack/requirements.json
node scripts/inspect-pack.mjs sample-pack     # inspect any pack (real file type, hash, pages, text, dates)
```
Pushing to `main` runs `.github/workflows/deploy.yml` (tests → build → GitHub Pages).

## AI usage
AI assistance was used to build this project. The prompts used for each stage are in the [`prompts/`](prompts/) folder.
