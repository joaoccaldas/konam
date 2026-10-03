import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8765/norwegian-engine-review.html';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/evidence/nor3-canonical');
fs.mkdirSync(out,{recursive:true});

const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});

const views=['overview','lanes','protocol','altitude','vault','fjord','recovery','kona'];
const configs=[
  {name:'desktop',viewport:{width:1440,height:900,deviceScaleFactor:1},views},
  {name:'phone390',viewport:{width:390,height:844,deviceScaleFactor:1},views:['overview','lanes','protocol','recovery','kona']},
  {name:'landscape',viewport:{width:844,height:390,deviceScaleFactor:1},views:['overview','lanes','protocol','fjord','kona']}
];

const results=[];
for(const cfg of configs){
  const page=await browser.newPage();
  await page.setViewport(cfg.viewport);
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('response',res=>{if(res.status()>=400)errors.push('http '+res.status()+': '+res.url())});
  await page.goto(base,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction(()=>window.__NOR3_REVIEW_READY===true&&window.__NOR3_REVIEW_API,{timeout:60000});
  for(const view of cfg.views){
    await page.evaluate(v=>window.__NOR3_REVIEW_API.setView(v),view);
    await new Promise(r=>setTimeout(r,1100));
    await page.screenshot({path:path.join(out,cfg.name+'-'+view+'.png')});
  }
  const metrics=await page.evaluate(()=>window.__NOR3_REVIEW_API.metrics());
  fs.writeFileSync(path.join(out,cfg.name+'-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
  fs.writeFileSync(path.join(out,cfg.name+'-errors.json'),JSON.stringify(errors,null,2)+'\n');
  results.push({name:cfg.name,metrics,errors});
  await page.close();
}
await browser.close();

const room=JSON.parse(fs.readFileSync(path.join(root,'world/konam/rooms/norwegian-engine.room.json'),'utf8'));
const budget=name=>name==='desktop'?room.performance.desktop:room.performance.mobile;
const violations=[];
for(const r of results){
  if(r.errors.length)violations.push(r.name+': browser errors: '+r.errors.join('; '));
  const b=budget(r.name);
  if(r.metrics.draw_calls>b.max_room_draw_calls)violations.push(r.name+': draw calls '+r.metrics.draw_calls+' > '+b.max_room_draw_calls);
  if(r.metrics.triangles>b.max_room_triangles)violations.push(r.name+': triangles '+r.metrics.triangles+' > '+b.max_room_triangles);
}
const summary={captured_at:new Date().toISOString(),source:'canonical buildInstallation("norwegian")',variant:'cinematic-production-v3',results,violations};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
if(violations.length){console.error(violations.join('\n'));process.exit(1)}
console.log(JSON.stringify(summary,null,2));
