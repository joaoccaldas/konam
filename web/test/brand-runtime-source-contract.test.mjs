import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

const brand = read('docs/BRAND_SYSTEM.md');
const tokens = read('brand/tokens.css');
const themes = read('brand/themes.css');
const artifacts = read('brand/artifacts.css');
const system = read('web/styles/system.css');
const profile = read('web/src/engine/profile.js');
const settings = read('web/src/ui/settings.js');
const shell = read('web/src/ui/kona-shell.js');
const home = read('web/src/ui/home.js');
const me = read('web/src/ui/me.js');
const landingTemplate = read('web/landing.template.html');
const landingBuild = read('web/build_landing.mjs');
const entry = read('web/src/entry.js');
const harden = read('tools/harden_pages.mjs');
const sync = read('.github/workflows/kona-beta-source-rc-sync.yml');

test('BRAND_SYSTEM is the canonical Light Dark Random contract', () => {
  assert.match(brand, /canonical brand and interface contract/i);
  assert.match(brand, /Light/);
  assert.match(brand, /Dark/);
  assert.match(brand, /Random/);
  assert.match(brand, /70% calm/i);
});

test('Random is a persisted appearance mode with one runtime owner', () => {
  assert.match(profile, /'random'/);
  assert.match(settings, /applyBrandMode/);
  assert.match(settings, /\['random','Random'\]/);
  assert.match(shell, /applyBrandMode/);
  assert.match(themes, /data-theme="random"/);
  for (const family of ['lava','ocean','hibiscus','lilac','lime']) assert.match(themes, new RegExp('data-random-family="' + family + '"'));
});

test('semantic brand tokens and artifact grammar are source files', () => {
  for (const token of ['--brand-bg','--brand-surface','--brand-ink','--brand-accent']) assert.match(tokens, new RegExp(token));
  for (const primitive of ['hero','photo','label','spec','bib','map','sticker','film','note']) assert.match(artifacts, new RegExp('artifact--' + primitive));
  assert.match(home, /artifact--hero/);
  assert.match(me, /artifact--label/);
});

test('landing index stays a thin consumer shell and world styles remain lazy', () => {
  assert.doesNotMatch(landingTemplate, /__HALL_WEB_CSS__|__HALL_MOBILE_CSS__/);
  assert.doesNotMatch(landingTemplate, /web\/styles\/hall-(?:web|mobile)\.css/);
  assert.match(landingTemplate, /brand\/tokens\.css/);
  assert.match(landingTemplate, /web\/styles\/components\.css/);
  assert.match(entry, /loadStyle\('web\/styles\/hall-web\.css','museum'\)/);
  assert.match(entry, /loadStyle\('web\/styles\/hall-mobile\.css','museum'\)/);
  assert.match(entry, /link\.disabled=!enabled/);
  assert.match(entry, /kona-panel-open/);
  assert.doesNotMatch(landingBuild, /packCss/);
  assert.doesNotMatch(harden, /<style id="design-system">/);
  assert.match(harden, /brand\/themes\.css/);
  assert.match(system, /#appSheet\{[^}]*env\(safe-area-inset-bottom\)/s);
  assert.doesNotMatch(system, /#appSheet[^\n]*var\(--safe-b\)/);
});

test('deterministic output sync pushes back to the active branch', () => {
  assert.match(sync, /TARGET: \$\{\{ inputs\.target_ref \|\| github\.ref_name \}\}/);
});
