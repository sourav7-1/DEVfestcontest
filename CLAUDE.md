# Tender Document Package Builder

Frontend-only React app (no backend, nothing ever uploaded; all PDF work in the browser; target latest Chrome).
Office staff load a tender's `requirements.json`, upload PDFs, match PDFs → requirements, enter expiry dates,
see live statuses, and generate ONE ordered PDF package (English cover page + footer on every page). Full Bangla/English UI.
Competition project: correctness of rules first, then polished UX. Prompts for each stage live in `prompts/`.

## Commands
- `npm run dev` · `npm test` (vitest) · `npm run build` (tsc -b + vite build) — keep both green before committing.
- Deploy: Vercel (https://de-vfestcontest.vercel.app/) publishes `main`; `.github/workflows/deploy.yml` tests/builds and targets GitHub Pages. Keep `base: './'` in `vite.config.ts` — an absolute `/DEVfestcontest/` base made the Vercel site blank (assets 404 at the domain root).
- `node scripts/inspect-pack.mjs <dir>` — Step-0 inspector for any pack (magic bytes, SHA-256, pages, encrypted/corrupt, text, dates).
- `sample-pack/` = the OFFICIAL contest pack (from `problem-pack.zip`; never regenerate or edit its documents). Its resolution is `sample-pack/resolution.json`.
- `node scripts/build-package.mjs <pack> [resolution.json] [--out=dir]` — builds `output/<tender_id>_Package.pdf` with the app's own lib; asserts `expect` statuses, checks every expiry date is printed in the document, refuses while anything blocks, then runs the verifier.
- `node scripts/verify-package.mjs <pkg.pdf> [requirements.json]` — pdfjs check: exactly one `<id> | Page X of Y` per page inside the 28pt band, nothing else in the band, no leftover /Rotate, cover labels/values and contents order. (Source PDFs may print their own "Page 1 of 2" — only our footer counts.)
- `test-pack/` — synthetic judge-mode pack (`node scripts/make-test-pack.mjs` + `python scripts/encrypt-pdf.py …`), built into `test-pack/output/` by the tests.
- `node scripts/screenshots.mjs [url]` — Playwright (local Chrome, `channel: 'chrome'`) captures `screenshots/a–d`; default URL = live site. Hide toasts with CSS, never remove sonner nodes (crashes React).
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
- `src/lib/` is pure and runs in plain Node (type stripping): no TS enums/parameter properties, value imports use `.ts` extensions. Modules (no React): `types.ts`, `requirements.ts` (parse/validate/sort, `daysUntil`), `files.ts` (`isPdfHeader`, `sha256` via crypto.subtle, `applyLimits`, `readUpload(file, countPages)` — page counter is injected), `duplicates.ts`, `pdf.ts` (browser-only pdfjs + worker via `?url`; `countPages`, `renderThumbnails`), `status.ts`, `matching.ts`, `package.ts`.
- `package.ts` (pure, runs in Node via type stripping — so no TS parameter properties/enums there): cover (A4, Helvetica, WinAnsi-sanitized, wraps + overflows to more pages) then docs by `order`; every source page is embedded onto a new page `FOOTER_BAND`=28pt taller, using its CropBox (non-zero origins OK) and baking `/Rotate` so the footer is at the visual bottom; blank pages (no Contents) kept blank; footers added in a final pass.
- `src/store.ts` — zustand: tender, requirements, files, matches (reqId→fileId), expiries (reqId→YYYY-MM-DD), lang, step, readingCount, flash, previewFileId, pendingReplace. Hooks: `useT()`, `useEvaluation()` (live statuses/blockers). `src/actions.ts` = user actions shared by drag & dropdown (confirm replace, toasts, row shake/focus).
- `src/i18n.ts` — `en` is the source of `Key`; `bn` must be `Record<Key,string>` (compile error if a key is missing). `translate(lang,key,params)` localizes numeric params to Bangla digits. Lang persisted in localStorage `tpb.lang`. No hard-coded user-facing strings in components.
- `src/components/ui.tsx` — hand-written shadcn-style primitives (Button, Card, Badge, Alert, Tooltip(Radix), Separator). `status.tsx` — `STATUS_META` single source of status colour+icon+text.
- Components: `Checklist.tsx` (rows = dnd-kit droppables, native `<select>` for keyboard users, expiry input), `FilesTray.tsx` (draggable cards, filters), `GenerateBar.tsx` (progress, “Why can’t I generate?” popover, build + download), `Dialogs.tsx` (preview sheet, replace confirm, progress/success dialogs).
- Tests: `src/lib/logic.test.ts`, `src/lib/stage2.test.ts` (status branches, matching rules, package incl. rotation/origin/overflow), `src/lib/judge.test.ts` (test-pack + official sample pack end-to-end via build-package).
- Git: the user commits and pushes manually — never commit/push, never add AI attribution anywhere.

## Design system — "tender file desk" (spec: prompts/design.md)
- Metaphor: a Bangladeshi office tender file — khaki cover, red tape (lal fita), rubber-stamp statuses, ruled register. Restrained, not kitschy.
- Tokens are CSS variables in `src/index.css` (RGB triplets) mapped in `tailwind.config.js`: `paper` #F5F0E6 (app bg), `sheet` #FFFDF8 (panels), `ink` #1E2B2A / `ink-muted` #5E6B67, `rule` #E2D9C6, `khaki` #C8A66A (accents only, never text) / `khaki-soft` #EFE3C8 / `khaki-deep` #7A5E2A (khaki-toned text, AA), `primary` bottle green #1F5C47 / hover #174A39, `tape` #B23A2E (sparingly: problems, file errors, the cover's tape stripe).
- Status stamps (`st-*` tokens, `.stamp` class: uppercase, 0.06em tracking, 1.5px border, 4px radius): OK #276E45/#E4F2E8 · Missing #B23A2E/#F8E3DF · Expired #9C2F24/#F6DDD8 · Expiry needed #8C580C/#FBEFD6 · Not provided #5E6461/#ECEAE4 · Duplicate brown #8A5A2B/#F1E6D6 · Error tape. Three spec colours were darkened to pass WCAG AA on their tints; keep every text/bg pair ≥ 4.5:1.
- BANNED: purple/violet/indigo/lavender/magenta, black or near-black backgrounds, pure #000 text, gradients/glass/glow, Inter/Poppins, same radius+shadow on everything. Overlay is rgba(30,43,42,0.35); the only shadow is `shadow-lift` (ink-tinted) on floating surfaces.
- Type: headings Source Serif 4 (Bangla: Noto Serif Bengali), UI IBM Plex Sans (Bangla: Hind Siliguri), numbers/IDs/dates/page counts IBM Plex Mono + `.tabular`. Scale 13/14/16/18/22/28; line-height 1.55, Bangla 1.7. Icons lucide at stroke 1.75, 18px in rows, 20px in buttons. Focus: 2px primary outline, 2px offset.
- Layout: thin top bar (serif name, khaki folder icon, mono "FILE NO." label, two-segment বাংলা|English) → steps as file-divider tabs (active = sheet + 3px khaki top) → khaki file-cover summary → register (mono margin column, ruled rows, square rows in an 8px container) ≈60% | files tray of folded-corner paper sheets ≈40% (collapsible drawer below `lg`) → sticky bar (khaki top border, mono "X / N ready", thin green line, tape-red problems popover, Generate right). "READY FOR SUBMISSION" stamp (−2°, one-time scale-in) appears when nothing blocks.
- Motion: 150ms colour transitions, row shake on refusal, slot settle on match, the single stamp moment; `prefers-reduced-motion` disables all.
- Copy: short, plain, polite office language in both languages; no marketing phrases or emoji.
