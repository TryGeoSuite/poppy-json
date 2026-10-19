# Contributing

Thanks for your interest in improving `@geosuite/poppy-json`.

## Ground rules

- Zero runtime dependencies. We rely on Node 20+ built-ins (`fetch`,
  `node:fs/promises`, `node:test`). Please don't add deps without an issue
  discussing the trade-off first.
- Tests run with `npm test` (`node --test test/*.test.js`): no test
  framework, no transpiler.
- Code style is plain modern ES modules. No TypeScript in the runtime path.
- Field names and semantics follow the spec at
  https://personalagentprotocol.org/docs/spec.
- `src/check.js` mirrors TryGeoSuite/geo-toolkit's `poppy.js` and GeoSuite's
  audit. A change to a check or an issue code starts there, then lands here
  unchanged, so the three tools never disagree about the same site.
  `test/fixtures/golden.json` is the contract: GeoSuite runs a byte copy of it
  (`backend/tests/fixtures/poppy_json_golden.json`), so a rule change comes
  with a new case there and the fixture copied to GeoSuite in the same round.
- `generatePoppy()` in `src/generate.js` must stay self-contained (no imports,
  no module-level helpers): the web page ships its source to the browser.
  `test/generate.test.js` checks both that and that its output passes the
  checker.

## Local development

```bash
git clone https://github.com/TryGeoSuite/poppy-json
cd poppy-json
npm test
node bin/cli.js validate test/fixtures/poppy-valid.json --domain acme.com
node bin/cli.js init --name "Acme" --domain acme.com --issuer https://auth.acme.com --mcp https://acme.com/mcp
```

The web page: `cd web && npx wrangler dev`, then open http://localhost:8787.

## Submitting changes

1. Open an issue describing the bug or feature first when the change is
   non-trivial.
2. Add or update a test in `test/` for any behavior change.
3. Keep PRs focused: one logical change per PR.
4. Update `CHANGELOG.md` under an `## Unreleased` section.

## Reporting bugs

When filing a bug, please include:

- Node version (`node --version`)
- The site, or the poppy.json (a minimal anonymized copy is fine)
- The exact CLI invocation
- Expected vs actual output, with the part of the spec that backs it

## License

By contributing you agree that your contributions are licensed under the MIT
License of this repository.
