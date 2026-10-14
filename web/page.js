// The single-page UI served at `/`, `/en` and `/it`. Bilingual (en/it): the
// worker picks a locale and calls renderPage(lang, initialUrl); the copy lives
// in the S dictionary below. Standard and field names (poppy.json, auth.issuer,
// poppy_domains, OAuth) stay as they are in both languages.
//
// It wears GeoSuite's design (theme.js, copied from the hub at
// tools.trygeosuite.it), so the tool and the hub read as one site.
//
// Two jobs on one page:
//   - the check: the browser calls /api/check (src/check.js, run by the worker)
//     and renders the verdict. A shared ?url= link runs it again on load.
//   - the generator: the form runs src/generate.js in the browser. Its source
//     is inlined below (generatePoppy is self-contained for that), so the page
//     and the CLI build the very same file. Nothing typed in it leaves the page.

import { FONTS, BASE_CSS, ENGINES } from './theme.js';
import { generatePoppy } from '../src/generate.js';
import { SPEC_URL } from '../src/check.js';
import { ISSUE_TEXT, INPUT_ERROR_TEXT } from '../src/messages.js';

const BASE = 'https://poppy-check.geosuite.workers.dev';
const HUB = 'https://tools.trygeosuite.it';
const GH = 'https://github.com/TryGeoSuite/poppy-json';
const NPM = 'https://www.npmjs.com/package/@geosuite/poppy-json';
const ANALYSIS = 'https://trygeosuite.it/analisi-gratuita?utm_source=geosuite-open&utm_medium=tool&utm_campaign=poppy-check';
const CMDS = [
  'npx @geosuite/poppy-json check yoursite.com',
  'npx @geosuite/poppy-json validate poppy.json --domain yoursite.com',
  'npx @geosuite/poppy-json init --name "Acme" --domain acme.com --issuer https://auth.acme.com --mcp https://acme.com/mcp',
];

// State icons, same drawing as the hub's check page, plus a neutral "info" one.
// The circle takes the state color from CSS; the text next to it always says
// the same thing, so color is never the only signal.
const ICONS = {
  ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M6 10.5l2.6 2.6L14 7.7" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  partial: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M6 10h8" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
  missing: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M7 7l6 6M13 7l-6 6" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="M10 9v5M10 6.2v.1" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
};

// The file next to the form: what the generator builds for a small shop.
const SAMPLE = generatePoppy({
  name: 'Acme',
  domain: 'acme.com',
  issuer: 'https://auth.acme.com',
  apis: [{ type: 'mcp', url: 'https://acme.com/mcp', description: 'Orders and returns' }],
}).json;

const S = {
  en: {
    title: 'Poppy Check: Personal Agent Protocol (poppy.json) checker and generator',
    desc: 'Check and create the /.well-known/poppy.json of the Personal Agent Protocol by Sierra and Meta: see whether a personal AI agent can find your company and sign in for your customers. Free, no sign-up.',
    tools: 'Free tools',
    eyebrow: 'A free GeoSuite tool',
    h1: 'Check and create your poppy.json for the Personal Agent Protocol',
    lead: 'A person’s own AI agent reads <code>/.well-known/poppy.json</code> to find a company, sign in for that person over OAuth and act for them. Enter your site: we check the file the way an agent would.',
    label: 'Your website',
    placeholder: 'yoursite.com',
    run: 'Check',
    facts: ['Free', 'No sign-up', 'Open source (MIT)'],
    note: `The <a href="${SPEC_URL}" target="_blank" rel="noopener">Personal Agent Protocol</a> by Sierra and Meta is a draft (0.1, 9 October 2026). Poppy Check is an independent GeoSuite tool, not affiliated with either.`,
    sampleLabel: 'What an agent reads',
    sampleMeta: '/.well-known/poppy.json',
    genTitle: 'Create your poppy.json',
    genText: 'Fill in what you offer and the page builds the file in your browser: nothing you type is sent anywhere. Then publish it at <code>/.well-known/poppy.json</code> and add two fields to your sign-in server’s OAuth metadata.',
    f: {
      name: 'Organization name',
      namePh: 'Acme',
      domain: 'Domain',
      domainPh: 'acme.com',
      issuer: 'Sign-in server (OAuth issuer)',
      issuerPh: 'https://auth.acme.com',
      signIn: 'How agents sign in',
      direct: 'Direct',
      directHint: 'OAuth in the browser',
      device: 'Device',
      deviceHint: 'a code on another screen',
      mediated: 'Mediated',
      mediatedHint: 'your own sign-in endpoint',
      mediatedEndpoint: 'Mediated sign-in endpoint',
      mediatedPh: 'https://auth.acme.com/poppy/sign-in',
      channels: 'What agents can use (at least one)',
      agent: 'Conversation endpoint',
      agentPh: 'https://api.acme.com/poppy',
      mcp: 'MCP server',
      mcpPh: 'https://acme.com/mcp',
      mcpDesc: 'What the MCP server does',
      mcpDescPh: 'Orders and returns',
      openapi: 'OpenAPI description',
      openapiPh: 'https://api.acme.com/openapi.json',
      openapiDesc: 'What the API does',
      openapiDescPh: 'Orders, returns, saved addresses',
      browser: 'Browser session endpoint',
      browserPh: 'https://acme.com/poppy/browser-session',
      build: 'Build poppy.json',
    },
    cliTitle: 'Run it from your terminal',
    cliText: 'The same checker and generator as a zero-dependency CLI on npm: <code>check</code> after a deploy, <code>validate</code> before you publish, <code>init</code> to start a file.',
    star: 'Star on GitHub',
    copyLabel: 'Copy the command',
    ctaTitle: 'Agents can find you. Do AI assistants recommend you?',
    ctaText: 'A poppy.json lets a customer’s own agent act for them. First, someone has to choose you: GeoSuite asks ChatGPT, Gemini and Perplexity the questions your customers really ask, and tells you whether you are recommended, who wins instead and what to fix first. The report arrives by email.',
    ctaButton: 'Get the free analysis',
    footer: `Open source (MIT) by <a href="https://github.com/matte97p">Matteo Perino</a>, a <a href="https://trygeosuite.it">GeoSuite</a> tool for the Personal Agent Protocol by Sierra and Meta, not affiliated with them. Code on <a href="${GH}">GitHub</a>, package on <a href="${NPM}">npm</a>. We read only the public /.well-known files of the site you enter.`,
    js: {
      running: 'Checking…',
      reading: 'Reading {url}…',
      validTitle: 'Valid: a personal agent can use your poppy.json',
      validSub: 'We read the file, matched its domain and checked the sign-in server’s metadata, as an agent does before it signs in.',
      invalidTitle: 'Published, but an agent would set it aside',
      invalidSub: 'What to fix:',
      missingTitle: 'No poppy.json on {host} yet',
      missingSub: 'The standard is from October 2026, so that is normal today. You can create the file below in a couple of minutes.',
      errorTitle: 'We could not reach {host}',
      errorSub: { timeout: 'The site did not answer in time. Check the address and try again.', fetch: 'The site did not answer. Check the address and try again.', too_large: 'The file is larger than 256 KB, more than an agent will read.' },
      invalidUrl: 'Enter a public website address, like yoursite.com.',
      networkError: 'Network error, try again.',
      labels: { file: 'File', status: 'HTTP status', version: 'Protocol version', domain: 'Organization domain', issuer: 'Sign-in server', signIn: 'Sign-in types', channels: 'Channels' },
      channels: { conversation: 'conversation', mcp: 'MCP server', openapi: 'OpenAPI', browser: 'browser session' },
      createBelow: 'Create it below',
      fixBelow: 'Rebuild it below',
      share: 'Copy link',
      linkCopied: 'Link copied',
      copy: 'Copy',
      copied: 'Copied',
      download: 'Download',
      fileTitle: 'poppy.json',
      fileMeta: 'Publish at {url}',
      metaTitle: 'Sign-in server metadata',
      metaMeta: 'Add to {url}',
      metaNote: 'That metadata must also list {list}. Your server has them already: issuer and poppy_domains are what the Personal Agent Protocol checks.',
      ready: 'Ready',
    },
  },
  it: {
    title: 'Poppy Check: verifica e genera il poppy.json del Personal Agent Protocol',
    desc: 'Verifica e crea il /.well-known/poppy.json del Personal Agent Protocol di Sierra e Meta: scopri se l’agente AI personale di un cliente trova la tua azienda e sa entrare per suo conto. Gratis, senza registrazione.',
    tools: 'Strumenti gratuiti',
    eyebrow: 'Uno strumento gratuito di GeoSuite',
    h1: 'Verifica e crea il tuo poppy.json per il Personal Agent Protocol',
    lead: 'L’agente AI personale di una persona legge <code>/.well-known/poppy.json</code> per trovare un’azienda, entrare con l’account di quella persona via OAuth e agire per lei. Inserisci il tuo sito: controlliamo il file come farebbe un agente.',
    label: 'Il tuo sito',
    placeholder: 'tuosito.it',
    run: 'Verifica',
    facts: ['Gratis', 'Senza registrazione', 'Open source (MIT)'],
    note: `Il <a href="${SPEC_URL}" target="_blank" rel="noopener">Personal Agent Protocol</a> di Sierra e Meta è una bozza (0.1, 9 ottobre 2026). Poppy Check è uno strumento indipendente di GeoSuite, non affiliato a nessuna delle due.`,
    sampleLabel: 'Cosa legge un agente',
    sampleMeta: '/.well-known/poppy.json',
    genTitle: 'Crea il tuo poppy.json',
    genText: 'Indica cosa offri e la pagina costruisce il file nel tuo browser: quello che scrivi non viene inviato da nessuna parte. Poi pubblicalo su <code>/.well-known/poppy.json</code> e aggiungi due campi ai metadati OAuth del tuo server di login.',
    f: {
      name: 'Nome dell’organizzazione',
      namePh: 'Acme',
      domain: 'Dominio',
      domainPh: 'acme.it',
      issuer: 'Server di login (issuer OAuth)',
      issuerPh: 'https://auth.acme.it',
      signIn: 'Come entrano gli agenti',
      direct: 'Direct',
      directHint: 'OAuth nel browser',
      device: 'Device',
      deviceHint: 'un codice su un altro schermo',
      mediated: 'Mediated',
      mediatedHint: 'il tuo endpoint di login',
      mediatedEndpoint: 'Endpoint di login mediated',
      mediatedPh: 'https://auth.acme.it/poppy/sign-in',
      channels: 'Cosa possono usare gli agenti (almeno uno)',
      agent: 'Endpoint di conversazione',
      agentPh: 'https://api.acme.it/poppy',
      mcp: 'Server MCP',
      mcpPh: 'https://acme.it/mcp',
      mcpDesc: 'Cosa fa il server MCP',
      mcpDescPh: 'Ordini e resi',
      openapi: 'Descrizione OpenAPI',
      openapiPh: 'https://api.acme.it/openapi.json',
      openapiDesc: 'Cosa fa l’API',
      openapiDescPh: 'Ordini, resi, indirizzi salvati',
      browser: 'Endpoint per la sessione nel browser',
      browserPh: 'https://acme.it/poppy/browser-session',
      build: 'Genera il poppy.json',
    },
    cliTitle: 'Usalo dal terminale',
    cliText: 'Lo stesso controllo e lo stesso generatore, come CLI su npm senza dipendenze: <code>check</code> dopo un rilascio, <code>validate</code> prima di pubblicare, <code>init</code> per partire con un file.',
    star: 'Stella su GitHub',
    copyLabel: 'Copia il comando',
    ctaTitle: 'Gli agenti ti trovano. Le AI ti consigliano?',
    ctaText: 'Un poppy.json permette all’agente di un cliente di agire per lui. Prima, però, qualcuno deve sceglierti: GeoSuite fa a ChatGPT, Gemini e Perplexity le domande che i tuoi clienti fanno davvero, e ti dice se ti consigliano, chi vince al posto tuo e cosa correggere per primo. Il report arriva via mail.',
    ctaButton: 'Richiedi l’analisi gratuita',
    footer: `Open source (MIT) di <a href="https://github.com/matte97p">Matteo Perino</a>, uno strumento di <a href="https://trygeosuite.it">GeoSuite</a> per il Personal Agent Protocol di Sierra e Meta, non affiliato a loro. Codice su <a href="${GH}">GitHub</a>, pacchetto su <a href="${NPM}">npm</a>. Leggiamo solo i file pubblici in /.well-known del sito che inserisci.`,
    js: {
      running: 'Verifica in corso…',
      reading: 'Lettura di {url}…',
      validTitle: 'Valido: un agente personale può usare il tuo poppy.json',
      validSub: 'Abbiamo letto il file, confrontato il dominio e controllato i metadati del server di login, come fa un agente prima di entrare.',
      invalidTitle: 'Pubblicato, ma un agente lo scarterebbe',
      invalidSub: 'Cosa correggere:',
      missingTitle: 'Su {host} non c’è ancora un poppy.json',
      missingSub: 'Lo standard è di ottobre 2026, quindi oggi è normale. Puoi creare il file qui sotto in un paio di minuti.',
      errorTitle: 'Non riusciamo a raggiungere {host}',
      errorSub: { timeout: 'Il sito non ha risposto in tempo. Controlla l’indirizzo e riprova.', fetch: 'Il sito non ha risposto. Controlla l’indirizzo e riprova.', too_large: 'Il file supera i 256 KB, più di quanto un agente legga.' },
      invalidUrl: 'Scrivi l’indirizzo di un sito pubblico, per esempio tuosito.it.',
      networkError: 'Errore di rete, riprova.',
      labels: { file: 'File', status: 'Stato HTTP', version: 'Versione del protocollo', domain: 'Dominio dell’organizzazione', issuer: 'Server di login', signIn: 'Tipi di accesso', channels: 'Canali' },
      channels: { conversation: 'conversazione', mcp: 'server MCP', openapi: 'OpenAPI', browser: 'sessione nel browser' },
      createBelow: 'Crealo qui sotto',
      fixBelow: 'Rigeneralo qui sotto',
      share: 'Copia il link',
      linkCopied: 'Link copiato',
      copy: 'Copia',
      copied: 'Copiato',
      download: 'Scarica',
      fileTitle: 'poppy.json',
      fileMeta: 'Da pubblicare su {url}',
      metaTitle: 'Metadati del server di login',
      metaMeta: 'Da aggiungere a {url}',
      metaNote: 'Quei metadati devono elencare anche {list}. Il tuo server li ha già: issuer e poppy_domains sono i campi che controlla il Personal Agent Protocol.',
      ready: 'Pronto',
    },
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// JSON inside a <script>: no "</script>" can close it early.
const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

function jsonLd(t, lang) {
  return js({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Poppy Check',
    alternateName: '@geosuite/poppy-json',
    url: `${BASE}/${lang}`,
    description: t.desc,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web, Node.js 20+',
    inLanguage: lang,
    isAccessibleForFree: true,
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: GH,
    downloadUrl: NPM,
    softwareVersion: '0.1.0',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    about: { '@type': 'Thing', name: 'Personal Agent Protocol', url: SPEC_URL },
    author: { '@type': 'Person', name: 'Matteo Perino', url: 'https://matteoperino.dev' },
    publisher: { '@type': 'Organization', name: 'GeoSuite', url: 'https://trygeosuite.it' },
  });
}

function field(id, label, placeholder, extra = '') {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="text" spellcheck="false" placeholder="${esc(placeholder)}"${extra}></div>`;
}

// lang: 'en' | 'it'. initialUrl: the ?url= of a shared link, or ''.
export function renderPage(lang, initialUrl = '') {
  const t = S[lang] || S.en;
  const f = t.f;
  const facts = t.facts.map((x) => `<li>${ICONS.ok}${x}</li>`).join('');
  const URLISH = ' inputmode="url" autocomplete="off"';
  const signIn = ['direct', 'device', 'mediated']
    .map((k) => `<label class="opt"><input type="checkbox" name="signin" value="${k}"${k === 'direct' ? ' checked' : ''}><span><strong>${f[k]}</strong> <span class="hint">${f[k + 'Hint']}</span></span></label>`)
    .join('');
  const client = {
    lang,
    icons: ICONS,
    t: t.js,
    issues: ISSUE_TEXT[lang] || ISSUE_TEXT.en,
    inputErrors: INPUT_ERROR_TEXT[lang] || INPUT_ERROR_TEXT.en,
    copyLabel: t.copyLabel,
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${BASE}/${lang}">
<link rel="alternate" hreflang="en" href="${BASE}/en">
<link rel="alternate" hreflang="it" href="${BASE}/it">
<link rel="alternate" hreflang="x-default" href="${BASE}/">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GeoSuite Open">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${BASE}/${lang}">
<meta property="og:image" content="${BASE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${lang === 'it' ? 'it_IT' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.desc)}">
<meta name="twitter:image" content="${BASE}/og.png">
${FONTS}
<script type="application/ld+json">${jsonLd(t, lang)}</script>
<style>
${BASE_CSS}
  code { font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:.875em; }
  .lead code, .note code, .cli p code, .gen-head p code { color:var(--ink); overflow-wrap:anywhere; }
  .note { color:var(--ink-3); font-size:.875rem; margin:12px 0 0; max-width:60ch; }
  .hero > * { min-width:0; }
  .sample { padding:20px; margin:0; }
  .sample figcaption { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; margin:0 0 12px; }
  pre.code { margin:0; padding:14px 16px; border-radius:8px; background:var(--sunk); border:1px solid var(--line); color:var(--ink); overflow:auto; max-height:460px; font:.8125rem/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space:pre; }

  #out { margin-top:32px; }
  #out:empty { display:none; }
  .result { padding:24px; }
  .verdict { display:flex; gap:12px; align-items:flex-start; padding:16px; border-radius:8px; margin:0 0 16px; }
  .verdict svg { flex:none; width:24px; height:24px; margin-top:2px; }
  .verdict svg path { stroke:#fff; }
  .verdict strong { display:block; font-size:1.25rem; line-height:1.3; letter-spacing:-.01em; overflow-wrap:anywhere; }
  .verdict .sub { display:block; color:var(--ink-2); font-size:.9375rem; margin-top:4px; }
  .verdict.ok { background:var(--ok-soft); } .verdict.ok svg circle { fill:var(--ok); }
  .verdict.warn { background:var(--warn-soft); } .verdict.warn svg circle { fill:var(--warn); }
  .verdict.info { background:var(--sunk); } .verdict.info svg circle { fill:var(--ink-3); }
  ul.issues { margin:8px 0 0; padding-left:20px; color:var(--ink); font-size:.9375rem; }
  ul.issues li { margin:4px 0; }
  ul.issues code { color:var(--ink-3); font-size:.8125rem; }
  dl.details { display:grid; grid-template-columns:max-content 1fr; gap:0; margin:0; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  dl.details dt, dl.details dd { padding:10px 14px; border-top:1px solid var(--line); margin:0; font-size:.9375rem; }
  dl.details dt:first-of-type, dl.details dd:first-of-type { border-top:0; }
  dl.details dt { color:var(--ink-3); font-weight:500; }
  dl.details dd { color:var(--ink); overflow-wrap:anywhere; min-width:0; }
  .result-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
  .result-actions a.ghost { text-decoration:none; display:inline-flex; align-items:center; }
  .loading { padding:18px 20px; display:flex; align-items:center; gap:12px; color:var(--ink-2); overflow-wrap:anywhere; }
  .spinner { width:18px; height:18px; flex:none; border-radius:50%; border:2px solid var(--line-2); border-top-color:var(--accent); animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .genpanel { margin-top:32px; padding:24px 28px; scroll-margin-top:16px; }
  .gen-head h2, .cli h2 { font-size:1.25rem; line-height:1.25; letter-spacing:-.015em; margin:0 0 6px; }
  .gen-head p, .cli p { color:var(--ink-2); margin:0 0 20px; max-width:66ch; }
  .genform { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .genform .wide { grid-column:1 / -1; }
  .field { display:flex; flex-direction:column; gap:6px; min-width:0; }
  .field label, fieldset legend { font-size:.875rem; font-weight:600; color:var(--ink-2); }
  .genform input[type=text] { height:44px; font-size:.9375rem; flex:none; width:100%; }
  fieldset { border:0; margin:0; padding:0; min-width:0; }
  fieldset legend { padding:0; margin:0 0 8px; }
  .opts { display:flex; flex-wrap:wrap; gap:8px; }
  .opt { display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--line-2); border-radius:8px; background:var(--surface); cursor:pointer; font-size:.9375rem; min-height:44px; }
  .opt input { width:18px; height:18px; flex:none; margin:0; accent-color:var(--accent-deep); }
  .opt .hint { color:var(--ink-3); font-size:.8125rem; }
  .genform .group { grid-column:1 / -1; display:grid; grid-template-columns:1fr 1fr; gap:16px; padding-top:16px; border-top:1px solid var(--line); }
  .genform .group > legend { grid-column:1 / -1; float:left; width:100%; }
  .genform .submit { grid-column:1 / -1; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .genform .err { margin:0; }
  #gen-out { margin-top:24px; display:grid; gap:16px; }
  #gen-out:empty { display:none; }
  #gen-out > * { min-width:0; }
  #gen-out pre.code { max-height:none; }
  .block .meta { display:flex; align-items:center; gap:8px 12px; flex-wrap:wrap; margin:0 0 10px; }
  .block h3 { margin:0; font-size:1rem; letter-spacing:-.01em; }
  .block .sub { color:var(--ink-3); font-size:.875rem; overflow-wrap:anywhere; min-width:0; }
  .block .actions { display:flex; gap:8px; margin-left:auto; }
  .block .foot { color:var(--ink-3); font-size:.875rem; margin:10px 0 0; }
  .state { display:inline-flex; align-items:center; gap:6px; font-size:.8125rem; font-weight:600; padding:2px 10px 2px 6px; border-radius:999px; color:var(--ok); background:var(--ok-soft); }
  .state svg { width:16px; height:16px; } .state svg circle { fill:var(--ok); } .state svg path { stroke:#fff; }

  .cli { margin-top:16px; padding:24px 28px; }
  .cmd { display:flex; align-items:center; gap:8px; padding:4px 4px 4px 12px; background:var(--surface-2); border:1px solid var(--line); border-radius:8px; margin:0 0 10px; }
  .cmd code { flex:1; min-width:0; overflow-x:auto; white-space:nowrap; color:var(--ink-2); font-size:.8125rem; padding:6px 0; }
  .cmd button { flex:none; min-height:36px; padding:4px 12px; font-size:.8125rem; }
  .links { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
  .links a { text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
  .links svg { width:16px; height:16px; }
  .cta { margin-top:16px; }
  /* One column: once a result is on screen, the sample above it only pushes it down. */
  @media (max-width:899px) { .hero:has(~ #out:not(:empty)) .sample { display:none; } }
  @media (max-width:640px) {
    .result, .sample { padding:16px; }
    .genpanel, .cli { padding:20px; }
    .genform, .genform .group { grid-template-columns:1fr; }
    dl.details { grid-template-columns:1fr; }
    dl.details dd { border-top:0; padding-top:0; }
    .block .actions { margin-left:0; width:100%; }
    .block .actions .ghost { flex:1; }
    .genform .submit .primary { width:100%; }
  }
  @media (prefers-reduced-motion: reduce) { .spinner { animation:none; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="bar">
    <a class="brand" href="https://trygeosuite.it">GeoSuite</a>
    <nav aria-label="Site">
      <a href="${HUB}/${lang}">${t.tools}</a>
      <a href="/en"${lang === 'en' ? ' aria-current="page"' : ''} hreflang="en">EN</a>
      <a href="/it"${lang === 'it' ? ' aria-current="page"' : ''} hreflang="it">IT</a>
    </nav>
  </header>

  <main>
    <div class="hero">
      <div>
        <p class="eyebrow">${t.eyebrow}</p>
        <h1>${t.h1}</h1>
        <p class="lead">${t.lead}</p>
        <form class="urlform" id="f" novalidate>
          <label for="u">${t.label}</label>
          <input id="u" name="url" type="text" inputmode="url" autocomplete="url" spellcheck="false" placeholder="${t.placeholder}" value="${esc(initialUrl)}">
          <button class="primary" id="go" type="submit">${t.run}</button>
        </form>
        <ul class="facts">${facts}</ul>
        <p class="err" id="err" role="alert"></p>
        <p class="note">${t.note}</p>
      </div>
      <figure class="panel sample">
        <figcaption><span class="label">${t.sampleLabel}</span><span class="ex-meta">${t.sampleMeta}</span></figcaption>
        <pre class="code">${esc(SAMPLE)}</pre>
      </figure>
    </div>

    <div id="out" aria-live="polite"></div>

    <section class="panel genpanel" id="gen" aria-labelledby="gen-head">
      <div class="gen-head">
        <h2 id="gen-head">${t.genTitle}</h2>
        <p>${t.genText}</p>
      </div>
      <form class="genform" id="g" novalidate>
        ${field('g-name', f.name, f.namePh, ' autocomplete="organization"')}
        ${field('g-domain', f.domain, f.domainPh, URLISH)}
        <div class="wide">${field('g-issuer', f.issuer, f.issuerPh, URLISH)}</div>
        <fieldset class="wide">
          <legend>${f.signIn}</legend>
          <div class="opts">${signIn}</div>
        </fieldset>
        <div class="wide" id="g-mediated-row" hidden>${field('g-mediated', f.mediatedEndpoint, f.mediatedPh, URLISH)}</div>
        <fieldset class="group">
          <legend>${f.channels}</legend>
          <div class="wide">${field('g-agent', f.agent, f.agentPh, URLISH)}</div>
          ${field('g-mcp', f.mcp, f.mcpPh, URLISH)}
          ${field('g-mcp-desc', f.mcpDesc, f.mcpDescPh)}
          ${field('g-openapi', f.openapi, f.openapiPh, URLISH)}
          ${field('g-openapi-desc', f.openapiDesc, f.openapiDescPh)}
          <div class="wide">${field('g-browser', f.browser, f.browserPh, URLISH)}</div>
        </fieldset>
        <div class="submit">
          <button class="primary" type="submit">${f.build}</button>
          <p class="err" id="g-err" role="alert"></p>
        </div>
      </form>
      <div id="gen-out" aria-live="polite"></div>
    </section>

    <section class="panel cli" aria-labelledby="cli-head">
      <h2 id="cli-head">${t.cliTitle}</h2>
      <p>${t.cliText}</p>
      ${CMDS.map((c) => `<div class="cmd"><code>${esc(c)}</code></div>`).join('\n      ')}
      <div class="links">
        <a class="ghost" href="${GH}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>${t.star}</a>
        <a class="ghost" href="${NPM}" target="_blank" rel="noopener">npm</a>
      </div>
    </section>

    <section class="panel cta">
      <div>
        <h2>${t.ctaTitle}</h2>
        <p>${t.ctaText}</p>
        ${ENGINES}
      </div>
      <a class="primary" href="${ANALYSIS}" target="_blank" rel="noopener">${t.ctaButton}</a>
    </section>
  </main>

  <footer>${t.footer}</footer>
</div>

<script>var CFG = ${js(client)};
// wrangler bundles with esbuild's keepNames, which wraps inner functions in
// __name(fn, "name") calls: the source shipped below needs that helper too.
var __name = function (fn) { return fn; };
var generatePoppy = ${generatePoppy.toString()};</script>
<script>
(function () {
  var T = CFG.t, ICONS = CFG.icons;
  var $ = function (id) { return document.getElementById(id); };
  var out = $('out'), input = $('u'), btn = $('go'), run = 0;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(kind) { var s = document.createElement('span'); s.innerHTML = ICONS[kind]; return s.firstChild; }
  function fill(s, vars) { return String(s).replace(/\\{(\\w+)\\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
  function flash(b, text, back) { b.textContent = text; setTimeout(function () { b.textContent = back; }, 1500); }
  function copy(text, b) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () { flash(b, T.copied, T.copy); }).catch(function () {});
  }
  function download(text, name) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 0);
  }
  function scrollTo(node) { node.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }

  // ---- the check ----
  function verdict(kind, iconKind, title, sub) {
    var v = el('div', 'verdict ' + kind);
    v.appendChild(icon(iconKind));
    var box = el('div');
    box.appendChild(el('strong', null, title));
    if (sub) box.appendChild(el('span', 'sub', sub));
    v.appendChild(box);
    return v;
  }

  function channels(r) {
    var c = [];
    if (r.hasConversation) c.push(T.channels.conversation);
    (r.apiTypes || []).forEach(function (t) { c.push(T.channels[t] || t); });
    if (r.hasBrowserSession) c.push(T.channels.browser);
    return c.join(', ');
  }

  function details(r) {
    var rows = [[T.labels.file, r.url, true], [T.labels.status, r.status ? String(r.status) : '']];
    if (r.present) {
      rows.push([T.labels.version, r.protocolVersion], [T.labels.domain, r.organizationDomain], [T.labels.issuer, r.issuer],
        [T.labels.signIn, (r.signInTypes || []).join(', ')], [T.labels.channels, channels(r)]);
    }
    var dl = el('dl', 'details');
    rows.forEach(function (row) {
      if (!row[1]) return;
      dl.appendChild(el('dt', null, row[0]));
      var dd = el('dd');
      if (row[2]) { var a = el('a', null, row[1]); a.href = row[1]; a.target = '_blank'; a.rel = 'noopener'; dd.appendChild(a); }
      else dd.textContent = row[1];
      dl.appendChild(dd);
    });
    return dl;
  }

  function bareHost(h) { return String(h || '').replace(/^www[.]/, ''); }

  function render(r) {
    var panel = el('div', 'panel result');
    var vars = { host: r.host };
    if (r.valid) panel.appendChild(verdict('ok', 'ok', T.validTitle, T.validSub));
    else if (r.present) {
      var v = verdict('warn', 'partial', T.invalidTitle, T.invalidSub);
      var ul = el('ul', 'issues');
      (r.issues || []).forEach(function (code) {
        var li = el('li', null, (CFG.issues[code] || code) + ' ');
        li.appendChild(el('code', null, code));
        ul.appendChild(li);
      });
      v.lastChild.appendChild(ul);
      panel.appendChild(v);
    } else if (r.error) panel.appendChild(verdict('info', 'info', fill(T.errorTitle, vars), T.errorSub[r.error] || T.errorSub.fetch));
    else panel.appendChild(verdict('info', 'info', fill(T.missingTitle, vars), T.missingSub));
    panel.appendChild(details(r));

    var actions = el('div', 'result-actions');
    if (!r.valid && !r.error) {
      var create = el('a', 'ghost', r.present ? T.fixBelow : T.createBelow);
      create.href = '#gen';
      create.addEventListener('click', function (e) {
        e.preventDefault();
        if (!$('g-domain').value) $('g-domain').value = bareHost(r.host);
        scrollTo($('gen')); $('g-name').focus({ preventScroll: true });
      });
      actions.appendChild(create);
    }
    if (navigator.clipboard) {
      var share = el('button', 'ghost', T.share); share.type = 'button';
      share.addEventListener('click', function () {
        navigator.clipboard.writeText(location.href).then(function () { flash(share, T.linkCopied, T.share); }).catch(function () {});
      });
      actions.appendChild(share);
    }
    panel.appendChild(actions);
    out.textContent = '';
    out.appendChild(panel);
  }

  function check(value) {
    value = value.trim();
    $('err').textContent = '';
    if (!value) { $('err').textContent = T.invalidUrl; return; }
    var me = ++run;
    btn.disabled = true; btn.textContent = T.running;
    out.innerHTML = '<div class="panel loading"><span class="spinner" aria-hidden="true"></span><span></span></div>';
    out.querySelector('.loading span:last-child').textContent = fill(T.reading, { url: value });
    fetch('/api/check?url=' + encodeURIComponent(value))
      .then(function (res) { return res.json(); })
      .then(function (r) {
        if (me !== run) return;
        if (r.error === 'invalid_url') { out.textContent = ''; $('err').textContent = T.invalidUrl; return; }
        render(r);
      })
      .catch(function () { if (me === run) { out.textContent = ''; $('err').textContent = T.networkError; } })
      .then(function () { if (me === run) { btn.disabled = false; btn.textContent = ${js(t.run)}; } });
  }

  $('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (v) history.replaceState(null, '', '?url=' + encodeURIComponent(v));
    check(v);
  });

  // ---- the generator (runs here, in the browser) ----
  var built = false;
  function val(id) { return $(id).value; }
  function signIns() {
    return Array.prototype.slice.call(document.querySelectorAll('input[name=signin]:checked')).map(function (c) { return c.value; });
  }
  function block(title, sub, text, file) {
    var b = el('div', 'block');
    var meta = el('div', 'meta');
    var st = el('span', 'state'); st.appendChild(icon('ok')); st.appendChild(document.createTextNode(T.ready));
    meta.appendChild(st);
    meta.appendChild(el('h3', null, title));
    meta.appendChild(el('span', 'sub', sub));
    var actions = el('span', 'actions');
    if (navigator.clipboard) {
      var c = el('button', 'ghost', T.copy); c.type = 'button';
      c.addEventListener('click', function () { copy(text, c); });
      actions.appendChild(c);
    }
    if (file) {
      var d = el('button', 'ghost', T.download); d.type = 'button';
      d.addEventListener('click', function () { download(text, file); });
      actions.appendChild(d);
    }
    meta.appendChild(actions);
    b.appendChild(meta);
    b.appendChild(el('pre', 'code', text));
    return b;
  }

  function build(showErrors) {
    var result;
    try {
      result = generatePoppy({
        name: val('g-name'),
        domain: val('g-domain'),
        issuer: val('g-issuer'),
        signIn: signIns(),
        mediatedEndpoint: val('g-mediated'),
        agentEndpoint: val('g-agent'),
        apis: [
          { type: 'mcp', url: val('g-mcp'), description: val('g-mcp-desc') },
          { type: 'openapi', url: val('g-openapi'), description: val('g-openapi-desc') },
        ],
        browserSessionEndpoint: val('g-browser'),
      });
    } catch (e) {
      if (showErrors) $('g-err').textContent = CFG.inputErrors[e.code] || e.message;
      return;
    }
    $('g-err').textContent = '';
    var where = 'https://' + result.document.organization.domain + '/.well-known/poppy.json';
    var box = $('gen-out'); box.textContent = '';
    box.appendChild(block(T.fileTitle, fill(T.fileMeta, { url: where }), result.json, 'poppy.json'));
    var m = block(T.metaTitle, fill(T.metaMeta, { url: result.metadata.url }), result.metadata.json, null);
    m.appendChild(el('p', 'foot', fill(T.metaNote, { list: result.metadata.requiredEndpoints.join(', ') })));
    box.appendChild(m);
    if (!built) { built = true; if (showErrors) scrollTo(box); }
  }

  document.querySelectorAll('input[name=signin]').forEach(function (c) {
    c.addEventListener('change', function () { $('g-mediated-row').hidden = !document.querySelector('input[name=signin][value=mediated]').checked; });
  });
  $('g').addEventListener('submit', function (e) { e.preventDefault(); build(true); });
  // After the first build, the output follows the form as you type.
  $('g').addEventListener('input', function () { if (built) build(false); });

  // ---- the npx commands: a copy button, only where the clipboard API exists ----
  if (navigator.clipboard) {
    document.querySelectorAll('.cmd').forEach(function (box) {
      var cmd = box.querySelector('code').textContent.trim();
      var b = el('button', 'ghost', T.copy); b.type = 'button'; b.setAttribute('aria-label', CFG.copyLabel);
      b.addEventListener('click', function () { copy(cmd, b); });
      box.appendChild(b);
    });
  }

  if (input.value) check(input.value);
})();
</script>
</body>
</html>`;
}
