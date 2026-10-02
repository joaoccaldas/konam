import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const tpl = fs.readFileSync(path.join(root, 'web/landing.template.html'), 'utf8');
const install = fs.readFileSync(path.join(root,'web/src/ui/install.js'),'utf8');
const appShell = fs.readFileSync(path.join(root, 'web/src/app-shell.js'), 'utf8');

test('mobile app manifest is installable and standalone', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(manifest.icons.some(icon => /icon-v3\.svg$/.test(icon.src)));
});

test('consumer landing wires one truthful install experience', () => {
  assert.match(tpl, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(tpl, /apple-mobile-web-app-capable/);
  assert.match(tpl, /id="entryInstall"/);
  assert.doesNotMatch(tpl, /data-pwa-action/);
  assert.match(install, /ensureInstallSheet/);
  assert.match(install, /beforeinstallprompt/);
  assert.match(install, /data-pwa-action/);
  assert.match(install, /prompt\.prompt/);
  assert.match(appShell, /app\/android-version\.json/);
  assert.match(install,/initInstall/);
  assert.match(appShell,/initInstall/);
  assert.match(appShell, /serviceWorker\.register\('sw\.js', \{ scope: '\.\/', updateViaCache: 'none' \}\)/);
});

test('sealed service worker verifies release files and keeps GLBs out of the core shell', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app/app-manifest.json'), 'utf8'));
  assert.ok(app.version && app.files && app.core?.length);
  assert.ok(app.core.every(p => !/\.glb$/i.test(p)));
  assert.ok(app.core.includes('app/kona-core.js') && app.core.includes('app/entry-data.json') && app.core.includes('integrations/public-catalog.json'));

  const builder = fs.readFileSync(path.join(root,'tools/build_app.mjs'),'utf8');
  assert.match(builder,/['"]app\/viewport\.js['"]/,'manifest builder must seal viewport runtime');
  for(const css of ['web/styles/home.css','web/styles/garage.css','web/styles/race-self.css','web/styles/companion.css']){
    assert.ok(builder.includes("'"+css+"'"),css+' should be offline-ready without eager DOM import');
  }

  assert.ok(!app.core.includes('app/museum-data.js') && app.files['app/museum-data.js']);
  assert.ok(!app.core.includes('app/hall.js') && app.files['app/hall.js']);
  assert.ok(!app.core.includes('app/race-self-stage.js') && app.files['app/race-self-stage.js']);
  assert.ok(!app.core.includes('app/world-shell.html') && app.files['app/world-shell.html']);
  assert.ok(app.files['app/studio.js'] && app.files['app/studio-catalog.js']);

  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const coreJs = fs.readFileSync(path.join(root, 'app/kona-core.js'), 'utf8');
  assert.match(index, /src="app\/kona-core\.js"/);
  assert.doesNotMatch(index, /src="app\/hall\.js"/);
  assert.match(coreJs, /app\/hall\.js/);
  assert.ok(coreJs.length < 240000, 'the entry bundle pulled in Three.js/world runtime');
  assert.doesNotMatch(coreJs,/WebGLRenderer|GLTFLoader|OrbitControls/);
  assert.doesNotMatch(index, /window\.__PIECES=/);
  assert.ok(index.length < 250000, `index.html grew back to ${(index.length / 1024).toFixed(0)} kB`);
  assert.match(sw, /fetchVerified/);
  assert.match(sw, /integrity mismatch/);
  assert.match(sw, /speedmax-core-/);
});

test('installed apps pick up verified new versions and every public icon exists', () => {
  assert.match(appShell, /visibilitychange/);
  assert.match(sw, /skip-waiting/);
  assert.match(sw, /type: 'version'/);
  const manifest = JSON.parse(fs.readFileSync(path.join(here, '../../manifest.webmanifest'), 'utf8'));
  for (const i of manifest.icons) assert.ok(fs.existsSync(path.join(here, '../..', i.src)), i.src);
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable' && /-v\d+-/.test(i.src)));
  for (const template of ['web/landing.template.html', 'web/studio.template.html', 'web/experience.template.html']) {
    const html = fs.readFileSync(path.join(root, template), 'utf8');
    for (const m of html.matchAll(/<(?:link)[^>]+href="([^"]+)"/g)) {
      const href = m[1];
      if (/^(?:https?:|data:|#)/.test(href) || !/\.(?:svg|png)$/i.test(href)) continue;
      assert.ok(fs.existsSync(path.join(root, href.replace(/^\.\//, ''))), `${template}: ${href}`);
    }
  }
});

test('Experiences and app Passport share canonical storage', () => {
  const passport=fs.readFileSync(path.join(root,'web/src/passport.js'),'utf8');
  assert.match(passport,/readPassportState\(\)/);
  assert.match(passport,/savePassportState\(s\)/);
  assert.doesNotMatch(passport,/localStorage\.(?:getItem|setItem)\(['"]speedmax\.passport/);
});

test('Three.js runtime does not use the removed PCFSoftShadowMap constant', () => {
  const files = fs.readdirSync(path.join(root, 'web/src'), { recursive: true }).filter(f => /\.m?js$/.test(f));
  const src = files.map(f => fs.readFileSync(path.join(root, 'web/src', f), 'utf8')).join('\n');
  assert.doesNotMatch(src, /PCFSoftShadowMap/);
});
