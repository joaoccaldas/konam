import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(root, process.argv[3] || 'docs/evidence/final-room-recovery-20261004/runtime');
const refs = process.argv[4] ? path.resolve(root, process.argv[4]) : null;
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
fs.mkdirSync(out,{recursive:true});

const rooms = [
  {
    id:'nor3-winter',
    package:'world/konam/rooms/norwegian-engine.room.json',
    decor:'world/konam/rooms/nor3-winter.decor.json',
    refPrefix:'nor',
    compare:['hero','lanes','bike1','bike3','window','painting','fire','plunge']
  },
  {
    id:'beast-cave',
    package:'world/konam/rooms/beast-cave.room.json',
    decor:null,
    refPrefix:'beast',
    compare:[]
  },
  {
    id:'breitling-kona',
    package:'world/konam/rooms/breitling-kona.room.json',
    decor:'world/konam/rooms/breitling-kona.decor.json',
    refPrefix:'bk',
    compare:['hero','monument','low','vitrine','window','clock','exploded2']
  }
];

const configs = [
  {id:'desktop', width:1440,height:900,mobile:false,budget:'desktop'},
  {id:'phone390', width:390,height:844,mobile:true,budget:'mobile'},
  {id:'landscape', width:844,height:390,mobile:true,budget:'mobile'}
];

const browser = await puppeteer.launch({
  executablePath:chrome,
  headless:true,
  protocolTimeout:600000,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']
});

function pct(a,q){
  if(!a.length)return null;
  const s=[...a].sort((x,y)=>x-y);
  return +s[Math.min(s.length-1,Math.max(0,Math.floor((s.length-1)*q)))].toFixed(3);
}
async function sampleFrames(page,ms=2500){
  return page.evaluate(async duration=>{
    const d=[];let last=performance.now(),start=last;
    await new Promise(resolve=>{
      function step(now){if(now>last)d.push(now-last);last=now;if(now-start>=duration)resolve();else requestAnimationFrame(step)}
      requestAnimationFrame(step);
    });
    return d;
  },ms);
}
async function openReview(room,{width,height,mobile},clock=false){
  const page=await browser.newPage();
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  page.setDefaultTimeout(180000);
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/CERT|vibrate|net::ERR/.test(m.text()))errors.push('console: '+m.text().slice(0,300))});
  page.on('response',r=>{if(r.status()>=400)errors.push('http '+r.status()+': '+r.url())});
  if(clock){
    await page.evaluateOnNewDocument(()=>{
      let vt=1000;
      const real=window.requestAnimationFrame.bind(window);
      window.__RECOVERY_ADVANCE=(ms=40)=>{vt+=ms};
      window.requestAnimationFrame=cb=>real(()=>cb(vt));
      try{Object.defineProperty(performance,'now',{value:()=>vt,configurable:true})}catch{}
    });
  }
  const url=new URL(base);url.searchParams.set('reviewRoom',room.id);
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>window.__museum?.beast?.group && window.__museumGo,{timeout:90000});
  await page.evaluate(()=>window.__museumGo('beast'));
  await page.waitForFunction(()=>window.__museum?.beast?.group?.visible===true,{timeout:60000});
  // Final NOR/Breitling rooms own their assets. Do not block the entire evidence run waiting
  // for one mobile GLB to populate bikeSpot; asset failures are already captured as HTTP/console errors.
  const readiness=await page.evaluate(()=>({
    ownBikes:window.__museum?.beast?.ownBikes===true,
    hasBike:Boolean(window.__museum?.beast?.bikeSpot?.bike),
    room:window.__museum?.beast?.group?.name||null
  }));
  if(!readiness.ownBikes&&!readiness.hasBike){
    try{await page.waitForFunction(()=>Boolean(window.__museum?.beast?.bikeSpot?.bike),{timeout:30000})}catch{}
  }
  await new Promise(r=>setTimeout(r,3500));
  console.log('ready',room.id,width+'x'+height,JSON.stringify(readiness));
  return {page,errors};
}
async function place(page,s){
  if(!s)return;
  await page.evaluate(([x,z,drop,lx,ly,lz])=>{
    const m=window.__museum;m.halt?.();
    Object.assign(m.P,{x,z,drop,vx:0,vz:0});
    const eye=1.6+drop;
    m.P.yaw=Math.atan2(-(lx-x),-(lz-z));
    m.P.pitch=Math.atan2(ly-eye,Math.hypot(lx-x,lz-z));
  },s);
  if(typeof s[6]==='string')await page.evaluate(method=>window.__museum?.beast?.[method]?.(),s[6]);
  for(let i=0;i<5;i++){
    await page.evaluate(()=>{window.__RECOVERY_ADVANCE?.(40)});
    await new Promise(r=>setTimeout(r,50));
  }
}
async function runtimeMetrics(page){
  return page.evaluate(()=>{
    const m=window.__museum,ren=m.renderer;
    ren.info.autoReset=true;ren.render(m.scene,m.camera);
    const ri=ren.info.render;
    let roomMeshes=0,roomTriangles=0,materials=new Set();
    m.beast?.group?.traverse(o=>{
      if(!o.isMesh||!o.visible)return;
      roomMeshes++;
      const g=o.geometry;
      const t=(g?.index?g.index.count:g?.attributes?.position?.count||0)/3;
      roomTriangles+=t*(o.isInstancedMesh?o.count:1);
      for(const mat of (Array.isArray(o.material)?o.material:[o.material]))if(mat)materials.add(mat.uuid||mat.id);
    });
    return {
      scene_calls:ri.calls,
      scene_triangles:ri.triangles,
      room_meshes:roomMeshes,
      room_triangles:Math.round(roomTriangles),
      unique_room_materials:materials.size,
      dpr:ren.getPixelRatio?.()??null
    };
  });
}
async function canvasShot(page,file){
  const el=await page.$('#hall');
  if(!el)throw new Error('hall canvas missing');
  await el.screenshot({path:file,type:'png'});
}
async function similarity(candidate,reference){
  const a=fs.readFileSync(candidate).toString('base64');
  const b=fs.readFileSync(reference).toString('base64');
  const page=await browser.newPage();
  const result=await page.evaluate(async({a,b})=>{
    const load=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src});
    const [ia,ib]=await Promise.all([load('data:image/png;base64,'+a),load('data:image/jpeg;base64,'+b)]);
    const w=160,h=90;
    const ca=document.createElement('canvas'),cb=document.createElement('canvas');ca.width=cb.width=w;ca.height=cb.height=h;
    const xa=ca.getContext('2d'),xb=cb.getContext('2d');xa.drawImage(ia,0,0,w,h);xb.drawImage(ib,0,0,w,h);
    const da=xa.getImageData(0,0,w,h).data,db=xb.getImageData(0,0,w,h).data;
    let sum=0,luma=0;
    for(let i=0;i<da.length;i+=4){
      sum+=Math.abs(da[i]-db[i])+Math.abs(da[i+1]-db[i+1])+Math.abs(da[i+2]-db[i+2]);
      const ya=.2126*da[i]+.7152*da[i+1]+.0722*da[i+2],yb=.2126*db[i]+.7152*db[i+1]+.0722*db[i+2];
      luma+=Math.abs(ya-yb);
    }
    const n=w*h;
    return {
      rgb_similarity:+(1-sum/(n*3*255)).toFixed(5),
      mean_abs_luma:+(luma/n).toFixed(3),
      candidate_size:[ia.naturalWidth,ia.naturalHeight],
      reference_size:[ib.naturalWidth,ib.naturalHeight]
    };
  },{a,b});
  await page.close();
  return result;
}

const summary={schema_version:1,source_sha:process.env.GIT_SHA||'UNKNOWN',captured_at:new Date().toISOString(),rooms:{}};
for(const room of rooms){
  const dir=path.join(out,room.id);fs.mkdirSync(dir,{recursive:true});
  const pkg=JSON.parse(fs.readFileSync(path.join(root,room.package),'utf8'));
  const decor=room.decor?JSON.parse(fs.readFileSync(path.join(root,room.decor),'utf8')):{shots:{}};
  const hero=decor.shots?.hero||null;
  const rows=[];
  for(const cfg of configs){
    const {page,errors}=await openReview(room,cfg,false);
    if(hero)await place(page,hero);
    const frames=await sampleFrames(page,2500);
    const metrics=await runtimeMetrics(page);
    const avg=frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:null;
    const b=pkg.performance?.[cfg.budget]||null;
    const row={
      config:cfg.id,
      viewport:[cfg.width,cfg.height],
      fps_mean:avg?+(1000/avg).toFixed(2):null,
      frame_ms_p50:pct(frames,.5),frame_ms_p95:pct(frames,.95),frame_ms_p99:pct(frames,.99),
      ...metrics,
      budget:b?{calls:b.max_room_draw_calls,triangles:b.max_room_triangles}:null,
      within_budget:b?metrics.room_meshes<=b.max_room_draw_calls&&metrics.room_triangles<=b.max_room_triangles:null,
      errors:[...new Set(errors)]
    };
    await canvasShot(page,path.join(dir,cfg.id+'.png'));
    rows.push(row);await page.close();
  }
  const comparisons=[];
  if(room.decor){
    const {page,errors}=await openReview(room,{width:2400,height:1350,mobile:false},true);
    for(const shot of room.compare){
      const s=decor.shots?.[shot];if(!s)continue;
      await place(page,s);
      const file=path.join(dir,shot+'.png');await canvasShot(page,file);
      const ref=refs?path.join(refs,room.refPrefix+'-'+shot+'.jpg'):null;
      if(ref&&fs.existsSync(ref))comparisons.push({shot,...await similarity(file,ref)});
    }
    if(errors.length)rows.push({config:'canonical-shots',errors:[...new Set(errors)]});
    await page.close();
  }
  summary.rooms[room.id]={metrics:rows,comparisons};
}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');

const hardFailures=[];
for(const [id,r] of Object.entries(summary.rooms)){
  for(const m of r.metrics){
    if(m.within_budget===false)hardFailures.push(id+'/'+m.config+': budget exceeded');
    if(m.errors?.length)hardFailures.push(id+'/'+m.config+': '+m.errors.join('; '));
  }
}
await browser.close();
console.log(JSON.stringify(summary,null,2));
if(hardFailures.length){console.error(hardFailures.join('\n'));process.exit(1)}
