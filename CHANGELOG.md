# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 (2026-10-14)

Initial release, for draft 0.1 of the
[Personal Agent Protocol](https://personalagentprotocol.org/docs/spec).

### Added

- `src/check.js`: the poppy.json checker (`validatePoppyDocument`,
  `checkIssuerMetadata`, `issuerMetadataUrl`, `probePoppy`). It mirrors
  TryGeoSuite/geo-toolkit's `poppy.js` and GeoSuite's audit, issue codes
  included.
- `src/generate.js`: `generatePoppy()` builds a `poppy.json` (protocol version
  0.1, organization, OAuth issuer, direct/device/mediated sign-in, conversation
  endpoint, MCP and OpenAPI entries, browser session endpoint) plus the
  `issuer` and `poppy_domains` snippet for the issuer's RFC 8414 metadata.
  Its output always passes the checker for the same domain.
- `src/messages.js`: plain-language explanations of every issue code and
  generator error, in English and Italian.
- CLI `poppy-json` (also `geosuite-poppy-json`) with `check <url>`,
  `validate <file> [--domain] [--metadata-file]` and `init`, `--json`,
  `--help`, `--version`. Exit codes: 0 valid, 1 invalid or not published,
  2 usage error.
- `web/`: Poppy Check, the hosted page (Cloudflare Worker): live check at
  `/api/check`, a generator that runs in the browser, English and Italian,
  `/robots.txt` and `/llms.txt`.
- Zero runtime dependencies. Tests run with `node --test`.
