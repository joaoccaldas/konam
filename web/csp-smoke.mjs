// Loads every published page under its Content-Security-Policy and reports violations, page errors and missing metadata.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
for (const u of ['index.html', 'Canyon_Collection.html', 'Speedmax_Museum.html', 'Speedmax_SLX_Museum.html', 'Speedmax_2007_Museum.html', 'Speedmax_Three_2005_Museum.html', 'Speedmax_AL_2011_Museum.html', 'Speedmax_CF_2011_Museum.html']) {
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message.slice(0, 120))); p.on('console', m => { if (m.type() === 'error' || /Content Security Policy|Refused/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await p.evaluateOnNewDocument(() => document.addEventListener('securitypolicyviolation', e => console.error('CSP ' + e.violatedDirective + ' ' + e.blockedURI)));
  await p.goto('http://127.0.0.1:8747/' + u, { waitUntil: 'load', timeout: 120000 }); await new Promise(r => setTimeout(r, 9000));
  if (u === 'index.html') { await p.evaluate(() => { window.__museum.enter(); window.__museum.visitWyld(window.__museum.wyldBikes[0]); }); await new Promise(r => setTimeout(r, 9000)); }
  const ok = await p.evaluate(() => ({ canvas: !!document.querySelector('canvas'), ld: !!document.querySelector('script[type="application/ld+json"]'), csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]') }));
  console.log(u, JSON.stringify(ok), errs.length ? 'ERRORS: ' + [...new Set(errs)].join(' | ') : 'clean');
  await p.close();
}
await b.close();
