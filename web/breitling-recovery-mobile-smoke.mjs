import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8765/index.html';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/evidence/final-room-recovery-20261004/breitling-mobile');
fs.mkdirSync(out,{recursive:true});

const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
  headless:true,
  protocolTimeout:180000,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']
});

const configs=[
  {name:'phone390',width:390,height:844},
  {name:'landscape',width:844,height:390}
];

const results=[];
for(const cfg of configs){
  const page=await browser.newPage();
  await page.setViewport({width:cfg.width,height:cfg.height,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.setDefaultTimeout(90000);
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/CERT|vibrate|net::ERR/.test(m.text()))errors.push('console: '+m.text().slice(0,240))});
  page.on('response',r=>{if(r.status()>=400)errors.push('http '+r.status()+': '+r.url())});
  const url=new URL(base);url.searchParams.set('reviewRoom','breitling-kona');
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__museum?.beast?.group&&window.__museumGo,{timeout:60000});
  await page.evaluate(()=>window.__museumGo('beast'));
  await page.waitForFunction(()=>window.__museum?.beast?.group?.visible===true,{timeout:30000});
  let assetReady=true;
  try{await page.waitForFunction(()=>Boolean(window.__museum?.beast?.bikeSpot?.bike),{timeout:25000})}catch{assetReady=false}
  await new Promise(r=>setTimeout(r,2500));
  const metrics=await page.evaluate(()=>{
    const m=window.__museum,ren=m.renderer;
    ren.info.autoReset=true;ren.render(m.scene,m.camera);
    let meshes=0,tris=0;
    m.beast.group.traverse(o=>{if(o.isMesh&&o.visible){meshes++;const g=o.geometry;tris+=((g?.index?g.index.count:g?.attributes?.position?.count||0)/3)*(o.isInstancedMesh?o.count:1)}});
    return {room:m.beast.group.name,visible:m.beast.group.visible,ownBikes:m.beast.ownBikes===true,hasHeroAsset:Boolean(m.beast.bikeSpot?.bike),room_meshes:meshes,room_triangles:Math.round(tris),scene_calls:ren.info.render.calls,scene_triangles:ren.info.render.triangles};
  });
  await page.screenshot({path:path.join(out,cfg.name+'.png'),fullPage:false});
  results.push({...cfg,assetReady,metrics,errors:[...new Set(errors)]});
  await page.close();
}
await browser.close();
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({source_sha:process.env.GIT_SHA||'UNKNOWN',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
const bad=results.flatMap(r=>[
  ...(r.metrics.room!=='beastCaveRoom'||r.metrics.visible!==true?[r.name+': final room not visible']:[]),
  ...(!r.metrics.ownBikes?[r.name+': wrong room contract']:[]),
  ...(!r.assetReady?[r.name+': hero watch asset did not become ready']:[]),
  ...r.errors.map(e=>r.name+': '+e)
]);
if(bad.length){console.error(bad.join('\n'));process.exit(1)}
