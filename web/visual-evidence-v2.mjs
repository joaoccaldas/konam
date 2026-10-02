import puppeteer from 'puppeteer-core';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import fs from 'node:fs';import path from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:8754/';
const out=process.argv[3]||'visual-evidence-v2';fs.mkdirSync(out,{recursive:true});
const chrome=process.env.CHROME_PATH;if(!chrome)throw new Error('CHROME_PATH required');
const browser=await puppeteer.launch({executablePath:chrome,timeout:90000,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const viewports=[{id:'320',width:320,height:720},{id:'360',width:360,height:780},{id:'390',width:390,height:844},{id:'430',width:430,height:932},{id:'landscape-phone',width:844,height:390},{id:'desktop',width:1440,height:900}];
const states=['landing','sign-in','onboarding-profile','avatar-registration','install-handoff','onboarding-tour','home','user-studio','avatar-editor','discover','garage','plan','progress','feed','travel','museum-return-home','collection','find-studio','bike-studio'];const report=[];
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify({source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source_dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),bundle_sha256:createHash('sha256').update(fs.readFileSync('app/kona-core.js')).digest('hex'),generated_at:new Date().toISOString()},null,2)+'\n');
// deterministic storage per capture: seed after origin exists, then reload exactly once.
async function capture(vp,state,theme){
 const context=await browser.createBrowserContext();const p=await context.newPage();await p.setBypassServiceWorker(true);p.setDefaultNavigationTimeout(180000);const requests=[];const errors=[];
 p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
 await p.setViewport({width:vp.width,height:vp.height,deviceScaleFactor:vp.id==='desktop'?1:2,isMobile:vp.id!=='desktop',hasTouch:vp.id!=='desktop'});
 await p.evaluateOnNewDocument(({theme,state})=>{
   localStorage.clear();
   if(state==='bike-studio')localStorage.setItem('kona.progression.v1',JSON.stringify({schema:'progression-v1',xp:40,level:2,access_tier:'visitor',streak:0,discoveries:[],badges:[],unlocks:[],seen:[],ledger:[],credits:0,history:[],acquisitions:[]}));
   localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,appearance:theme,quality:'low',motion:'reduced',travel:'teleport'}));
   if(!['landing','sign-in','onboarding-profile','avatar-registration','install-handoff','onboarding-tour'].includes(state)){
     localStorage.setItem('kona.raceIdentity.v1',JSON.stringify({entity_type:'race-identity',event_id:'kona-2026',goal:{label:'Race the version of yourself'}}));
     localStorage.setItem('kona.onboarding.v1','seen');
   }
 },{theme,state});
 await p.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await new Promise(r=>setTimeout(r,700));
 await p.evaluate(()=>document.fonts.ready);
 const press=async selector=>{
   const element=await p.waitForSelector(selector,{visible:true});
   // Home can introduce a font absent from the landing page. Wait after the
   // target exists so a touch cannot become a card click during font reflow.
   await p.evaluate(()=>document.fonts.ready);
   await element.evaluate(e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await p.waitForFunction(selector=>{
     const e=document.querySelector(selector),r=e?.getBoundingClientRect();if(!r)return false;
     const rect=[r.x,r.y,r.width,r.height].join(',');
     const now=performance.now();
     const prior=globalThis.__captureTargetGeometry;
     if(!prior||prior.selector!==selector||prior.rect!==rect){globalThis.__captureTargetGeometry={selector,rect,since:now};return false;}
     return now-prior.since>=200;
   },{polling:'raf'},selector);
   await p.waitForFunction(selector=>{
     const e=document.querySelector(selector),r=e?.getBoundingClientRect();if(!r)return false;
     const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
     return !!hit&&(hit===e||e.contains(hit));
   },{},selector);
   if(vp.id==='desktop')await element.click();else await element.tap();
 };
 if(state==='sign-in'){
   await p.click('#entrySignIn');await p.waitForSelector('#saveForm');
 }else if(state==='onboarding-profile'){
   await p.click('#buildSelf');await p.waitForSelector('[data-onboarding-question]');
 }else if(state==='avatar-registration'){
   await p.click('#buildSelf');await p.waitForSelector('[data-onboarding-question]');await p.click('[data-onboarding-skip]');await p.waitForSelector('.registration-avatar');
 }else if(state==='onboarding-tour'||state==='install-handoff'){
   await p.click('#buildSelf');await p.waitForSelector('[data-onboarding-question]');await p.click('[data-onboarding-skip]');await p.waitForSelector('.registration-avatar');
   await p.click('[data-reg-continue]');await p.waitForSelector('.onboarding-handoff');
   if(state==='onboarding-tour'){await p.click('[data-handoff-continue]');await p.waitForSelector('.kona-tour');}
 }else if(state==='bike-studio'){
   await p.goto(new URL('Studio.html',base).href,{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>window.__studio?.current,{timeout:60000});
 }else if(state!=='landing'){
   await p.click('#buildSelf');
   await p.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden,{timeout:60000});
   if(state==='home'){
     // Returning users land here. No personal/world 3D should be required.
   }else if(['collection','find-studio'].includes(state)){
     await press('[data-first-find]');await p.waitForFunction(()=>document.querySelector('[data-first-find]')?.disabled);await press('[data-home-finds]');await p.waitForSelector('[data-find]');
     if(state==='find-studio'){await press('[data-find="find:shore:lava"]');await p.waitForSelector('.find-studio');}
   }else if(['user-studio','avatar-editor','progress'].includes(state)){
     const switched=await p.evaluate(async()=>{const shell=window.__konaShell;if(!shell?.me)return false;await shell.me();return true;});
     if(!switched)throw new Error('could not enter User Studio');
     await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame,{timeout:60000});
     if(state==='avatar-editor')await p.click('[data-race-self-action="customize"]');
     if(state==='progress'){await p.click('[data-race-self-action="progress"]');await p.waitForSelector('#konaAccount');}
   }else if(state==='museum-return-home'){
     const switched=await p.evaluate(async()=>{const shell=window.__konaShell;if(!shell?.explore)return false;await shell.explore();return true;});
     if(!switched)throw new Error('could not enter Discover before world');
     await p.click('[data-enter-world]');
     await p.waitForFunction(()=>document.body.classList.contains('museum-open'));
     await p.waitForFunction(()=>[...document.querySelectorAll('link[data-style-scope="museum"]')].length===2);
     await p.evaluate(()=>window.__konaShell.now());
     await p.waitForFunction(()=>/Home/i.test(document.querySelector('#konaPanelTitle')?.textContent||''));

   }else{
     const fn={discover:'explore',garage:'garage',plan:'plan',feed:'feed',travel:'travel'}[state];
     const switched=await p.evaluate(async fn=>{const shell=window.__konaShell;if(!shell||typeof shell[fn]!=='function')return false;await shell[fn]();return true;},fn);
     if(!switched)throw new Error('could not enter requested state: '+state);
     if(state==='feed')await p.waitForFunction(()=>document.querySelector('.companion-story,.companion-empty'),{timeout:15000});
     if(state==='travel')await p.waitForSelector('.companion-arrival',{timeout:15000});
   }
 }
 await p.evaluate(()=>document.fonts.ready);
 await new Promise(r=>setTimeout(r,250));
 const metrics=await p.evaluate(touchViewport=>{
   const visible=el=>{
     const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;
     // A hidden Museum parent can retain child geometry while fading out.
     // Its controls are not visible Home controls and must not be scored.
     for(let node=el;node;node=node.parentElement){
       const s=getComputedStyle(node);
       if(s.display==='none'||s.visibility==='hidden'||+s.opacity<=.02)return false;
     }
     return true;
   };
   const els=[...document.querySelectorAll('button,a,[role=button]')].filter(visible);
   const primary=els.filter(x=>x.matches('.primary,[data-primary=true]'));
   // Canonical touch targets apply to phone captures; desktop mouse controls
   // retain their existing compact layout. Record the threshold with evidence.
   const targetMinimum=touchViewport?48:24;
   const small=els.map(x=>{const r=x.getBoundingClientRect();return{tag:x.tagName,text:(x.textContent||'').trim().slice(0,50),w:r.width,h:r.height};}).filter(x=>x.w<targetMinimum||x.h<targetMinimum);
   const grid=document.querySelector('.finds-grid'),cards=grid?[...grid.querySelectorAll('[data-find]')].slice(0,2):[];
   const collectionGrid=grid?{display:getComputedStyle(grid).display,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,sameFirstRow:cards.length===2&&Math.abs(cards[0].getBoundingClientRect().top-cards[1].getBoundingClientRect().top)<1}:null;
   const back=document.querySelector('#konaPanelClose');
   const backCovered=back&&visible(back)?(()=>{const r=back.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !(hit===back||back.contains(hit))})():false;
   const intro=document.getElementById('intro');
   const nav=document.querySelector('.kona-bottom-nav');
   const tour=document.querySelector('.kona-tour');
   const tourText=tour&&visible(tour)?(tour.innerText||'').slice(0,600):'';
   const activeNav=[...document.querySelectorAll('.kona-bottom-nav .on,.kona-bottom-nav [aria-current="page"]')].map(x=>(x.textContent||'').trim());
   const visibleText=(document.body.innerText||'').replace(/\s+/g,' ').trim().slice(0,900);
   const stage=document.querySelector('.studio-canvas-frame');const sr=stage?.getBoundingClientRect?.();
   const museumLinks=[...document.querySelectorAll('link[data-style-scope="museum"]')];
   const companionHero=document.querySelector('.companion-hero');
   const reg=document.querySelector('.registration-avatar'),regCopy=document.querySelector('.registration-avatar-copy'),regPreview=document.querySelector('.registration-avatar-preview');
   const enter=document.getElementById('buildSelf'),product=document.querySelector('#intro.kona-entry .entry-product');
   const er=enter?.getBoundingClientRect?.(),pr=product?.getBoundingClientRect?.();
   const rr=reg?.getBoundingClientRect?.(),rc=regCopy?.getBoundingClientRect?.(),rp=regPreview?.getBoundingClientRect?.();
   return{panelBackCovered:backCovered,panelScrollTop:document.querySelector('#konaPanel')?.scrollTop??0,targetMinimum,collectionGrid,museumControlsVisible:els.filter(x=>x.closest('#konaWorld')).length,landing:er?{ctaTop:er.top,ctaBottom:er.bottom,ctaLeft:er.left,ctaRight:er.right,ctaW:er.width,productTop:pr?.top??null,productBottom:pr?.bottom??null,productLeft:pr?.left??null,productRight:pr?.right??null,viewportH:innerHeight}:null,registration:rr&&rc&&rp?{w:rr.width,copyW:rc.width,previewW:rp.width,overlap:Math.max(0,Math.min(rc.right,rp.right)-Math.max(rc.left,rp.left))}:null,stage:sr?{x:sr.x,y:sr.y,w:sr.width,h:sr.height}:null,museumStylesEnabled:museumLinks.filter(x=>!x.disabled).length,companionHeroPosition:companionHero?getComputedStyle(companionHero).position:null,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,primaryActions:primary.length,visibleActions:els.length,smallTargets:small.slice(0,20),title:document.title,lang:document.documentElement.lang,introVisible:intro?visible(intro):false,navVisible:nav?visible(nav):false,activeNav,visibleText,tourText};
 },vp.id!=='desktop');
 const heavy=requests.filter(u=>/app\/hall\.js|three(?:\.module)?\.js|\.glb(?:\?|$)|\.hdr(?:\?|$)/i.test(u));
 const personal3D=requests.filter(u=>/app\/race-self-stage\.js|\.glb(?:\?|$)/i.test(u));
 const name=`${vp.id}-${theme}-${state}`;await p.screenshot({path:path.join(out,name+'.png'),fullPage:false});
 report.push({viewport:vp.id,theme,state,metrics,heavyRequests:heavy,personal3DRequests:personal3D,errors});
 await context.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Captured '+name);
}
for(const vp of viewports.filter(v=>!process.env.AUDIT_VIEWPORT||v.id===process.env.AUDIT_VIEWPORT))for(const theme of ['light','dark','random'])for(const state of states)await capture(vp,state,theme);
await browser.close();
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const violations=[];
for(const r of report){
 if(r.metrics.panelBackCovered)violations.push(`${r.viewport}/${r.theme}/${r.state}: panel back is covered`);
 if(r.state==='collection'&&r.metrics.panelScrollTop!==0)violations.push(`${r.viewport}/${r.theme}: new collection route retained old scroll position`);
 if(r.metrics.overflowX)violations.push(`${r.viewport}/${r.theme}/${r.state}: horizontal overflow`);
 if(r.state==='landing'&&r.heavyRequests.length)violations.push(`${r.viewport}/${r.theme}: heavy 3D requested on landing`);
 if(r.state==='landing'&&r.viewport!=='desktop'&&r.metrics.landing){const l=r.metrics.landing;if(l.ctaTop<0||l.ctaBottom>l.viewportH)violations.push(`${r.viewport}/${r.theme}: Enter KONA is not fully visible in first viewport`);if(l.ctaW<160)violations.push(`${r.viewport}/${r.theme}: Enter KONA is too narrow`);if(l.productTop!=null&&l.productBottom!=null&&l.productLeft!=null&&l.productRight!=null){const overlapX=Math.min(l.ctaRight,l.productRight)-Math.max(l.ctaLeft,l.productLeft),overlapY=Math.min(l.ctaBottom,l.productBottom)-Math.max(l.ctaTop,l.productTop);if(overlapX>1&&overlapY>1)violations.push(`${r.viewport}/${r.theme}: product teaser overlaps primary decision`);}}
 if(r.errors.length)violations.push(`${r.viewport}/${r.theme}/${r.state}: JS errors ${r.errors.join('; ')}`);
 if(!['landing','sign-in','onboarding-profile','avatar-registration','install-handoff'].includes(r.state)&&r.metrics.introVisible)violations.push(`${r.viewport}/${r.theme}/${r.state}: landing intro still visible after state transition`);
 if(r.state==='sign-in'&&!/Sign in or create your account/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: sign-in form missing`);
 if(r.state==='onboarding-profile'&&!/What brings you to Kona|WHY ARE YOU HERE/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: onboarding question missing`);
 if(r.state==='avatar-registration'&&!/TRISUIT LAYOUT|Who are we sending into the lava/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: avatar registration missing`);
 if(r.state==='avatar-registration'&&r.viewport==='desktop'&&r.metrics.registration){
   const a=r.metrics.registration;
   if(a.w<900||a.copyW<420||a.previewW<340||a.overlap>1)violations.push(`desktop/${r.theme}: avatar registration grid collapsed ${Math.round(a.w)} total / ${Math.round(a.copyW)} copy / ${Math.round(a.previewW)} preview / ${Math.round(a.overlap)} overlap`);
 }
 if(r.state==='onboarding-tour'&&!/MAKE IT YOURS|Start with your athlete/i.test(r.metrics.tourText))violations.push(`${r.viewport}/${r.theme}: onboarding tour missing`);
 if(r.state==='home'&&!/YOUR RACE SELF|OVER THE HORIZON/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: Home discovery surface missing`);
 if(r.state==='user-studio'&&!/Build the version of you|YOUR ATHLETE|USER STUDIO/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: User Studio content missing`);
 if(r.state==='avatar-editor'&&!/Your character|Minecraft|Customize/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: avatar editor missing`);
 if(r.state==='garage'&&!/Garage|equipment/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: no Garage content detected`);
 if(r.state==='feed'&&!/THE FEED|rabbit hole|Triathlon/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: no Feed content detected`);
 if(r.state==='travel'&&!/TRAVEL|Kona International|island/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: no Travel content detected`);
 if(r.state==='museum-return-home'&&r.metrics.museumControlsVisible)violations.push(`${r.viewport}/${r.theme}: Museum controls remained visible behind Home`);
 if(r.state==='museum-return-home'&&r.metrics.museumStylesEnabled)violations.push(`${r.viewport}/${r.theme}: museum CSS remained enabled after returning Home`);
 if(['feed','travel'].includes(r.state)&&r.metrics.companionHeroPosition==='fixed')violations.push(`${r.viewport}/${r.theme}/${r.state}: museum header styling leaked into companion page`);
 if(r.state==='user-studio'&&r.metrics.stage){
   const minW=r.viewport==='desktop'?520:260,minH=r.viewport==='desktop'?420:220;
   if(r.metrics.stage.w<minW||r.metrics.stage.h<minH)violations.push(`${r.viewport}/${r.theme}: User Studio stage too small ${Math.round(r.metrics.stage.w)}x${Math.round(r.metrics.stage.h)}`);
 }
 if(r.viewport!=='desktop'&&r.metrics.smallTargets.length)violations.push(`${r.viewport}/${r.theme}/${r.state}: touch targets below 48px: ${r.metrics.smallTargets.map(x=>x.text||x.tag).join(', ')}`);
 if(r.state==='plan'&&!/Plan|race week|Expo|October/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: no Plan content detected`);
 if(r.state==='progress'&&!/Progress|XP|Credits|milestones/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: no Progress content detected`);
 if(r.metrics.panelBackCovered)violations.push(`${r.viewport}/${r.theme}/${r.state}: panel back is covered`);
 if(r.state==='collection'&&(!r.metrics.collectionGrid||r.metrics.collectionGrid.display!=='grid'||r.metrics.collectionGrid.columns!==(r.viewport==='desktop'?4:2)||!r.metrics.collectionGrid.sameFirstRow))violations.push(`${r.viewport}/${r.theme}: Finds cards are not arranged in the canonical responsive grid`);
 if(r.state==='bike-studio'&&!/Speedmax|Bikes/i.test(r.metrics.visibleText))violations.push(`${r.viewport}/${r.theme}: Bike Studio missing`);
}
if(violations.length){console.error(violations.join('\n'));process.exitCode=1}
// Random appearance is exercised in the full matrix; all five named families are validated by brand-hygiene and theme contracts.
console.log(`visual evidence: ${report.length} captures, ${violations.length} blocking violations`);
