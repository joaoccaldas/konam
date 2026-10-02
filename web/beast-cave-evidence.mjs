import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8765/review/beast-cave/';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/evidence/beast-cave');
fs.mkdirSync(out,{recursive:true});

const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});

async function openViewport(viewport){
  const page=await browser.newPage();
  await page.setViewport(viewport);
  const errors=[];
  page.on('console',m=>{if(m.type()==='error') errors.push('console: '+m.text())});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('response',res=>{if(res.status()>=400) errors.push(`http ${res.status()}: ${res.url()}`)});
  page.on('requestfailed',req=>errors.push(`requestfailed: ${req.url()} :: ${req.failure()?.errorText||'unknown'}`));
  await page.goto(base,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction(()=>window.__BEAST_CAVE_RENDER_READY===true,{timeout:60000});
  return {page,errors};
}

async function capture(page,name,pose){
  await page.evaluate(async p=>window.__BEAST_CAVE_REVIEW.setPose(p,true),pose);
  await new Promise(r=>setTimeout(r,220));
  await page.screenshot({path:path.join(out,name+'.png')});
}

const desktop=await openViewport({width:1440,height:900,deviceScaleFactor:1});
for(const [name,pose] of [
  ['desktop-01-overview','overview'],
  ['desktop-02-machine','trainer'],
  ['desktop-03-heat','heat'],
  ['desktop-04-run-lab','runlab'],
  ['desktop-05-iterations','gallery'],
  ['desktop-06-gear','gear'],
  ['desktop-07-recovery','recovery'],
  ['desktop-08-kona-horizon','kona'],
  ['desktop-09-threshold','threshold']
]) await capture(desktop.page,name,pose);

await desktop.page.evaluate(()=>{
  const card=document.getElementById('inspect');
  document.getElementById('inspectTitle').textContent='Triathlon bike';
  document.getElementById('inspectBody').textContent='Hero bike slot. Current room uses procedural candidate geometry until the exact sourced race-bike GLB is approved.';
  card.style.display='block';
});
await capture(desktop.page,'desktop-10-inspect-card','trainer');

const metrics=await desktop.page.evaluate(()=>{
  const api=window.__BEAST_CAVE_REVIEW;
  api.renderer.render(api.scene,api.camera);
  const info=api.renderer.info.render;
  let meshes=0,lights=0,materials=new Set(),geometries=new Set(),textures=new Set();
  const names=[];
  api.built.group.traverse(o=>{
    if(o.isMesh){meshes++;geometries.add(o.geometry.uuid);const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(!m)continue;materials.add(m.uuid);if(m.map)textures.add(m.map.uuid);if(m.emissiveMap)textures.add(m.emissiveMap.uuid);}}
    if(o.isLight)lights++;
    if(o.name) names.push(o.name);
  });
  return {
    bounds:api.built.bounds,
    zones:api.built.zones,
    meshes,lights,
    unique_geometries:geometries.size,
    unique_materials:materials.size,
    textures:textures.size,
    pickables:api.pickables.length,
    obstacles:api.obstacles.length,
    draw_calls:info.calls,
    triangles:info.triangles,
    points:info.points,
    lines:info.lines,
    object_names:names
  };
});
fs.writeFileSync(path.join(out,'render-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
fs.writeFileSync(path.join(out,'browser-errors.json'),JSON.stringify(desktop.errors,null,2)+'\n');
await desktop.page.close();

const mobile=await openViewport({width:390,height:844,deviceScaleFactor:1});
for(const [name,pose] of [
  ['mobile-01-overview','overview'],
  ['mobile-02-machine','trainer'],
  ['mobile-03-gear','gear'],
  ['mobile-04-kona-horizon','kona']
]) await capture(mobile.page,name,pose);
fs.writeFileSync(path.join(out,'mobile-browser-errors.json'),JSON.stringify(mobile.errors,null,2)+'\n');
await mobile.page.close();

await browser.close();
console.log(JSON.stringify({out,base,metrics},null,2));
