// tools/verify_museum.mjs — screenshot verification of the rebuilt museum.
import puppeteer from '../web/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'output/verify');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const shots = [];
try {
  // 1. Landing page desktop
  {
    const p = await browser.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.setViewport({ width: 1512, height: 982 });
    await p.goto('file://' + path.join(root, 'Canyon_Collection.html'), { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1500));
    await p.screenshot({ path: path.join(out, 'landing-desktop.png'), fullPage: true });
    const cards = await p.$$eval('.bike-card', els => els.length);
    const wings = await p.evaluate(() => ({ modern: document.querySelectorAll('#wing-modern-body .wing-card').length, heritage: document.querySelectorAll('#wing-heritage-body .wing-card').length, metrics: document.querySelectorAll('.hero-metrics b').length }));
    shots.push(`landing-desktop: cards=${cards} wings=${JSON.stringify(wings)} errors=${errors.length}`);
    await p.close();
  }
  // 2. Landing mobile
  {
    const p = await browser.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await p.goto('file://' + path.join(root, 'Canyon_Collection.html'), { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({ path: path.join(out, 'landing-mobile.png') });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    shots.push(`landing-mobile: h-overflow=${overflow} errors=${errors.length}`);
    await p.close();
  }
  // 3. CFR exhibit + Wyld skin
  {
    const p = await browser.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.setViewport({ width: 1512, height: 982 });
    await p.goto('file://' + path.join(root, 'Speedmax_Museum.html'), { waitUntil: 'load' });
    await p.waitForFunction(() => document.body.classList.contains('ready'), { timeout: 60000 }).catch(() => shots.push('CFR: ready timeout'));
    await new Promise(r => setTimeout(r, 2500));
    await p.screenshot({ path: path.join(out, 'cfr-default.png') });
    // open customize drawer, apply Wyld preset
    await p.locator('[data-drawer="build"]').click();
    await new Promise(r => setTimeout(r, 900));
    await p.evaluate(() => { const b = [...document.querySelectorAll('[data-preset]')].find(b => b.dataset.preset === 'wyld'); b?.click(); });
    await new Promise(r => setTimeout(r, 1500));
    await p.screenshot({ path: path.join(out, 'cfr-wyld.png') });
    // no-rider + no-fit-button assertion
    const state = await p.evaluate(() => ({
      riderPill: !!document.querySelector('#riderOpen'),
      wyldCtl: !!window.__sm,
      cfgWyld: !!(window.__sm && window.__collection === undefined ? false : false),
      label: document.querySelector('#presets [data-preset=wyld] strong')?.textContent,
    }));
    shots.push(`cfr: riderPill=${state.riderPill} wyldPreset="${state.label}" errors=${errors.length}${errors.length ? ' :: ' + errors.slice(0, 2).join(' | ') : ''}`);
    // 4. Aero lab (tunnel) — rider must NOT appear
    await p.evaluate(() => window.__sm.lab.open());
    await new Promise(r => setTimeout(r, 2500));
    await p.screenshot({ path: path.join(out, 'cfr-aerolab.png') });
    await p.close();
  }
} finally { await browser.close(); }
console.log(shots.join('\n'));