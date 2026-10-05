// Public-page portrait audit. Browser emulation is not physical-device proof.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.env.AUDIT_ROOT||'.');
const base=process.argv[2]||'http://127.0.0.1:8744/';
const out=path.resolve(process.argv[3]||'output/playwright/pages');
fs.mkdirSync(out,{recursive:true});
const profiles={phone320:{width:320,height:720},phone393:{width:393,height:852},phone430:{width:430,height:932},landscape:{width:852,height:393},desktop:{width:1440,height:900},desktopPhone:{width:980,height:2125,screenWidth:393,screenHeight:852}};
const selected=process.env.AUDIT_PROFILE?[process.env.AUDIT_PROFILE]:Object.keys(profiles);
for(const id of selected)if(!profiles[id])throw new Error('Unknown profile '+id);
const files=fs.readdirSync(root).filter(x=>x.endsWith('.html'));
function reviews(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())reviews(file);else if(entry.name.endsWith('.html'))files.push(path.relative(root,file));}}
reviews(path.join(root,'review'));files.sort();
const report={source_sha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),source_dirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),base,files,generated_at:new Date().toISOString(),limitations:['Emulated desktop-site phone uses a synthetic screen size; confirm on physical Android/PWA.','Frame timing in headless software rendering is not mobile GPU performance.','Admin and authenticated states require separate app-state coverage.'],rows:[]};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const profile of selected)for(const file of files){
 const vp=profiles[profile],context=await browser.createBrowserContext(),p=await context.newPage();
 const errors=[],missing=[];const row={profile,file,status:'FAIL',errors,missing};
 p.on('pageerror',e=>errors.push(e.message));
 p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.status()+' '+r.url().slice(base.length));});
 try{
  await p.setBypassServiceWorker(true);
  await p.setViewport({width:vp.width,height:vp.height,deviceScaleFactor:1,isMobile:profile!=='desktop'&&profile!=='desktopPhone',hasTouch:profile!=='desktop'});
  if(vp.screenWidth)await p.evaluateOnNewDocument(({w,h})=>{Object.defineProperty(screen,'width',{get:()=>w});Object.defineProperty(screen,'height',{get:()=>h});},{w:vp.screenWidth,h:vp.screenHeight});
  await p.goto(new URL(file,base.endsWith('/')?base:base+'/').href,{waitUntil:'networkidle0',timeout:60000});
  await p.evaluate(()=>document.fonts.ready);
  if(file==='index.html')await p.waitForFunction(()=>window.__konaShell,{timeout:20000});
  row.metrics=await p.evaluate(()=>{
   const visible=e=>{if(!e.getClientRects().length)return false;for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity<.02)return false;}return true;};
   const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const cta=document.querySelector('#buildSelf'),heading=document.querySelector('#intro h1');
   const cr=rect(cta),hr=rect(heading);
   const hit=cr?document.elementFromPoint(cr.x+cr.width/2,cr.y+cr.height/2):null;
   const textOverflow=[...document.querySelectorAll('h1,h2,h3,button,input,select')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX!=='auto').map(e=>e.id||e.textContent.trim().slice(0,60));
   const intersects=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
   const header=rect(document.querySelector('.promo-header,.about-header')),rail=rect(document.querySelector('.field-rail-toggle'));
   const editorial=[...document.querySelectorAll('.promo-manifesto-copy,.promo-story-copy,.about-story-copy,.about-hero-copy')].filter(visible).map(rect).filter(r=>r.bottom>0&&r.y<innerHeight);
   return{title:document.title,viewport:{width:innerWidth,height:innerHeight},fit:document.documentElement.classList.contains('phone-fit'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,textOverflow,editorialOcclusion:editorial.some(r=>intersects(header,r)||intersects(rail,r)),landing:cr?{cta:cr,heading:hr,ctaVisible:visible(cta),ctaReachable:!!hit&&(hit===cta||cta.contains(hit)),copyWidth:document.querySelector('.entry-copy')?.getBoundingClientRect().width,containerWidth:document.querySelector('.intro-inner')?.getBoundingClientRect().width}:null,canvas:[...document.querySelectorAll('canvas')].filter(visible).map(rect),timing:performance.getEntriesByType('navigation').map(n=>({domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd})),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.transferSize,duration:r.duration}))};
  });
  const m=row.metrics;row.violations=[];
  if(m.overflow)row.violations.push('horizontal overflow');
  if(m.editorialOcclusion)row.violations.push('editorial content covered');
  if(m.textOverflow.length)row.violations.push('text overflow: '+m.textOverflow.join(', '));
  if(file==='index.html'){
   const l=m.landing;
   if(!l||!l.ctaVisible||!l.ctaReachable)row.violations.push('entry action missing or covered');
   if(l&&(l.cta.bottom>vp.height||l.cta.y<0))row.violations.push('entry action outside first viewport');
   if(profile.startsWith('phone')||profile==='desktopPhone'){
    if(l&&l.copyWidth<l.containerWidth*.85)row.violations.push('portrait copy collapsed into desktop column');
    if(l&&l.heading.y>vp.height*.25)row.violations.push('excess blank space before headline');
   }
  }
  row.status=errors.length||missing.length||row.violations.length?'FAIL':'PASS';
 }catch(error){row.failure=String(error.stack||error);}
 finally{await p.screenshot({path:path.join(out,profile+'-'+file.replaceAll('/','_').replace('.html','.png')),fullPage:false}).catch(()=>{});report.rows.push(row);write();console.log(profile,file,row.status,row.failure||row.violations||'');await context.close();}
}}finally{await browser.close();write();}
if(report.rows.some(row=>row.status==='FAIL'))process.exitCode=1;
