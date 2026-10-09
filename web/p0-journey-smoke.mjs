import puppeteer from 'puppeteer-core';
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8744/';
const exe=process.env.CHROME_PATH||process.env.CHROME||['/opt/pw-browsers/chromium-1194/chrome-linux/chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
if(!exe) throw new Error('Chrome/Chromium required');
const browser=await puppeteer.launch({executablePath:exe,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(30000);
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const requests=[],pageErrors=[];
 page.on('request',r=>requests.push(r.url()));
 page.on('pageerror',e=>pageErrors.push('page:'+String(e?.stack||e)));
 page.on('console',m=>{if(m.type()==='error')pageErrors.push('console:'+m.text())});
 page.on('requestfailed',r=>{const reason=r.failure()?.errorText||'unknown';if(reason==='net::ERR_ABORTED')return;pageErrors.push('requestfailed:'+r.url()+':'+reason);});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const museumHeavy=()=>requests.filter(u=>/app\/hall\.js|app\/museum-data\.js|\.hdr(?:\?|$)/i.test(u));
 const personal3D=()=>requests.filter(u=>/app\/race-self-stage\.js|\.glb(?:\?|$)/i.test(u));
 assert.equal(museumHeavy().length,0,'landing must request zero museum/world assets');
 assert.ok(requests.some(u=>/app\/entry-data\.json/.test(u)),'landing should request only tiny entry event data');

 // First run questions precede avatar setup, and can be skipped without an account.
 await page.click('#buildSelf');
 await page.waitForSelector('[data-onboarding-question]');
 await page.click('[data-onboarding-skip]');
 await page.waitForSelector('.registration-avatar');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'avatar registration must not overflow horizontally');
 assert.match(await page.$eval('.registration-avatar',e=>e.textContent),/TRISUIT LAYOUT/i);
 await page.click('[data-reg-archetype="aero"]');
 await page.click('[data-reg-trisuit="aero-panel"]');
 await page.click('[data-reg-continue]');
 await page.waitForFunction(()=>document.querySelector('.kona-bottom-nav')&&!document.querySelector('#konaPanel').hidden);
 assert.match(await page.$eval('#konaPanelTitle',e=>e.textContent),/Now/i,'first run lands on the calm Now surface');
 assert.equal(museumHeavy().length,0,'Home must not request museum/world assets');

 assert.equal(await page.$('.kona-tour'),null,'first Home must not ambush the user with a tutorial');
 await page.evaluate(async()=>{await window.__konaShell.tour();});
 await page.waitForSelector('.kona-tour');
 assert.match(await page.$eval('.kona-tour',e=>e.textContent),/MAKE IT YOURS|Start with your athlete/i);
 await page.click('[data-tour-skip]');
 await page.waitForFunction(()=>!document.querySelector('.kona-tour'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('kona.onboarding.v1')),'seen');

 await page.evaluate(async()=>{await window.__konaShell.me();});
 await page.waitForSelector('.race-self-experience');
 await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 assert.ok(personal3D().some(u=>/race-self-stage\.js/i.test(u)),'personal 3D loads only after entering Me/User Studio');
 await page.click('[data-race-self-action="customize"]');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'avatar customization drawer must not overflow');
 await page.click('[data-avatar-archetype="renegade"]');
 await page.click('[data-hub-close]');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await page.$eval('#buildSelf',e=>e.textContent),/Continue your Kona/i);
 await page.click('#buildSelf');
 await page.waitForFunction(()=>!document.querySelector('#konaPanel').hidden);
 assert.match(await page.$eval('#konaPanelTitle',e=>e.textContent),/Now/i);
 assert.equal(await page.evaluate(()=>window.__konaProfile.get().avatarStyle.archetype),'renegade');
 assert.equal(await page.$('.kona-tour'),null);

 // The primary map stays stable; discovery depth changes inside the surface, not in navigation.
 assert.equal(await page.$eval('[data-tab="discover"]',e=>e.hidden),false,'Discover stays visible in the stable primary map');
 await page.click('[data-first-find]');
 await page.waitForFunction(()=>document.querySelector('[data-first-find]')?.disabled);
 await page.click('[data-tab="discover"]');
 await page.waitForSelector('[data-enter-world]');
 await page.click('[data-enter-world]');
 await page.waitForFunction(()=>document.body.classList.contains('museum-open'));
 await page.waitForFunction(()=>[...document.querySelectorAll('link[data-style-scope="museum"]')].length===2);
 await page.evaluate(()=>window.__konaShell.feed());
 await page.waitForSelector('.companion-page');
 const restored=await page.evaluate(()=>{
   const links=[...document.querySelectorAll('link[data-style-scope="museum"]')];
   const hero=document.querySelector('.companion-hero');
   return {disabled:links.length===2&&links.every(x=>x.disabled),heroPosition:hero?getComputedStyle(hero).position:null,title:document.querySelector('#konaPanelTitle')?.textContent};
 });
 assert.equal(restored.disabled,true,'museum styles must be disabled after returning to an app surface');
 assert.notEqual(restored.heroPosition,'fixed');
 assert.match(restored.title||'',/Feed/i);
 await page.evaluate(()=>window.__konaShell.now());
 assert.match(await page.$eval('#konaPanelTitle',e=>e.textContent),/Now/i);

 const planPage=await browser.newPage();planPage.setDefaultTimeout(30000);
 await planPage.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const planErrors=[];planPage.on('pageerror',e=>planErrors.push(String(e?.stack||e)));planPage.on('console',m=>{if(m.type()==='error')planErrors.push(m.text())});
 await planPage.goto(new URL('?view=plan',base).href,{waitUntil:'domcontentloaded'});
 await planPage.waitForFunction(()=>/Plan/i.test(document.querySelector('#konaPanelTitle')?.textContent||''));
 await planPage.waitForFunction(()=>document.querySelectorAll('.plan-timeline .plan-day').length>0);
 const planText=await planPage.$eval('#konaPanelBody',e=>e.textContent);
 assert.doesNotMatch(planText,/Race-week details are being verified|Useful place notes are being prepared/i);
 assert.deepEqual(planErrors,[]);await planPage.close();

 const collectionPage=await browser.newPage();collectionPage.setDefaultTimeout(30000);
 const collectionErrors=[];collectionPage.on('pageerror',e=>collectionErrors.push(String(e?.stack||e)));collectionPage.on('console',m=>{if(m.type()==='error')collectionErrors.push(m.text())});
 await collectionPage.goto(new URL('Canyon_Collection.html',base).href,{waitUntil:'domcontentloaded'});
 await collectionPage.waitForSelector('[data-compare="geometry"]');
 await collectionPage.click('[data-compare="geometry"]');await collectionPage.waitForSelector('#comparison table');
 await collectionPage.click('[data-compare="components"]');await collectionPage.waitForSelector('#comparison table');
 assert.deepEqual(collectionErrors,[]);await collectionPage.close();

 // Account access remains optional and returns to the same local-first app.
 const auth=await browser.newPage();auth.setDefaultTimeout(30000);
 await auth.goto(base,{waitUntil:'domcontentloaded'});
 await auth.waitForSelector('#entrySignIn');await auth.click('#entrySignIn');await auth.waitForSelector('.account-form');await auth.click('[data-back]');await auth.waitForFunction(()=>document.body.dataset.entryMode==='landing');
 assert.ok(await auth.$('#buildSelf'),'local-first build action remains available');
 await auth.close();

 const installPage=await browser.newPage();installPage.setDefaultTimeout(30000);
 await installPage.setUserAgent('Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36');
 await installPage.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await installPage.goto(base,{waitUntil:'domcontentloaded'});
 await installPage.click('#entryInstall');
 await installPage.waitForFunction(()=>!document.querySelector('#appSheet')?.hidden);
 const installComputed=await installPage.evaluate(()=>{
   const sheet=getComputedStyle(document.querySelector('#appSheet')),box=getComputedStyle(document.querySelector('#appSheet>div')),close=getComputedStyle(document.querySelector('#appSheet .close'));
   return {paddingBottom:sheet.paddingBottom,maxHeight:box.maxHeight,closeBorder:close.borderTopStyle};
 });
 assert.notEqual(installComputed.maxHeight,'none');assert.notEqual(installComputed.paddingBottom,'0px');assert.notEqual(installComputed.closeBorder,'none');
 assert.match(await installPage.$eval('#appSheet',e=>e.textContent),/Add KONA to your phone|Native Android download|Install KONA/i);
 await installPage.$eval('#appSheet .close',e=>e.click());
 await installPage.evaluate(()=>{
   const e=new Event('beforeinstallprompt',{cancelable:true});
   Object.defineProperty(e,'prompt',{value:async()=>{}});
   Object.defineProperty(e,'userChoice',{value:Promise.resolve({outcome:'dismissed'})});
   dispatchEvent(e);
 });
 await installPage.click('#entryInstall');await installPage.waitForFunction(()=>!document.querySelector('[data-pwa-action]')?.hidden);
 assert.match(await installPage.$eval('[data-pwa-action]',e=>e.textContent),/Install KONA now/i);await installPage.close();
 assert.deepEqual(pageErrors,[],'P0 journey must produce zero uncaught page errors');
 console.log('P0 browser journey PASS: optional questions → avatar → Now → optional tour → first Find unlocks Discover → museum round trip + local-first/install');
} finally {await browser.close();}
