import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../src/landing.js'), 'utf8');
const tpl = fs.readFileSync(path.join(here, '../world-shell.template.html'), 'utf8');

test('Museum Passport is local-first and contains no identity fields', () => {
  assert.match(src, /readPassportState/);
  assert.match(src, /savePassportState\(passport\)/);
  for (const forbidden of ['email', 'phone', 'address', 'birthdate']) {
    assert.ok(!new RegExp(`passport\\.${forbidden}\\b`).test(src), forbidden);
  }
});

test('Museum Passport supports discovery progress and return resume', () => {
  assert.match(src, /function discover\(p\)/);
  assert.match(src, /passport\.discoveries\.push/);
  assert.match(src, /function savePose\(\)/);
  assert.match(src, /passport\.discoveries\.push/);
  assert.doesNotMatch(tpl, /id="passportBtn"|id="passportCount"/);
  assert.doesNotMatch(tpl, />Passport\b|>Studio<|>Compare<|>Archive<|id="shareBtn"/);
  assert.match(tpl,/id="backKonaBtn"/);
  assert.match(tpl,/id="worldMoreBtn"/);
});
