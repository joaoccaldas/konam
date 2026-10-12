// Derived, static previews of existing Find meshes. No renderer runs in the collection grid.
// Start the local site first; run: node tools/build_find_thumbnails.mjs http://127.0.0.1:8765
import fs from 'node:fs';
import {createRequire} from 'node:module';
const root=new URL('../',import.meta.url).pathname;
const require=createRequire(root+'web/package.json'),puppeteer=require('puppeteer-core');
const base=process.argv[2]||'http://127.0.0.1:8765';
const registry=JSON.parse(fs.readFileSync(root+'museum/game/finds-v1.json'));
const output=root+'assets/entry/finds';fs.mkdirSync(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal']});
try{
 const page=await browser.newPage();await page.setViewport({width:320,height:240,deviceScaleFactor:1});
 await page.goto(base+'/privacy.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{document.body.innerHTML='<canvas style="display:block;width:320px;height:240px"></canvas>';document.body.style.cssText='margin:0;background:#f4efe7';await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='app/collectible-stage.js';s.onload=resolve;s.onerror=reject;document.body.append(s);});});
 for(const item of registry.items.filter(i=>i.model)){
  await page.evaluate(async model=>{window.previewStage?.dispose();window.previewStage=await window.__mountCollectibleStage(document.querySelector('canvas'),{model,motion:'reduced'});},item.model);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await (await page.$('canvas')).screenshot({path:output+'/'+item.model.node+'.png'});
  console.log(item.id);
 }
}finally{await browser.close();}
