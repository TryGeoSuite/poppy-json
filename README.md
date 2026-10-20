<p align="center"><img src="./assets/logo.svg" alt="GeoSuite Open" width="72"></p>

# Poppy Check: Personal Agent Protocol (poppy.json) checker and generator

> A small, zero-dependency Node CLI and library that checks and generates
> `/.well-known/poppy.json`, the discovery file of the Personal Agent Protocol
> by Sierra and Meta.
>
> Created and invented by **[Matteo Perino](https://github.com/matte97p)** ([LinkedIn](https://www.linkedin.com/in/matteo-perino-27642016b/)). Built and maintained by [GeoSuite(Matteo Perino)](https://trygeosuite.it).

[![CI](https://github.com/TryGeoSuite/poppy-json/actions/workflows/ci.yml/badge.svg)](https://github.com/TryGeoSuite/poppy-json/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@geosuite/poppy-json.svg)](https://www.npmjs.com/package/@geosuite/poppy-json)
[![npm downloads](https://img.shields.io/npm/dm/@geosuite/poppy-json.svg)](https://www.npmjs.com/package/@geosuite/poppy-json)
[![GitHub stars](https://img.shields.io/github/stars/TryGeoSuite/poppy-json?style=flat&logo=github)](https://github.com/TryGeoSuite/poppy-json/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

### [Try it online](https://poppy-check.geosuite.workers.dev): enter a site, see whether its `poppy.json` works, or build one

No install: the page checks the live file the way an agent would and builds a
new one in your browser, ready to copy or download. Or run the CLI below.

Poppy Check is an independent GeoSuite tool for the Personal Agent Protocol by
Sierra and Meta. It is not affiliated with, or endorsed by, either company.

---

## What is the Personal Agent Protocol?

The [Personal Agent Protocol](https://personalagentprotocol.org/docs/spec)
("Poppy", draft 0.1 of 9 October 2026, by Sierra and Meta) is how a person's own
AI agent finds a company, signs in for that person over OAuth and acts for them.
It all starts from one JSON file the company publishes at
`https://<domain>/.well-known/poppy.json`.

That file names the organization, its OAuth issuer and the ways an agent can
work with it: a conversation endpoint, MCP servers or OpenAPI descriptions, and
a browser session endpoint. The issuer, in turn, must list the domain in the
`poppy_domains` field of its RFC 8414 metadata, or agents will not trust it.

## Why GeoSuite cares

GeoSuite helps brands measure and improve how AI engines (ChatGPT, Perplexity,
Gemini, Google AI Overviews) describe and recommend them. Personal agents are
the next step: once an assistant has chosen a company, a `poppy.json` is what
lets it actually do something there for the customer. The standard is new, so
most sites do not have the file yet; this tool makes it a ten-minute job and
checks it the same way GeoSuite's audit does.

## Install

Requires **Node.js 20 or later** (uses the native `fetch` API). No runtime
dependencies.

```bash
# Run without installing
npx @geosuite/poppy-json check acme.com

# Or install globally
npm install -g @geosuite/poppy-json
poppy-json --help

# Or as a project dev dependency
npm install --save-dev @geosuite/poppy-json
```

Both `poppy-json` and `geosuite-poppy-json` are installed as commands.

## Usage

### Check a live site

```bash
npx @geosuite/poppy-json check acme.com
```

Reads `https://acme.com/.well-known/poppy.json` and checks it the way an agent
would: protocol version, organization domain, at least one channel, an https
OAuth issuer, then the issuer's RFC 8414 metadata (`issuer` and
`poppy_domains`). Exit code `0` when valid, `1` when invalid or not published,
`2` on a usage error, so it fits a CI step after a deploy.

```text
poppy.json for acme.com: valid, a personal agent can use it
  https://acme.com/.well-known/poppy.json
  Protocol version 0.1
  Domain           acme.com
  Sign-in server   https://auth.acme.com
  Sign-in types    direct, device
  Channels         conversation (poppy), MCP server
```

Add `--json` for the raw result.

### Validate a file before publishing

```bash
npx @geosuite/poppy-json validate ./public/.well-known/poppy.json --domain acme.com
```

Shape checks only, no network. `--domain` is the host the file will be served
on (it defaults to the file's own `organization.domain`). Pass
`--metadata-file <file>` to also check the issuer metadata you are about to
publish.

### Generate a new file

```bash
npx @geosuite/poppy-json init \
  --name "Acme" \
  --domain acme.com \
  --issuer https://auth.acme.com \
  --mcp https://acme.com/mcp \
  > poppy.json
```

The `poppy.json` goes to stdout (or `--out <file>`); the snippet the OAuth
issuer must add to its metadata goes to stderr, with the exact URL it must be
served at. `--metadata` prints only that snippet, as JSON.

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--name <text>` | _required_ | `organization.name`, shown to the person. |
| `--domain <host>` | _required_ | `organization.domain`, the host the file is published on. A leading `www.` is dropped. |
| `--issuer <https-url>` | _required_ | `auth.issuer`, your OAuth issuer, kept exactly as given. |
| `--sign-in <list>` | `direct` | Any of `direct`, `device`, `mediated`, comma-separated. |
| `--scopes <list>` | `poppy:read,poppy:write` | Scopes each sign-in type can grant. |
| `--mediated <https-url>` | _none_ | Endpoint for mediated sign-in (adds `mediated`, with email and password fields). |
| `--agent <https-url>` | _none_ | A `poppy` conversation endpoint (`agent.protocols`). |
| `--mcp <https-url>` | _none_ | A remote MCP server. Repeatable. `--mcp-description <text>` sets its description. |
| `--openapi <https-url>` | _none_ | An OpenAPI description. Repeatable. `--openapi-description <text>` sets its description. |
| `--browser <https-url>` | _none_ | `web.browser_session_endpoint`. |
| `--out <file>` | stdout | Write `poppy.json` to a file. |
| `--metadata` | off | Print only the issuer metadata snippet. |

At least one channel (`--agent`, `--mcp`, `--openapi` or `--browser`) is required.

### The other half: your OAuth metadata

The generated snippet looks like this, and belongs in the issuer's
[RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) metadata at
`https://auth.acme.com/.well-known/oauth-authorization-server`:

```json
{
  "issuer": "https://auth.acme.com",
  "poppy_domains": ["acme.com"]
}
```

The spec also requires that metadata to list an https `token_endpoint` and
`revocation_endpoint`, plus `authorization_endpoint` for direct sign-in and
`device_authorization_endpoint` for device sign-in. Your server has those
already; `init` reminds you which ones apply, and `check` fails without them.

## Issue codes

The checker returns the same codes as GeoSuite's audit and the
[AI Readiness Check](https://tools.trygeosuite.it/en/check):

| Code | Meaning |
| ---- | ------- |
| `not_an_object` | the file is not a JSON object |
| `missing_protocol_version` | the protocol version is missing |
| `unsupported_major_version` | the protocol version is not supported (only `0.x` today) |
| `missing_organization` | the organization name or domain is missing |
| `domain_mismatch` | the declared domain is not the site's |
| `invalid_agent_protocol` | a conversation channel has no type or no https address |
| `invalid_api_entry` | an API has no type, address or description |
| `invalid_browser_session_endpoint` | the browser session address is not https |
| `no_channels` | it declares no channel (conversation, API or website) |
| `missing_auth_issuer` | the sign-in server (`auth.issuer`) is missing |
| `not_https` | the file goes through a non-https address |
| `issuer_metadata_unreachable` | the sign-in server metadata does not respond |
| `issuer_metadata_invalid` | the sign-in server metadata cannot be read |
| `issuer_mismatch` | the sign-in server declares a different issuer |
| `domain_not_in_issuer` | the sign-in server does not list this domain in `poppy_domains` |
| `missing_token_endpoint` | the sign-in server does not say where agents get their tokens (an https `token_endpoint`) |
| `missing_revocation_endpoint` | the sign-in server does not say where access is revoked (an https `revocation_endpoint`) |
| `missing_authorization_endpoint` | direct sign-in is declared, but the sign-in server has no https `authorization_endpoint` |
| `missing_device_authorization_endpoint` | device sign-in is declared, but the sign-in server has no https `device_authorization_endpoint` |

A missing file is not an issue: `check` reports it as "not published".

## Programmatic API

```js
import {
  probePoppy,
  validatePoppyDocument,
  checkIssuerMetadata,
  issuerMetadataUrl,
  generatePoppy,
  explainIssue,
} from '@geosuite/poppy-json';

// Live check, the way an agent does it. Never throws.
const result = await probePoppy('acme.com');
// { present, valid, url, status, issues, protocolVersion, organizationDomain,
//   issuer, signInTypes, apiTypes, hasConversation, hasBrowserSession }

// Offline shape checks for a document and the host it will be served on.
const { valid, issues } = validatePoppyDocument(json, 'acme.com');
issues.map((code) => explainIssue(code, 'en'));

// Build a document and the issuer snippet.
const { json: text, metadata } = generatePoppy({
  name: 'Acme',
  domain: 'acme.com',
  issuer: 'https://auth.acme.com',
  signIn: ['direct'],
  apis: [{ type: 'mcp', url: 'https://acme.com/mcp', description: 'Orders and returns' }],
});
// metadata.url  -> https://auth.acme.com/.well-known/oauth-authorization-server
// metadata.json -> { "issuer": ..., "poppy_domains": ["acme.com"] }
```

`generatePoppy` throws an `Error` with a `code` (`missing_name`,
`invalid_issuer`, `no_channels`, ...) when the input cannot make a valid file.
Its output always passes `validatePoppyDocument` for the same domain.

## Out of scope

- **Running the protocol.** This tool checks and writes the discovery file; it
  does not sign in, start conversations or call your APIs.
- **Every redirect hop.** The spec wants every redirect on the way to the file
  to be https. `fetch` only exposes where the chain ends, so the checker flags
  a file that ends on http (`not_https`), not each hop.
- **The contents of sign-in types.** The checker reports which of `direct`,
  `device` and `mediated` are declared, like GeoSuite's audit, but does not yet
  validate their scopes, mediated fields or the required OAuth endpoints.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome: please open
an issue first for non-trivial changes so we can discuss scope.

## Related: GeoSuite open-source tools

`poppy-json` is part of a small family of zero-dependency CLIs we maintain to make Generative Engine Optimization (GEO) measurable from the terminal:

- [`@geosuite/ai-crawler-bots`](https://github.com/TryGeoSuite/ai-crawler-bots): curated AI bot user-agent list with a CLI that tells you whether GPTBot, ClaudeBot, PerplexityBot and friends can read your site and where the block came from.
- [`@geosuite/llms-txt-generator`](https://github.com/TryGeoSuite/llms-txt-generator): turn a `sitemap.xml` into an `llms.txt`.
- [`@geosuite/schema-templates`](https://github.com/TryGeoSuite/schema-templates): copy-paste-ready schema.org JSON-LD templates with a local validator.
- [`@geosuite/sitemap-builder`](https://github.com/TryGeoSuite/sitemap-builder): crawl a site and emit a valid `sitemap.xml`, for sites that ship without one.

All of them, plus a single AI Readiness Check, live at [tools.trygeosuite.it](https://tools.trygeosuite.it).

## Creator

**Created and invented by [Matteo Perino](https://github.com/matte97p)**: [LinkedIn](https://www.linkedin.com/in/matteo-perino-27642016b/) · [matte97.p@gmail.com](mailto:matte97.p@gmail.com).

Ideated, designed and validated by Matteo Perino. Implementation written with AI assistance, maintained under GeoSuite.

## License

[MIT](LICENSE) © 2026 Matteo Perino and GeoSuite

---

If `poppy-json` is useful, [give it a star](https://github.com/TryGeoSuite/poppy-json): it helps other people find the toolkit.

---

## Built by GeoSuite

This is part of the open-source toolkit behind **[GeoSuite](https://trygeosuite.it)**, the platform that measures and improves how AI engines (ChatGPT, Gemini, Claude, Perplexity) cite your brand. [Explore the platform](https://trygeosuite.it)

---

<sub>Built by **Matteo Perino**: [matteoperino.dev](https://matteoperino.dev)</sub>
