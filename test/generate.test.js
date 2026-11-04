// generatePoppy: what it builds must pass the checker, for the same domain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePoppy } from '../src/generate.js';
import { validatePoppyDocument, checkIssuerMetadata, issuerMetadataUrl, probePoppy, resolveIssuer, POPPY_PATH, PROTECTED_RESOURCE_PATH } from '../src/check.js';
import { INPUT_ERROR_TEXT } from '../src/messages.js';

const BASE = { name: 'Acme', domain: 'acme.com', issuer: 'https://auth.acme.com' };
const FULL = {
  ...BASE,
  signIn: ['direct', 'device', 'mediated'],
  scopes: ['orders:read', 'addresses'],
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
  assert.equal(document.protocol_version, '0.3');
  assert.deepEqual(document.auth, { issuer: BASE.issuer });
  assert.equal(document.extensions, undefined);
});

test('a full document is valid and reports every channel', () => {
  const { document } = generatePoppy(FULL);
  const out = validatePoppyDocument(document, 'acme.com');
  assert.equal(out.valid, true, out.issues.join(','));
  assert.deepEqual(out.signInTypes, ['mediated']);
  assert.deepEqual(out.apiTypes, ['openapi', 'mcp']);
  assert.equal(out.hasConversation, true);
  assert.equal(out.hasBrowserSession, true);
  const mediated = document.extensions['mediated-sign-in'];
  assert.equal(mediated.version, '1');
  assert.deepEqual(mediated.fields.map((f) => f.secret), [false, true]);
  assert.deepEqual(mediated.scopes, ['orders:read', 'addresses']);
  assert.equal(document.apis[1].description, 'Acme MCP server');
  assert.equal(document.apis[1].resource, undefined);
});

test('without an issuer the file has no auth and no metadata, and sign-in is ignored', () => {
  const r = generatePoppy({ name: 'Acme', domain: 'acme.com', signIn: ['mediated'], agentEndpoint: 'https://acme.com/c' });
  assert.equal(r.document.auth, undefined);
  assert.equal(r.document.extensions, undefined);
  assert.equal(r.protectedResource, null);
  assert.equal(r.metadata, null);
  assert.equal(validatePoppyDocument(r.document, 'acme.com').valid, true);
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

test('the domain is the host, lowercase, www kept: agents compare it with the host that serves the file', () => {
  const { document } = generatePoppy({ ...BASE, domain: 'https://WWW.Acme.com./about', agentEndpoint: 'https://acme.com/c' });
  assert.equal(document.organization.domain, 'www.acme.com');
});

test('the json text is the document, pretty-printed with a final newline', () => {
  const r = generatePoppy({ ...BASE, agentEndpoint: 'https://acme.com/c' });
  assert.deepEqual(JSON.parse(r.json), r.document);
  assert.ok(r.json.endsWith('}\n'));
  assert.ok(r.json.startsWith('{\n  "protocol_version": "0.3",'));
});

test('the two metadata documents pass discovery and checkIssuerMetadata, at their addresses', () => {
  for (const issuer of ['https://auth.acme.com', 'https://acme.com/auth/']) {
    const r = generatePoppy({ ...BASE, issuer, signIn: ['direct', 'device'], agentEndpoint: 'https://acme.com/c' });
    const domain = r.document.organization.domain;
    assert.equal(r.protectedResource.url, 'https://' + domain + PROTECTED_RESOURCE_PATH);
    assert.deepEqual(resolveIssuer(r.protectedResource.document, domain, r.document.auth.issuer, false), { issuer, issues: [] });
    assert.equal(r.metadata.url, issuerMetadataUrl(issuer));
    assert.deepEqual(r.metadata.document.grant_types_supported, ['refresh_token', 'authorization_code', 'urn:ietf:params:oauth:grant-type:device_code']);
    // The snippet holds the Poppy fields; the server adds them to the
    // metadata it already publishes, endpoints included.
    const served = { ...Object.fromEntries(r.metadata.requiredEndpoints.map((k) => [k, 'https://auth.acme.com/' + k])), ...r.metadata.document };
    assert.deepEqual(checkIssuerMetadata(served, issuer, domain), []);
    assert.deepEqual(checkIssuerMetadata(r.metadata.document, issuer, domain), r.metadata.requiredEndpoints.map((k) => 'missing_' + k));
    assert.deepEqual(r.metadata.requiredEndpoints, ['token_endpoint', 'revocation_endpoint', 'authorization_endpoint', 'device_authorization_endpoint']);
  }
  const mediatedOnly = generatePoppy({ ...BASE, signIn: ['mediated'], scopes: ['orders:read'], agentEndpoint: 'https://acme.com/c' });
  assert.deepEqual(mediatedOnly.metadata.requiredEndpoints, ['token_endpoint', 'revocation_endpoint']);
  assert.deepEqual(mediatedOnly.metadata.document.grant_types_supported, ['refresh_token', 'https://personalagentprotocol.org/grant/mediated-sign-in']);
  assert.deepEqual(mediatedOnly.metadata.document.scopes_supported, ['orders:read']);
});

test('round trip: a site serving the generated files probes as valid', async () => {
  const r = generatePoppy(FULL);
  // The sign-in server publishes the snippet's fields next to its endpoints.
  const served = JSON.stringify({ ...Object.fromEntries(r.metadata.requiredEndpoints.map((k) => [k, 'https://auth.acme.com/' + k])), ...r.metadata.document });
  const routes = { ['https://acme.com' + POPPY_PATH]: r.json, [r.protectedResource.url]: r.protectedResource.json, [r.metadata.url]: served };
  const fetchImpl = async (url) => ({ status: routes[url] ? 200 : 404, url, text: async () => routes[url] || '' });
  const out = await probePoppy('acme.com', fetchImpl);
  assert.equal(out.present, true);
  assert.deepEqual(out.issues, []);
  assert.equal(out.valid, true);
  assert.deepEqual(out.signInTypes, ['direct', 'device', 'mediated']);
});

test('round trip without an issuer: no protected resource metadata, still valid', async () => {
  const r = generatePoppy({ name: 'Acme', domain: 'acme.com', browserSessionEndpoint: 'https://acme.com/b' });
  const fetchImpl = async (url) => (url === 'https://acme.com' + POPPY_PATH ? { status: 200, url, text: async () => r.json } : { status: 404, url, text: async () => '' });
  const out = await probePoppy('acme.com', fetchImpl);
  assert.equal(out.valid, true, out.issues.join(','));
  assert.equal(out.issuer, null);
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
    [{ ...BASE, signIn: ['mediated'], agentEndpoint: 'https://acme.com/c' }, 'missing_mediated_scopes'],
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
