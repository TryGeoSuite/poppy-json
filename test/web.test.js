// The hosted page (web/page.js): it renders in both languages, its inline
// scripts parse, and its words follow the rules the README promises.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../web/page.js';

const LANGS = ['en', 'it'];

const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*ld\+json)(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test('both languages name the standard and the file in title, description and H1', () => {
  for (const lang of LANGS) {
    const html = renderPage(lang);
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/)[1];
    const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
    for (const part of [title, h1, desc]) {
      assert.match(part, /Personal Agent Protocol/, `${lang}: ${part}`);
      assert.match(part, /poppy\.json/, `${lang}: ${part}`);
    }
    assert.match(html, new RegExp(`<html lang="${lang}">`));
  }
});

test('the inline scripts parse, and the inlined generator works on its own', () => {
  for (const lang of LANGS) {
    const scripts = inlineScripts(renderPage(lang));
    assert.equal(scripts.length, 2);
    for (const s of scripts) new Function(s);
    const scope = new Function(`${scripts[0]}; return { CFG, generatePoppy };`)();
    assert.equal(scope.CFG.lang, lang);
    const r = scope.generatePoppy({ name: 'Acme', domain: 'acme.com', issuer: 'https://auth.acme.com', agentEndpoint: 'https://acme.com/c' });
    assert.equal(r.document.protocol_version, '0.1');
  }
});

test('JSON-LD is a SoftwareApplication', () => {
  const ld = JSON.parse(renderPage('en').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld['@type'], 'SoftwareApplication');
  assert.equal(ld.name, 'Poppy Check');
});

test('a shared ?url= is escaped into the form', () => {
  const html = renderPage('en', '"><script>alert(1)</script>');
  assert.ok(!html.includes('"><script>alert(1)'));
  assert.ok(html.includes('value="&quot;&gt;&lt;script&gt;'));
});

test('no long dashes, no claim of being official', () => {
  for (const lang of LANGS) {
    const html = renderPage(lang);
    assert.ok(!html.includes('\u2014'), `${lang}: em dash`);
    assert.ok(!/\bofficial\b|\bufficiale\b/i.test(html), `${lang}: official`);
    assert.match(html, /not affiliated|non affiliato/);
    assert.match(html, /utm_campaign=poppy-check/);
  }
});
