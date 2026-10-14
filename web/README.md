# Poppy Check: hosted tool

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that puts
[`poppy-json`](../) behind a web page for the
[Personal Agent Protocol](https://personalagentprotocol.org/docs/spec) by Sierra
and Meta: enter a site and it checks `/.well-known/poppy.json` the way an agent
would (same `probePoppy` as the CLI), or fill in a form and it builds the file.

- `GET /`: the page (`page.js`), bilingual **en/it** (auto-detected from `Accept-Language`; `/en` · `/it` force a locale). `?url=<site>` runs the check on load, so results can be shared.
- `GET /api/check?url=example.com`: `{ host, present, valid, url, status, issues, protocolVersion, organizationDomain, issuer, signInTypes, apiTypes, hasConversation, hasBrowserSession }`
- `GET /og.png`: Open Graph share image (1200x630)
- `GET /favicon.png` · `/favicon.ico` · `/apple-touch-icon.png`: GeoSuite's favicon (PNG; the old `/favicon.svg` path serves it too)
- `GET /logos/{chatgpt,gemini,perplexity}.svg`: engine logos shown in the page's closing panel
- `GET /robots.txt` (every crawler welcome, AI ones by name) · `GET /llms.txt`

The generator runs in the browser: `page.js` inlines the source of
`generatePoppy` from `../src/generate.js`, so the Worker never sees what people
type in the form. The check fetches only the site's `poppy.json` and its OAuth
issuer's metadata. No database, no cookies, no client tracking: one Analytics
Engine data point per check (checked host and verdict, nothing about the
visitor), skipped when the `AE` binding is absent.

## Run locally

```bash
cd web
npx wrangler dev
# open http://localhost:8787
```

## Deploy

```bash
cd web
npx wrangler deploy
```

Deploy to your **personal / GeoSuite** Cloudflare account, not the work one
(`wrangler whoami` to check). Publishes to
`https://poppy-check.<your-subdomain>.workers.dev`.

## Auto-deploy (CI)

[`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml)
redeploys on every push to `main` touching `web/`, `src/`, or `package.json`.
Add two repo secrets (Settings > Secrets and variables > Actions):

- `CLOUDFLARE_API_TOKEN`: token scoped **Edit Cloudflare Workers** from the
  account that owns the Worker.
- `CLOUDFLARE_ACCOUNT_ID`: that account's id.

## Notes

- `theme.js` and `logos/` are copied from TryGeoSuite/geo-toolkit (the hub at
  tools.trygeosuite.it): change them there first.
- This directory is **not** part of the npm package, so it never ships to
  registry consumers.
