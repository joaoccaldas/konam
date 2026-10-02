// Real-browser release checks for entry, studio composition, persistence and destinations.
// node web/studio-launch-audit.mjs http://127.0.0.1:PORT
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8744';
const out=new URL('../output/playwright/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:process.env.CI?['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader']:['--use-angle=metal']});
const report=[];
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Block service-worker reuse: verify the current build, not an earlier local release.
 await page.setBypassServiceWorker(true);
 await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({entity_type:'race-identity',event_id:'kona-2026',goal:{label:'Race the version of yourself'}}));}catch{}});
 for(const [width,height] of [[390,844],[430,932],[768,1024],[1280,800],[1440,900],[844,390],[360,640]]){
  await page.setViewport({width,height,deviceScaleFactor:1});
  await page.goto(base,{waitUntil:'networkidle0'});
  const entry=await page.$eval('#buildSelf',e=>{const r=e.getBoundingClientRect();return {bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.ok(!entry.overflow,`${width}: entry horizontal overflow`);
  assert.ok(entry.bottom<=height,`${width}: entry CTA below fold: ${entry.bottom}`);
  if(width===390||width===1440)await page.screenshot({path:new URL(`landing-${width}.png`,out).pathname});
  await page.click('#buildSelf');
  await page.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);
  await page.evaluate(()=>{
   const mobile=document.querySelector('[data-tab="me"]');
   const global=document.querySelector('[data-user-studio]');
   const visible=el=>el&&getComputedStyle(el).display!=='none'&&el.getClientRects().length>0;
   const target=visible(mobile)?mobile:visible(global)?global:null;
   if(!target)throw new Error('No visible User Studio route');
   target.click();
  });
  await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
  const layout=await page.evaluate(()=>{
   const canvas=document.querySelector('[data-race-self-stage]'),frame=canvas.__studioFrame;
   const {bounds,camera}=frame;
   const projected=[];
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const v=camera.position.clone().set(x,y,z).project(camera);projected.push([v.x,v.y]);
   }
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const stage=rect(canvas), menuEls=[...document.querySelectorAll('.studio-destinations,.race-self-controls')],menus=menuEls.map(rect);
   const targets=[...document.querySelectorAll('.studio-destinations>button,.race-self-controls>button,.race-self-controls>a')].map(e=>{
     const parent=e.parentElement,r=rect(e),pr=rect(parent);
     return {name:e.textContent.trim(),...r,scrollable:parent.scrollWidth>parent.clientWidth+1,parentRight:pr.right,parentBottom:pr.bottom,scrollLeft:parent.scrollLeft,scrollWidth:parent.scrollWidth,clientWidth:parent.clientWidth,offsetLeft:e.offsetLeft,offsetWidth:e.offsetWidth};
   });
   return {stage,menus,targets,projected,overflow:document.documentElement.scrollWidth>innerWidth,quest:!!document.querySelector('#konaQuest')};
  });
  assert.ok(!layout.quest,`${width}: onboarding gate appeared`);
  assert.ok(!layout.overflow,`${width}: horizontal overflow`);
  assert.ok(layout.projected.every(([x,y])=>Math.abs(x)<.94&&Math.abs(y)<.94),`${width}: athlete is clipped`);
  for(const t of layout.targets){
    assert.ok(t.w>=44&&t.h>=44,`${width}: small control ${t.name}`);
    assert.ok(t.y>=0&&t.bottom<=height+1,`${width}: menu vertically outside viewport: ${t.name}`);
    if(t.scrollable){
      assert.ok(t.offsetLeft>=0&&t.offsetLeft+t.offsetWidth<=t.scrollWidth+1,`${width}: unreachable scroll-strip item: ${t.name}`);
    }else{
      assert.ok(t.x>=0&&t.right<=width+1,`${width}: menu outside viewport: ${t.name}`);
    }
  }
  for(const m of layout.menus){const s=layout.stage;assert.ok(Math.min(s.right,m.right)-Math.max(s.x,m.x)<=0||Math.min(s.bottom,m.bottom)-Math.max(s.y,m.y)<=0,`${width}: stage covered by menu`);}
  await page.screenshot({path:new URL(`studio-${width}.png`,out).pathname});
  report.push({width,height,status:'PASS',stage:layout.stage});
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 // Browser-level text enlargement proxy: verify consumer shell remains usable when text is scaled 125%.
 await page.goto(base,{waitUntil:'networkidle0'});
 await page.evaluate(()=>document.documentElement.style.fontSize='125%');
 await page.click('#buildSelf');await page.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);
 const enlarged=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth,
   cta:[...document.querySelectorAll('.kona-primary,.btn-primary')].filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.right<=innerWidth+1;})
 }));
 assert.equal(enlarged.overflow,false,'125% text scale must not create horizontal overflow');
 assert.equal(enlarged.cta,true,'125% text scale must keep primary actions usable');
 await page.evaluate(()=>document.documentElement.style.fontSize='');

 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.click('[data-tab="me"]');await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 await page.click('[data-race-self-action="customize"]');
 await page.click('[data-avatar-archetype="aero"]');
 await page.click('[data-avatar-item="skin:sand"]');
 await page.keyboard.press('Escape');
 assert.equal(await page.$eval('[data-hub-drawer]',e=>e.hidden),true);
 assert.equal(await page.$eval('[data-race-self-action="customize"]',e=>e===document.activeElement),true);
 await page.reload({waitUntil:'networkidle0'});await page.click('#buildSelf');await page.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);await page.click('[data-tab="me"]');await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 assert.equal(await page.evaluate(()=>window.__konaProfile.get().avatarStyle.archetype),'aero');
 assert.equal(await page.evaluate(()=>window.__konaProfile.get().avatarStyle.items.skin.id),'sand');
 await page.click('[data-race-self-action="customize"]');await page.screenshot({path:new URL('avatar-editor-phone.png',out).pathname});await page.keyboard.press('Escape');
 await page.click('[data-race-self-action="progress"]');await page.waitForSelector('[data-hub-drawer]:not([hidden]) #konaAccount');await page.keyboard.press('Escape');
 await page.click('[data-studio-home]');await page.waitForSelector('[data-tab="plan"]',{visible:true});await page.click('[data-tab="plan"]');await page.waitForFunction(()=>document.querySelector('#konaPanelTitle').textContent==='Plan');await page.click('[data-tab="me"]');await page.waitForSelector('[data-race-self-stage]');
 await page.click('[data-studio-home]');await page.waitForSelector('[data-tab="discover"]',{visible:true});await page.click('[data-tab="discover"]');await page.waitForFunction(()=>document.querySelector('#konaPanelTitle').textContent==='Discover');await page.click('[data-tab="me"]');await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 await page.click('[data-studio-home]');await page.waitForSelector('[data-tab="discover"]',{visible:true});await page.click('[data-tab="discover"]');await page.waitForSelector('[data-enter-world]');await page.click('[data-enter-world]');await page.waitForFunction(()=>!!window.__museum,{timeout:60000});
 await page.waitForFunction(()=>document.body.classList.contains('walking'),{timeout:60000});
 const hallLinks=await page.evaluate(()=>[...document.querySelectorAll('link[data-style-scope="museum"]')].map(l=>({href:l.getAttribute('href'),disabled:l.disabled})));
 assert.ok(hallLinks.length>=2&&hallLinks.every(x=>x.disabled===false),'museum styles must be enabled inside museum');
 await page.screenshot({path:new URL('museum-phone.png',out).pathname});
 await page.evaluate(()=>window.__konaShell.now());
 await page.waitForFunction(()=>document.querySelector('#konaPanelTitle')?.textContent==='Home');
 const afterMuseum=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth,
   hall:[...document.querySelectorAll('link[data-style-scope="museum"]')].map(l=>l.disabled),
   homeFont:getComputedStyle(document.querySelector('#konaPanelTitle')).fontFamily,
   homeColor:getComputedStyle(document.querySelector('#konaPanelTitle')).color
 }));
 assert.equal(afterMuseum.overflow,false,'Home after museum must not overflow');
 assert.ok(afterMuseum.hall.length>=2&&afterMuseum.hall.every(Boolean),'museum styles must be disabled on app surfaces');
 assert.match(afterMuseum.homeFont,/Instrument Serif|Georgia/i,'Home editorial typography must survive museum round trip');
 assert.deepEqual(errors,[],'runtime errors');
 report.push({journeys:'avatar persistence, Escape/focus, Progress, Plan, Discover, 3D World',status:'PASS'});
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(new URL('studio-audit.json',out),JSON.stringify(report,null,2));await browser.close();}
