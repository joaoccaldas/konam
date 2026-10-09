// Host-level observations on this computer; these are not physical-phone FPS or budget certification.
import {createRequire} from 'node:module';import fs from 'node:fs';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,''),base=process.argv[2]||'http://127.0.0.1:8765',out=process.argv[3]||root+'/output/playwright/world-runtime';fs.mkdirSync(out,{recursive:true});
const {default:puppeteer}=await import(root+'/web/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
const {roomOverview}=await import(root+'/web/src/world/map-model.js');
const budgets=JSON.parse(fs.readFileSync(root+'/config/performance-budgets.json'));const rows=[];
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--use-angle=metal'],protocolTimeout:120000});
try{for(const [name,width,height,quality] of JSON.parse(process.env.KONA_WORLD_VIEWPORTS||'[ ["phone",390,844,"low"], ["landscape",844,390,"low"], ["desktop",1440,900,"high"] ]')){
 const ctx=await b.createBrowserContext(),p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setViewport({width,height,isMobile:name!=='desktop',hasTouch:name!=='desktop',deviceScaleFactor:1});await p.setBypassServiceWorker(true);await p.setRequestInterception(true);p.on('request',r=>/supabase|plausible|googletagmanager/.test(r.url())?r.abort():r.continue());
 await p.evaluateOnNewDocument(quality=>{localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,appearance:'light',quality,motion:'reduced'}));localStorage.setItem('kona.onboarding.v1','seen');},quality);
 await p.goto(base+'/?room=hall',{waitUntil:'domcontentloaded',timeout:30000});await p.waitForFunction(()=>window.__museum?.renderer,{timeout:90000});
 await new Promise(r=>setTimeout(r,4000));
 const routes=JSON.parse(fs.readFileSync(root+'/world/konam/founding-runtime-v1.json')).routes;
 const targets=process.env.KONA_WORLD_TARGETS?.split(',')||[...new Set(routes.filter(x=>x.action.kind==='world').map(x=>x.action.target)), 'room-bio','room-horror','room-alien','room-zombie','breitling'];
 const areas=await p.evaluate(()=>[
{id:'hall',floor:'ground',x0:-7,x1:7,z0:5,z1:-46.5},
{id:'kona',floor:'ground',x0:-19.3,x1:-7.3,z0:-8.8,z1:-25.6},
{id:'pier',floor:'ground',x0:-7,x1:7,z0:-46.5,z1:-73},
...window.__gallery.bays.map(b=>({id:'bay-'+b.id,floor:'upper',x0:8.4,x1:14.8,z0:b.z-1.8,z1:b.z+1.8})),
...window.__gallery.rooms.map(r=>({id:'room-'+r.id,floor:'upper',...r.bounds})),
...window.__atlas.wings.map(w=>({id:'wing-'+w.id,floor:w.floor,...w.corridor})),
...window.__atlas.rooms.map(r=>({id:'atlas-'+r.wing+'-'+r.id,floor:'upper',...r.rect})),
]);
 for(const target of targets){
  const area=areas?.find(a=>a.id===target);if(!area){rows.push({name,target,unavailable:true});continue;}
  const ov=roomOverview(area,{upperY:8.2,groundY:1.6});
  await p.evaluate(({target,ov})=>{window.__museumGo(target);const m=window.__museum;m.halt();Object.assign(m.P,{x:ov.to.x,z:ov.to.z,y:ov.face.y-1.6,drop:0,vx:0,vz:0});m.P.yaw=Math.atan2(-(ov.face.x-ov.to.x),-(ov.face.z-ov.to.z));m.P.pitch=Math.atan2(0,Math.hypot(ov.face.x-ov.to.x,ov.face.z-ov.to.z));}, {target,ov});
  await new Promise(r=>setTimeout(r,2400));
  const metrics=await p.evaluate(async()=>{const m=window.__museum,r=m.renderer,frames=[];let prev=performance.now();await new Promise(done=>{const frame=t=>{frames.push(t-prev);prev=t;if(frames.length<45)requestAnimationFrame(frame);else done()};requestAnimationFrame(frame)});r.info.autoReset=true;r.render(m.scene,m.camera);return {drawCalls:r.info.render.calls,triangles:r.info.render.triangles,textures:r.info.memory.textures,geometries:r.info.memory.geometries,dpr:r.getPixelRatio(),frameMedianMs:frames.sort((a,b)=>a-b)[22],room:window.__map.here()?.id,quality:window.__konaProfile.get().quality};});
  await p.screenshot({path:out+'/'+name+'-'+target+'.jpg',quality:70,type:'jpeg'});
  rows.push({name,target,...metrics});fs.writeFileSync(out+'/metrics.json',JSON.stringify({rows,errors},null,2));console.log(JSON.stringify(rows.at(-1)));
 }
 rows.push({name,errors});await ctx.close();
}}finally{await b.close();fs.writeFileSync(out+'/metrics.json',JSON.stringify({rows,budgets,limitation:'Desktop Chrome emulates mobile viewport and quality; frame timings are observations on this Mac, not physical phone FPS.'},null,2));}
