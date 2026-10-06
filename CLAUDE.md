# Tender Document Package Builder

Frontend-only React app (no backend, nothing ever uploaded; all PDF work in the browser; target latest Chrome).
Office staff load a tender's `requirements.json`, upload PDFs, match PDFs → requirements, enter expiry dates,
see live statuses, and generate ONE ordered PDF package (English cover page + footer on every page). Full Bangla/English UI.
Competition project: correctness of rules first, then polished UX. Prompts for each stage live in `prompts/`.

## Commands
- `npm run dev` · `npm test` (vitest) · `npm run build` (tsc -b + vite build) — keep both green before committing.
- `node scripts/inspect-pack.mjs <dir>` — Step-0 inspector for any pack (magic bytes, SHA-256, pages, encrypted/corrupt, text, dates).
- `node scripts/make-sample-pack.mjs && python scripts/make-sample-pack.py` — regenerates the synthetic `sample-pack/` + zip (python step needs `pypdf`).
- `node scripts/verify-package.mjs <pkg.pdf> [requirements.json]` — pdfjs check of footers "<id> | Page X of Y" + cover fields; `--sample` builds from the sample pack into `out/` first.
- See `SAMPLE_PACK_NOTES.md` for the trap list the app must handle.

## Rules (business logic)
- Requirements: ALWAYS sort by `order` (never trust array order). Parser accepts key aliases (`deadline`/`submission_deadline`, `mandatory`/`required`, `expiry_required`/`expiry_check`…); `mandatory` defaults to true. Errors are i18n keys (`RequirementsError.key`).
- A file is a PDF only if `%PDF-` appears in its first 1024 bytes — ignore extension and MIME.
- Then it must open in pdfjs: `PasswordException` → `encrypted`, anything else → `corrupt`. Never crash; errored files stay visible with a reason and can be dismissed.
- Limits: max 30 files and 50 MB total, counting only accepted (error-free) files; overflow files are shown with error `limit`.
- Duplicates = identical SHA-256 (any name). Errored files are ignored for duplicates. Include duplicate content once in the package.
- Status (`lib/status.ts`), one per requirement, in order: no file & mandatory → MISSING; no file & optional → NOT_PROVIDED; expiry checked & no date → EXPIRY_NEEDED; expiry < deadline → EXPIRED; else OK. Only OK/NOT_PROVIDED are non-blocking. Dates compared as YYYY-MM-DD strings, never via `Date`. Expiry == deadline is OK (highlighted in UI). Expiry is entered by the user (printed formats vary: `30 June 2027`, `20/10/2026` = DD/MM, `2026-09-30`).
- Matching (`lib/matching.ts`): 1 file ↔ 1 requirement; error files never match; same-hash file can't fill a different requirement (`duplicate_elsewhere`). Replacing a slot's file clears its expiry; moving a file keeps it; removing a file drops its match + expiry.
- Mandatory missing/unusable → blocks generation; optional missing → "Not provided", does not block. Irrelevant extra files must not enter the package.

## Architecture
- `src/lib/` is pure and Node-testable (no React): `types.ts`, `requirements.ts` (parse/validate/sort, `daysUntil`), `files.ts` (`isPdfHeader`, `sha256` via crypto.subtle, `applyLimits`, `readUpload(file, countPages)` — page counter is injected), `duplicates.ts`, `pdf.ts` (browser-only pdfjs + worker via `?url`; `countPages`, `renderThumbnails`), `status.ts`, `matching.ts`, `package.ts`.
- `package.ts` (pure, runs in Node via type stripping — so no TS parameter properties/enums there): cover (A4, Helvetica, WinAnsi-sanitized, wraps + overflows to more pages) then docs by `order`; every source page is embedded onto a new page `FOOTER_BAND`=28pt taller, using its CropBox (non-zero origins OK) and baking `/Rotate` so the footer is at the visual bottom; blank pages (no Contents) kept blank; footers added in a final pass.
- `src/store.ts` — zustand: tender, requirements, files, matches (reqId→fileId), expiries (reqId→YYYY-MM-DD), lang, step, readingCount, flash, previewFileId, pendingReplace. Hooks: `useT()`, `useEvaluation()` (live statuses/blockers). `src/actions.ts` = user actions shared by drag & dropdown (confirm replace, toasts, row shake/focus).
- `src/i18n.ts` — `en` is the source of `Key`; `bn` must be `Record<Key,string>` (compile error if a key is missing). `translate(lang,key,params)` localizes numeric params to Bangla digits. Lang persisted in localStorage `tpb.lang`. No hard-coded user-facing strings in components.
- `src/components/ui.tsx` — hand-written shadcn-style primitives (Button, Card, Badge, Alert, Tooltip(Radix), Separator). `status.tsx` — `STATUS_META` single source of status colour+icon+text.
- Components: `Checklist.tsx` (rows = dnd-kit droppables, native `<select>` for keyboard users, expiry input), `FilesTray.tsx` (draggable cards, filters), `GenerateBar.tsx` (progress, “Why can’t I generate?” popover, build + download), `Dialogs.tsx` (preview sheet, replace confirm, progress/success dialogs).
- Tests: `src/lib/logic.test.ts`, `src/lib/stage2.test.ts` (status branches, matching rules, package incl. rotation/origin/overflow; sample-pack regressions).

## Design system
- Calm, government-office, trustworthy. Light theme, canvas `#F3F5F8`, white cards (`rounded-xl`, border `#DDE3E9`, faint shadow), ink `#1E293B`, single primary deep teal `#0F5E63` (soft `#E3F0EF`, dark `#0A4447`).
- Fonts: Inter + Noto Sans Bengali (Google Fonts). Base 16px; Bangla gets line-height 1.65. Click targets ≥ 40px. Visible focus rings (`ring-primary`).
- Status = colour + icon + text, always: OK green CheckCircle · Missing red XCircle · Expired red CalendarX · Expiry needed amber CalendarClock · Not provided gray MinusCircle · Duplicate purple Copy · Error red AlertTriangle.
- Layout: sticky top bar (name, tender ID chip, বাংলা|English toggle) → 4-step stepper → workspace: tender summary, then requirements (≈60%) | files tray (≈40%) → sticky bottom bar (progress "N of M ready", problem count, Generate).
- Motion light: tailwindcss-animate fade-ins only; reduced-motion respected. Toast (sonner) for every action outcome.
