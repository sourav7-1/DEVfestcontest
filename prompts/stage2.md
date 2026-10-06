Read CLAUDE.md and SAMPLE_PACK_NOTES.md first. Save this prompt to prompts/stage2.md.

## A. Status engine — src/lib/status.ts (pure, fully unit-tested)
For every requirement exactly ONE status, evaluated in this order:
1. no file & mandatory → MISSING (blocking)
2. no file & optional → NOT_PROVIDED (non-blocking)
3. has_expiry & no expiry entered → EXPIRY_NEEDED (blocking)
4. has_expiry & expiry < submission_deadline → EXPIRED (blocking)
5. else → OK
Compare dates as YYYY-MM-DD strings — NEVER parse with local-timezone Date. Expiry EQUAL to deadline is OK. Tests for every branch, including same-day, one-day-before, optional-with-expiry, mandatory-without-expiry.
Also src/lib/matching.ts (pure, tested): assign/unassign/move with rules — one requirement ↔ at most one file; one file ↔ at most one requirement; error files can never be matched; files with identical hash may NOT be matched to different requirements (return a typed rejection reason). Removing a file removes its match and expiry.
Expose derived statuses + blocking reasons from the zustand store so the UI updates instantly after every change.

## B. Matching UX (Step 3) — make this the best part of the app
- Requirements checklist rows (left): order pill, title (current language), Mandatory/Optional badge, live status badge (icon+text+color), and a "slot":
  - Empty slot: dashed drop target "Drop a file here" + a Select dropdown listing available files (used files shown disabled with "Used for <doc>"; error files hidden; duplicates warned).
  - Filled slot: file chip (name, pages) with "Preview", "Change" and "Unmatch" (X) actions.
  - If has_expiry and matched: inline date input with label "Expiry date" and helper text showing the deadline; immediately shows Expired/OK.
  - Expired rows explain: "Expired on 2026-09-30 — must be valid on or after 2026-10-20".
- Files tray (right): draggable file cards (@dnd-kit). Drag onto a requirement slot to match; dropping onto an occupied slot asks to replace. Matched files show a small "→ R03 Trade License" tag and are dimmed. Filter tabs: All / Unmatched / Problems.
- Illegal actions (duplicate to a different doc, error file) → shake/red highlight + toast with the reason in the current language.
- Preview: a shadcn Sheet showing pdfjs-rendered page thumbnails of a file (lazy, first ~5 pages, page count shown) so staff can confirm what they're matching.
- Keyboard/no-drag users can do everything with the dropdowns.

## C. Generate gating (sticky bottom bar)
- Progress bar "X of N ready", counts of blocking problems.
- Generate button disabled while any blocking status or illegal duplicate match exists. Beside it, a visible "Why can't I generate?" list (popover or inline expandable) with plain-language reasons in the current language; clicking a reason scrolls to and highlights that row.

## D. PDF package — src/lib/package.ts (pure: bytes+data in → Uint8Array out; must also run in Node)
1. Page 1 = cover in ENGLISH: tender ID, title, procuring entity, bidder, submission deadline, package generated date (YYYY-MM-DD local), and the ordered list of included documents (order, title_en, file name, pages). Professional layout (title block, labeled fields table, thin rules), Helvetica, text wrapping for long titles, overflow to additional cover pages if needed.
2. Then matched documents sorted by `order`, ALL pages, original order. Skip optional docs with no file.
3. EVERY page incl. cover: footer "<tender_id> | Page X of Y", Y = total pages of the final package. Add footers in a final pass.
4. Footer must be readable and must NOT cover content: add a dedicated footer band (~28pt) below the original content — either extend MediaBox AND CropBox downward (respect non-zero origins) or embed each source page onto a new taller page. Must handle rotation 0/90/180/270 so the footer is at the visual bottom, centered, ~9–10pt dark gray, with a thin separator line. Handle mixed page sizes.
5. Download as <tender_id>_Package.pdf.
After generation show a success Dialog: total pages, list of included docs, "Download again" and "Open in new tab" buttons. Show a progress indicator while building; never freeze silently.

scripts/verify-package.mjs: load a PDF with pdfjs, print page count, extract per-page text, assert every footer "Page X of Y" is correct and the cover contains all required fields. Vitest tests for package builder with small generated PDFs incl. a rotated page and a non-zero MediaBox origin.

Run tests + build, fix all. Commit:
"feat: drag-and-drop matching, live status engine, generate gating, PDF package with cover and footers | AI prompt: prompts/stage2.md"
Push.
