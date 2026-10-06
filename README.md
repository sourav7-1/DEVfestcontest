# Tender Document Package Builder

**Live app:** https://sourav7-1.github.io/DEVfestcontest/

Frontend-only web app (Bangla / English) that helps office staff assemble a tender submission:
load the tender's `requirements.json`, add PDFs, match each PDF to a required document, enter expiry dates,
see live statuses, and download one ordered PDF with an English cover page and a `<tender_id> | Page X of Y` footer on every page.
Nothing is uploaded — all PDF processing happens in the browser.

## Run locally
```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # unit tests (status rules, matching, package builder, sample-pack regressions)
npm run build      # production build (served under /DEVfestcontest/)
npx vite preview   # preview the production build
```

## Scripts
- `node scripts/inspect-pack.mjs sample-pack` — inspect a pack (real file type, SHA-256, pages, encrypted/corrupt, text, dates).
- `node scripts/verify-package.mjs <package.pdf> [requirements.json]` — check footers and cover of a generated package.

## Deployment
Pushing to `main` runs `.github/workflows/deploy.yml` (test → build → GitHub Pages).
