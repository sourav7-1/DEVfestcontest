You are building a competition project under a hard 90-minute limit. Correctness of rules first, then a polished UX. First save this exact prompt to prompts/stage1.md.

## Project
"Tender Document Package Builder" — FRONTEND-ONLY React web app (no backend; never upload documents anywhere; all PDF processing in the browser; must work in latest Chrome). Non-technical office staff load a tender's requirements.json, upload PDFs, match each PDF to a required document, enter expiry dates, see live statuses, and generate ONE ordered PDF package with an English cover page and footers on every page. Full Bangla/English UI.

## Step 0 — inspect the sample pack (do this first, thoroughly)
Unzip sample-pack.zip into ./sample-pack/. Read requirements.json. For every file in documents/: detect real type by magic bytes, page count, SHA-256, encrypted/corrupt status, and extract text (pdftotext/pdfinfo or a node script) to identify which requirement it is and any expiry/validity date printed in it. Write SAMPLE_PACK_NOTES.md: file → requirement mapping, expiry dates, and EVERY hidden problem (identical-content duplicates with different names, expired docs, docs expiring exactly on the deadline, non-PDF or fake .pdf files, corrupt/password-protected PDFs, missing mandatory docs, irrelevant extra files, unsorted `order`, misleading file names). Judges will test with an unseen pack containing similar traps.

## Step 1 — scaffold
- Vite + React 18 + TypeScript (strict).
- Tailwind CSS + shadcn/ui (Button, Card, Badge, Select, Dialog, Sheet, Tooltip, Popover, Progress, Toggle Group, Alert, Separator, Input). If shadcn setup blocks for >5 minutes, fall back to hand-written Tailwind components with the same look — don't lose time.
- lucide-react icons, sonner toasts, zustand for state, @dnd-kit/core for drag-to-match, react-dropzone for uploads.
- pdf-lib (+ @pdf-lib/fontkit), pdfjs-dist (configure the worker for Vite: `pdfjs-dist/build/pdf.worker.min.mjs?url`).
- vitest for logic tests.
- Fonts: Inter + Noto Sans Bengali (Google Fonts) so Bangla renders beautifully in the UI.
If a frontend-design skill is available to you, load and follow it for visual decisions.

Create CLAUDE.md capturing the rules, architecture and design system below so later sessions keep context.

## Architecture (business logic pure, UI-independent, runnable in Node)
- src/lib/types.ts — Tender, Requirement, UploadedFile {id, name, size, bytes, pageCount, hash, error?: 'not_pdf'|'corrupt'|'encrypted'|'limit'}, Status enum.
- src/lib/requirements.ts — parse + validate requirements.json with clear errors; ALWAYS sort by `order` yourself.
- src/lib/files.ts — reject non-PDF by checking the header contains "%PDF-" (not extension/MIME); enforce max 30 files and 50 MB total; SHA-256 via crypto.subtle; page count via pdfjs; catch corrupt and password-protected PDFs → mark with a friendly error, never crash.
- src/lib/duplicates.ts — group files by identical hash.
- src/store.ts — zustand store: tender, requirements, files, matches (reqId→fileId), expiries (reqId→YYYY-MM-DD), lang. Derived selectors for statuses come later.
- src/i18n.ts — complete `en` and `bn` dictionaries (natural, friendly office Bangla, not literal machine translation) for EVERY string: steps, buttons, statuses, errors, hints, toasts, empty states. `t()` helper + language persisted in localStorage. No hard-coded strings in components.

## Design system (apply consistently)
- Feel: calm, trustworthy, government-office friendly, modern. Light theme default, neutral slate background, white cards, one primary color (deep indigo or teal), generous spacing, rounded-xl cards, subtle shadows, base font 16px (readable for older staff), large click targets (min 40px).
- Status colors ALWAYS paired with icon + text (never color alone): OK = green/CheckCircle, Missing = red/XCircle, Expired = red/CalendarX, Expiry needed = amber/CalendarClock, Not provided = gray/MinusCircle, Duplicate = purple/Copy, Error = red/AlertTriangle.
- Layout (desktop-first, still usable at 1280px and on tablet):
  - Top bar: app name + icon, tender ID chip once loaded, language segmented toggle (বাংলা | English).
  - Horizontal stepper: 1 Load requirements → 2 Upload PDFs → 3 Match & check → 4 Generate. Steps show done/active state; later steps are reachable but show guidance if prerequisites are missing.
  - Main workspace (after load): LEFT (~60%) = Requirements checklist; RIGHT (~40%) = Uploaded files tray. Sticky bottom bar = progress ("6 of 9 ready"), problem count, Generate button.
- Micro-interactions: smooth transitions (CSS/tailwind-animate only, keep it light), toast for every action outcome, skeleton/spinner while reading PDFs, focus rings, full keyboard accessibility, aria-labels.

## Build in this stage
1. Landing/Step 1: a friendly hero card with a big drop zone "Drop requirements.json here or click to choose", a short 4-step explanation of the process, and clear error alerts for invalid JSON. After loading: a Tender summary card (tender ID, title, procuring entity, bidder, deadline with "N days left" or "deadline passed") and the requirements list sorted by order (order number pill, title in current language via title_bn/title_en, Mandatory/Optional badge, "Expiry checked" chip).
2. Step 2: Files tray with react-dropzone accepting many files at once (and a "Choose files" button). Each file is a compact card: PDF icon, name (truncate + tooltip), pages, size, remove button (icon), and badges for errors/duplicates ("Same content as X"). Rejected files stay visible with a clear reason so the user understands what happened, and can be dismissed. Toasts for rejections and for limit violations.
3. Language toggle switches the whole app instantly.

Write vitest tests for requirements parsing/sorting, file validation (magic bytes) and duplicate detection. Run tests and `npm run build`; fix until green.

Commit: "feat: React+Tailwind scaffold, design system, requirements loading, PDF upload/validation, duplicate detection, i18n | AI prompt: prompts/stage1.md"
Push to origin main. Then show me a summary of SAMPLE_PACK_NOTES.md.
