# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed (breaking)

- Aligned to draft 0.3 of the Personal Agent Protocol. Only `protocol_version`
  `0.3` is accepted: before 1.0 every minor version can break the one before,
  and an agent uses only the versions it knows. `unsupported_major_version` is
  now `unsupported_version`.
- The sign-in server is discovered the 0.3 way: the domain's protected
  resource metadata (RFC 9728, `/.well-known/oauth-protected-resource`) names
  the issuer, and `auth.issuer` is needed only when it names more than one. A
  404 there means a company with no sign-in, which is valid. The issuer's
  metadata must list the domain in `protected_resources` (it was
  `poppy_domains`) and have `grant_types_supported` with `refresh_token`.
  Direct and Device Sign-In come from those grant types, no longer from
  `auth.direct` and `auth.device`; Mediated Sign-In from the
  `mediated-sign-in` extension.
- `organization.domain` is compared with the host that served the file after
  the redirects, ignoring case only (a leading `www.` is no longer dropped),
  and a redirect that ends off `/.well-known/poppy.json` is flagged.
- New codes: `invalid_auth_issuer`, `sign_in_conflict`, `wrong_final_path`,
  `protected_resource_unreachable`, `protected_resource_invalid`,
  `issuer_not_listed`, `sign_in_without_issuer`, `invalid_grant_types`.
- `checkIssuerMetadata(metadata, issuer, domain)` no longer takes the sign-in
  types; new exports `resolveIssuer` and `signInTypesFrom`.
- The generator writes 0.3 files: the issuer is optional, `www.` is kept,
  `poppy:read`/`poppy:write` are gone (each company defines its scopes), and
  with an issuer it also builds the protected resource metadata and the
  issuer's snippet with `protected_resources` and `grant_types_supported`.
  `--mediated <url>` is gone: mediated sign-in has no endpoint of its own in
  0.3, and needs `--scopes`.

### Added

- The issuer metadata must list the endpoints the spec makes required, all
  https: `token_endpoint` and `revocation_endpoint` always,
  `authorization_endpoint` with `auth.direct`, `device_authorization_endpoint`
  with `auth.device`. Four new codes, `missing_token_endpoint`,
  `missing_revocation_endpoint`, `missing_authorization_endpoint` and
  `missing_device_authorization_endpoint`, also in the golden fixture.
  Before, a file whose sign-in server lacked them was reported valid.

### Changed

- The checker now gives GeoSuite's audit verdict on every case of
  `test/fixtures/golden.json`, a fixture GeoSuite runs too
  (`backend/tests/fixtures/poppy_json_golden.json`):
  - redirects are followed by hand, and `not_https` flags any http hop, not
    only the last address;
  - issuer metadata that answer but are not JSON (an HTML page, over 256 KB)
    are `issuer_metadata_invalid`, as before; GeoSuite now says the same
    instead of `issuer_metadata_unreachable`;
  - a field counts as present when the audit counts it: `[]`, `{}` and `0` are
    missing (an organization name `[]` was accepted);
  - the 256 KB cap counts bytes, not characters;
  - `status` is `null`, not `0`, when no HTTP answer came back.

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
