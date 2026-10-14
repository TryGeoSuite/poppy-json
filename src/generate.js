// Builds a /.well-known/poppy.json for the Personal Agent Protocol (draft 0.1,
// https://personalagentprotocol.org/docs/spec), and the snippet the OAuth
// issuer must add to its RFC 8414 metadata so an agent trusts the file.
//
// generatePoppy() is self-contained on purpose: no imports, no module-level
// helpers. The web page ships its source to the browser (Function.toString)
// and runs the same code client-side, so the form and the CLI can never drift.
// Its output passes validatePoppyDocument (src/check.js) for the same domain;
// test/generate.test.js holds that line.

/**
 * @typedef {object} PoppyInput
 * @property {string} name                     organization.name, shown to the person.
 * @property {string} domain                   the host the file is published on (organization.domain).
 * @property {string} issuer                   https OAuth issuer (auth.issuer), kept exactly as given.
 * @property {string[]} [signIn]               any of 'direct', 'device', 'mediated'. Default ['direct'].
 * @property {string[]} [scopes]               scopes each sign-in can grant. Default ['poppy:read', 'poppy:write'].
 * @property {string} [mediatedEndpoint]       https endpoint for mediated sign-in (required with 'mediated').
 * @property {string} [agentEndpoint]          https endpoint of a 'poppy' conversation protocol.
 * @property {{type: 'mcp'|'openapi', url: string, description?: string}[]} [apis]
 * @property {string} [browserSessionEndpoint] https web.browser_session_endpoint.
 */

/**
 * @param {PoppyInput} input
 * @returns {{ document: object, json: string, metadata: { url: string, document: object, json: string, requiredEndpoints: string[] } }}
 * Throws an Error whose `code` says what is wrong (and `field`, when one input is to blame).
 */
export function generatePoppy(input) {
  var SIGN_IN_TYPES = ['direct', 'device', 'mediated'];
  var API_TYPES = ['mcp', 'openapi'];
  var DEFAULT_SCOPES = ['poppy:read', 'poppy:write'];

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
  // "https://www.Acme.com/x" -> "acme.com": the spec compares hosts without a
  // leading www., so the bare host is the clearest value to publish.
  function host(v) {
    var s = text(v).toLowerCase();
    if (!s) fail('missing_domain', 'domain');
    var h;
    try {
      h = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(s) ? s : 'https://' + s).hostname;
    } catch (err) {
      h = '';
    }
    h = h.replace(/\.$/, '').replace(/^www\./, '');
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
  var issuer = https(src.issuer, 'issuer', 'invalid_issuer');

  var signIn = src.signIn == null ? ['direct'] : list(src.signIn).map(function (s) { return s.toLowerCase(); });
  if (!signIn.length) fail('no_sign_in', 'signIn');
  for (var k = 0; k < signIn.length; k++) {
    if (SIGN_IN_TYPES.indexOf(signIn[k]) < 0) fail('unknown_sign_in', 'signIn');
  }
  var scopes = src.scopes == null ? DEFAULT_SCOPES.slice() : list(src.scopes);
  if (!scopes.length) scopes = DEFAULT_SCOPES.slice();

  var auth = { issuer: issuer };
  // Fixed order, the spec's: direct, device, mediated.
  SIGN_IN_TYPES.forEach(function (kind) {
    if (signIn.indexOf(kind) < 0) return;
    if (kind === 'mediated') {
      if (!text(src.mediatedEndpoint)) fail('missing_mediated_endpoint', 'mediatedEndpoint');
      auth.mediated = {
        endpoint: https(src.mediatedEndpoint, 'mediatedEndpoint'),
        fields: [
          { name: 'email', label: 'Email', secret: false },
          { name: 'password', label: 'Password', secret: true },
        ],
        scopes: scopes.slice(),
      };
    } else {
      auth[kind] = { scopes: scopes.slice() };
    }
  });

  var doc = { protocol_version: '0.1', organization: { name: name, domain: domain }, auth: auth };

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
    var entry = { type: type, url: url, description: description };
    // An MCP server is an OAuth resource of its own (RFC 8707): the spec's
    // example names it with the server's URL.
    if (type === 'mcp') entry.resource = url;
    apis.push(entry);
  }
  if (apis.length) doc.apis = apis;

  if (text(src.browserSessionEndpoint)) {
    doc.web = { browser_session_endpoint: https(src.browserSessionEndpoint, 'browserSessionEndpoint') };
  }

  if (!doc.agent && !doc.apis && !doc.web) fail('no_channels');

  // RFC 8414, section 3: the issuer's path goes after the well-known segment
  // (same rule as issuerMetadataUrl in src/check.js).
  var iu = new URL(issuer);
  var metadataUrl = 'https://' + iu.host + '/.well-known/oauth-authorization-server' + iu.pathname.replace(/\/+$/, '');
  var metadataDoc = { issuer: issuer, poppy_domains: [domain] };
  // What the spec also asks of that metadata; the server already knows the values.
  var required = ['token_endpoint', 'revocation_endpoint'];
  if (auth.direct) required.push('authorization_endpoint');
  if (auth.device) required.push('device_authorization_endpoint');

  // Two-space JSON, with short lists of strings (scopes, poppy_domains) on one line.
  function pretty(v) {
    return JSON.stringify(v, null, 2).replace(/\[\n\s+("(?:[^"\\]|\\.)*"(?:,\n\s+"(?:[^"\\]|\\.)*")*)\n\s+\]/g, function (m, inner) {
      return '[' + inner.split(/,\n\s+/).join(', ') + ']';
    }) + '\n';
  }

  return {
    document: doc,
    json: pretty(doc),
    metadata: {
      url: metadataUrl,
      document: metadataDoc,
      json: pretty(metadataDoc),
      requiredEndpoints: required,
    },
  };
}
