import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { decodeForScan, PERSONAL_PATTERNS, isExcepted } from '../../tools/lib/privacy-patterns.mjs';

const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const kind = k => PERSONAL_PATTERNS.find(([n]) => n === k)[1];
const at = '@';

// Runs the real repository scanner in a throwaway git repository holding only `files`.
function scan(files, exceptions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-scan-'));
  fs.mkdirSync(path.join(dir, 'tools/lib'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'tools/scan_private_data.mjs'), path.join(dir, 'tools/scan_private_data.mjs'));
  fs.copyFileSync(path.join(repo, 'tools/lib/privacy-patterns.mjs'), path.join(dir, 'tools/lib/privacy-patterns.mjs'));
  if (exceptions) fs.writeFileSync(path.join(dir, 'config/privacy-exceptions.json'), JSON.stringify({ schema_version: 1, exceptions }));
  for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  const r = spawnSync(process.execPath, ['tools/scan_private_data.mjs'], { cwd: dir, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}
const exception = { file: 'page.html', kind: 'personal-email', value: `project${at}gmail.com`, reason: 'test', approved_by: 'test' };

test('an HTML-entity or percent-encoded Gmail address is decoded and caught', () => {
  assert.match(decodeForScan('mailto:someone&#64;gmail.com'), kind('personal-email'));
  assert.match(decodeForScan('someone&#x40;gmail.com'), kind('personal-email'));
  assert.match(decodeForScan('someone&commat;gmail.com'), kind('personal-email'));
  assert.match(decodeForScan('someone%40gmail.com'), kind('personal-email'));
  const r = scan({ 'page.html': '<a href="mailto:someone&#64;gmail.com">mail</a>\n' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /page\.html:1: personal-email/);
});

test('a declared exception passes, but only for its exact value and file', () => {
  assert.equal(scan({ 'page.html': `<a href="mailto:project${at}gmail.com">mail</a>\n` }, [exception]).status, 0);
  const other = scan({ 'page.html': `project${at}gmail.com and other${at}gmail.com\n` }, [exception]);
  assert.equal(other.status, 1, 'a second address on an excepted line is still a finding');
  assert.equal(isExcepted([exception], { file: 'elsewhere.html', kind: 'personal-email', line: `project${at}gmail.com`, re: kind('personal-email') }), false);
});

test('an unused exception fails the scan', () => {
  const r = scan({ 'page.html': 'no contact here\n' }, [exception]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unused-exception:page\.html:personal-email/);
});

test('home-relative workstation paths and private knowledge references are caught', () => {
  assert.match('cd ~/Developer/some-repo', kind('workstation-path'));
  assert.match('`~/Projects/x/y.js`', kind('workstation-path'));
  assert.match('Knowledge-hub evidence `' + 'a'.repeat(64) + '`', kind('private-knowledge-ref'));
  assert.doesNotMatch('cd <repo-root>', kind('workstation-path'));
  const r = scan({ 'notes.md': 'Run from ~/Developer/some-repo\n' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /notes\.md:1: workstation-path/);
});

test('the repository itself passes the private-data scan', () => {
  const r = spawnSync(process.execPath, ['tools/scan_private_data.mjs'], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
