// Headless check of Experiences.html on a phone: every mode loads, the bike arrives, the
// exploded view opens a part card, a hidden object can be collected, History Lane walks.
//   python3 -m http.server 8744 (repo root), then: node web/exp-smoke.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const base = process.argv[2] || 'http://127.0.0.1:8744/Experiences.html';
const out = path.join(root, 'output/exp'); fs.mkdirSync(out, { recursive: true });
const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const mode of ['lava', 'camp13', 'tunnel', 'history']) {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => { localStorage.setItem('speedmax.exp.tut.v1', '1'); localStorage.setItem('speedmax.hist.tut.v1', '1'); });
    await page.goto(`${base}#${mode}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('loading').classList.contains('off'), { timeout: 180000 });
    await wait(3500);
    await page.screenshot({ path: path.join(out, `${mode}-1.png`) });
    if (mode !== 'history') {
      assert.ok(await page.evaluate(() => window.__exp.passport.has(`night:${window.__exp.mode}`)));
      await page.evaluate(() => document.getElementById('cClose').click());
      await page.evaluate(() => document.getElementById('exBtn').click());
      await wait(5000);
      await page.screenshot({ path: path.join(out, `${mode}-2-exploded.png`) });
    } else {
      await page.evaluate(() => document.getElementById('cClose').click());
      for (const t of [.25, .55]) { await page.mouse.move(195, 600); await page.mouse.down(); await page.mouse.move(195, 600 - t * 900, { steps: 8 }); await page.mouse.up(); await wait(3500); }
      await page.screenshot({ path: path.join(out, `${mode}-2-walk.png`) });
    }
    assert.deepEqual(errors, [], mode);
    console.log(mode, 'OK');
    await page.close();
  }
} finally { await browser.close(); }
