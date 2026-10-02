import puppeteer from 'puppeteer-core';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8744/';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report=[];const output=new URL('../output/playwright/',import.meta.url);fs.mkdirSync(output,{recursive:true});
try{
 for(const platform of ['android','ios','standalone']){
  const context=await browser.createBrowserContext(),p=await context.newPage();await p.setBypassServiceWorker(true);
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.setUserAgent(platform==='ios'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36');
  if(platform==='standalone')await p.evaluateOnNewDocument(()=>{const mm=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('display-mode')?{matches:true,addEventListener(){},removeEventListener(){}}:mm(q);});
  await p.goto(base,{waitUntil:'networkidle0'});
  if(platform==='standalone'){
   await p.evaluate(()=>localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({entity_type:'race-identity',event_id:'kona-2026'})));await p.reload({waitUntil:'networkidle0'});
   assert.equal(await p.$eval('#entryInstall',e=>e.hidden),true);assert.equal(await p.evaluate(()=>innerWidth),390);
   await p.click('#buildSelf');await p.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);await p.click('[data-tab="me"]');await p.waitForSelector('[data-install-app]');assert.equal(await p.$eval('[data-install-app]',e=>e.hidden),true);
   report.push({platform,status:'PASS',checks:'installed controls hidden; device-width viewport'});await context.close();continue;
  }
  await p.click('#entryInstall');await p.waitForFunction(()=>!document.querySelector('#appSheet').hidden);
  assert.equal(await p.$eval('#appSheet .close',e=>e===document.activeElement),true);
  const box=await p.$eval('#appSheet>div',e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom}});assert.ok(box.x>=0&&box.right<=390&&box.y>=0&&box.bottom<=844);
  const text=await p.$eval('#appSheet',e=>e.innerText);assert.match(text,platform==='ios'?/Safari.*Share.*Add to Home Screen/s:/Chrome.*Install app/s);
  await p.screenshot({path:new URL(`install-${platform}.png`,output).pathname});
  await p.keyboard.press('Escape');assert.equal(await p.$eval('#entryInstall',e=>e===document.activeElement),true);assert.equal(await p.$eval('#intro',e=>e.inert),false);
  if(platform==='android'){
   for(const outcome of ['dismissed','error','accepted']){
    await p.evaluate(outcome=>{window.__promptCalls=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.__promptCalls++;if(outcome==='error')throw new Error('unavailable')};e.userChoice=Promise.resolve({outcome});dispatchEvent(e);},outcome);
    await p.click('#entryInstall');await p.click('[data-pwa-action]');await p.waitForFunction(()=>document.querySelector('.install-status').textContent.length>0);
    assert.equal(await p.evaluate(()=>window.__promptCalls),1);assert.equal(await p.$eval('[data-pwa-action]',e=>e.hidden),true);
    assert.match(await p.$eval('.install-status',e=>e.textContent),outcome==='dismissed'?/install later/:outcome==='error'?/unavailable/:/browser will confirm/);
    await p.keyboard.press('Escape');
   }
   await p.evaluate(()=>dispatchEvent(new Event('appinstalled')));assert.equal(await p.$eval('#entryInstall',e=>e.hidden),true);
  }
  assert.deepEqual(errors,[]);report.push({platform,status:'PASS',checks:'instructions, modal fit, Escape/focus, prompt lifecycle'});await context.close();
 }
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(new URL('install-audit.json',output),JSON.stringify(report,null,2));await browser.close();}
