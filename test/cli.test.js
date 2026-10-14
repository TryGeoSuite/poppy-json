// The CLI: argument parsing, and the commands that need no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, initInput, targetHost } from '../src/input.js';
import { validatePoppyDocument } from '../src/check.js';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'bin', 'cli.js');
const fixture = (name) => join(here, 'fixtures', name);

function run(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr });
    });
  });
}

test('parseArgs: --flag value and --flag=value, repeatable and boolean flags', () => {
  const a = parseArgs(['init', '--name', 'Acme Inc', '--domain=acme.com', '--mcp', 'https://a/1', '--mcp=https://a/2', '--json', '--metadata', 'x']);
  assert.deepEqual(a._, ['init', 'x']);
  assert.equal(a.name, 'Acme Inc');
  assert.equal(a.domain, 'acme.com');
  assert.deepEqual(a.mcp, ['https://a/1', 'https://a/2']);
  assert.equal(a.json, true);
  assert.equal(a.metadata, true);
});

test('parseArgs: short flags, and a value flag left without a value', () => {
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['-v']).version, true);
  assert.equal(parseArgs(['init', '--name', '--domain', 'acme.com']).name, true);
  assert.equal(parseArgs(['--json=false']).json, false);
});

test('initInput: maps flags to the generator input', () => {
  const input = initInput(parseArgs(['init', '--name', 'Acme', '--domain', 'acme.com', '--issuer', 'https://auth.acme.com', '--mcp', 'https://acme.com/mcp', '--mcp-description', 'Orders', '--openapi', 'https://acme.com/openapi.json', '--agent', 'https://acme.com/c', '--browser', 'https://acme.com/b', '--sign-in', 'direct,device', '--scopes', 'poppy:read']));
  assert.deepEqual(input.apis, [
    { type: 'mcp', url: 'https://acme.com/mcp', description: 'Orders' },
    { type: 'openapi', url: 'https://acme.com/openapi.json', description: undefined },
  ]);
  assert.deepEqual(input.signIn, ['direct', 'device']);
  assert.deepEqual(input.scopes, ['poppy:read']);
  assert.equal(input.agentEndpoint, 'https://acme.com/c');
  assert.equal(input.browserSessionEndpoint, 'https://acme.com/b');
});

test('initInput: --mediated alone adds mediated sign-in next to direct', () => {
  const input = initInput(parseArgs(['init', '--mediated', 'https://auth.acme.com/in']));
  assert.deepEqual(input.signIn, ['direct', 'mediated']);
  assert.equal(input.mediatedEndpoint, 'https://auth.acme.com/in');
});

test('targetHost: public hosts only', () => {
  assert.equal(targetHost('https://www.Acme.com/x?y'), 'www.acme.com');
  assert.equal(targetHost('acme.com'), 'acme.com');
  for (const bad of ['', 'localhost', '127.0.0.1', 'acme.com:8080', 'printer.local', 'ftp://', 'not a host']) {
    assert.equal(targetHost(bad), null, bad);
  }
});

test('cli: --help exits 0, no command exits 2, --version prints the package version', async () => {
  const help = await run(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Personal Agent Protocol/);
  assert.equal((await run([])).code, 2);
  const pkg = JSON.parse(await readFile(join(here, '..', 'package.json'), 'utf8'));
  assert.equal((await run(['--version'])).stdout.trim(), pkg.version);
  assert.equal((await run(['frobnicate'])).code, 2);
});

test('cli init: prints a valid poppy.json, the issuer snippet on stderr', async () => {
  const r = await run(['init', '--name', 'Acme', '--domain', 'acme.com', '--issuer', 'https://auth.acme.com', '--mcp', 'https://acme.com/mcp']);
  assert.equal(r.code, 0, r.stderr);
  const doc = JSON.parse(r.stdout);
  assert.equal(validatePoppyDocument(doc, 'acme.com').valid, true);
  assert.match(r.stderr, /https:\/\/auth\.acme\.com\/\.well-known\/oauth-authorization-server/);
  assert.match(r.stderr, /"poppy_domains"/);
});

test('cli init --metadata: only the issuer snippet, as JSON', async () => {
  const r = await run(['init', '--name', 'Acme', '--domain', 'acme.com', '--issuer', 'https://auth.acme.com', '--agent', 'https://acme.com/c', '--metadata']);
  assert.deepEqual(JSON.parse(r.stdout), { issuer: 'https://auth.acme.com', poppy_domains: ['acme.com'] });
});

test('cli init --out writes the file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'poppy-json-'));
  const file = join(dir, 'poppy.json');
  const r = await run(['init', '--name', 'Acme', '--domain', 'acme.com', '--issuer', 'https://auth.acme.com', '--browser', 'https://acme.com/b', '--out', file]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, '');
  assert.equal(JSON.parse(await readFile(file, 'utf8')).web.browser_session_endpoint, 'https://acme.com/b');
});

test('cli init: bad input is a usage error with a readable message', async () => {
  const r = await run(['init', '--name', 'Acme', '--domain', 'acme.com', '--issuer', 'https://auth.acme.com']);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /at least one channel/);
  assert.equal((await run(['init', '--name'])).code, 2);
});

test('cli validate: a good file exits 0, a broken one exits 1 with the codes', async () => {
  const good = await run(['validate', fixture('poppy-valid.json'), '--domain', 'acme.com']);
  assert.equal(good.code, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /valid/);
  const wrongDomain = await run(['validate', fixture('poppy-valid.json'), '--domain', 'other.com']);
  assert.equal(wrongDomain.code, 1);
  assert.match(wrongDomain.stdout, /domain_mismatch/);
  const bad = await run(['validate', fixture('poppy-invalid.json'), '--domain', 'acme.com', '--json']);
  assert.equal(bad.code, 1);
  assert.deepEqual(JSON.parse(bad.stdout).issues, ['missing_auth_issuer']);
});

test('cli validate: --domain defaults to the file own domain', async () => {
  const r = await run(['validate', fixture('poppy-valid.json')]);
  assert.equal(r.code, 0);
  assert.match(r.stderr, /no --domain given/);
});

test('cli validate --metadata-file: checks the issuer metadata too', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'poppy-json-'));
  const meta = join(dir, 'meta.json');
  await writeFile(meta, JSON.stringify({ issuer: 'https://auth.acme.com', poppy_domains: ['other.com'] }));
  const r = await run(['validate', fixture('poppy-valid.json'), '--domain', 'acme.com', '--metadata-file', meta]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /domain_not_in_issuer/);
});

test('cli validate: not JSON, or a missing file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'poppy-json-'));
  const notJson = join(dir, 'p.json');
  await writeFile(notJson, '<!doctype html>');
  assert.equal((await run(['validate', notJson, '--domain', 'acme.com'])).code, 1);
  assert.equal((await run(['validate', join(dir, 'nope.json')])).code, 2);
  assert.equal((await run(['validate'])).code, 2);
});

test('cli check: refuses what is not a public host, before any network', async () => {
  assert.equal((await run(['check', 'localhost'])).code, 2);
  assert.equal((await run(['check'])).code, 2);
});
