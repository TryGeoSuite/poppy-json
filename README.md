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
("Poppy", draft 0.3, October 2026, by Sierra and Meta) is how a person's own
AI agent finds a company, signs in for that person over OAuth and acts for them.
It all starts from one JSON file the company publishes at
`https://<domain>/.well-known/poppy.json`.

That file names the organization and the ways an agent can work with it: a
conversation endpoint, MCP servers or OpenAPI descriptions, and a browser
session endpoint. A company whose customers sign in also names its OAuth issuer
in the domain's protected resource metadata (RFC 9728,
`/.well-known/oauth-protected-resource`), and the issuer must list the domain
in the `protected_resources` field of its RFC 8414 metadata, or agents will not
trust it. A company with no sign-in needs neither: agents use it signed out.

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
would: protocol version (`0.3`), organization domain against the host that
served the file, at least one channel, then the discovery of the sign-in
server: the domain's protected resource metadata, and the issuer's RFC 8414
metadata (`issuer`, `protected_resources`, endpoints, `grant_types_supported`). Exit code `0` when valid, `1` when invalid or not published,
`2` on a usage error, so it fits a CI step after a deploy.

```text
poppy.json for acme.com: valid, a personal agent can use it
  https://acme.com/.well-known/poppy.json
  Protocol version 0.3
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

The `poppy.json` goes to stdout (or `--out <file>`). With `--issuer`, the two
OAuth metadata documents go to stderr, each with the exact URL it must be
served at: the domain's protected resource metadata and the snippet for the
issuer's metadata. `--metadata` prints only the issuer's snippet, as JSON.

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--name <text>` | _required_ | `organization.name`, shown to the person. |
| `--domain <host>` | _required_ | `organization.domain`, the host that serves the file. Keep `www.` if the site lives there: agents compare it with the host after redirects. |
| `--issuer <https-url>` | _none_ | `auth.issuer`, your OAuth issuer, kept exactly as given. Leave it out if customers do not sign in through agents. |
| `--sign-in <list>` | `direct` | Any of `direct`, `device`, `mediated`, comma-separated. Needs `--issuer`. They become the issuer's `grant_types_supported`; `mediated` also adds the `mediated-sign-in` extension, with email and password fields. |
| `--scopes <list>` | _none_ | The scopes mediated sign-in can grant (required with `mediated`), also listed in `scopes_supported`. |
| `--agent <https-url>` | _none_ | A `poppy` conversation endpoint (`agent.protocols`). |
| `--mcp <https-url>` | _none_ | A remote MCP server. Repeatable. `--mcp-description <text>` sets its description. |
| `--openapi <https-url>` | _none_ | An OpenAPI description. Repeatable. `--openapi-description <text>` sets its description. |
| `--browser <https-url>` | _none_ | `web.browser_session_endpoint`. |
| `--out <file>` | stdout | Write `poppy.json` to a file. |
| `--metadata` | off | Print only the issuer metadata snippet. Needs `--issuer`. |

At least one channel (`--agent`, `--mcp`, `--openapi` or `--browser`) is required.

### The other half: your OAuth metadata

With an issuer, agents find it in two steps. First the domain names it, in its
[RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected resource metadata
at `https://acme.com/.well-known/oauth-protected-resource`:

```json
{
  "resource": "https://acme.com",
  "authorization_servers": ["https://auth.acme.com"]
}
```

Then the issuer confirms the domain, in its
[RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) metadata at
`https://auth.acme.com/.well-known/oauth-authorization-server`:

```json
{
  "issuer": "https://auth.acme.com",
  "protected_resources": ["https://acme.com"],
  "grant_types_supported": ["refresh_token", "authorization_code"]
}
```

`grant_types_supported` must include `refresh_token`, and says which sign-in
types you offer: `authorization_code` for direct,
`urn:ietf:params:oauth:grant-type:device_code` for device. The spec also
requires an https `token_endpoint` and `revocation_endpoint`, plus
`authorization_endpoint` for direct sign-in and `device_authorization_endpoint`
for device sign-in. Your server has those already; `init` reminds you which
ones apply, and `check` fails without them.

Without an issuer, publish nothing at `/.well-known/oauth-protected-resource`:
the 404 tells agents there is no sign-in.

## Issue codes

The checker returns the same codes as GeoSuite's audit and the
[AI Readiness Check](https://tools.trygeosuite.it/en/check):

| Code | Meaning |
| ---- | ------- |
| `not_an_object` | the file is not a JSON object |
| `missing_protocol_version` | the protocol version is missing |
| `unsupported_version` | the protocol version is not `0.3`, the draft agents follow today |
| `missing_organization` | the organization name or domain is missing |
| `domain_mismatch` | the declared domain is not the host that serves the file |
| `invalid_agent_protocol` | a conversation channel has no type or no https address |
| `invalid_api_entry` | an API has no type, address or description |
| `invalid_browser_session_endpoint` | the browser session address is not https |
| `no_channels` | it declares no channel (conversation, API or website) |
| `invalid_auth_issuer` | `auth.issuer` is not an https address |
| `sign_in_conflict` | sign-in is turned off (`auth.disabled`), but the file still offers it |
| `not_https` | the file goes through a non-https address |
| `wrong_final_path` | the redirects end on an address other than `/.well-known/poppy.json` |
| `protected_resource_unreachable` | the domain's `/.well-known/oauth-protected-resource` does not respond |
| `protected_resource_invalid` | the domain's `/.well-known/oauth-protected-resource` cannot be read, or names another resource |
| `missing_auth_issuer` | the domain declares more than one authorization server, and `auth.issuer` does not say which one agents use |
| `issuer_not_listed` | `auth.issuer` is not among the authorization servers the domain declares |
| `sign_in_without_issuer` | the file offers sign-in, but the domain names no sign-in server |
| `issuer_metadata_unreachable` | the sign-in server metadata does not respond |
| `issuer_metadata_invalid` | the sign-in server metadata cannot be read |
| `issuer_mismatch` | the sign-in server declares a different issuer |
| `domain_not_in_issuer` | the sign-in server does not list this domain in `protected_resources` |
| `missing_token_endpoint` | the sign-in server does not say where agents get their tokens (an https `token_endpoint`) |
| `missing_revocation_endpoint` | the sign-in server does not say where access is revoked (an https `revocation_endpoint`) |
| `invalid_grant_types` | the sign-in server does not list `grant_types_supported` with `refresh_token` |
| `missing_authorization_endpoint` | the sign-in server offers `authorization_code`, but has no https `authorization_endpoint` |
| `missing_device_authorization_endpoint` | the sign-in server offers the device code grant, but has no https `device_authorization_endpoint` |

A missing file is not an issue: `check` reports it as "not published".

## Programmatic API

```js
import {
  probePoppy,
  validatePoppyDocument,
  checkIssuerMetadata,
  resolveIssuer,
  issuerMetadataUrl,
  generatePoppy,
  explainIssue,
} from '@geosuite/poppy-json';

// Live check, the way an agent does it. Never throws.
const result = await probePoppy('acme.com');
// { present, valid, url, status, issues, protocolVersion, organizationDomain,
//   issuer, signInTypes, signInDisabled, signedInAccess, apiTypes,
//   hasConversation, hasBrowserSession }

// Offline shape checks for a document and the host it will be served on.
const { valid, issues } = validatePoppyDocument(json, 'acme.com');
issues.map((code) => explainIssue(code, 'en'));

// Build a document and the two OAuth metadata documents.
const { json: text, protectedResource, metadata } = generatePoppy({
  name: 'Acme',
  domain: 'acme.com',
  issuer: 'https://auth.acme.com',
  signIn: ['direct'],
  apis: [{ type: 'mcp', url: 'https://acme.com/mcp', description: 'Orders and returns' }],
});
// protectedResource.url -> https://acme.com/.well-known/oauth-protected-resource
// metadata.url          -> https://auth.acme.com/.well-known/oauth-authorization-server
// metadata.json         -> { "issuer": ..., "protected_resources": ["https://acme.com"], ... }
// Both are null without an issuer.
```

`generatePoppy` throws an `Error` with a `code` (`missing_name`,
`invalid_issuer`, `no_channels`, ...) when the input cannot make a valid file.
Its output always passes `validatePoppyDocument` for the same domain.

## Out of scope

- **Running the protocol.** This tool checks and writes the discovery file; it
  does not sign in, start conversations or call your APIs.
- **Scopes and extensions.** The checker reports which of `direct`, `device`
  and `mediated` a company offers, like GeoSuite's audit, but does not check
  scope descriptions, `scope_hints`, the mediated sign-in fields or other
  extensions.

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
