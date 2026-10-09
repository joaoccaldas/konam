// Verify the shared Find stage redraws on interaction, but does no continuous GPU work in reduced motion.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8765',report=[];
const finds=JSON.parse(fs.readFileSync(new URL('../museum/game/finds-v1.json',import.meta.url))).items.filter(i=>i.model);
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:[process.env.CI?'--use-angle=swiftshader':'--use-angle=metal']});
try{
 const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.goto(base+'/privacy.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  document.body.innerHTML='<canvas style="display:block;width:320px;height:240px"></canvas>';window.drawCalls=0;
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(...args){const gl=original.apply(this,args);if(gl&&String(args[0]).startsWith('webgl')&&!gl.__counted){gl.__counted=true;for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const draw=gl[name];if(draw)gl[name]=function(...args){window.drawCalls++;return draw.apply(this,args);};}}return gl;};
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='app/collectible-stage.js';script.onload=resolve;script.onerror=reject;document.body.append(script);});
 });
 for(const item of finds){
  await page.evaluate(async model=>{window.stage?.dispose();window.stage=await window.__mountCollectibleStage(document.querySelector('canvas'),{model,motion:'reduced'});},item.model);
  await new Promise(r=>setTimeout(r,250));const before=await page.evaluate(()=>drawCalls);await new Promise(r=>setTimeout(r,350));const after=await page.evaluate(()=>drawCalls);
  assert.ok(before>0);assert.equal(after,before,'reduced motion stops continuous GPU draws');
  await page.mouse.move(160,120);await page.mouse.down();await page.mouse.move(220,140,{steps:4});await page.mouse.up();
  assert.ok(await page.evaluate(()=>drawCalls)>after,'dragging redraws the object');
  report.push({id:item.id,idleDrawCalls:after-before,status:'PASS'});
 }
 await page.evaluate(()=>stage.dispose());assert.equal(await page.$eval('canvas',c=>c.__collectibleStage),false);
}finally{await browser.close();fs.mkdirSync(new URL('../output/playwright/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/playwright/collectible-browser-audit.json',import.meta.url),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
