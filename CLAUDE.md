# Tender Document Package Builder

Frontend-only React app (no backend, nothing ever uploaded; all PDF work in the browser; target latest Chrome).
Office staff load a tender's `requirements.json`, upload PDFs, match PDFs → requirements, enter expiry dates,
see live statuses, and generate ONE ordered PDF package (English cover page + footer on every page). Full Bangla/English UI.
Competition project: correctness of rules first, then polished UX. Prompts for each stage live in `prompts/`.

## Commands
- `npm run dev` · `npm test` (vitest) · `npm run build` (tsc -b + vite build) — keep both green before committing.
- `node scripts/inspect-pack.mjs <dir>` — Step-0 inspector for any pack (magic bytes, SHA-256, pages, encrypted/corrupt, text, dates).
- `node scripts/make-sample-pack.mjs && python scripts/make-sample-pack.py` — regenerates the synthetic `sample-pack/` + zip (python step needs `pypdf`).
- See `SAMPLE_PACK_NOTES.md` for the trap list the app must handle.

## Rules (business logic)
- Requirements: ALWAYS sort by `order` (never trust array order). Parser accepts key aliases (`deadline`/`submission_deadline`, `mandatory`/`required`, `expiry_required`/`expiry_check`…); `mandatory` defaults to true. Errors are i18n keys (`RequirementsError.key`).
- A file is a PDF only if `%PDF-` appears in its first 1024 bytes — ignore extension and MIME.
- Then it must open in pdfjs: `PasswordException` → `encrypted`, anything else → `corrupt`. Never crash; errored files stay visible with a reason and can be dismissed.
- Limits: max 30 files and 50 MB total, counting only accepted (error-free) files; overflow files are shown with error `limit`.
- Duplicates = identical SHA-256 (any name). Errored files are ignored for duplicates. Include duplicate content once in the package.
- Expiry (stage 2): a doc is **expired if expiry < deadline**; expiry == deadline is valid (still valid on submission day) but should be highlighted. Expiry is entered by the user (printed formats vary: `30 June 2027`, `20/10/2026` = DD/MM, `2026-09-30`).
- Mandatory missing/unusable → blocks generation; optional missing → "Not provided", does not block. Irrelevant extra files must not enter the package.

## Architecture
- `src/lib/` is pure and Node-testable (no React): `types.ts`, `requirements.ts` (parse/validate/sort, `daysUntil`), `files.ts` (`isPdfHeader`, `sha256` via crypto.subtle, `applyLimits`, `readUpload(file, countPages)` — page counter is injected), `duplicates.ts`, `pdf.ts` (browser-only pdfjs + worker via `?url`; exports `countPages`).
- `src/store.ts` — zustand: tender, requirements, files, matches (reqId→fileId), expiries (reqId→YYYY-MM-DD), lang, step, readingCount. `useT()` hook. Status selectors come in stage 2.
- `src/i18n.ts` — `en` is the source of `Key`; `bn` must be `Record<Key,string>` (compile error if a key is missing). `translate(lang,key,params)` localizes numeric params to Bangla digits. Lang persisted in localStorage `tpb.lang`. No hard-coded user-facing strings in components.
- `src/components/ui.tsx` — hand-written shadcn-style primitives (Button, Card, Badge, Alert, Tooltip(Radix), Separator). `status.tsx` — `STATUS_META` single source of status colour+icon+text.
- Tests: `src/lib/logic.test.ts` (includes a real sample-pack regression via pdfjs legacy build).

## Design system
- Calm, government-office, trustworthy. Light theme, canvas `#F3F5F8`, white cards (`rounded-xl`, border `#DDE3E9`, faint shadow), ink `#1E293B`, single primary deep teal `#0F5E63` (soft `#E3F0EF`, dark `#0A4447`).
- Fonts: Inter + Noto Sans Bengali (Google Fonts). Base 16px; Bangla gets line-height 1.65. Click targets ≥ 40px. Visible focus rings (`ring-primary`).
- Status = colour + icon + text, always: OK green CheckCircle · Missing red XCircle · Expired red CalendarX · Expiry needed amber CalendarClock · Not provided gray MinusCircle · Duplicate purple Copy · Error red AlertTriangle.
- Layout: sticky top bar (name, tender ID chip, বাংলা|English toggle) → 4-step stepper → workspace: tender summary, then requirements (≈60%) | files tray (≈40%) → sticky bottom bar (progress "N of M ready", problem count, Generate).
- Motion light: tailwindcss-animate fade-ins only; reduced-motion respected. Toast (sonner) for every action outcome.
