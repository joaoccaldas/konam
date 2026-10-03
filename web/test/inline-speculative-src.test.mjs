import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Chromium's speculative HTML parser can read `<img src="${...}">` inside an inline
// <script> as markup and request the literal URL before the script runs. Inline
// templates must emit data-kona-src and hydrate after insertion (web/src/engine/dom.js).
const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const shipped = execFileSync('git', ['ls-files', '*.html'], { cwd: repo, encoding: 'utf8' }).split('\n')
  .filter(f => f && !/^(docs|review)\/|\/reference\//.test(f));

test('no shipped HTML page carries a template-literal src inside an inline script', () => {
  const offenders = [];
  for (const f of shipped) {
    const html = fs.readFileSync(path.join(repo, f), 'utf8');
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc=\\?["']?\$\{/.test(m[1])) offenders.push(f);
    }
  }
  assert.deepEqual([...new Set(offenders)], []);
});

test('History Lane and Collection templates defer image sources', () => {
  for (const f of ['web/src/exp/main.js', 'web/src/collection.js']) {
    const src = fs.readFileSync(path.join(repo, f), 'utf8');
    assert.doesNotMatch(src, /<img[^>]*\ssrc="\$\{/, f);
    assert.match(src, /deferredSrc\(/, f);
    assert.match(src, /hydrateImages\(/, f);
  }
});
