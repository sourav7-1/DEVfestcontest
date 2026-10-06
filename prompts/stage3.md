Read CLAUDE.md and SAMPLE_PACK_NOTES.md. Save this prompt to prompts/stage3.md.

## GIT RULES (strict, apply to this whole stage)
- Do NOT run git commit, git push, git rebase, or any command that changes git history or remotes.
- Do NOT add "Co-Authored-By", "Generated with Claude Code", or any Claude/Anthropic attribution anywhere (commit messages, README, code comments, PR text).
- I commit and push manually. When I need to push (e.g. for deployment), stop and tell me.

## 1. DEPLOY SETUP
Set up GitHub Pages deployment via GitHub Actions: create .github/workflows/deploy.yml (build with Vite, upload dist, deploy to Pages) and set Vite `base` to "/<repo-name>/" (read the repo name from `git remote get-url origin`). Make sure the pdfjs worker and fonts resolve correctly under that base path. Run `npm run build` and `npx vite preview` locally to confirm the production build works with the base path.
Then STOP and tell me: "Ready to deploy — please commit and push now", and give me the exact commit message. After I confirm I've pushed, tell me how to enable Pages (Settings → Pages → Source: GitHub Actions) if needed, and verify the live URL once I give it to you (load it, check worker/fonts, full flow). Put the live URL in README.md.

## 2. REAL OUTPUT
scripts/build-sample.mjs uses src/lib/package.ts to build the package from the sample pack after resolving its problems per SAMPLE_PACK_NOTES.md (correct file per requirement, real expiry dates read from the documents, duplicates excluded, broken/irrelevant files skipped). If a mandatory doc genuinely can't be satisfied, STOP and tell me — never fake data. Save to output/<tender_id>_Package.pdf and run scripts/verify-package.mjs on it; show me the result.

## 3. UX POLISH
- Empty states with an icon and one-line guidance for every panel.
- Collapsible "How it works" hint banner in both languages.
- Confirm dialogs before removing a matched file and for "Start over".
- Responsive check at 1280px, 1440px and tablet width; nothing overflows; long Bangla titles wrap nicely.
- Accessibility: tab order, visible focus, aria-labels, status text readable by screen readers, AA contrast.
- Optional: Bangla digits for counts/dates in Bangla mode (UI only; keep YYYY-MM-DD internally).

## 4. BONUS FEATURES (in this order; each only if it takes <5 min and breaks nothing; run tests after each)
a. Auto-match: "Suggest matches" button — fuzzy-match file names against title_en/title_bn and keywords (trade, license, tin, vat, bin, bank, solvency, experience, technical, financial, proposal…). Show suggestions in a Dialog the user accepts all or individually; never apply silently; never suggest error files or duplicate-conflicting files.
b. Export checklist CSV (document, file name, pages, expiry date, status) with UTF-8 BOM so Bangla opens correctly in Excel.
c. Index page after the cover: each document with its starting page number (accounting for cover + index pages; footer Y includes them). Update verify-package.mjs accordingly.
d. Save/restore: autosave matches/expiries/lang to localStorage (files re-linked by hash when re-uploaded) + export/import a project JSON.
e. Seal/signature: upload a PNG, choose pages (all / specific), position and size; stamp before footers and never over the footer band.

## FINISH
Run all tests and `npm run build`; fix everything until green. Then STOP and give me:
1. a short summary of what changed and which bonus features are done,
2. a ready-to-copy commit message in this exact format:
   "feat: <what changed> | AI prompt: prompts/stage3.md"
