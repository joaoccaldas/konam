// Studio phone audit for My Kona Setup V0.
// Usage: CHROME_PATH=/path/to/chrome node studio-phone-audit.mjs [baseUrl]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://127.0.0.1:8754/';
const candidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);
const executablePath = candidates.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('Chrome/Chromium not found; set CHROME_PATH');

const PHONES = [['320',320,568],['360',360,640],['390',390,844],['430',430,932],['landscape',844,390]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath, headless:'new', args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader'] });
let failures = 0;

for (const [name,w,h] of PHONES) {
  const page = await browser.newPage();
  await page.setViewport({ width:w, height:h, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + 'Studio.html?event=kona-2026', { waitUntil:'load', timeout:120000 });
  await page.waitForFunction(() => window.__studio?.current?.product, { timeout:120000 });
  await page.evaluate(() => window.__studio.saveCurrentToSetup());
  await wait(700);
  await page.evaluate(() => {
    const label=document.querySelector('.setup-slot small');
    if (label) label.textContent='A deliberately long product configuration label that must wrap without hiding the setup actions';
  });

  const issues = await page.evaluate(() => {
    const out = [], vw=innerWidth, vh=innerHeight;
    const setupTab = document.querySelector('[data-tab="setup"]');
    if (!setupTab) out.push('setup tab missing');
    else if (setupTab.getAttribute('aria-selected') !== 'true') out.push('setup tab not selected after save');

    const panel=document.querySelector('#panel');
    const text=panel?.textContent || '';
    for (const expected of ['My Kona Setup','Bike','Wheels','Helmet','Shoes','2 / 4','Share setup'])
      if (!text.includes(expected)) out.push('missing '+expected);

    if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls horizontally');

    const visible = el => {
      const s=getComputedStyle(el), r=el.getBoundingClientRect();
      return s.display!=='none' && s.visibility!=='hidden' && +s.opacity>.05 && r.width>2 && r.height>2;
    };
    const activeTab=document.querySelector('.tabs [aria-selected="true"]');
    if (activeTab) {
      const r=activeTab.getBoundingClientRect();
      if (r.left < -1 || r.right > vw + 1) out.push('active setup tab not horizontally visible');
    }
    for (const el of document.querySelectorAll('.setup-slot,.setup-actions .btn,.tabs button')) {
      if (!visible(el)) continue;
      const r=el.getBoundingClientRect(), n=el.textContent.trim().slice(0,30);
      if (!el.closest('.tabs') && (r.left < -1 || r.right > vw + 1)) out.push(`horizontal overflow ${n}`);
      if (el.matches('button') && (r.height < 40 || r.width < 40)) out.push(`small tap target ${n} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const scroller=panel?.querySelector('.setup-scroll');
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      scroller.scrollTop = scroller.scrollHeight;
      const share=panel.querySelector('button[aria-label="Share My Kona Setup"]');
      if (share) {
        const r=share.getBoundingClientRect(), pr=panel.getBoundingClientRect();
        if (r.left < pr.left - 1 || r.right > pr.right + 1 || r.top < pr.top - 1 || r.bottom > pr.bottom + 1)
          out.push(`share action not reachable after content scroll [${[r.left,r.top,r.right,r.bottom].map(Math.round)}]`);
      }
      scroller.scrollTop = 0;
    }
    const share=document.querySelector('button[aria-label="Share My Kona Setup"]');
    if (share && visible(share)) {
      const sr=share.getBoundingClientRect();
      const pr=panel?.getBoundingClientRect();
      if (pr && (sr.bottom > pr.bottom + 1 || sr.top < pr.top - 1)) out.push('sticky share leaves visible panel');
    }
    const slots=[...document.querySelectorAll('.setup-slot')].filter(visible);
    for (let i=1;i<slots.length;i++) {
      const a=slots[i-1].getBoundingClientRect(), b=slots[i].getBoundingClientRect();
      if (a.bottom > b.top + 1) out.push('setup slots overlap');
    }
    return out;
  });

  const unique=[...new Set([...issues,...errors.filter(e => !/favicon|beforeinstallprompt/i.test(e))])];
  console.log(`${name}px: ${unique.length ? 'FAIL '+unique.join(' | ') : 'ok'}`);
  if (unique.length) failures++;
  await page.close();
}

await browser.close();
console.log(failures ? `FAIL ${failures}` : 'ALL OK');
process.exitCode = failures ? 1 : 0;
