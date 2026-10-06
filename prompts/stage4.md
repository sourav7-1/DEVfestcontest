Final QA. Save this prompt to prompts/stage4.md. NO new features — only fixes.

## GIT RULES (strict)
- Do NOT run git commit, git push, or any history-changing command.
- Do NOT add "Co-Authored-By", "Generated with Claude Code", or any Claude/Anthropic attribution anywhere (commits, README, comments).
- I commit and push manually.

## 1. JUDGE-MODE TEST
Create test-pack/ with a DIFFERENT tender: different tender_id, unsorted `order` values, an optional doc with expiry, a doc expiring exactly on the deadline (must be OK), one expiring one day before (must be Expired), a duplicate pair with different names, a .txt renamed to .pdf, an encrypted PDF if you can generate one, and an extra irrelevant PDF. Run the logic over it and confirm every status matches the rules. Generate its package and pass verify-package.mjs. Report any bug and fix it.

## 2. RULE CHECKLIST
Re-verify: cover page in English with tender ID, title, procuring entity, bidder, deadline, generated date and the ordered document list; documents sorted by order with all pages in original order; unmatched optional docs skipped; footer "<tender_id> | Page X of Y" on EVERY page including the cover; footer never overlaps content; filename <tender_id>_Package.pdf; Generate disabled with visible reasons while any blocking status exists. Grep all components for hard-coded user-facing strings — the language toggle must translate EVERYTHING.

## 3. SCREENSHOTS
Using Playwright (if it installs quickly) against the LIVE URL, load the sample pack and save to screenshots/:
(a) statuses showing problems, (b) all statuses OK, (c) Bangla UI, (d) generate success dialog.
If Playwright fails, give me an exact manual screenshot list with what to click before each one.

## 4. README.md
Overview, live link, 4-step usage guide in English and Bangla, tech stack, how each sample-pack problem was resolved, bonus features completed, and an "AI usage" section stating that AI assistance was used and the prompts are in the prompts/ folder (plain statement, no tool attribution lines).

## 5. FINAL CHECK
Confirm output/<tender_id>_Package.pdf exists and is up to date, screenshots/ is filled, prompts/ contains stage1–4, and `npm run build` passes.

## FINISH
STOP and give me:
1. the final submission checklist (repo URL, live URL, output PDF, screenshots, README) with ✅/❌ for each,
2. a ready-to-copy commit message:
   "chore: final QA, screenshots, README | AI prompt: prompts/stage4.md"
3. a reminder that after my push I must confirm the live site shows the latest version before T+90.
