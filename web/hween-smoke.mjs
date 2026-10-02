// Headless check of Lava Night (the Halloween room) on a phone viewport.
//   python3 -m http.server 8744 (repo root), then: node web/hween-smoke.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const url = process.argv[2] || 'http://127.0.0.1:8744/index.html';
const out = path.join(root, 'output/hween'); fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (/warn|error/.test(m.type()) && !/Failed to load resource/.test(m.text())) console.log('console:', m.text()); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__museum?.hween && !document.getElementById('enterBtn').disabled, { timeout: 120000 });
  await page.evaluate(() => { localStorage.setItem('speedmax.coach.v1', '1'); window.__museum.enter(); });
  await page.waitForFunction(() => window.__museum.hween.piece.bike, { timeout: 400000 });
  const shot = async (name, x, z, yaw, pitch = -.05) => {
    await page.evaluate((x, z, yaw, pitch) => { const m = window.__museum; m.halt(); Object.assign(m.P, { x, z, yaw, pitch }); }, x, z, yaw, pitch);
    await new Promise(r => setTimeout(r, 2500)); await page.screenshot({ path: path.join(out, name + '.png') });
  };
  await shot('1-hall-door', -2.5, 3.2, 1.25);
  await shot('2-inside', -8.4, 2.6, 1.45, -.12);
  await shot('3-moon', -10.5, -3.2, 1.2, .05);
  await page.evaluate(() => window.__museum.visitHween());
  await page.waitForFunction(() => /Lava Night/.test(document.getElementById('cYears').textContent) && document.getElementById('card').classList.contains('on'), { timeout: 90000 });
  await new Promise(r => setTimeout(r, 1500)); await page.screenshot({ path: path.join(out, '4-card.png') });
  assert.deepEqual(errors, []);
  console.log('lava night smoke OK → output/hween');
} finally { await browser.close(); }
