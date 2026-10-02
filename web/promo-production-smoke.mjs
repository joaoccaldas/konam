import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const base=process.argv[2]||'http://127.0.0.1:8754/';
const out=path.resolve(process.argv[3]||path.join(root,'promo-evidence'));
fs.mkdirSync(out,{recursive:true});
const exe=process.env.CHROME_PATH||process.env.CHROME||'/usr/bin/google-chrome';
const vp=process.env.AUDIT_VIEWPORT||'390';
const viewports={
  '320':{width:320,height:740,isMobile:true,hasTouch:true},
  '360':{width:360,height:800,isMobile:true,hasTouch:true},
  '390':{width:390,height:844,isMobile:true,hasTouch:true},
  '430':{width:430,height:932,isMobile:true,hasTouch:true},
  'landscape-phone':{width:844,height:390,isMobile:true,hasTouch:true},
  'desktop':{width:1440,height:900,isMobile:false,hasTouch:false}
};
const cfg=viewports[vp]||viewports['390'];
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push('console: '+m.text())});
  await page.setViewport({...cfg,deviceScaleFactor:1});
  await page.goto(new URL('promo.html',base).href,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForSelector('.promo-hero-product',{visible:true,timeout:30000});
  await new Promise(r=>setTimeout(r,700));

  const brand=await page.evaluate(()=>{
    const css=(sel)=>getComputedStyle(document.querySelector(sel));
    const rect=(sel)=>document.querySelector(sel).getBoundingClientRect();
    const img=(sel)=>{const el=document.querySelector(sel);return {src:el?.getAttribute('src'),w:el?.naturalWidth||0,h:el?.naturalHeight||0}};
    return {
      bodyFont:css('body').fontFamily,
      heroFont:css('.promo-hero h1').fontFamily,
      labelFont:css('.promo-kicker').fontFamily,
      ctaBg:css('.promo-enter').backgroundColor,
      ctaColor:css('.promo-enter').color,
      ctaRect:rect('.promo-enter').toJSON(),
      heroBike:img('.promo-product-bike'),
      heroAthlete:img('.promo-product-athlete'),
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      rewardCount:document.querySelectorAll('.reward-cell').length,
      oldGhost:!!document.querySelector('.promo-bike-ghost'),
      theme:document.documentElement.dataset.theme
    };
  });

  assert.match(brand.bodyFont,/Manrope/i,'body uses Manrope UI authority');
  assert.match(brand.heroFont,/Instrument Serif/i,'hero uses Instrument Serif editorial authority');
  assert.match(brand.labelFont,/Manrope/i,'labels use Manrope');
  assert.equal(brand.ctaBg,'rgb(255, 106, 0)','primary forward CTA uses Kona Sunrise');
  assert.ok(brand.ctaRect.height>=42,'primary header CTA remains usable');
  assert.ok(brand.heroBike.w>100 && brand.heroBike.h>50,'real bike media loaded');
  assert.ok(brand.heroAthlete.w>20 && brand.heroAthlete.h>40,'real athlete media loaded');
  assert.ok(brand.overflow<=1,'no horizontal overflow');
  assert.equal(brand.rewardCount,141,'Founding 141 renders exactly 141 hidden cells');
  assert.equal(brand.oldGhost,false,'prototype SVG bike ghost removed');
  assert.deepEqual(errors,[],'no runtime errors');

  await page.screenshot({path:path.join(out,`${vp}-hero.png`)});

  await page.evaluate(()=>document.querySelector('#why-three-ways')?.scrollIntoView({block:'start'}));
  await new Promise(r=>setTimeout(r,500));
  const railReady=await page.$eval('[data-field-rail]',el=>el.classList.contains('is-ready'));
  assert.equal(railReady,true,'field rail arrives after hero');
  await page.click('[data-rail-toggle]');
  await new Promise(r=>setTimeout(r,450));
  const rail=await page.evaluate(()=>{
    const r=document.querySelector('[data-rail-toggle]').getBoundingClientRect();
    return {open:document.querySelector('[data-field-rail]').classList.contains('is-open'),w:r.width,h:r.height,expanded:document.querySelector('[data-rail-toggle]').getAttribute('aria-expanded')};
  });
  assert.equal(rail.open,true,'field rail opens');
  assert.equal(rail.expanded,'true','field rail aria state correct');
  assert.ok(rail.w>=48 && rail.h>=48,'field rail toggle meets touch target');
  await page.screenshot({path:path.join(out,`${vp}-rail-open.png`)});

  await page.evaluate(()=>document.querySelector('#rewards')?.scrollIntoView({block:'start'}));
  await new Promise(r=>setTimeout(r,650));
  const reward=await page.evaluate(()=>{
    const cells=[...document.querySelectorAll('.reward-cell')];
    const text=document.querySelector('#rewards')?.textContent||'';
    const first=cells[0]?.getBoundingClientRect();
    return {count:cells.length,first:first?{w:first.width,h:first.height}:null,text};
  });
  assert.equal(reward.count,141);
  assert.ok(!/Timing Mat: Swim Out|Body Marking Pen|Coffee Boat/.test(reward.text),'collectible identities stay hidden');
  await page.screenshot({path:path.join(out,`${vp}-rewards.png`)});

  console.log('promo production smoke OK',vp,brand);
}finally{
  await browser.close();
}
