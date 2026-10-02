import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8755/experiences/beast-cave/';
const out=process.argv[3]||'beast-cave-experience-evidence';
fs.mkdirSync(out,{recursive:true});

const candidates=[
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium'
].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath) throw new Error('Chrome/Chromium required');

const browser=await puppeteer.launch({
  executablePath,
  headless:'new',
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});

async function pageFor(vp){
  const page=await browser.newPage();
  await page.setViewport(vp);
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push('http '+r.status()+': '+r.url())});
  await page.goto(base,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction(()=>window.__BEAST_CAVE_READY===true,{timeout:90000});
  return {page,errors};
}
async function shot(page,name){
  await new Promise(r=>setTimeout(r,260));
  await page.screenshot({path:path.join(out,name+'.png')});
}

const desktop=await pageFor({width:1440,height:900,deviceScaleFactor:1});
await shot(desktop.page,'desktop-01-entry');
await desktop.page.click('#enterRoom');
await new Promise(r=>setTimeout(r,2100));
await shot(desktop.page,'desktop-02-room');
await desktop.page.evaluate(()=>window.__BEAST_CAVE_EXPERIENCE.focusHotspot('machine'));
await shot(desktop.page,'desktop-03-machine-story');
await desktop.page.evaluate(()=>{document.getElementById('closeStory').click();window.__BEAST_CAVE_EXPERIENCE.focusHotspot('iterations')});
await shot(desktop.page,'desktop-04-iterations-story');
await desktop.page.evaluate(()=>{document.getElementById('closeStory').click();window.__BEAST_CAVE_EXPERIENCE.focusHotspot('horizon')});
await shot(desktop.page,'desktop-05-horizon-story');
fs.writeFileSync(path.join(out,'desktop-errors.json'),JSON.stringify(desktop.errors,null,2)+'\n');
await desktop.page.close();

const mobile=await pageFor({width:390,height:844,deviceScaleFactor:1});
await shot(mobile.page,'mobile-01-entry');
await mobile.page.click('#enterRoom');
await new Promise(r=>setTimeout(r,2100));
await shot(mobile.page,'mobile-02-room');
await mobile.page.evaluate(()=>window.__BEAST_CAVE_EXPERIENCE.focusHotspot('machine'));
await shot(mobile.page,'mobile-03-story');
fs.writeFileSync(path.join(out,'mobile-errors.json'),JSON.stringify(mobile.errors,null,2)+'\n');
await mobile.page.close();

await browser.close();
console.log(JSON.stringify({base,out},null,2));
