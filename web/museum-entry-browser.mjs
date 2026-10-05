// Prove the actual gallery is one action away, without onboarding or unlocks.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8748/';
const out=new URL('../output/playwright/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox',process.env.CI?'--use-angle=swiftshader':'--use-angle=metal','--enable-unsafe-swiftshader']});
const report=[];
async function press(page,selector){
 console.log('museum control',page.viewport().width,selector);
 await page.waitForSelector(selector,{visible:true});await page.$eval(selector,e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
 await page.waitForFunction(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),key=[r.x,r.y,r.width,r.height].join(',');const previous=window.__museumPressGeometry;window.__museumPressGeometry={key,selector,since:previous?.selector===selector&&previous?.key===key?previous.since:performance.now()};return performance.now()-window.__museumPressGeometry.since>200&&(hit===e||e.contains(hit));},{},selector);
 const point=await page.$eval(selector,e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 if(page.viewport().hasTouch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
}

try{
 for(const [width,height,returning] of [[390,844,false],[844,390,true],[1440,900,false]]){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],requests=[];
  page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  await page.setViewport({width,height,isMobile:width<900,hasTouch:width<900});await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(returning=>{localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,quality:'low',motion:'reduced'}));localStorage.setItem('speedmax.coach.v1','1');if(returning)localStorage.setItem('kona.onboarding.v1','seen');},returning);
  await page.goto(base,{waitUntil:'networkidle2'});await page.waitForFunction(()=>window.__konaShell);await page.evaluate(()=>document.fonts.ready);
  const first=await page.$eval('#entryWorld',button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:button.textContent,bottom:r.bottom,visible:r.top>=0&&r.bottom<=innerHeight&&(hit===button||button.contains(hit))};});
  assert.ok(first.visible,'Museum action must be visible on first screen');assert.match(first.label,/Enter the 3D museum/);
  assert.equal(requests.some(url=>/\/hall\.js|\.glb(?:\?|$)/.test(url)),false,'No renderer/model request before intent');
  await page.screenshot({path:new URL(`museum-entry-${width}.png`,out).pathname});
  await press(page,'#entryWorld');await page.waitForFunction(()=>document.body.classList.contains('walking')&&window.__museum?.renderer.info.render.triangles>1000);
  assert.equal(await page.$('[data-onboarding-question]'),null,'Museum must bypass onboarding');
  assert.equal(requests.filter(url=>url.endsWith('/app/hall.js')).length,1,'One canonical runtime load');
  await page.waitForFunction(()=>window.__museum.PIECES.some(piece=>piece.bike&&Math.hypot(piece.view.x-window.__museum.P.x,piece.view.z-window.__museum.P.z)>9));
  assert.ok(await page.evaluate(()=>window.__museum.P.z<3),'Hero must place the visitor inside the gallery, not outside its door');
  await page.screenshot({path:new URL(`museum-walking-${width}.png`,out).pathname});
  for(const selector of ['#mapBtn','#worldMoreBtn'])assert.ok(await page.$eval(selector,(button,minHeight)=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=minHeight&&r.top>=0&&r.bottom<=innerHeight&&(hit===button||button.contains(hit));},width<900?48:40),`${selector} must be reachable`);
  await press(page,'#mapBtn');await page.waitForSelector('#map:not([hidden])');assert.ok(await page.$('.map-list button'),'Explore has real rooms');await press(page,'.map-close');
  await press(page,'#worldMoreBtn');await page.waitForSelector('#worldMoreMenu:not([hidden])');await page.keyboard.press('Escape');assert.equal(await page.$eval('#worldMoreMenu',el=>el.hidden),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'worldMoreBtn');
  await press(page,'#worldMoreBtn');await press(page,'[data-world-settings]');await page.waitForSelector('#settings:not([hidden])');await press(page,'.set-close');assert.equal(await page.evaluate(()=>document.activeElement.id),'worldMoreBtn');
  // A real exhibit interaction after entering, rather than only a canvas/class check.
  const index=await page.evaluate(()=>window.__museum.PIECES.findIndex(piece=>piece.bike&&Math.hypot(piece.view.x-window.__museum.P.x,piece.view.z-window.__museum.P.z)>9));
  await page.$eval(`.chip[data-i="${index}"]`,el=>el.scrollIntoView({block:'center',inline:'center'}));assert.ok(await page.$eval(`.chip[data-i="${index}"]`,button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===button||button.contains(hit);}), 'Gallery rail must not be covered by app navigation');await press(page,`.chip[data-i="${index}"]`);
  await page.waitForFunction(()=>document.querySelector('#card')?.classList.contains('on'));
  assert.ok(await page.$eval('#cName',el=>el.textContent.trim().length>0),'Exhibit must have its real story');
  await page.$eval('#cExplode',e=>e.scrollIntoView({block:'center'}));await press(page,'#cExplode');await page.waitForFunction(()=>window.__museum.inspectionFocus?.piece?.ex>.99,{timeout:15000});
  const framing=await page.evaluate(()=>{const api=window.__museum,b=api.inspectionBounds(),r=api.inspectionViewport();api.camera.updateMatrixWorld(true);const points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=api.camera.position.clone().set(x,y,z).project(api.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});}return {region:r,points};});
  for(const point of framing.points)assert.ok(point.x>=framing.region.x-3&&point.x<=framing.region.x+framing.region.width+3&&point.y>=framing.region.y-3&&point.y<=framing.region.y+framing.region.height+3,`Museum explosion clips: ${JSON.stringify(framing)}`);
  await page.screenshot({path:new URL(`museum-exploded-${width}.png`,out).pathname});await page.$eval('#cExplode',e=>e.scrollIntoView({block:'center'}));await press(page,'#cExplode');
  await page.waitForFunction(()=>!window.__museum.inspectionFocus,{timeout:15000});
  await page.waitForFunction(()=>{const e=document.querySelector('#cardClose'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),top=document.querySelector('#card').getBoundingClientRect().top;const previous=window.__cardTestGeometry;window.__cardTestGeometry={top,at:previous?.top===top?previous.at:performance.now()};return performance.now()-window.__cardTestGeometry.at>200&&(hit===e||e.contains(hit));});
  await press(page,'#cardClose');await page.waitForFunction(()=>!document.body.classList.contains('card-open'));await page.waitForFunction(()=>{const e=document.querySelector('#worldMoreBtn'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit);});await press(page,'#worldMoreBtn');await page.waitForSelector('#worldMoreMenu:not([hidden])');await press(page,'[data-world-home]');await page.waitForSelector('#konaPanel:not([hidden])');
  const home=await page.$eval('#konaPanelBody',root=>({first:root.firstElementChild.classList.contains('home-world-hero'),button:!!root.querySelector('[data-home-world]')}));
  assert.ok(home.first&&home.button,'Museum must lead Home without a Find');
  await page.$eval('[data-home-world]',button=>button.scrollIntoView({block:'center'}));await press(page,'[data-home-world]');
  await page.waitForFunction(()=>document.querySelector('#konaPanel').hidden&&document.body.classList.contains('museum-open'));
  assert.equal(requests.filter(url=>url.endsWith('/app/hall.js')).length,1,'Return reuses the existing renderer');assert.deepEqual(errors,[]);
  report.push({width,height,returning,...first,actualGallery:true,exhibitStory:true,exploreAndMenu:true,expandedBikeFits:true,homeUngated:true,status:'PASS'});await context.close();
 }
 const context=await browser.createBrowserContext(),page=await context.newPage();let rejectHall=true;
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await page.setBypassServiceWorker(true);await page.setRequestInterception(true);
 page.on('request',request=>request.url().endsWith('/app/hall.js')&&rejectHall?request.abort():request.continue());
 await page.goto(base,{waitUntil:'networkidle2'});await page.waitForFunction(()=>window.__konaShell);await press(page,'#entryWorld');
 await page.waitForFunction(()=>document.querySelector('[data-museum-status]').textContent.includes('could not open'));
 assert.ok(await page.$eval('#entryWorld',button=>!button.disabled));assert.equal(await page.$('[data-onboarding-question]'),null);
 rejectHall=false;await press(page,'#entryWorld');await page.waitForFunction(()=>document.body.classList.contains('walking')&&window.__museum?.renderer);
 report.push({journey:'Failed runtime download stays on landing with a working retry; retry enters actual museum',status:'PASS'});await context.close();
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(new URL('museum-entry-report.json',out),JSON.stringify(report,null,2));await browser.close();}
