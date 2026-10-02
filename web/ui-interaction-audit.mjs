// Behavioral evidence on the built app. All personal data is synthetic and isolated.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base=process.argv[2]||'http://127.0.0.1:8754/';
const out=process.argv[3]||'ui-interaction-evidence';fs.mkdirSync(out,{recursive:true});
const options={phone320:{width:320,height:720},phone390:{width:390,height:844},landscape:{width:844,height:390},desktop:{width:1440,height:900}};
const selected=process.env.AUDIT_VIEWPORT?[process.env.AUDIT_VIEWPORT]:Object.keys(options);
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const report={source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),artifact_kind:'rebuilt-from-source',generated_at:new Date().toISOString(),base,scenarios:[],controls:[],limitations:['Browser emulation, not physical phone thermals or native install.','No real email, checkout, race registration or user cloud mutation.','Feed stories depend on publisher availability; UI fallback is tested separately.','Admin-only and unimplemented shop controls are not represented as tested.']};
report.bundle_sha256=createHash('sha256').update(fs.readFileSync('app/kona-core.js')).digest('hex');
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kona-ui-'));
const png=path.join(tmp,'sample.png');fs.writeFileSync(png,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVhUAAAAASUVORK5CYII=','base64'));
let failures=0;
try{
for(const id of selected){
 if(!options[id])throw new Error('Unknown viewport '+id);
 for(const theme of ['light','dark','random']){
  const context=await browser.createBrowserContext();const p=await context.newPage();const errors=[];
  p.setDefaultTimeout(20000);p.setDefaultNavigationTimeout(90000);
  p.on('pageerror',e=>errors.push(String(e.stack||e)));
  await p.setViewport({...options[id],isMobile:id!=='desktop',hasTouch:id!=='desktop',deviceScaleFactor:1});
  await p.evaluateOnNewDocument(theme=>{if(!localStorage.getItem('kona.profile.v1'))localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,appearance:theme,quality:'low',motion:'reduced'}));},theme);
  const prefix=id+'-'+theme;
  const click=async selector=>{
    if(selector.startsWith('[data-race-self-action='))await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const el=await p.waitForSelector(selector,{visible:true});
    assert.equal(await el.evaluate(e=>!!e.disabled),false,'Disabled action: '+selector);
    await el.evaluate(e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
    await p.waitForFunction(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();return r&&r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth;},{},selector);
    if(id==='desktop')await el.click();else await el.tap();
  };
  const text=selector=>p.$eval(selector,e=>e.textContent||'');
  const waitHome=()=>p.waitForFunction(()=>!document.querySelector('#konaPanel')?.hidden&&document.querySelector('#konaPanelTitle')?.textContent==='Home');
  const enter=async()=>{await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__konaShell);};
  const inventory=async surface=>{
    const controls=await p.evaluate(()=>[...document.querySelectorAll('button,a[href],input,select,summary')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,100)||e.getAttribute('placeholder'),disabled:!!e.disabled,width:Math.round(r.width),height:Math.round(r.height),href:e.getAttribute('href')};}));
    report.controls.push({viewport:id,theme,surface,controls});
  };
  const step=async(name,fn)=>{
    const started=Date.now();
    try{await fn();assert.deepEqual(errors,[],'Uncaught UI error');report.scenarios.push({viewport:id,theme,name,status:'pass',ms:Date.now()-started});console.log('PASS',prefix,name);}
    catch(error){failures++;report.scenarios.push({viewport:id,theme,name,status:'fail',error:String(error.stack||error),ms:Date.now()-started});await p.screenshot({path:path.join(out,prefix+'-failure.png')}).catch(()=>{});write();throw error;}
    write();
  };
  try{
    await step('first-run answers persist, award once, and open avatar setup',async()=>{
      await enter();await inventory('landing');await click('#buildSelf');
      await p.waitForSelector('[data-onboarding-question]');await inventory('onboarding');
      await p.screenshot({path:path.join(out,prefix+'-onboarding.png')});
      for(const answer of ['dreaming','never','ocean','seen','review'])await click('[data-onboarding-answer="'+answer+'"]');
      await p.waitForSelector('.registration-avatar');
      const data=await p.evaluate(()=>({answers:JSON.parse(localStorage.getItem('kona.entryIntent.v1')),progress:JSON.parse(localStorage.getItem('kona.progression.v1'))}));
      assert.equal(data.answers.answers['kona-intent'],'dreaming');assert.equal(data.answers.completed,true);
      assert.equal(data.progress.xp,75);assert.equal(data.progress.level,2);
      await click('[data-reg-back]');await click('#buildSelf');
      await p.waitForSelector('.registration-avatar');
      assert.equal(await p.$('[data-onboarding-question]'),null,'one-time onboarding cards must not replay');
      assert.equal(await p.evaluate(()=>localStorage.getItem('kona.onboarding.cards.v1')),'seen');
      assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.progression.v1')).xp),75);
    });
    await step('avatar registration choices persist and first-run tour can finish',async()=>{
      await click('[data-reg-archetype="aero"]');await click('[data-reg-trisuit="aero-panel"]');
      await click('[data-reg-continue]');await p.waitForSelector('.onboarding-handoff');await inventory('install-rotate-handoff');await p.screenshot({path:path.join(out,prefix+'-handoff.png')});await click('[data-handoff-continue]');await waitHome();
      await p.waitForSelector('.kona-tour');
      for(let i=0;i<4;i++){assert.equal(await p.$eval('.tour-target',e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'}),true,'tour must highlight a visible control');await click('[data-tour-next]');}
      await p.waitForFunction(()=>!document.querySelector('.kona-tour'));
      assert.equal(await p.evaluate(()=>localStorage.getItem('kona.onboarding.v1')),'seen');
    });
    await step('Home actions and five-tab navigation reach their declared surfaces',async()=>{
      assert.equal(await p.$eval('.kona-user-menu',e=>getComputedStyle(e).display),'none','panel navigation must not be covered by the floating Studio shortcut');
      for(const [selector,title] of [['[data-home-plan]','Plan'],['[data-home-garage]','Garage'],['[data-home-discover]','Discover']]){
        await click(selector);await p.waitForFunction(t=>document.querySelector('#konaPanelTitle')?.textContent===t,{},title);
        await inventory(title);await click('[data-tab="home"]');await waitHome();
      }
      await click('[data-home-self]');await p.waitForSelector('.race-self-experience');await inventory('User Studio');
    });
    let raceId;
    await step('race search and all three relationship buttons save and select visibly',async()=>{
      await click('[data-race-self-action="races"]');await p.waitForSelector('[data-race-results] .race-card');
      await p.type('[data-race-search]','Kona');
      await p.waitForFunction(()=>document.querySelector('[data-race-results] .race-card')?.dataset.raceId.includes('kona'));
      raceId=await p.$eval('[data-race-results] .race-card',e=>e.dataset.raceId);
      for(const rel of ['interested','registered','completed']){
        await click('[data-race-results] .race-card:first-child [data-race-rel="'+rel+'"]');
        await p.waitForFunction(({raceId,rel})=>JSON.parse(localStorage.getItem('kona.raceHistory.v1')||'[]').some(r=>r.race_id===raceId&&r.relationship===rel),{},{raceId,rel});
        await p.waitForFunction(rel=>document.querySelector('[data-race-results] .race-card:first-child [data-race-rel="'+rel+'"]')?.getAttribute('aria-pressed')==='true',{},rel);
        assert.equal(await p.$$eval('[data-race-results] .race-card:first-child [aria-pressed="true"]',els=>els.length),1);
      }
      await inventory('race-picker');await p.screenshot({path:path.join(out,prefix+'-race-selected.png')});
    });
    await step('race status editing preserves result, repeated taps do not duplicate',async()=>{
      await p.evaluate(raceId=>{const rows=JSON.parse(localStorage.getItem('kona.raceHistory.v1'));rows.find(r=>r.race_id===raceId).result={bib:'TEST-7',finish_time_seconds:12345};localStorage.setItem('kona.raceHistory.v1',JSON.stringify(rows));},raceId);
      await click('[data-race-results] .race-card:first-child [data-race-rel="registered"]');
      await p.waitForFunction(()=>/Saved as Registered/.test(document.querySelector('[data-race-feedback]')?.textContent));
      await click('[data-race-results] .race-card:first-child [data-race-rel="registered"]');
      const rows=await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.raceHistory.v1')));
      assert.equal(rows.filter(r=>r.race_id===raceId).length,1);assert.equal(rows.find(r=>r.race_id===raceId).result.bib,'TEST-7');
    });
    await step('race state survives reload and Remove actually removes the saved card',async()=>{
      await enter();await click('#buildSelf');await waitHome();await click('[data-tab="me"]');
      await click('[data-race-self-action="races"]');await p.waitForSelector('[data-race-badges] [data-remove-race]');
      assert.match(await text('[data-race-badges]'),/Registered/);
      await click('[data-race-badges] [data-remove-race]');
      await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kona.raceHistory.v1')||'[]').length===0);
      await p.waitForFunction(()=>/No race badges/.test(document.querySelector('[data-race-badges]')?.textContent));
      await p.type('[data-race-search]','zzzzzz-not-a-real-race');
      await p.waitForFunction(()=>/No matching race/.test(document.querySelector('[data-race-results]')?.textContent));
      await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('[data-hub-drawer]')?.hidden);
    });
    await step('all avatar archetypes and presentation buttons update saved state',async()=>{
      await click('[data-race-self-action="customize"]');
      const types=await p.$$eval('[data-avatar-archetype]',els=>els.map(e=>e.dataset.avatarArchetype));
      assert.equal(types.length,4);
      for(const type of types){await click('[data-avatar-archetype="'+type+'"]');assert.equal(await p.evaluate(()=>window.__konaProfile.get().avatarStyle.archetype),type);}
      const presentations=await p.$$eval('[data-avatar-presentation]',els=>els.map(e=>e.dataset.avatarPresentation));
      for(const value of presentations){await click('[data-avatar-presentation="'+value+'"]');assert.equal(await p.evaluate(()=>window.__konaProfile.get().avatarStyle.presentation),value);}
      await click('[data-hub-close]');
    });
    await step('wardrobe item buttons, image overlay and removal update the avatar',async()=>{
      await click('[data-race-self-action="customize"]');
      const items=await p.$$eval('[data-avatar-item]',els=>els.filter(e=>!e.disabled).map(e=>e.dataset.avatarItem));
      for(const value of items){await click('[data-avatar-item="'+value+'"]');assert.equal(await p.$eval('[data-avatar-item="'+value+'"]',e=>e.classList.contains('on')),true);}
      const upload=await p.$('[data-avatar-overlay="trisuit"]');await upload.uploadFile(png);
      await p.waitForSelector('[data-avatar-overlay-remove="trisuit"]');
      await click('[data-avatar-overlay-remove="trisuit"]');await p.waitForFunction(()=>!document.querySelector('[data-avatar-overlay-remove="trisuit"]'));
      await click('[data-hub-close]');await click('[data-stage-reset]');
    });
    await step('Progress and replay-tour controls have observable outcomes',async()=>{
      await click('[data-race-self-action="progress"]');await p.waitForSelector('[data-hub-drawer]:not([hidden]) #konaAccount');
      assert.match(await text('[data-hub-body]'),/Level road|LEVEL [23]/);await inventory('Progress');
      await click('[data-hub-close]');await click('[data-race-self-action="tour"]');
      await p.waitForSelector('.kona-tour');await click('[data-tour-skip]');await p.waitForFunction(()=>!document.querySelector('.kona-tour'));
      await click('[data-tab="me"]');
    });
    await step('first Find earns once, all 100 slots and filters work, and Item Studio loads the actual model',async()=>{
      await click('[data-studio-home]');await waitHome();
      await click('[data-first-find]');const earned=await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.progression.v1')));
      assert.ok(earned.discoveries.includes('find:shore:lava'));await click('[data-home-finds]');
      await p.waitForSelector('[data-find]');assert.equal((await p.$$('[data-find]')).length,100);
      assert.equal(await p.$eval('#konaPanel',e=>e.scrollTop),0,'new collection route must start at its heading');
      for(const filter of ['hidden','trade','event','all']){await click('[data-find-filter="'+filter+'"]');assert.equal(await p.$eval('[data-find-filter="'+filter+'"]',e=>e.getAttribute('aria-pressed')),'true');assert.ok((await p.$$('[data-find]')).length>0);}
      await inventory('KONA Finds');await p.screenshot({path:path.join(out,prefix+'-finds.png')});
      await click('[data-find="find:shore:lava"]');assert.match(await text('.find-studio'),/Perfect Volcanic Rock|Its story/);
      await click('[data-view-find]');await p.waitForFunction(()=>document.querySelector('.find-canvas')?.__collectibleStage,{timeout:60000});
      await p.screenshot({path:path.join(out,prefix+'-item-3d.png')});const canvas=await p.$('.find-canvas');
      await click('[data-find-return]');assert.equal(await canvas.evaluate(c=>c.__collectibleStage),false,'return must dispose 3D');
      const hidden=await p.$eval('[data-find]:not(.is-collected)',e=>e.dataset.find);await click('[data-find="'+hidden+'"]');
      assert.match(await text('.find-studio'),/A story still waiting/);assert.equal(await p.$('[data-view-find]'),null,'uncollected details must remain hidden');await click('[data-find-return]');
      await click('[data-finds-back]');await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);await click('[data-studio-home]');await waitHome();
      assert.equal(await p.$eval('[data-first-find]',e=>e.disabled),true);
      assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('kona.progression.v1')).xp),earned.xp);
      await click('[data-tab="me"]');await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
    });
    await step('countdown defaults to seconds, normal/timezone persist, and traveller brief has useful sourced links',async()=>{
      await click('[data-studio-home]');await waitHome();assert.equal(await p.$eval('[data-countdown-value]',e=>e.dataset.countdownMode),'seconds');
      await click('.home-today .kona-countdown-options summary');await click('.home-today [data-clock-mode="normal"]');
      await p.select('.home-today [aria-label="Countdown timezone"]','Europe/Stockholm');
      assert.match(await text('.home-today [data-clock-target]'),/Europe\/Stockholm/);
      await click('[data-home-plan]');await p.waitForSelector('[data-kona-weather]');
      assert.match(await text('#konaPanelBody'),/Land at KOA|THE INTERN|Official websites & social/);
      assert.equal((await p.$$('.kona-brief-thumbnail')).length,2);assert.ok((await p.$$('a[href*="airports.hawaii.gov"]')).length>=3);await inventory('What matters most');
      await click('[data-tab="home"]');await waitHome();assert.equal(await p.$eval('[data-countdown-value]',e=>e.dataset.countdownMode),'normal');
      await click('[data-tab="me"]');await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
    });
    await step('sharing exports a real PNG, handles cancellation, and preserves private data',async()=>{
      await click('[data-race-self-action="share"]');await p.waitForSelector('[data-hub-drawer]:not([hidden])');
      assert.match(await text('[data-hub-body]'),/Share/);const links=await p.$$eval('[data-hub-body] a[href]',els=>els.map(e=>e.href));
      assert.ok(links.every(url=>!url.includes('access_token')&&!url.includes('@')));
      await p.evaluate(()=>{
        window.__sharedCard=null;window.__shareCancelled=false;window.__copiedLink='';
        Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
        Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{if(window.__shareCancelled)throw new DOMException('Cancelled','AbortError');const f=payload.files?.[0];window.__sharedCard={url:payload.url,text:payload.text,name:f?.name,size:f?.size,type:f?.type,signature:f?[...new Uint8Array(await f.arrayBuffer()).slice(0,8)]:[]};}});
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedLink=text;}}});
      });
      await click('[data-share-progress]');await p.waitForFunction(()=>!!window.__sharedCard);
      const card=await p.evaluate(()=>window.__sharedCard);assert.equal(card.type,'image/png');assert.ok(card.size>1000);assert.deepEqual(card.signature,[137,80,78,71,13,10,26,10]);assert.doesNotMatch(JSON.stringify(card),/access_token|@gmail|refresh_token/);
      await click('[data-share-copy]');await p.waitForFunction(()=>document.querySelector('[data-share-copy]').textContent==='Copied');
      assert.equal(await p.evaluate(()=>window.__copiedLink),new URL(base).origin+new URL(base).pathname);
      await p.evaluate(()=>window.__shareCancelled=true);await click('[data-share-progress]');await p.waitForFunction(()=>document.querySelector('[data-share-status]').textContent.includes('Not shared'));
      assert.equal(await p.$eval('[data-share-progress]',e=>e.disabled),false);await click('[data-hub-close]');
    });
    await step('Feed shortcut, category buttons, search and RSS affordance work',async()=>{
      await click('[data-race-self-action="feed"]');await p.waitForSelector('.companion-page');
      await p.waitForSelector('[data-kind]',{timeout:45000});
      const kinds=await p.$$eval('[data-kind]',els=>els.map(e=>e.dataset.kind));
      for(const kind of kinds){await click('[data-kind="'+kind+'"]');assert.equal(await p.$eval('[data-kind="'+kind+'"]',e=>e.getAttribute('aria-pressed')),'true');}
      await inventory('The Feed');await p.screenshot({path:path.join(out,prefix+'-feed.png')});
      const rss=await p.$('[data-personal-rss]');assert.ok(rss,'RSS affordance missing');
      const href=await rss.evaluate(e=>e.getAttribute('href'));assert.ok(href&&!href.startsWith('javascript:'));
      await click('.companion-page [data-back]');await p.waitForSelector('.race-self-experience');
    });
    await step('Travel shortcut, place filters and return to User Studio work',async()=>{
      await click('[data-race-self-action="travel"]');await p.waitForSelector('.companion-arrival');
      for(const filter of ['bike-service','coffee','ocean','all']){await click('[data-place-filter="'+filter+'"]');assert.equal(await p.$eval('[data-place-filter="'+filter+'"]',e=>e.getAttribute('aria-pressed')),'true');}
      await inventory('Travel');await click('.companion-page > [data-back]');await p.waitForSelector('.race-self-experience');
    });
    await step('Settings opens and closes without breaking subsequent Studio actions',async()=>{
      await click('[data-race-self-action="settings"]');await p.waitForSelector('#settings:not([hidden])');
      await inventory('Settings');await click('#settings .set-close');await p.waitForFunction(()=>document.querySelector('#settings')?.hidden);
      await click('[data-race-self-action="races"]');await p.waitForSelector('[data-race-search]');await click('[data-hub-close]');
    });
    await step('disabled gear is explicitly marked Soon and no duplicate main navigation exists',async()=>{
      assert.match(await text('.race-self-controls button[disabled]'),/Soon/i);
      assert.equal(await p.$eval('.race-self-controls button[disabled]',e=>e.disabled),true);
      assert.equal(await p.$$eval('.kona-bottom-nav',els=>els.length),1);
      await p.screenshot({path:path.join(out,prefix+'-studio.png')});
    });
  }catch(error){console.error('FAILED',prefix,error.message);}finally{await context.close();}
 }
}
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});report.passed=report.scenarios.filter(s=>s.status==='pass').length;report.failed=failures;write();}
console.log(JSON.stringify({passed:report.passed,failed:report.failed,source_sha:report.source_sha}));
if(failures)process.exitCode=1;
