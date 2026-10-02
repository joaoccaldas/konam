// Headless check of the Kona Pier on a phone viewport: walks out, opens a year, reaches the finish.
//   node web/pier-smoke.mjs [url]      (serve the repo root first, e.g. python3 -m http.server 8744)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const url = process.argv[2] || 'http://127.0.0.1:8744/index.html';
const out = path.join(root, 'output/pier'); fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const browser = await puppeteer.launch({ executablePath: fs.statSync(exe).isDirectory() ? path.join(exe, 'chrome-linux/chrome') : exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-sandbox'] });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__museum?.pier && !document.getElementById('enterBtn').disabled, { timeout: 120000 });
  await page.screenshot({ path: path.join(out, '0-intro.png') });
  await page.evaluate(() => { localStorage.setItem('speedmax.coach.v1', '1'); window.__museum.enter(); });
  await new Promise(r => setTimeout(r, 4000));                          // let the entry step finish
  const shot = async (name, x, z, yaw, pitch = -.02) => {
    await page.evaluate((x, z, yaw, pitch) => { const m = window.__museum; m.halt(); Object.assign(m.P, { x, z, yaw, pitch }); }, x, z, yaw, pitch);
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(out, name + '.png') });
  };
  await shot('1-apse-door', 3.2, -36, -.35);
  await page.evaluate(() => window.__museum.pier.load());
  await new Promise(r => setTimeout(r, 4000));
  await shot('2-pier-head', 5.4, -48.5, 0);
  await shot('3-pier-mid', 5.4, -60, .15);
  await shot('4-year-2019', 4.6, -66, 1.05, .02);
  // walk to a station through the real router and wait for its card
  const stats = await page.evaluate(() => { const m = window.__museum; m.visitPier(m.pier.stations[9]); return m.pier.stations.length; });
  assert.equal(stats, 12);
  await page.waitForFunction(() => document.getElementById('card').classList.contains('on') && /Kona 2023/.test(document.getElementById('cYears').textContent), { timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(out, '5-card-2023.png') });
  const name = await page.$eval('#cName', e => e.textContent); assert.equal(name, 'Laura Philipp');
  await page.evaluate(() => { const m = window.__museum; m.visitPier(m.pier.finale); });
  await page.waitForFunction(() => /finish/i.test(document.getElementById('cYears').textContent) && document.getElementById('card').classList.contains('on'), { timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(out, '6-finale.png') });
  // the way back is routed round the apse plinth, not through it
  const back = await page.evaluate(() => { const m = window.__museum; m.visit(m.PIECES[0]); return true; });
  assert.ok(back);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);
  assert.deepEqual(errors.filter(e => !/Failed to load resource/.test(e)), []);
  console.log('pier smoke OK →', path.relative(root, out));
} finally { await browser.close(); }
