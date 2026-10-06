Redesign the visual layer of this app. Save this prompt to prompts/design.md.

## GIT RULES (strict)
Do NOT run git commit/push or any history-changing command. Do NOT add "Co-Authored-By", "Generated with Claude Code" or any Claude/Anthropic attribution anywhere. I commit manually.

## HARD CONSTRAINTS
- Change ONLY styling, layout and presentational components. Do NOT change any logic in src/lib/ or the store. All existing tests must still pass.
- NO purple, violet, indigo, lavender or magenta anywhere (including status colors, focus rings, links, selection, charts). NO black or near-black backgrounds, NO dark-mode-by-default. Text uses a dark ink color, never pure #000.
- If a frontend-design skill is available, load it and follow it.

## IT MUST NOT LOOK AI-GENERATED. Avoid all of these:
- purple/blue gradients, gradient text, glassmorphism, blurred blobs, glowing borders
- centered hero with big gradient headline + generic subtitle
- the generic grid of 3 identical feature cards with icons
- default shadcn look (slate + rounded-xl + shadow everywhere) — restyle its tokens
- sparkle/magic icons, emoji in headings, "✨", "AI-powered" vibes
- Inter / Poppins / system-default "startup" fonts
- every element having the same radius and same drop shadow
- meaningless decorative illustrations

## CONCEPT: "Tender file desk" (Bangladeshi office file, made modern)
The app should feel like a well-organized physical tender file on an office desk: khaki file cover, red tape ("lal fita"), rubber-stamp statuses, ruled register pages — but clean, modern and highly usable, not kitschy. Real-world metaphor, restrained execution.

## PALETTE (CSS variables / Tailwind theme tokens; replace shadcn defaults)
--paper:      #F5F0E6  (app background, warm off-white)
--sheet:      #FFFDF8  (cards / panels)
--ink:        #1E2B2A  (main text, deep green-gray)
--ink-muted:  #5E6B67
--rule:       #E2D9C6  (borders, ruled lines)
--khaki:      #C8A66A  (file-cover accents, headers of the file)
--khaki-soft: #EFE3C8
--primary:    #1F5C47  (bottle green — primary buttons, active step, links)
--primary-hover: #174A39
--tape:       #B23A2E  (red tape accent — sparingly: the Generate area, key highlights)
Status colors (each always with icon + text label):
OK #2E7D4F on #E4F2E8 · Missing #B23A2E on #F8E3DF · Expired #9C2F24 on #F6DDD8 · Expiry needed #A86B12 on #FBEFD6 · Not provided #6B716E on #ECEAE4 · Duplicate #8A5A2B (brown) on #F1E6D6 · File error #B23A2E
Focus ring: 2px #1F5C47 with 2px offset. Text selection: khaki-soft. Check every text/background pair passes WCAG AA.

## TYPOGRAPHY (Google Fonts)
- Headings: "Source Serif 4" (semibold) — gives an official-document character.
- Body/UI: "IBM Plex Sans".
- Bangla: "Hind Siliguri" for UI text, "Noto Serif Bengali" for Bangla headings; set font-family stacks so Bangla glyphs always use these.
- Numbers, tender ID, page counts, dates: "IBM Plex Mono" with tabular figures.
- Base 16px, line-height 1.55; Bangla line-height 1.7. Clear size scale (14/16/18/22/28).

## COMPONENT STYLING
- App background: --paper with a very subtle paper texture or none (no gradients).
- Top bar: thin, --sheet background, bottom 1px --rule border. App name in serif, a small khaki file-folder icon. Tender ID shown as a monospace "file number" label (e.g. "FILE NO. T-2026-0417"). Language toggle as a simple two-segment control (বাংলা | English) with green active state.
- Stepper: numbered like file tabs (1–4) along the top edge of the workspace, active tab looks "pulled forward" (sheet color, khaki top border 3px), inactive tabs khaki-soft. No circles-with-lines generic stepper.
- Tender summary: styled as the FRONT OF A FILE COVER — khaki-soft panel with a 4px khaki left edge, fields laid out as a labeled form (label small caps muted, value in ink), deadline highlighted with days remaining. A thin red-tape stripe across one corner is allowed as the only decoration.
- Requirements checklist: a REGISTER/LEDGER — table-like rows with 1px ruled lines (--rule), order number in a narrow left margin column in mono (like a margin line in a register book), title, mandatory/optional as small uppercase text tags, and the matched-file slot. Alternating rows NOT striped; hover = khaki-soft tint. Mixed radius: rows square, the container 8px.
- Status badges: RUBBER-STAMP style — uppercase, letter-spacing 0.06em, 1.5px solid border in the status color, light tinted fill, small icon, 4px radius. Readable, not rotated. When ALL requirements are OK, show one larger "READY FOR SUBMISSION" stamp (slightly rotated −2°, tape red or green) near the Generate button — the only playful moment.
- Empty slot: dashed --rule border with "Drop file here / ফাইল এখানে রাখুন". On drag-over: green dashed border + khaki-soft fill.
- Files tray: each file is a small "paper sheet" card — --sheet, 1px --rule border, a folded top-right corner (CSS clip-path or pseudo-element), PDF icon, name, mono page count. Matched files show a small "→ R03" tag; error files get a red left border and a clear reason line; duplicates get a brown "SAME CONTENT AS …" tag.
- Buttons: primary = solid bottle green, white text, 6px radius, no gradient; secondary = sheet background with --rule border; destructive = tape red text with outline. Disabled state clearly gray with not-allowed cursor.
- Sticky bottom bar: --sheet with top border in khaki, progress shown as "6 / 9 ready" in mono plus a thin green progress line (not a chunky pill), problem count in tape red, and the Generate button on the right. The "why disabled" list appears as a register-style popover with each reason as a row (click → scroll & briefly highlight the row with khaki-soft).
- Dialogs/sheets: --sheet background, serif title, 1px --rule dividers, soft single shadow (0 8px 24px rgba(30,43,42,0.12)). Overlay: rgba(30,43,42,0.35) (NOT black).
- Toasts: sheet background, colored left border by type, ink text.
- Icons: lucide, stroke 1.75, sized consistently (18px in rows, 20px in buttons).
- Motion: minimal and purposeful — 150ms color/border transitions, slot "settle" on drop, a 1-time stamp scale-in for READY. Respect prefers-reduced-motion.
- Spacing: 8px grid, generous whitespace; content max-width ~1280px centered; left register ~60%, right files tray ~40%; on tablet stack vertically with the tray as a collapsible drawer.

## COPY TONE
Short, plain, polite office language in both languages ("Upload the trade license PDF here", "ট্রেড লাইসেন্সের PDF এখানে দিন"). No marketing phrases, no exclamation-heavy text, no emojis.

## FINISH
Run tests and `npm run build`; fix issues. Take before/after screenshots if possible and save them to screenshots/design/. Then STOP and give me:
1. a short summary of the visual changes,
2. a list confirming no purple/black colors remain (grep the codebase for violet/purple/indigo/fuchsia/black/#000 classes and values and show results),
3. a ready-to-copy commit message:
   "style: redesign UI as tender file desk theme, remove purple/black | AI prompt: prompts/design.md"
