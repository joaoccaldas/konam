// Local stress/performance evidence. Timings describe the test machine, not every device.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8744';
const launchArgs=process.env.CI?['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--use-angle=metal'];
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:launchArgs});
const report={};
try{
 const page=await browser.newPage();page.setDefaultTimeout(process.env.CI?90000:30000);page.setDefaultNavigationTimeout(process.env.CI?120000:60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setBypassServiceWorker(true);await page.evaluateOnNewDocument(()=>{localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({entity_type:'race-identity',event_id:'kona-2026',goal:{label:'Stress test'}}));localStorage.setItem('kona.onboarding.v1','seen');});await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const cdp=await page.createCDPSession();await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 let start=Date.now();await page.goto(base,{waitUntil:'networkidle0'});report.entryReady4xCPUms=Date.now()-start;
 const before=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/\.glb|race-self-stage|hall\.js/.test(r.name)).length);assert.equal(before,0);
 start=Date.now();await page.click('#buildSelf');await page.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden);await page.evaluate(()=>window.__konaShell.me());await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);report.studioReady4xCPUms=Date.now()-start;
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 for(let i=0;i<20;i++){
  await page.evaluate(()=>window.__konaShell.plan());await page.evaluate(()=>window.__konaShell.me());
  await page.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 }
 await page.click('[data-race-self-action="customize"]');
 for(let i=0;i<40;i++)await page.click(`[data-avatar-archetype="${['minecraft','aero','renegade','islander'][i%4]}"]`);
 await page.keyboard.press('Escape');
 report.studioStress={visits:20,avatarChanges:40,canvases:await page.$$eval('canvas',xs=>xs.length)};assert.equal(report.studioStress.canvases,1);
 report.frameIntervalsMs=await page.evaluate(()=>new Promise(resolve=>{const deltas=[];let prev=performance.now();function frame(t){deltas.push(t-prev);prev=t;if(deltas.length<90)requestAnimationFrame(frame);else{deltas.sort((a,b)=>a-b);resolve({median:deltas[45],p95:deltas[85]})}}requestAnimationFrame(frame)}));
 await page.goto(base+'/Studio.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__studio?.CAT?.products?.length>0);
 await page.evaluate(async()=>{const studio=window.__studio;const target=studio.CAT.products.find(Boolean);if(!target)throw new Error('Studio catalog empty');await studio.show(target);});
 await page.waitForFunction(()=>window.__studio?.current?.root);
 const fit=()=>page.evaluate(()=>{
  const {camera,current}=window.__studio;const box=new (camera.position.constructor)(); // use existing Three values; no remote imports.
  const r=document.querySelector('#stage').getBoundingClientRect(),d=document.querySelector('#dock').getBoundingClientRect();
  const points=[];current.root.updateMatrixWorld(true);current.root.traverse(o=>{if(!o.isMesh||!o.visible)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=box.clone().set(x,y,z).applyMatrix4(o.matrixWorld).project(camera);points.push(Math.max(Math.abs(v.x),Math.abs(v.y)));}});
  return {maxNDC:Math.max(...points),stage:[r.x,r.y,r.width,r.height],dock:[d.x,d.y,d.width,d.height],headerVisible:!!document.querySelector('.bar').getClientRects().length};
 });
 report.bikePhone=await fit();assert.ok(report.bikePhone.maxNDC<1,'phone bike clipped');assert.ok(report.bikePhone.headerVisible);
 const memories=[];
 for(let round=0;round<2;round++){
  for(let i=0;i<12;i++)await page.evaluate(async i=>{await window.__studio.show(window.__studio.CAT.products[i]);await new Promise(requestAnimationFrame)},i);
  memories.push(await page.evaluate(()=>({...window.__studio.renderer.info.memory})));
 }
 report.bikeStress={switches:24,memories};assert.ok(memories[1].geometries<=memories[0].geometries+10,'GPU geometry grows after repeat cycle');
 await page.setViewport({width:1440,height:900,deviceScaleFactor:1});await page.waitForFunction(()=>document.querySelector('#stage').clientWidth<innerWidth);report.bikeDesktop=await fit();assert.ok(report.bikeDesktop.maxNDC<1,'desktop bike clipped');
 assert.deepEqual(errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));
}finally{fs.mkdirSync(new URL('../output/playwright/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/playwright/stress.json',import.meta.url),JSON.stringify(report,null,2));await browser.close();}
