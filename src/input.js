// Input parsing shared by bin/cli.js and the web worker: CLI flags, and the
// site a visitor types. Kept apart so the tests reach it without a process.
// Not part of the public API.

// Flags that never take a value.
const BOOLEAN = new Set(['help', 'version', 'json', 'metadata']);
// Flags that may repeat; their values are collected in order.
const MULTI = new Set(['mcp', 'openapi']);
const SHORT = { h: 'help', v: 'version' };

/**
 * Accepts `--flag value` and `--flag=value`. Positionals land in `_`.
 * @param {string[]} argv
 * @returns {{ _: string[], [flag: string]: unknown }}
 */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (/^-[a-z]$/.test(tok) && SHORT[tok[1]]) {
      out[SHORT[tok[1]]] = true;
      continue;
    }
    if (!tok.startsWith('--') || tok === '--') {
      out._.push(tok);
      continue;
    }
    const eq = tok.indexOf('=');
    const key = eq === -1 ? tok.slice(2) : tok.slice(2, eq);
    let value;
    if (BOOLEAN.has(key)) {
      value = eq === -1 ? true : !/^(false|0|no)$/i.test(tok.slice(eq + 1));
    } else if (eq !== -1) {
      value = tok.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      value = argv[++i];
    } else {
      value = true; // a value flag with nothing after it: the caller reports it
    }
    if (MULTI.has(key)) (out[key] = out[key] || []).push(value);
    else out[key] = value;
  }
  return out;
}

const str = (v) => (typeof v === 'string' ? v : undefined);

/** Maps `init` flags to generatePoppy()'s input. */
export function initInput(args) {
  const apis = [];
  for (const url of args.mcp || []) apis.push({ type: 'mcp', url: str(url), description: str(args['mcp-description']) });
  for (const url of args.openapi || []) apis.push({ type: 'openapi', url: str(url), description: str(args['openapi-description']) });
  const signIn = str(args['sign-in']) ? args['sign-in'].split(',') : str(args.mediated) ? ['direct', 'mediated'] : undefined;
  return {
    name: str(args.name),
    domain: str(args.domain),
    issuer: str(args.issuer),
    signIn,
    scopes: str(args.scopes) ? args.scopes.split(',') : undefined,
    mediatedEndpoint: str(args.mediated),
    agentEndpoint: str(args.agent),
    apis,
    browserSessionEndpoint: str(args.browser),
  };
}

/**
 * The host to probe, from what a person typed: "https://www.acme.com/x" -> "www.acme.com",
 * "acme.com" -> "acme.com". Null for anything that is not a public name
 * (IP addresses, ports, .local and the like).
 */
export function targetHost(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) return null;
  if (/^\d+(\.\d+){3}$/.test(h) || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return null;
  return u.port ? null : h;
}
