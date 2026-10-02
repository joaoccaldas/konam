import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
test('Android nested bundle ships the sealed public release without native sources or a service worker', () => {
  execFileSync(process.execPath, ['app/native/scripts/build-www.mjs'], {
    cwd: root, env: { ...process.env, SPEEDMAX_VERSION_CODE: '42', SPEEDMAX_VERSION_NAME: '1.42<script>' }, stdio: 'pipe'
  });
  const www = path.join(root, 'app/native/www');
  const manifest = JSON.parse(fs.readFileSync(path.join(www, 'app/app-manifest.json')));
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const file = path.join(www, rel);
    if (rel === 'sw.js') { assert.equal(fs.existsSync(file), false); continue; }
    assert.equal(fs.existsSync(file), true, rel + ' is bundled');
    if (rel !== 'index.html') assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('base64'), expected, rel + ' is unmodified');
  }
  const index = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
  assert.match(index, /window\.__NATIVE=\{"versionCode":42,"versionName":"1\.42script"\}/);
  assert.equal(fs.existsSync(path.join(www, 'app/native')), false);
  assert.equal(fs.existsSync(path.join(www, 'web/src')), false);
  assert.equal(fs.existsSync(path.join(www, 'assets/reference/canyon')), false);
  assert.equal(fs.existsSync(path.join(www, 'tools')), false);
  assert.equal(fs.existsSync(path.join(www, '.git')), false);
});
