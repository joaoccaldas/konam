// CI uses a smaller raster canvas; CSS viewport and all projection assertions remain unchanged.
// Full pixel-density checks live in visual-evidence-v2 and the physical-device audit.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('output/playwright',{recursive:true});
import {pauseSoftwareRaster,drawSoftwareFrame} from './browser-software-raster.mjs';
if(process.env.KONA_TEST_VIEWPORT&&!['390','844'].includes(process.env.KONA_TEST_VIEWPORT))throw Error('Unknown test viewport; refusing empty coverage');
const base=process.argv[2]||'http://127.0.0.1:8748/';
const routes=JSON.parse(fs.readFileSync('world/konam/founding-runtime-v1.json')).routes;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage',process.env.CI?'--use-angle=swiftshader':'--use-angle=metal','--enable-unsafe-swiftshader']});const report=[];
try{
 for(const [width,height] of [[390,844],[844,390]].filter(v=>!process.env.KONA_TEST_VIEWPORT||String(v[0])===process.env.KONA_TEST_VIEWPORT)){
 const context=await browser.createBrowserContext(),page=await context.newPage();page.setDefaultTimeout(60000);await page.setViewport({width,height,deviceScaleFactor:process.env.CI?.35:1,isMobile:true,hasTouch:true});await page.setBypassServiceWorker(true);
 await page.evaluateOnNewDocument(()=>{localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,quality:'low',motion:'reduced',travel:'teleport'}));localStorage.setItem('speedmax.coach.v1','1');localStorage.setItem('kona.onboarding.v1','seen');});
 await page.goto(base,{waitUntil:'networkidle2'});await page.click('#entryWorld');await pauseSoftwareRaster(page);await page.waitForFunction(()=>!!window.__museum?.renderer);await page.waitForFunction(()=>document.body.classList.contains('walking'));
 for(const route of routes){
  console.log('visiting',route.room_id,route.action.target);
  if(route.action.kind==='world')await page.evaluate(()=>{__museum.P.pitch=.65;__museum.P.yaw=2.3;});
  await page.click('#mapBtn');assert.equal(await page.$$eval('[data-founding-id]',els=>els.length),14);const selector=`[data-founding-id="${route.room_id}"]`;await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector);
  if(route.action.kind==='world'){
   assert.ok(await page.evaluate(target=>window.__map.areas.some(area=>area.id===target),route.action.target),'Existing 3D target must exist');
   await page.waitForFunction(target=>{const api=window.__museum,area=window.__map.areas.find(area=>area.id===target),p=api.P;return api.roomView?.area.id===target&&!api.navigating&&p.x>=Math.min(area.x0,area.x1)&&p.x<=Math.max(area.x0,area.x1)&&p.z>=Math.min(area.z0,area.z1)&&p.z<=Math.max(area.z0,area.z1)&&Math.abs(p.pitch)<.01;},{timeout:60000},route.action.target);
   await drawSoftwareFrame(page);assert.ok(await page.evaluate(()=>window.__museum.renderer.info.render.triangles>1000));
   const view=await page.evaluate(()=>{const a=__museum,{area,overview:o}=a.roomView,c=a.camera,d=c.getWorldDirection(c.position.clone()),to=c.position.clone().set(o.face.x,o.face.y,o.face.z).sub(c.position).normalize(),dist=Math.hypot(o.face.x-o.to.x,o.face.z-o.to.z);c.updateMatrixWorld(true);const region=a.roomViewport(),farCorners=[];for(const x of [area.x0,area.x1])for(const z of [area.z0,area.z1]){const depth=((x-o.to.x)*(o.face.x-o.to.x)+(z-o.to.z)*(o.face.z-o.to.z))/dist;if(depth>dist*.5){for(const y of [o.floorY,o.floorY+(area.height??1.6)]){const p=c.position.clone().set(x,y,z).project(c);farCorners.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});}}}return {pitch:a.P.pitch,directionY:d.y,looksIntoRoom:d.dot(to),centerDistance:dist,wallClearance:Math.min(a.P.x-Math.min(area.x0,area.x1),Math.max(area.x0,area.x1)-a.P.x,a.P.z-Math.min(area.z0,area.z1),Math.max(area.z0,area.z1)-a.P.z),fov:c.fov,region,farCorners};});
   assert.ok(Math.abs(view.directionY)<.02&&view.looksIntoRoom>.97&&view.centerDistance>.5&&view.wallClearance>=.89,`Arrival must look into the room from a clear level pose: ${JSON.stringify(view)}`);
   for(const p of view.farCorners)assert.ok(p.x>=view.region.x-2&&p.x<=view.region.x+view.region.width+2&&p.y>=view.region.y-2&&p.y<=view.region.y+view.region.height+2,`Room floor, ceiling and width must fit between controls: ${route.action.target}/${width}: ${JSON.stringify(view)}`);
   await page.screenshot({path:`output/playwright/arrival-${route.room_id}-${width}.png`});route.arrivalView=view;
  }else{
   await page.waitForSelector('#konaPanel:not([hidden])');const expected={garage:'Garage',plan:'Plan',travel:'Travel',collection:'Finds'}[route.action.target];assert.match(await page.$eval('#konaPanelTitle',e=>e.textContent),new RegExp(expected));await page.evaluate(()=>window.__konaShell.now());await page.waitForSelector('[data-home-world]');await page.click('[data-home-world]');await page.waitForFunction(()=>document.querySelector('#konaPanel').hidden);
  }
  report.push({...route,width,height,softwareRasterStepped:!!process.env.CI,status:'PASS'});
 }
 await page.click('#mapBtn');await page.screenshot({path:`output/playwright/founding-rooms-${width}.png`});console.log('PASS all 14 founding routes and level overview arrivals',width);await context.close();
 }
}finally{fs.writeFileSync('output/playwright/founding-rooms-report.json',JSON.stringify(report,null,2));await browser.close();}
