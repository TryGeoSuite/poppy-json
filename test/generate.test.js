// generatePoppy: what it builds must pass the checker, for the same domain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePoppy } from '../src/generate.js';
import { validatePoppyDocument, checkIssuerMetadata, issuerMetadataUrl, probePoppy, POPPY_PATH } from '../src/check.js';
import { INPUT_ERROR_TEXT } from '../src/messages.js';

const BASE = { name: 'Acme', domain: 'acme.com', issuer: 'https://auth.acme.com' };
const FULL = {
  ...BASE,
  signIn: ['direct', 'device', 'mediated'],
  mediatedEndpoint: 'https://auth.acme.com/poppy/sign-in',
  agentEndpoint: 'https://api.acme.com/poppy/conversations',
  apis: [
    { type: 'openapi', url: 'https://api.acme.com/openapi.json', description: 'Orders and returns' },
    { type: 'mcp', url: 'https://mcp.acme.com/mcp' },
  ],
  browserSessionEndpoint: 'https://acme.com/poppy/browser-session',
};

const code = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.code;
  }
  return null;
};

test('a minimal document (one MCP server) is valid for its domain', () => {
  const { document } = generatePoppy({ ...BASE, apis: [{ type: 'mcp', url: 'https://acme.com/mcp' }] });
  const out = validatePoppyDocument(document, 'acme.com');
  assert.deepEqual(out.issues, []);
  assert.equal(out.valid, true);
  assert.equal(document.protocol_version, '0.1');
  assert.deepEqual(out.signInTypes, ['direct']);
  assert.deepEqual(document.auth.direct.scopes, ['poppy:read', 'poppy:write']);
});

test('a full document is valid and reports every channel', () => {
  const { document } = generatePoppy(FULL);
  const out = validatePoppyDocument(document, 'www.acme.com');
  assert.equal(out.valid, true, out.issues.join(','));
  assert.deepEqual(out.signInTypes, ['direct', 'device', 'mediated']);
  assert.deepEqual(out.apiTypes, ['openapi', 'mcp']);
  assert.equal(out.hasConversation, true);
  assert.equal(out.hasBrowserSession, true);
  assert.equal(document.auth.mediated.endpoint, FULL.mediatedEndpoint);
  assert.deepEqual(document.auth.mediated.fields.map((f) => f.secret), [false, true]);
  assert.equal(document.apis[1].description, 'Acme MCP server');
  assert.equal(document.apis[1].resource, 'https://mcp.acme.com/mcp');
  assert.equal(document.apis[0].resource, undefined);
});

test('every single channel on its own makes a valid document', () => {
  for (const extra of [
    { agentEndpoint: 'https://acme.com/c' },
    { apis: [{ type: 'openapi', url: 'https://acme.com/o.json' }] },
    { browserSessionEndpoint: 'https://acme.com/b' },
  ]) {
    const { document } = generatePoppy({ ...BASE, ...extra });
    assert.equal(validatePoppyDocument(document, 'acme.com').valid, true, JSON.stringify(extra));
  }
});

test('the domain is reduced to the bare host', () => {
  const { document } = generatePoppy({ ...BASE, domain: 'https://WWW.Acme.com/about', agentEndpoint: 'https://acme.com/c' });
  assert.equal(document.organization.domain, 'acme.com');
});

test('the json text is the document, pretty-printed with a final newline', () => {
  const r = generatePoppy({ ...BASE, agentEndpoint: 'https://acme.com/c' });
  assert.deepEqual(JSON.parse(r.json), r.document);
  assert.ok(r.json.endsWith('}\n'));
  assert.ok(r.json.startsWith('{\n  "protocol_version": "0.1",'));
});

test('the issuer metadata snippet passes checkIssuerMetadata, at the RFC 8414 address', () => {
  for (const issuer of ['https://auth.acme.com', 'https://acme.com/auth/']) {
    const r = generatePoppy({ ...BASE, issuer, signIn: ['direct', 'device'], agentEndpoint: 'https://acme.com/c' });
    assert.equal(r.metadata.url, issuerMetadataUrl(issuer));
    assert.deepEqual(checkIssuerMetadata(r.metadata.document, r.document.auth.issuer, r.document.organization.domain), []);
    assert.deepEqual(r.metadata.requiredEndpoints, ['token_endpoint', 'revocation_endpoint', 'authorization_endpoint', 'device_authorization_endpoint']);
  }
  const mediatedOnly = generatePoppy({ ...BASE, signIn: ['mediated'], mediatedEndpoint: 'https://auth.acme.com/in', agentEndpoint: 'https://acme.com/c' });
  assert.deepEqual(mediatedOnly.metadata.requiredEndpoints, ['token_endpoint', 'revocation_endpoint']);
});

test('round trip: a site serving the generated files probes as valid', async () => {
  const r = generatePoppy(FULL);
  const routes = { ['https://acme.com' + POPPY_PATH]: r.json, [r.metadata.url]: r.metadata.json };
  const fetchImpl = async (url) => ({ status: routes[url] ? 200 : 404, url, text: async () => routes[url] || '' });
  const out = await probePoppy('acme.com', fetchImpl);
  assert.equal(out.present, true);
  assert.deepEqual(out.issues, []);
  assert.equal(out.valid, true);
});

test('bad input fails with a code the messages explain', () => {
  const cases = [
    [{ ...BASE, name: ' ' }, 'missing_name'],
    [{ ...BASE, domain: '' }, 'missing_domain'],
    [{ ...BASE, domain: 'localhost' }, 'invalid_domain'],
    [{ ...BASE, issuer: 'http://auth.acme.com' }, 'invalid_issuer'],
    [{ ...BASE }, 'no_channels'],
    [{ ...BASE, agentEndpoint: 'http://acme.com/c' }, 'invalid_url'],
    [{ ...BASE, signIn: [], agentEndpoint: 'https://acme.com/c' }, 'no_sign_in'],
    [{ ...BASE, signIn: ['password'], agentEndpoint: 'https://acme.com/c' }, 'unknown_sign_in'],
    [{ ...BASE, signIn: ['mediated'], agentEndpoint: 'https://acme.com/c' }, 'missing_mediated_endpoint'],
    [{ ...BASE, apis: [{ type: 'graphql', url: 'https://acme.com/g' }] }, 'unknown_api_type'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(code(() => generatePoppy(input)), expected, JSON.stringify(input));
    assert.ok(INPUT_ERROR_TEXT.en[expected] && INPUT_ERROR_TEXT.it[expected], expected);
  }
  assert.deepEqual(Object.keys(INPUT_ERROR_TEXT.en).sort(), Object.keys(INPUT_ERROR_TEXT.it).sort());
});

test('an API entry with no url is skipped (an empty form row)', () => {
  const { document } = generatePoppy({ ...BASE, agentEndpoint: 'https://acme.com/c', apis: [{ type: 'mcp', url: '' }] });
  assert.equal(document.apis, undefined);
});

test('the function is self-contained: its source runs on its own, as in the browser', () => {
  const standalone = new Function(`return (${generatePoppy.toString()})`)();
  assert.deepEqual(standalone(FULL), generatePoppy(FULL));
  assert.equal(code(() => standalone(BASE)), 'no_channels');
});
