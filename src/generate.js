// Builds a /.well-known/poppy.json for the Personal Agent Protocol (draft 0.3,
// https://personalagentprotocol.org/docs/spec) and, for a company that offers
// sign-in, the two OAuth metadata documents an agent checks before trusting
// the file: the domain's protected resource metadata (RFC 9728), which names
// the issuer, and the issuer's own metadata (RFC 8414), which lists the domain.
//
// generatePoppy() is self-contained on purpose: no imports, no module-level
// helpers. The web page ships its source to the browser (Function.toString)
// and runs the same code client-side, so the form and the CLI can never drift.
// Its output passes validatePoppyDocument (src/check.js) for the same domain;
// test/generate.test.js holds that line.

/**
 * @typedef {object} PoppyInput
 * @property {string} name                     organization.name, shown to the person.
 * @property {string} domain                   the host that serves the file (organization.domain), www included when the site lives there.
 * @property {string} [issuer]                 https OAuth issuer, kept exactly as given. Without it the company offers no sign-in.
 * @property {string[]} [signIn]               any of 'direct', 'device', 'mediated', with an issuer only. Default ['direct'].
 * @property {string[]} [scopes]               the scopes Mediated Sign-In can grant (required with 'mediated'), also listed in scopes_supported.
 * @property {string} [agentEndpoint]          https endpoint of a 'poppy' conversation protocol.
 * @property {{type: 'mcp'|'openapi', url: string, description?: string}[]} [apis]
 * @property {string} [browserSessionEndpoint] https web.browser_session_endpoint.
 */

/**
 * @param {PoppyInput} input
 * @returns {{ document: object, json: string,
 *   protectedResource: { url: string, document: object, json: string } | null,
 *   metadata: { url: string, document: object, json: string, requiredEndpoints: string[] } | null }}
 * protectedResource and metadata are null without an issuer.
 * Throws an Error whose `code` says what is wrong (and `field`, when one input is to blame).
 */
export function generatePoppy(input) {
  var SIGN_IN_TYPES = ['direct', 'device', 'mediated'];
  var API_TYPES = ['mcp', 'openapi'];
  var GRANTS = {
    direct: 'authorization_code',
    device: 'urn:ietf:params:oauth:grant-type:device_code',
    mediated: 'https://personalagentprotocol.org/grant/mediated-sign-in',
  };

  function fail(code, field) {
    var e = new Error(field ? code + ' (' + field + ')' : code);
    e.code = code;
    if (field) e.field = field;
    throw e;
  }
  function text(v) {
    return typeof v === 'string' ? v.trim() : '';
  }
  function https(v, field, code) {
    var s = text(v);
    var u;
    try {
      u = new URL(s);
    } catch (err) {
      u = null;
    }
    if (!u || u.protocol !== 'https:' || !u.host) fail(code || 'invalid_url', field);
    return s;
  }
  // "https://www.Acme.com/x" -> "www.acme.com": organization.domain must be the
  // host that serves the file, compared without case and nothing else (spec
  // 3.1), so a site on www keeps its www.
  function host(v) {
    var s = text(v).toLowerCase();
    if (!s) fail('missing_domain', 'domain');
    var h;
    try {
      h = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(s) ? s : 'https://' + s).hostname;
    } catch (err) {
      h = '';
    }
    h = h.replace(/\.$/, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) fail('invalid_domain', 'domain');
    return h;
  }
  function list(v) {
    if (v == null) return [];
    var arr = Array.isArray(v) ? v : String(v).split(',');
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var s = text(String(arr[i]));
      if (s && out.indexOf(s) < 0) out.push(s);
    }
    return out;
  }

  var src = input || {};
  var name = text(src.name);
  if (!name) fail('missing_name', 'name');
  var domain = host(src.domain);
  var issuer = text(src.issuer) ? https(src.issuer, 'issuer', 'invalid_issuer') : '';

  // Sign-in needs an issuer: without one the company is signed-out only, and
  // the sign-in choice does not apply.
  var signIn = [];
  if (issuer) {
    signIn = src.signIn == null ? ['direct'] : list(src.signIn).map(function (s) { return s.toLowerCase(); });
    if (!signIn.length) fail('no_sign_in', 'signIn');
    for (var k = 0; k < signIn.length; k++) {
      if (SIGN_IN_TYPES.indexOf(signIn[k]) < 0) fail('unknown_sign_in', 'signIn');
    }
  }
  var scopes = list(src.scopes);

  var doc = { protocol_version: '0.3', organization: { name: name, domain: domain } };
  if (issuer) doc.auth = { issuer: issuer };

  if (text(src.agentEndpoint)) {
    doc.agent = { protocols: [{ type: 'poppy', endpoint: https(src.agentEndpoint, 'agentEndpoint') }] };
  }

  var apis = [];
  var given = Array.isArray(src.apis) ? src.apis : [];
  for (var a = 0; a < given.length; a++) {
    var api = given[a] || {};
    if (!text(api.url)) continue;
    var type = text(api.type).toLowerCase();
    if (API_TYPES.indexOf(type) < 0) fail('unknown_api_type', 'apis');
    var url = https(api.url, 'apis');
    var description = text(api.description) || (type === 'mcp' ? name + ' MCP server' : name + ' API (OpenAPI description)');
    apis.push({ type: type, url: url, description: description });
  }
  if (apis.length) doc.apis = apis;

  if (text(src.browserSessionEndpoint)) {
    doc.web = { browser_session_endpoint: https(src.browserSessionEndpoint, 'browserSessionEndpoint') };
  }

  if (!doc.agent && !doc.apis && !doc.web) fail('no_channels');

  // Mediated Sign-In is an extension: the credentials the company asks for and
  // the scopes it can grant (extension "mediated-sign-in", version 1).
  if (signIn.indexOf('mediated') >= 0) {
    if (!scopes.length) fail('missing_mediated_scopes', 'scopes');
    doc.extensions = {
      'mediated-sign-in': {
        version: '1',
        fields: [
          { name: 'email', label: 'Email', secret: false },
          { name: 'password', label: 'Password', secret: true },
        ],
        scopes: scopes.slice(),
      },
    };
  }

  var protectedResource = null;
  var metadata = null;
  if (issuer) {
    // RFC 9728: the domain names its issuer. RFC 8414, section 3: the issuer's
    // path goes after the well-known segment (same rule as issuerMetadataUrl
    // in src/check.js).
    var resource = 'https://' + domain;
    var prDoc = { resource: resource, authorization_servers: [issuer] };
    var iu = new URL(issuer);
    var metadataDoc = { issuer: issuer, protected_resources: [resource], grant_types_supported: ['refresh_token'] };
    // Fixed order, the spec's: direct, device, mediated.
    SIGN_IN_TYPES.forEach(function (kind) {
      if (signIn.indexOf(kind) >= 0) metadataDoc.grant_types_supported.push(GRANTS[kind]);
    });
    if (scopes.length) metadataDoc.scopes_supported = scopes.slice();
    // What the spec also asks of that metadata; the server already knows the values.
    var required = ['token_endpoint', 'revocation_endpoint'];
    if (signIn.indexOf('direct') >= 0) required.push('authorization_endpoint');
    if (signIn.indexOf('device') >= 0) required.push('device_authorization_endpoint');
    protectedResource = { url: resource + '/.well-known/oauth-protected-resource', document: prDoc };
    metadata = {
      url: 'https://' + iu.host + '/.well-known/oauth-authorization-server' + iu.pathname.replace(/\/+$/, ''),
      document: metadataDoc,
      requiredEndpoints: required,
    };
  }

  // Two-space JSON, with short lists of strings (scopes, protected_resources) on one line.
  function pretty(v) {
    return JSON.stringify(v, null, 2).replace(/\[\n\s+("(?:[^"\\]|\\.)*"(?:,\n\s+"(?:[^"\\]|\\.)*")*)\n\s+\]/g, function (m, inner) {
      return '[' + inner.split(/,\n\s+/).join(', ') + ']';
    }) + '\n';
  }

  if (protectedResource) protectedResource.json = pretty(protectedResource.document);
  if (metadata) metadata.json = pretty(metadata.document);
  return { document: doc, json: pretty(doc), protectedResource: protectedResource, metadata: metadata };
}
