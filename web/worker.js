// "Poppy Check": hosted free tool (Cloudflare Worker) for the Personal Agent
// Protocol by Sierra and Meta (https://personalagentprotocol.org/docs/spec).
//
// The check reuses the package's probePoppy (../src/check.js), fed the platform
// `fetch()`: it reads https://<host>/.well-known/poppy.json and the OAuth
// issuer's RFC 8414 metadata, the way a personal agent does. The generator runs
// in the browser (see page.js), so this Worker never sees what people type there.
//
// Page routes:
//   GET /     -> locale picked from Accept-Language (it -> Italian, else English)
//   GET /en   -> English   |   GET /it -> Italian
//   (?url=<site> on any of them runs the check on load: shareable results)
// Asset routes:
//   GET /og.png
//   GET /favicon.png  /favicon.ico  /favicon.svg (old path)  /apple-touch-icon.png
//                -> GeoSuite's favicon (PNG)
//   GET /logos/{chatgpt,gemini,perplexity}.svg -> engine logos in the closing panel
//   GET /robots.txt (every crawler welcome, AI ones by name)  /llms.txt
// API routes:
//   GET /api/check?url=...  -> { host, present, valid, url, status, issues, ... }

import { probePoppy } from '../src/check.js';
import { targetHost } from '../src/input.js';
import { renderPage } from './page.js';
import OG_PNG from './og.png'; // bundled as ArrayBuffer via the wrangler "Data" rule
import FAVICON_PNG from './favicon.png'; // GeoSuite's official favicon, 96px
import TOUCH_ICON_PNG from './apple-touch-icon.png'; // same mark, 180px
import LOGO_CHATGPT from './logos/chatgpt.svg'; // bundled as text via the "Text" rule
import LOGO_GEMINI from './logos/gemini.svg';
import LOGO_PERPLEXITY from './logos/perplexity.svg';

const BASE = 'https://poppy-check.geosuite.workers.dev';
const UA = 'poppy-check-web/1.0 (+https://github.com/TryGeoSuite/poppy-json)';
const ASSET_CACHE = 'public, max-age=86400';

// The engines named in the closing panel (theme.js ENGINES), same files as the hub.
const ENGINE_LOGOS = { chatgpt: LOGO_CHATGPT, gemini: LOGO_GEMINI, perplexity: LOGO_PERPLEXITY };

// Every favicon path answers with the PNG; /favicon.svg stays for cached links.
const ICONS = {
  '/favicon.png': FAVICON_PNG,
  '/favicon.ico': FAVICON_PNG,
  '/favicon.svg': FAVICON_PNG,
  '/apple-touch-icon.png': TOUCH_ICON_PNG,
};

// We practice what we preach: every crawler is welcome, AI ones by name.
const ROBOTS = `# Poppy Check by GeoSuite: every crawler, AI included, is welcome.
User-agent: *
Allow: /

User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: meta-externalagent
User-agent: CCBot
Allow: /
`;

// llmstxt.org format.
const LLMS = `# Poppy Check

> Free checker and generator for /.well-known/poppy.json, the discovery file of the Personal Agent Protocol by Sierra and Meta (draft 0.1, October 2026). A person's own AI agent reads that file to find a company, sign in for the person over OAuth and act for them. Poppy Check is an independent GeoSuite tool, not affiliated with Sierra or Meta.

## Tool

- [Poppy Check (English)](${BASE}/en): enter a site, see whether its poppy.json is valid the way an agent checks it (version, domain, channels, OAuth issuer and its RFC 8414 metadata with poppy_domains), and build one in the browser.
- [Poppy Check (Italiano)](${BASE}/it): the same page in Italian.
- [Check API](${BASE}/api/check?url=example.com): JSON verdict for one site.

## Code

- [poppy-json on GitHub](https://github.com/TryGeoSuite/poppy-json): source, MIT license.
- [@geosuite/poppy-json on npm](https://www.npmjs.com/package/@geosuite/poppy-json): the CLI (check, validate, init) and the library.
- [Personal Agent Protocol specification](https://personalagentprotocol.org/docs/spec)

## About

- [GeoSuite](https://trygeosuite.it): measures and improves how AI assistants describe and recommend a brand.
- [GeoSuite free tools](https://tools.trygeosuite.it/en)
`;

// '/it' -> 'it', '/en' -> 'en', '/' -> first Accept-Language tag (it -> 'it', else 'en').
function pickLang(request, path) {
  if (path === '/it') return 'it';
  if (path === '/en') return 'en';
  const first = (request.headers.get('accept-language') || '').split(',')[0].trim().toLowerCase();
  return first.startsWith('it') ? 'it' : 'en';
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  // Short: someone who just published the file wants to see it at once.
  'cache-control': 'public, max-age=60',
};

function text(body, type) {
  return new Response(body, { headers: { 'content-type': type, 'cache-control': ASSET_CACHE } });
}

// Server-side usage counts via Analytics Engine: the checked host and the
// verdict, never anything about the visitor. Safe without the binding.
function track(env, host, result) {
  if (!env || !env.AE) return;
  try {
    const state = result.valid ? 'valid' : result.present ? 'invalid' : result.error ? 'error' : 'missing';
    env.AE.writeDataPoint({
      indexes: [host.slice(0, 32)],
      blobs: [host, state, (result.issues || []).join(',').slice(0, 256)],
      doubles: [result.present ? 1 : 0, result.valid ? 1 : 0, result.status || 0],
    });
  } catch {
    // Never let analytics break a check.
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/check') {
      const target = url.searchParams.get('url');
      if (!target) {
        return new Response(JSON.stringify({ error: 'missing_url', message: 'Missing ?url= parameter.' }), { status: 400, headers: JSON_HEADERS });
      }
      const host = targetHost(target);
      if (!host) {
        return new Response(JSON.stringify({ error: 'invalid_url', message: 'Enter a public website address, like example.com.' }), { status: 400, headers: JSON_HEADERS });
      }
      const result = { host, ...(await probePoppy(host, fetch, { userAgent: UA })) };
      track(env, host, result);
      return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
    }

    // --- Static assets ---
    if (path === '/og.png') return new Response(OG_PNG, { headers: { 'content-type': 'image/png', 'cache-control': ASSET_CACHE } });
    if (Object.hasOwn(ICONS, path)) return new Response(ICONS[path], { headers: { 'content-type': 'image/png', 'cache-control': ASSET_CACHE } });
    const logo = path.match(/^\/logos\/(chatgpt|gemini|perplexity)\.svg$/);
    if (logo) return text(ENGINE_LOGOS[logo[1]], 'image/svg+xml; charset=utf-8');
    if (path === '/robots.txt') return text(ROBOTS, 'text/plain; charset=utf-8');
    if (path === '/llms.txt') return text(LLMS, 'text/plain; charset=utf-8');

    if (path === '/' || path === '/en' || path === '/it') {
      const lang = pickLang(request, path);
      // '/' is content-negotiated, so it must not be cached language-agnostically.
      const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' };
      if (path === '/') headers.vary = 'Accept-Language';
      return new Response(renderPage(lang, (url.searchParams.get('url') || '').slice(0, 300)), { headers });
    }

    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
