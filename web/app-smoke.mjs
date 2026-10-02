// Checks the installable app: the service worker installs, the museum reopens offline, and a
// release whose files don't match their SHA-256 is refused (the old version stays).
//   python3 -m http.server 8744 (repo root), then: node web/app-smoke.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const base = process.argv[2] || 'http://127.0.0.1:8744/';
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 300000, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const swPath = path.join(root, 'sw.js'), original = fs.readFileSync(swPath, 'utf8');
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(base + 'index.html', { waitUntil: 'load', timeout: 180000 });
  const v1 = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return new Promise(res => { navigator.serviceWorker.addEventListener('message', e => res(e.data.version), { once: true }); r.active.postMessage('version'); }); });
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app/app-manifest.json'), 'utf8'));
  assert.equal(v1, manifest.version); console.log('installed release', v1);
  const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys()).find(k => k.startsWith('speedmax-core-')))).keys()).length);
  assert.equal(cached, manifest.core.length);
  // offline: the museum still opens
  await page.reload({ waitUntil: 'load' });                             // now controlled
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'load' });
  assert.ok(await page.$('#hall')); assert.match(await page.title(), /Speedmax/);
  console.log('offline reload OK');
  await page.setOfflineMode(false);
  // a tampered release: index.html's hash no longer matches → install must fail, old worker stays
  fs.writeFileSync(swPath, original.replace(/"index\.html":"[^"]+"/, '"index.html":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="').replace(/const VERSION = '[^']+'/, "const VERSION = 'tampered'"));
  const outcome = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update().catch(() => {});
    const w = reg.installing || reg.waiting; if (!w) return 'no-update-seen';
    if (w.state === 'installed') return 'installed';
    return new Promise(res => w.addEventListener('statechange', () => { if (w.state === 'redundant' || w.state === 'installed') res(w.state); }));
  });
  assert.equal(outcome, 'redundant'); console.log('tampered release refused');
  const still = await page.evaluate(() => new Promise(res => { navigator.serviceWorker.addEventListener('message', e => res(e.data.version), { once: true }); navigator.serviceWorker.controller.postMessage('version'); }));
  assert.equal(still, v1); console.log('app still on', still);
} finally { fs.writeFileSync(swPath, original); await browser.close(); }
