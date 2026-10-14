#!/usr/bin/env node
// CLI for @geosuite/poppy-json.
//
// Usage:
//   poppy-json check <url> [--json]
//   poppy-json validate <file> [--domain <host>] [--metadata-file <file>] [--json]
//   poppy-json init --name <text> --domain <host> --issuer <https-url> [channels] [--out <file>] [--metadata]
//   poppy-json --help | --version

import { readFile, writeFile } from 'node:fs/promises';
import { probePoppy, validatePoppyDocument, checkIssuerMetadata, SPEC_URL } from '../src/check.js';
import { generatePoppy } from '../src/generate.js';
import { explainIssue, INPUT_ERROR_TEXT } from '../src/messages.js';
import { parseArgs, initInput, targetHost } from '../src/input.js';

const HELP = `poppy-json: check and generate /.well-known/poppy.json, the discovery file
of the Personal Agent Protocol (${SPEC_URL})

USAGE
  poppy-json check <url> [--json]
  poppy-json validate <file> [--domain <host>] [--metadata-file <file>] [--json]
  poppy-json init --name <text> --domain <host> --issuer <https-url> [options]

COMMANDS
  check <url>          Fetch https://<host>/.well-known/poppy.json and check it the
                       way a personal agent would, issuer metadata included.
  validate <file>      Shape checks on a local poppy.json, no network.
                       --domain <host>         The host the file will be served on.
                                               Defaults to the file's own domain.
                       --metadata-file <file>  Also check the issuer's RFC 8414
                                               metadata (issuer, poppy_domains).
  init                 Print a poppy.json built from the options below. The
                       snippet the OAuth issuer must publish goes to stderr.
                       --name <text>           organization.name (required)
                       --domain <host>         organization.domain (required)
                       --issuer <https-url>    auth.issuer, the OAuth issuer (required)
                       --sign-in <list>        direct,device,mediated. Default: direct
                       --scopes <list>         Default: poppy:read,poppy:write
                       --mediated <https-url>  Endpoint for mediated sign-in
                       --agent <https-url>     A "poppy" conversation endpoint
                       --mcp <https-url>       A remote MCP server (repeatable)
                       --mcp-description <text>
                       --openapi <https-url>   An OpenAPI description (repeatable)
                       --openapi-description <text>
                       --browser <https-url>   web.browser_session_endpoint
                       --out <file>            Write poppy.json to a file
                       --metadata              Print only the issuer snippet

OPTIONS
  --json               Machine-readable output (check, validate).
  --help, -h           Show this help.
  --version, -v        Show the version.

EXIT CODES
  0  valid (or generated)   1  invalid or not published   2  usage error

EXAMPLES
  npx @geosuite/poppy-json check acme.com
  npx @geosuite/poppy-json validate ./public/.well-known/poppy.json --domain acme.com
  npx @geosuite/poppy-json init --name "Acme" --domain acme.com \\
      --issuer https://auth.acme.com --mcp https://acme.com/mcp > poppy.json
`;

const out = (s) => process.stdout.write(s);
const err = (s) => process.stderr.write(s);

class UsageError extends Error {}

function channelsOf(r) {
  const c = [];
  if (r.hasConversation) c.push('conversation (poppy)');
  for (const t of r.apiTypes || []) c.push(t === 'mcp' ? 'MCP server' : 'OpenAPI');
  if (r.hasBrowserSession) c.push('browser session');
  return c;
}

function printDetails(r) {
  const rows = [
    ['Protocol version', r.protocolVersion],
    ['Domain', r.organizationDomain],
    ['Sign-in server', r.issuer],
    ['Sign-in types', (r.signInTypes || []).join(', ')],
    ['Channels', channelsOf(r).join(', ')],
  ].filter(([, v]) => v);
  for (const [k, v] of rows) out(`  ${k.padEnd(17)}${v}\n`);
}

function printIssues(issues) {
  for (const code of issues) out(`  - ${code}: ${explainIssue(code)}\n`);
}

async function cmdCheck(args) {
  const target = args._[1];
  if (!target) throw new UsageError('check needs a site, e.g. poppy-json check acme.com');
  const host = targetHost(target);
  if (!host) throw new UsageError(`not a public site address: ${target}`);
  const r = await probePoppy(host);
  if (args.json) {
    out(JSON.stringify({ host, ...r }, null, 2) + '\n');
    return r.valid ? 0 : 1;
  }
  if (r.valid) {
    out(`poppy.json for ${host}: valid, a personal agent can use it\n  ${r.url}\n`);
    printDetails(r);
    return 0;
  }
  if (r.present) {
    out(`poppy.json for ${host}: published, but an agent would reject it\n  ${r.url} (HTTP ${r.status})\n`);
    printIssues(r.issues);
    printDetails(r);
    return 1;
  }
  const why = r.error === 'timeout' ? 'the site did not answer in time' : r.error ? 'the site could not be reached' : r.status ? `HTTP ${r.status}` : 'no JSON document';
  out(`poppy.json for ${host}: not published (${why})\n  ${r.url}\n`);
  out('  The standard is new (draft 0.1, October 2026), so this is normal today.\n');
  out('  Create one: npx @geosuite/poppy-json init --help\n');
  return 1;
}

async function readJsonFile(path, what) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    throw new UsageError(`cannot read ${what} ${path}: ${e.code || e.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return { __notJson: e.message };
  }
}

async function cmdValidate(args) {
  const file = args._[1];
  if (!file) throw new UsageError('validate needs a file, e.g. poppy-json validate poppy.json --domain acme.com');
  const doc = await readJsonFile(file, 'file');
  if (doc && doc.__notJson) {
    if (args.json) out(JSON.stringify({ valid: false, issues: ['not_json'], error: doc.__notJson }, null, 2) + '\n');
    else out(`${file}: not valid JSON (${doc.__notJson})\n`);
    return 1;
  }
  let domain = typeof args.domain === 'string' ? args.domain : null;
  if (!domain) {
    domain = doc && doc.organization && typeof doc.organization.domain === 'string' ? doc.organization.domain : '';
    if (!args.json) err(`note: no --domain given, checking against the file's own domain${domain ? ` (${domain})` : ''}\n`);
  }
  const r = validatePoppyDocument(doc, domain);
  const issues = [...r.issues];
  if (typeof args['metadata-file'] === 'string') {
    const meta = await readJsonFile(args['metadata-file'], 'metadata file');
    if (r.issuer && r.organizationDomain) issues.push(...checkIssuerMetadata(meta && meta.__notJson ? null : meta, r.issuer, r.organizationDomain));
  }
  const valid = issues.length === 0;
  if (args.json) {
    out(JSON.stringify({ ...r, issues, valid }, null, 2) + '\n');
    return valid ? 0 : 1;
  }
  out(valid ? `${file}: valid\n` : `${file}: an agent would reject it\n`);
  printIssues(issues);
  printDetails(r);
  if (valid && typeof args['metadata-file'] !== 'string') {
    out('  Shape only: run `check` once it is live to test the issuer metadata too.\n');
  }
  return valid ? 0 : 1;
}

async function cmdInit(args) {
  for (const k of ['name', 'domain', 'issuer', 'agent', 'browser', 'mediated', 'out', 'sign-in', 'scopes']) {
    if (args[k] === true) throw new UsageError(`--${k} needs a value`);
  }
  let result;
  try {
    result = generatePoppy(initInput(args));
  } catch (e) {
    if (!e.code) throw e;
    throw new UsageError(INPUT_ERROR_TEXT.en[e.code] || e.message);
  }
  const { json, metadata } = result;
  const snippet =
    `\nThe sign-in server must serve this in its OAuth metadata (RFC 8414):\n  ${metadata.url}\n\n` +
    metadata.json.replace(/^/gm, '  ').trimEnd() +
    `\n\nIt must also list ${metadata.requiredEndpoints.join(', ')}.\n`;
  if (args.metadata) {
    out(metadata.json);
    return 0;
  }
  if (typeof args.out === 'string') {
    await writeFile(args.out, json, 'utf8');
    err(`wrote ${args.out}: publish it at https://${result.document.organization.domain}/.well-known/poppy.json\n`);
  } else {
    out(json);
  }
  err(snippet);
  return 0;
}

async function version() {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  return pkg.version;
}

async function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  if (args.version) {
    out((await version()) + '\n');
    return 0;
  }
  if (args.help || !cmd) {
    (args.help ? out : err)(HELP);
    return args.help ? 0 : 2;
  }
  if (cmd === 'check') return cmdCheck(args);
  if (cmd === 'validate') return cmdValidate(args);
  if (cmd === 'init') return cmdInit(args);
  throw new UsageError(`unknown command: ${cmd} (try --help)`);
}

// exitCode, not exit(): a piped stdout must drain before the process ends.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    err(`error: ${e && e.message ? e.message : e}\n`);
    process.exitCode = e instanceof UsageError ? 2 : 1;
  },
);
