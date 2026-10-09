// Real route loading, failure/retry and delayed navigation. Public service calls are blocked.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8765',report=[];
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:[process.env.CI?'--use-angle=swiftshader':'--use-angle=metal']});
try{
 for(const mode of ['retry','delayed']){
  const context=await browser.createBrowserContext(),page=await context.newPage();let blocked=true,pending=null,requests=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('kona.onboarding.v1','seen');localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,appearance:'light',motion:'reduced',quality:'low'}));});
  await page.setRequestInterception(true);page.on('request',r=>{
   if(/supabase|plausible|googletagmanager/.test(r.url()))return r.abort();
   if(r.url().endsWith('/app/companion-ui.js')){requests++;if(blocked){if(mode==='retry')return r.abort();pending=r;return;}}
   r.continue();
  });
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await page.click('#buildSelf');await page.waitForSelector('[data-home-feed]');
  assert.equal(requests,0,'reading/travel module is not fetched on entry or Now');
  if(mode==='retry'){
   await page.evaluate(async()=>window.__konaShell.feed('home'));await page.waitForSelector('[data-companion-retry]');
   blocked=false;await page.click('[data-companion-retry]');await page.waitForSelector('[data-intern-brief] h4');
   assert.equal(requests,2,'failed feature script can be retried');
  }else{
   await page.evaluate(()=>{window.delayedFeed=window.__konaShell.feed('home');});
   await page.waitForFunction(()=>document.querySelector('script[src="app/companion-ui.js"]'));
   await page.evaluate(async()=>window.__konaShell.now());blocked=false;await pending.continue();await page.evaluate(async()=>window.delayedFeed);
   assert.equal(await page.$eval('#konaPanelTitle',e=>e.textContent),'Now','latest navigation wins delayed module');
  }
  assert.deepEqual(errors,[]);report.push({mode,status:'PASS',requests});await context.close();
 }
}finally{await browser.close();fs.mkdirSync(new URL('../output/playwright/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/playwright/companion-route-regression.json',import.meta.url),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
