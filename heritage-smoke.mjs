// Browser check for heritage exhibit pages: node heritage-smoke.mjs <page.html> [<page.html> ...]
import puppeteer from 'puppeteer-core';
import path from 'path';
import assert from 'assert';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.join(here, '..');
const pages = process.argv.slice(2);
if (!pages.length) throw new Error('pass at least one exhibit HTML');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const report = [];
try {
  for (const page of pages) for (const [name, width, height] of [['desktop', 1512, 982], ['mobile', 390, 844]]) {
    const p = await browser.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.setViewport({ width, height, deviceScaleFactor: 1, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
    await p.goto('file://' + path.resolve(root, page));
    await p.waitForFunction(() => document.body.classList.contains('ready'), { timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
    const r = await p.evaluate(() => ({ parts: window.__heritage.parts.length, overflow: document.documentElement.scrollWidth > innerWidth,
      title: document.title, frame: window.__heritage.parts.includes('frame') }));
    assert.equal(r.overflow, false, page + ' overflows at ' + width);
    assert.ok(r.frame && r.parts > 20, page + ' model parts missing');
    assert.deepEqual(errors, [], page + ' errors');
    const shot = path.join(root, 'output/playwright', path.basename(page, '.html') + '-' + name + '.png');
    await p.screenshot({ path: shot });
    report.push({ page, name, ...r, errors, shot });
    await p.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(report, null, 2));
