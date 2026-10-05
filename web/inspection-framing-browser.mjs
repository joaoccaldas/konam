// CI uses a smaller raster canvas; CSS viewport and all projection assertions remain unchanged.
// Full pixel-density checks live in visual-evidence-v2 and the physical-device audit.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8748/';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage',process.env.CI?'--use-angle=swiftshader':'--use-angle=metal','--enable-unsafe-swiftshader']});
const report=[];
try{
 for(const [width,height] of [[390,844],[844,390]])for(const file of ['Speedmax_Museum.html','Speedmax_2007_Museum.html']){
  const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>console.log('PAGE ERROR',file,e.message));console.log('checking',file,width);await page.setViewport({width,height,deviceScaleFactor:process.env.CI?.35:1,isMobile:true,hasTouch:true});await page.setBypassServiceWorker(true);await page.evaluateOnNewDocument(()=>localStorage.setItem('kona.progression.v1',JSON.stringify({schema:'progression-v1',xp:100000,level:10,access_tier:'visitor',streak:0,discoveries:[],badges:[],unlocks:[],seen:[],ledger:[],credits:0,history:[],acquisitions:[]})));
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.goto(new URL(file,base).href,{waitUntil:'networkidle2'});await page.waitForFunction(()=>!!(window.__sm?.inspection||window.__heritage?.inspection));
  await page.$eval('#explode',e=>{e.value=e.max;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>{const api=window.__sm||window.__heritage;return api.inspection.value>.99;});
  const framing=await page.evaluate(()=>{const api=window.__sm||window.__heritage,b=api.inspectionBounds(),r=api.inspectionRegion();api.camera.updateMatrixWorld(true);const points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=api.camera.position.clone().set(x,y,z).project(api.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z});}return {region:r,points,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.equal(framing.overflow,false);for(const p of framing.points){assert.ok(p.z<1&&p.x>=framing.region.x-2&&p.x<=framing.region.x+framing.region.width+2&&p.y>=framing.region.y-2&&p.y<=framing.region.y+framing.region.height+2,`Expanded bike clips under controls: ${file}/${width}: ${JSON.stringify(framing)}`);}
  await page.screenshot({path:`output/playwright/inspection-${file.replace('.html','')}-${width}.png`});report.push({file,width,height,expandedBikeFits:true,framing,status:'PASS'});await context.close();
 }
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync('output/playwright/inspection-framing-report.json',JSON.stringify(report,null,2));await browser.close();}
