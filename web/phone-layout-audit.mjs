// Phone layout audit: every fixed UI element must sit inside the viewport, never overlap another, never overflow its text.
// usage: node phone-layout-audit.mjs [url] [outDir]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://127.0.0.1:8747/index.html', out = process.argv[3] || '';
const PHONES = [['se-1st', 320, 568], ['galaxy-fold', 280, 653], ['android-small', 360, 640], ['iphone-se', 375, 667], ['iphone-14', 390, 844],
  ['pixel-7', 412, 915], ['iphone-pro-max', 430, 932], ['landscape-iphone', 844, 390], ['landscape-small', 667, 375], ['tablet', 768, 1024]];
const W = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
let fails = 0;
for (const [name, w, h] of PHONES) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url, { waitUntil: 'load', timeout: 120000 }); await W(7000);
  const states = [['landing', null], ['walk', () => window.__museum.enter()], ['card', () => window.__museum.visitWyld(window.__museum.wyldBikes[0])], ['champ', () => window.__museum.visitChamp(window.__museum.champs[0])]];
  for (const [st, fn] of states) {
    if (fn) { await p.evaluate(fn); await W(st === 'walk' ? 1500 : 9000); }
    await p.evaluate(() => document.querySelectorAll('#coach').forEach(c => { c.style.display = 'none'; }));   // onboarding coach is transient
    const r = await p.evaluate(() => {
      const vw = innerWidth, vh = innerHeight, issues = [];
      if (document.documentElement.scrollWidth > vw + 1) issues.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
      const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
      const ids = ['brand', 'topbar', 'top', 'rail', 'joy', 'card', 'tourPill', 'nearby', 'toast', 'hero', 'intro'];
      const els = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return (s.position === 'fixed' || ids.includes(e.id)) && vis(e); });
      const box = e => e.getBoundingClientRect();
      for (const e of els) { const r = box(e); const n = e.id || e.className?.toString().slice(0, 30) || e.tagName;
        const fullyOff = r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh;          // parked off-screen on purpose (closed card, hidden pill)
        if (!fullyOff && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) issues.push(`${n} off-screen [${[r.left, r.top, r.right, r.bottom].map(Math.round)}]`); }
      const onScreen = e => { const r = box(e); return r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh; };
      const named = els.filter(onScreen).filter(e => e.id && ['rail', 'joy', 'card', 'tourPill', 'nearby'].includes(e.id) || e.matches?.('header, .top, #top, #brand, .brand, .actions'));
      for (let i = 0; i < named.length; i++) for (let j = i + 1; j < named.length; j++) { const a = box(named[i]), c = box(named[j]);
        if (named[i].contains(named[j]) || named[j].contains(named[i])) continue;
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ox > 4 && oy > 4) issues.push(`overlap ${named[i].id || named[i].className} × ${named[j].id || named[j].className} (${Math.round(ox)}×${Math.round(oy)})`); }
      for (const e of document.querySelectorAll('button, .btn, .chip b, h1, h2, #card p')) if (vis(e) && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'auto' && e.closest('#railInner') == null) issues.push(`text overflows ${e.id || e.className || e.tagName}: "${e.textContent.trim().slice(0, 24)}"`);
      for (const e of document.querySelectorAll('button, a.btn, .chip')) if (vis(e)) { const r = box(e); if ((r.height < 40 || r.width < 40) && r.bottom > 0 && r.top < vh && !e.closest('#railInner')) issues.push(`small tap target ${e.id || e.className}: ${Math.round(r.width)}×${Math.round(r.height)}`); }
      return issues;
    });
    if (out) await p.screenshot({ path: `${out}/ph_${name}_${st}.png` });
    if (r.length || errs.length) fails++;
    console.log(`${name} ${w}x${h} ${st}: ${r.length || errs.length ? 'ISSUES ' + [...new Set(r)].concat(errs).join(' | ') : 'ok'}`);
  }
  await p.close();
}
await b.close(); console.log(fails ? `FAIL ${fails}` : 'ALL OK'); process.exitCode = fails ? 1 : 0;
