import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=(process.argv[2]||'http://127.0.0.1:8744/_site/').replace(/\/?$/,'/');
const launchArgs=process.env.CI?['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--use-angle=metal'];
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:launchArgs});
const report={};
try{
 const p=await browser.newPage();p.setDefaultTimeout(process.env.CI?90000:30000);p.setDefaultNavigationTimeout(process.env.CI?120000:60000);await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({entity_type:'race-identity',event_id:'kona-2026',goal:{label:'Offline audit'}}));localStorage.setItem('kona.onboarding.v1','seen');}catch{}});await p.setViewport({width:390,height:844});const bad=[];p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url())});
 await p.goto(base,{waitUntil:'networkidle0'});
 const worker=await p.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return reg.active?.scriptURL});assert.equal(worker,base+'sw.js');
 await p.waitForFunction(()=>navigator.serviceWorker.controller);
 await p.click('#buildSelf');await p.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);await p.evaluate(()=>window.__konaShell.me());await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 await p.waitForNetworkIdle();assert.deepEqual(bad,[]);
 report.coreAssets=await p.evaluate(async()=>{const keys=await caches.keys(),name=keys.find(x=>x.startsWith('speedmax-core-'));return (await (await caches.open(name)).keys()).length});
 await p.setOfflineMode(true);await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('#buildSelf');await p.click('#buildSelf');await p.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);await p.evaluate(()=>window.__konaShell.me());await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);report.offlineStudio='PASS';
 await p.setOfflineMode(false);await p.close();
 const fallback=await browser.newPage();fallback.setDefaultTimeout(process.env.CI?90000:30000);fallback.setDefaultNavigationTimeout(process.env.CI?120000:60000);await fallback.setBypassServiceWorker(true);
 await fallback.evaluateOnNewDocument(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))return null;return getContext.call(this,type,...args)}});
 await fallback.evaluateOnNewDocument(()=>{try{localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({entity_type:'race-identity',event_id:'kona-2026',goal:{label:'No WebGL audit'}}));localStorage.setItem('kona.onboarding.v1','seen');}catch{}});await fallback.goto(base,{waitUntil:'networkidle0'});await fallback.click('#buildSelf');await fallback.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);await fallback.evaluate(()=>window.__konaShell.me());await fallback.waitForFunction(()=>document.querySelector('.studio-stage-status')?.textContent.includes('unavailable'));
 await fallback.click('[data-race-self-action="customize"]');assert.ok(await fallback.$('[data-avatar-archetype="aero"]'));report.noWebGL='customization and navigation remain available';report.status='PASS';console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(new URL('../output/playwright/offline.json',import.meta.url),JSON.stringify(report,null,2));await browser.close();}
