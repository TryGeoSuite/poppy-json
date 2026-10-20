// Ported from TryGeoSuite/geo-toolkit/test/poppy.test.js, itself ported from
// GeoSuite's backend/tests/ingestion/test_personal_agent_protocol.py: keep in step.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePoppyDocument, checkIssuerMetadata, issuerMetadataUrl, probePoppy, ISSUE_CODES } from '../src/check.js';
import { ISSUE_TEXT, explainIssue } from '../src/messages.js';

const ISSUER = 'https://auth.acme.it';
const METADATA_URL = ISSUER + '/.well-known/oauth-authorization-server';
// What a real sign-in server publishes: the two Poppy fields plus the endpoints
// the spec makes required (token and revocation always, authorization for direct).
const ENDPOINTS = { token_endpoint: ISSUER + '/token', revocation_endpoint: ISSUER + '/revoke', authorization_endpoint: ISSUER + '/authorize' };
const GOOD_METADATA = { issuer: ISSUER, poppy_domains: ['acme.it'], ...ENDPOINTS };

const doc = (over = {}) => ({
  protocol_version: '0.1',
  organization: { name: 'Acme', domain: 'acme.it' },
  auth: { issuer: ISSUER, direct: { scopes: ['poppy:read', 'poppy:write'] } },
  agent: { protocols: [{ type: 'poppy', endpoint: 'https://acme.it/poppy' }] },
  apis: [{ type: 'mcp', url: 'https://acme.it/mcp', description: 'Ordini' }],
  ...over,
});

// A fetch double: routes map a URL to { status, body } or a string body.
function fakeFetch(routes) {
  return async (url) => {
    const r = routes[url];
    if (!r) return { status: 404, url, text: async () => 'not found' };
    const { status = 200, body, finalUrl = url } = typeof r === 'string' ? { body: r } : r;
    return { status, url: finalUrl, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
}

test('a complete document is valid', () => {
  const out = validatePoppyDocument(doc(), 'www.acme.it');
  assert.equal(out.valid, true);
  assert.deepEqual(out.issues, []);
  assert.deepEqual(out.signInTypes, ['direct']);
  assert.deepEqual(out.apiTypes, ['mcp']);
  assert.equal(out.hasConversation, true);
  assert.equal(out.issuer, ISSUER);
});

test('the domain must match the requested host', () => {
  assert.ok(validatePoppyDocument(doc(), 'other.it').issues.includes('domain_mismatch'));
});

test('a new major version is not usable', () => {
  assert.ok(validatePoppyDocument(doc({ protocol_version: '1.0' }), 'acme.it').issues.includes('unsupported_major_version'));
});

test('a document without channels is invalid', () => {
  const d = doc();
  delete d.agent;
  delete d.apis;
  assert.deepEqual(validatePoppyDocument(d, 'acme.it').issues, ['no_channels']);
});

test('channels need an https issuer', () => {
  assert.ok(validatePoppyDocument(doc({ auth: { issuer: 'http://auth.acme.it' } }), 'acme.it').issues.includes('missing_auth_issuer'));
});

test('a JSON array is not a document', () => {
  assert.deepEqual(validatePoppyDocument([], 'acme.it').issues, ['not_an_object']);
});

test('issuer metadata: the path goes after the well-known segment', () => {
  assert.equal(issuerMetadataUrl('https://a.it/auth/'), 'https://a.it/.well-known/oauth-authorization-server/auth');
  assert.equal(issuerMetadataUrl(ISSUER), METADATA_URL);
});

test('issuer metadata must have the endpoints the spec makes required, https only', () => {
  const two = { issuer: ISSUER, poppy_domains: ['acme.it'] };
  assert.deepEqual(checkIssuerMetadata(two, ISSUER, 'acme.it'), ['missing_token_endpoint', 'missing_revocation_endpoint']);
  assert.deepEqual(checkIssuerMetadata({ ...two, token_endpoint: ISSUER + '/token', revocation_endpoint: ISSUER + '/revoke' }, ISSUER, 'acme.it', ['direct', 'device']), ['missing_authorization_endpoint', 'missing_device_authorization_endpoint']);
  assert.deepEqual(checkIssuerMetadata({ ...GOOD_METADATA, revocation_endpoint: 'http://auth.acme.it/revoke' }, ISSUER, 'acme.it', ['direct']), ['missing_revocation_endpoint']);
});

test('issuer metadata must name the issuer and list the domain', () => {
  assert.deepEqual(checkIssuerMetadata(GOOD_METADATA, ISSUER, 'www.acme.it'), []);
  assert.deepEqual(checkIssuerMetadata({ issuer: 'https://x.it', poppy_domains: [], ...ENDPOINTS }, ISSUER, 'acme.it'), ['issuer_mismatch', 'domain_not_in_issuer']);
  assert.deepEqual(checkIssuerMetadata('nope', ISSUER, 'acme.it'), ['issuer_metadata_invalid']);
});

test('probe: a valid file with good issuer metadata is valid', async () => {
  const out = await probePoppy('acme.it', fakeFetch({ 'https://acme.it/.well-known/poppy.json': { body: doc() }, [METADATA_URL]: { body: GOOD_METADATA } }));
  assert.equal(out.present, true);
  assert.equal(out.valid, true);
});

test('probe: an HTML 404 page answered with 200 is a missing file', async () => {
  const out = await probePoppy('acme.it', fakeFetch({ 'https://acme.it/.well-known/poppy.json': '<!doctype html><title>404</title>' }));
  assert.equal(out.present, false);
  assert.equal(out.valid, false);
});

test('probe: unreachable issuer metadata make the file invalid', async () => {
  const out = await probePoppy('acme.it', fakeFetch({ 'https://acme.it/.well-known/poppy.json': { body: doc() } }));
  assert.equal(out.present, true);
  assert.deepEqual(out.issues, ['issuer_metadata_unreachable']);
});

test('probe: a file that lands on http is flagged', async () => {
  const out = await probePoppy('acme.it', fakeFetch({ 'https://acme.it/.well-known/poppy.json': { body: doc(), finalUrl: 'http://acme.it/.well-known/poppy.json' } }));
  assert.ok(out.issues.includes('not_https'));
});

test('probe: a network error never throws', async () => {
  const out = await probePoppy('acme.it', async () => { throw new Error('boom'); });
  assert.equal(out.present, false);
  assert.equal(out.error, 'fetch');
});

// Local tests, beyond the shared ones.

test('every sign-in type is reported, in the spec order', () => {
  const out = validatePoppyDocument(doc({ auth: { issuer: ISSUER, mediated: { endpoint: 'https://auth.acme.it/in' }, device: {}, direct: {} } }), 'acme.it');
  assert.deepEqual(out.signInTypes, ['direct', 'device', 'mediated']);
});

test('an API entry without a description is invalid', () => {
  const out = validatePoppyDocument(doc({ apis: [{ type: 'mcp', url: 'https://acme.it/mcp' }] }), 'acme.it');
  assert.deepEqual(out.issues, ['invalid_api_entry']);
});

test('unknown API types are skipped, not flagged', () => {
  const out = validatePoppyDocument(doc({ apis: [{ type: 'graphql', url: 'https://acme.it/gql', description: 'x' }] }), 'acme.it');
  assert.equal(out.valid, true);
  assert.deepEqual(out.apiTypes, []);
});

test('a browser session endpoint on http is flagged', () => {
  const out = validatePoppyDocument(doc({ web: { browser_session_endpoint: 'http://acme.it/b' } }), 'acme.it');
  assert.deepEqual(out.issues, ['invalid_browser_session_endpoint']);
  assert.equal(out.hasBrowserSession, false);
});

test('a conversation endpoint on http is flagged', () => {
  const out = validatePoppyDocument(doc({ agent: { protocols: [{ type: 'poppy', endpoint: 'http://acme.it/p' }] } }), 'acme.it');
  assert.ok(out.issues.includes('invalid_agent_protocol'));
});

test('a missing organization is flagged', () => {
  assert.ok(validatePoppyDocument(doc({ organization: { name: 'Acme' } }), 'acme.it').issues.includes('missing_organization'));
});

test('a missing protocol version is flagged', () => {
  const d = doc();
  delete d.protocol_version;
  assert.deepEqual(validatePoppyDocument(d, 'acme.it').issues, ['missing_protocol_version']);
});

test('probe: issuer metadata that list another domain are flagged', async () => {
  const out = await probePoppy('acme.it', fakeFetch({ 'https://acme.it/.well-known/poppy.json': { body: doc() }, [METADATA_URL]: { body: { issuer: ISSUER, poppy_domains: ['other.it'], ...ENDPOINTS } } }));
  assert.equal(out.valid, false);
  assert.deepEqual(out.issues, ['domain_not_in_issuer']);
});

test('probe: an issuer with a path is looked up after the well-known segment', async () => {
  const issuer = 'https://acme.it/auth';
  const seen = [];
  const routes = {
    'https://acme.it/.well-known/poppy.json': { body: doc({ auth: { issuer, direct: {} } }) },
    'https://acme.it/.well-known/oauth-authorization-server/auth': { body: { issuer, poppy_domains: ['acme.it'], ...ENDPOINTS } },
  };
  const f = fakeFetch(routes);
  const out = await probePoppy('acme.it', async (url, init) => {
    seen.push(url);
    return f(url, init);
  });
  assert.equal(out.valid, true);
  assert.deepEqual(seen, Object.keys(routes));
});

test('probe: sends its own User-Agent, and a custom one when asked', async () => {
  const agents = [];
  const spy = async (url, init) => {
    agents.push(init.headers['user-agent']);
    return { status: 404, url, text: async () => '' };
  };
  await probePoppy('acme.it', spy);
  await probePoppy('acme.it', spy, { userAgent: 'test/1.0' });
  assert.match(agents[0], /^geosuite-poppy-json\//);
  assert.equal(agents[1], 'test/1.0');
});

test('probe: a timeout reads as a timeout', async () => {
  const out = await probePoppy('acme.it', async () => {
    const e = new Error('slow');
    e.name = 'TimeoutError';
    throw e;
  });
  assert.equal(out.error, 'timeout');
});

test('probe: a 404 is a missing file, with its status', async () => {
  const out = await probePoppy('acme.it', fakeFetch({}));
  assert.equal(out.present, false);
  assert.equal(out.status, 404);
  assert.equal(out.url, 'https://acme.it/.well-known/poppy.json');
});

test('every issue code has an English and an Italian line', () => {
  for (const code of ISSUE_CODES) {
    assert.ok(ISSUE_TEXT.en[code], `en: ${code}`);
    assert.ok(ISSUE_TEXT.it[code], `it: ${code}`);
  }
  assert.deepEqual(Object.keys(ISSUE_TEXT.en).sort(), [...ISSUE_CODES].sort());
  assert.equal(explainIssue('domain_mismatch', 'it'), ISSUE_TEXT.it.domain_mismatch);
  assert.equal(explainIssue('nope'), 'nope');
});
