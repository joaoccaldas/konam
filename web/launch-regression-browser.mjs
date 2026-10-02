// Local disposable-browser regressions. All account requests below are intercepted.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8744/';
const out=new URL('../output/playwright/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox',process.env.CI?'--use-angle=swiftshader':'--use-angle=metal']});
const report=[];
async function pageFor(width=390,height=844){
 const context=await browser.createBrowserContext(),page=await context.newPage();
 await page.evaluateOnNewDocument(()=>localStorage.setItem('kona.onboarding.v1','seen'));await page.setBypassServiceWorker(true);await page.setViewport({width,height,isMobile:width<900,hasTouch:width<900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 return {context,page,errors};
}
async function progress(page){
 await page.goto(base,{waitUntil:'networkidle0'});await page.click('#entrySignIn');await page.click('#continueLocal');await page.waitForFunction(()=>document.querySelector('#konaPanelTitle')?.textContent==='Home');await page.evaluate(async()=>{await window.__konaShell.me();});
 await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame,{timeout:60000});await page.waitForSelector('[data-race-self-action="progress"]');await page.click('[data-race-self-action="progress"]');
 await page.waitForSelector('#konaAccount');
}
try{
 const hero=await pageFor();await hero.page.goto(base,{waitUntil:'networkidle0'});
 const expected=JSON.parse(fs.readFileSync(new URL('../museum/entry-catalog.json',import.meta.url))).bikes.map(x=>x.id);
 const previews=await hero.page.evaluate(()=>{const seen=new Set([document.querySelector('[data-preview-id]').dataset.previewId]),random=Math.random;try{for(let i=0;i<300;i++){Math.random=()=>((i*37)%300)/300;document.querySelector('.entry-livery').click();seen.add(document.querySelector('[data-preview-id]').dataset.previewId);}return [...seen];}finally{Math.random=random;}});
 assert.deepEqual([...previews].sort(),expected.sort());assert.doesNotMatch(await hero.page.$eval('#intro',e=>e.innerText),/wyld/i);assert.deepEqual(hero.errors,[]);report.push({journey:'all landing catalogue previews reachable without progression; no WYLD',status:'PASS'});await hero.context.close();
 // Entry form stays usable after repeated Back and anonymous continuation.
 for(const [width,height] of [[320,720],[390,844],[844,390],[1440,900]]){
  const {context,page,errors}=await pageFor(width,height);await page.goto(base,{waitUntil:'networkidle0'});
  for(let i=0;i<5;i++){
   await page.click('#entrySignIn');await page.waitForSelector('#saveForm',{visible:true});
   assert.equal(await page.$eval('#konaQuest',e=>e.hidden),false);
   await page.click('#backFromSave');
  }
  await page.click('#entrySignIn');await page.click('#continueLocal');await page.waitForFunction(()=>!document.querySelector('#konaPanel').hidden);
  assert.match(await page.$eval('#konaPanelTitle',e=>e.textContent),/Home/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.$eval('[data-tab="home"]',e=>getComputedStyle(e).borderTopStyle),'none');
  assert.deepEqual(errors,[]);report.push({journey:'sign-in reentry and local continuation',width,height,status:'PASS'});await context.close();
 }
 // No email is sent. Exercise async form success and all error states through real DOM events.
 for(const status of [200,429,500]){
  const {context,page,errors}=await pageFor();let requests=0;await page.setRequestInterception(true);
  page.on('request',request=>{
   if(request.url().includes('/auth/v1/otp')){const headers={'access-control-allow-origin':new URL(base).origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'apikey, content-type'};if(request.method()==='OPTIONS')return request.respond({status:204,headers,body:''});requests++;request.respond({status,contentType:'application/json',headers,body:JSON.stringify(status===200?{}:{message:status===429?'Too many requests':'Unavailable'})});}
   else request.continue();
  });
  await progress(page);await page.waitForSelector('[data-login]');await page.type('#passportEmail','tester@example.test');await page.click('[data-login] button');
  await page.waitForFunction(()=>/Check your email|wait|Unavailable/.test(document.querySelector('#konaAccount [data-status]').textContent));
  assert.equal(requests,1);assert.deepEqual(errors,[]);
  if(status===200)assert.equal(await page.$eval('[data-login]',e=>e.hidden),true);
  else assert.equal(await page.$eval('[data-login] button',e=>e.disabled),false);
  report.push({journey:'mock account request',http:status,status:'PASS'});await context.close();
 }
 // A late stylesheet cannot reopen the previous tab after a newer navigation.
 const nav=await pageFor();await nav.page.goto(base,{waitUntil:'networkidle0'});
 await nav.page.click('#entrySignIn');await nav.page.click('#continueLocal');
 await nav.page.waitForFunction(()=>document.querySelector('#konaPanelTitle')?.textContent==='Home');
 await nav.page.setRequestInterception(true);
 nav.page.on('request',r=>r.url().includes('/web/styles/race-self.css')?setTimeout(()=>r.continue(),500):r.continue());
 await nav.page.evaluate(async()=>{await Promise.all([window.__konaShell.me(),window.__konaShell.explore()]);});
 assert.equal(await nav.page.$eval('#konaPanelTitle',e=>e.textContent),'Discover');
 assert.ok(await nav.page.$('[data-enter-world]'));assert.equal(await nav.page.$('[data-race-self-stage]'),null);
 assert.deepEqual(nav.errors,[]);report.push({journey:'latest navigation wins delayed Studio stylesheet',status:'PASS'});await nav.context.close();
 // Existing world passport must boot Experiences, keep stamps on return, and preserve discovery history.
 const {context,page,errors}=await pageFor();
 await page.evaluateOnNewDocument(()=>localStorage.setItem('speedmax.passport.v1',JSON.stringify({v:1,discoveries:['cfr'],visits:3,pose:{x:0,z:3}})));
 await page.goto(new URL('Experiences.html',base).href,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__exp?.passport);
 const experience=await page.evaluate(()=>{window.__exp.passport.stamp('part:launch-regression','Inspected component',5);return window.__exp.passport.state;});
 assert.ok(experience.discoveries.includes('cfr'));assert.ok(experience.stamps['part:launch-regression']);
 await page.goto(base,{waitUntil:'networkidle0'});await page.click('#entrySignIn');await page.click('#continueLocal');await page.waitForFunction(()=>document.querySelector('#konaPanelTitle')?.textContent==='Home');await page.evaluate(async()=>{await window.__konaShell.explore();});await page.click('[data-enter-world]');
 await page.waitForFunction(()=>window.__museum?.renderer);assert.deepEqual(await page.evaluate(()=>({bikes:window.__museum.wyldBikes.length,room:!!window.__museum.scene.getObjectByName('wyldRoom'),data:window.__WYLDROOM,nav:!!document.querySelector('[data-room=wyld]')})),{bikes:0,room:false,data:null,nav:false});await page.evaluate(()=>window.__konaShell.now());
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kona.passport.v1')));
 assert.ok(saved.discoveries.includes('cfr'));assert.ok(saved.stamps['part:launch-regression']);assert.ok(saved.visits>=3);
 assert.deepEqual(errors,[]);report.push({journey:'legacy Museum → Experiences → Museum Passport',status:'PASS'});await context.close();
 // Opening Studio (including shared preview) is read-only; a failed model cannot save the old one.
 const studio=await pageFor();await studio.page.goto(base,{waitUntil:'networkidle0'});
 await studio.page.evaluate(()=>{localStorage.setItem('kona.progression.v1',JSON.stringify({schema:'progression-v1',xp:40,level:2,access_tier:'visitor',streak:0,discoveries:[],badges:[],unlocks:[],seen:[],ledger:[],credits:0,history:[],acquisitions:[]}));localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({goal:{label:'Keep my goal'},setup:{shoe:'equipment:shoe'},mode:'real'}));localStorage.setItem('kona.userEquipment.v1',JSON.stringify([{id:'equipment:shoe',product_id:'product:shoe',relationship:'owned'}]));});
 const before=await studio.page.evaluate(()=>[localStorage.getItem('kona.raceIdentity.v1'),localStorage.getItem('kona.userEquipment.v1')]);
 await studio.page.goto(new URL('Studio.html',base).href,{waitUntil:'networkidle0'});await studio.page.waitForFunction(()=>window.__studio?.current,{timeout:60000});
 assert.deepEqual(await studio.page.evaluate(()=>[localStorage.getItem('kona.raceIdentity.v1'),localStorage.getItem('kona.userEquipment.v1')]),before);
 await studio.page.setRequestInterception(true);studio.page.on('request',r=>r.url().endsWith('missing-launch-model.glb')?r.respond({status:404,body:'missing'}):r.continue());
 const failed=await studio.page.evaluate(async()=>{const s=window.__studio;const old=s.current.product.id;const ok=await s.show({...s.current.product,id:'missing',glb:'assets/missing-launch-model.glb'});s.saveCurrentToSetup();return {ok,old,current:s.current.product.id,setup:s.raceSetup};});
 assert.equal(failed.ok,false);assert.equal(failed.current,failed.old);assert.deepEqual(await studio.page.evaluate(()=>[localStorage.getItem('kona.raceIdentity.v1'),localStorage.getItem('kona.userEquipment.v1')]),before);
 assert.deepEqual(studio.errors,[]);report.push({journey:'Studio read-only startup and failed load',status:'PASS'});await studio.context.close();
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(new URL('launch-regressions.json',out),JSON.stringify(report,null,2));await browser.close();}
