// Review rendered composition, clipped boxes and covered controls across public pages and app routes.
// Chrome emulates viewport/touch; this is not physical-device performance evidence.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const base=process.argv[2]||'http://127.0.0.1:8744';
const out=process.argv[3]||root+'/output/playwright/composition';
const require=createRequire(root+'/web/package.json');const puppeteer=require('puppeteer-core');
fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:[process.env.CI?'--use-angle=swiftshader':'--use-angle=metal'],timeout:60000});
const rows=[];const save=()=>fs.writeFileSync(out+'/report.json',JSON.stringify(rows,null,2));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function scan(p,name,width,height){
 const s=await p.evaluate(()=>{
  const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return !e.closest('[hidden]')&&s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>.05&&r.width>1&&r.height>1;};
  const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
  const issues=[],rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  for(const e of document.querySelectorAll('h1,h2,h3,p,button,a,input,select,iframe,table,[role="dialog"],.kona-panel-body,.plan-cockpit,.plan-timeline')){
   if(!visible(e)||e.closest('svg,[aria-hidden="true"]'))continue;
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);let scroller=null;for(let parent=e.parentElement;parent&&parent!==document.body;parent=parent.parentElement){const ps=getComputedStyle(parent);if(['auto','scroll'].includes(ps.overflowX)&&parent.scrollWidth>parent.clientWidth+2){scroller=parent;break;}}
   if(r.right>0&&r.left<innerWidth&&(r.right>innerWidth+1||r.left< -1)&&!scroller)issues.push({kind:'horizontal-spill',el:name(e),text:e.innerText?.slice(0,60),...rect(e)});
   if(e.matches('button,input,select')&&e.scrollWidth>e.clientWidth+2&&s.overflowX!=='auto')issues.push({kind:'control-text-spill',el:name(e),text:e.innerText?.slice(0,60),sw:e.scrollWidth,cw:e.clientWidth});
  }
  const chrome=[...document.querySelectorAll('.global-kona-links a,.kona-why-global,.kona-panel-why,header a,header button,.bar a,.bar button')].filter(visible).map(e=>{
   const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {el:name(e),text:e.innerText,occluded:!e.contains(top),by:top?name(top):null,...rect(e)};
  });
  for(const c of chrome)if(c.occluded&&c.top>=0&&c.bottom<=innerHeight)issues.push({kind:'occluded-control',...c});
  return {pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,scrollY,bodyClass:document.body.className,issues,chrome,heading:[...document.querySelectorAll('h1,h2')].filter(visible).map(e=>({text:e.innerText,...rect(e)})).slice(0,8)};
 });
 await p.screenshot({path:out+'/'+name+'-'+width+'.jpg',type:'jpeg',quality:75,fullPage:true,timeout:20000}).catch(e=>s.screenshotError=e.message);
 rows.push({name,width,height,...s});save();console.log(name,width,s.issues.length,JSON.stringify(s.issues.slice(0,10)));
}
try{for(const theme of (process.env.KONA_AUDIT_THEMES||'light,dark,random').split(','))for(const [width,height] of JSON.parse(process.env.KONA_AUDIT_VIEWPORTS||'[[320,568],[390,844],[844,390],[1440,900]]')){
 const ctx=await b.createBrowserContext();const p=await ctx.newPage();p.setDefaultTimeout(20000);await p.setViewport({width,height,isMobile:width<900,hasTouch:width<900,deviceScaleFactor:1});await p.setBypassServiceWorker(true);await p.evaluateOnNewDocument(theme=>localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,appearance:theme,quality:'low',motion:'reduced'})),theme);
 await p.setRequestInterception(true);p.on('request',r=>/supabase|plausible|googletagmanager/.test(r.url())?r.abort():r.continue());
 const prefix=theme+'-';const errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const file of (process.env.KONA_AUDIT_PAGES||'index.html,about.html,why.html,privacy.html,credits.html,Canyon_Collection.html,Studio.html,Experiences.html').split(',')){
  try{
   await p.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:30000});await wait(1800);
   await scan(p,prefix+file.replace('.html',''),width,height);
   if(file==='Canyon_Collection.html'){await p.$eval('.comparison',e=>e.scrollIntoView());await wait(200);await scan(p,prefix+'collection-comparison',width,height);}
   if(file==='index.html'){
    await p.click('#buildSelf');await wait(300);await scan(p,prefix+'questions',width,height);
    const skip=await p.$('[data-onboarding-skip]');if(skip){await p.$eval('#intro',e=>{e.scrollTop=e.scrollHeight});await skip.click();await wait(800);await scan(p,prefix+'registration',width,height);}
    const cont=await p.$('[data-reg-continue]');if(cont){await cont.click();await wait(900);}
    else if(await p.$('[data-onboarding-answer]')){await p.evaluate(()=>window.__konaShell.now());await wait(700);}
    for(const [name,fn] of [['home','now'],['discover','explore'],['garage','garage'],['plan','plan'],['me','me'],['collection-empty','collection'],['feed','feed'],['travel','travel']]){
     await p.evaluate(async fn=>{await window.__konaShell[fn]?.();},fn);await wait(name==='me'?2500:650);await scan(p,prefix+name,width,height);
    }
    await p.evaluate(async()=>{await window.__konaShell.now();});
    const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.progression.v1')).xp);
    await p.$eval('[data-first-find]',e=>e.click());
    const earned=await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.progression.v1')).xp);
    await p.$eval('[data-first-find]',e=>e.click());
    assert.ok(earned>before,'first Find grants its configured reward');
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.progression.v1')).xp),earned,'repeat click never pays twice');
    await p.$eval('[data-home-finds]',e=>e.click());await wait(300);
    assert.equal(await p.$eval('[data-finds-back]',e=>e.textContent.trim()),'← Now');
    assert.equal(await p.$eval('[data-tab=home]',e=>e.getAttribute('aria-current')),'page');
    await scan(p,prefix+'collection-owned',width,height);
    await p.waitForFunction(()=>document.querySelector('.find-card.is-collected .find-thumbnail')?.naturalWidth===320);
    await p.$eval('[data-find="find:shore:lava"]',e=>e.click());await scan(p,prefix+'find-detail',width,height);
    await p.$eval('[data-view-find]',e=>e.click());
    await p.waitForFunction(()=>document.querySelector('.find-canvas')?.__collectibleStage,{timeout:30000});await wait(250);
    await scan(p,prefix+'find-3d',width,height);
    await p.$eval('[data-find-return]',e=>e.click());
    assert.equal(await p.$('.find-canvas'),null,'leaving a Find removes its canvas');
    await p.$eval('[data-finds-back]',e=>e.click());await wait(200);
    assert.equal(await p.$eval('#konaPanelTitle',e=>e.textContent),'Now');
    await p.evaluate(async()=>{await window.__konaShell.explore();});
    await p.$eval('[data-discover-surface=feed]',e=>e.click());await p.waitForSelector('[data-intern-brief] h4');
    assert.equal(await p.$eval('[data-tab=discover]',e=>e.getAttribute('aria-current')),'page');
    await scan(p,prefix+'intern-edition',width,height);
    await p.$eval('[data-back]',e=>e.click());await wait(300);
    assert.equal(await p.$eval('#konaPanelTitle',e=>e.textContent),'Discover');
   }
  }catch(e){rows.push({name:file,width,height,failure:e.message});save();console.log('ERROR',file,width,e.message);}
 }
 rows.push({name:prefix+'errors',width,height,errors});save();await ctx.close();
}}finally{await b.close();save();}

if(rows.some(row=>row.failure||row.issues?.length||row.errors?.length))process.exitCode=1;
