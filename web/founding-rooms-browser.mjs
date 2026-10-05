import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8748/';
const routes=JSON.parse(fs.readFileSync('world/konam/founding-runtime-v1.json')).routes;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox',process.env.CI?'--use-angle=swiftshader':'--use-angle=metal','--enable-unsafe-swiftshader']});const report=[];
try{
 const page=await browser.newPage();page.setDefaultTimeout(60000);await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.setBypassServiceWorker(true);
 await page.evaluateOnNewDocument(()=>{localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,quality:'low',motion:'reduced',travel:'teleport'}));localStorage.setItem('speedmax.coach.v1','1');localStorage.setItem('kona.onboarding.v1','seen');});
 await page.goto(base,{waitUntil:'networkidle2'});await page.click('#entryWorld');await page.waitForFunction(()=>!!window.__museum?.renderer);await page.waitForFunction(()=>document.body.classList.contains('walking'));
 for(const route of routes){
  console.log('visiting',route.room_id,route.action.target);
  await page.click('#mapBtn');assert.equal(await page.$$eval('[data-founding-id]',els=>els.length),14);const selector=`[data-founding-id="${route.room_id}"]`;await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector);
  if(route.action.kind==='world'){
   assert.ok(await page.evaluate(target=>window.__map.areas.some(area=>area.id===target),route.action.target),'Existing 3D target must exist');
   await page.waitForFunction(target=>{const area=window.__map.areas.find(area=>area.id===target),p=window.__museum.P;return p.x>=Math.min(area.x0,area.x1)&&p.x<=Math.max(area.x0,area.x1)&&p.z>=Math.min(area.z0,area.z1)&&p.z<=Math.max(area.z0,area.z1);},{timeout:60000},route.action.target);
   assert.ok(await page.evaluate(()=>window.__museum.renderer.info.render.triangles>1000));
  }else{
   await page.waitForSelector('#konaPanel:not([hidden])');const expected={garage:'Garage',plan:'Plan',travel:'Travel',collection:'Finds'}[route.action.target];assert.match(await page.$eval('#konaPanelTitle',e=>e.textContent),new RegExp(expected));await page.evaluate(()=>window.__konaShell.now());await page.waitForSelector('[data-home-world]');await page.click('[data-home-world]');await page.waitForFunction(()=>document.querySelector('#konaPanel').hidden);
  }
  report.push({...route,status:'PASS'});
 }
 await page.click('#mapBtn');await page.screenshot({path:'output/playwright/founding-rooms-390.png'});console.log('PASS all 14 founding routes for a fresh visitor');
}finally{fs.writeFileSync('output/playwright/founding-rooms-report.json',JSON.stringify(report,null,2));await browser.close();}
