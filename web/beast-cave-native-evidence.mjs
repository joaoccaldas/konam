import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8765/';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/evidence/beast-cave-native');
fs.mkdirSync(out,{recursive:true});

const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});

async function open(viewport,label){
  const page=await browser.newPage();
  await page.setViewport(viewport);
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('response',res=>{if(res.status()>=400)errors.push('http '+res.status()+': '+res.url())});
  const url=new URL(base);
  url.searchParams.set('reviewRoom','beast-cave');
  url.searchParams.set('room','beast');
  await page.goto(url.href,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction(()=>window.__museum?.beast?.group && window.__museumGo,{timeout:60000});
  await page.evaluate(()=>window.__museumGo('beast'));
  await new Promise(r=>setTimeout(r,1800));
  const state=await page.evaluate(()=>({
    room:window.__museum?.beast?.group?.name||null,
    visible:window.__museum?.beast?.group?.visible??null,
    pickables:window.__museum?.pickables?.length||0,
    obstacles:window.__museum?.obstacles?.length||0,
    url:location.href
  }));
  await page.screenshot({path:path.join(out,label+'.png'),fullPage:false});
  fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({state,errors},null,2)+'\n');
  await page.close();
  return {label,state,errors};
}

const results=[];
results.push(await open({width:1440,height:900,deviceScaleFactor:1},'desktop'));
results.push(await open({width:390,height:844,deviceScaleFactor:1},'phone390'));
results.push(await open({width:844,height:390,deviceScaleFactor:1},'landscape'));

await browser.close();
const bad=results.flatMap(x=>x.errors.map(e=>x.label+': '+e));
if(results.some(x=>x.state.room!=='beastCaveRoom'||x.state.visible!==true)) throw new Error('Beast Cave native room did not become visible');
if(bad.length) throw new Error(bad.join('\n'));
console.log(JSON.stringify(results,null,2));
