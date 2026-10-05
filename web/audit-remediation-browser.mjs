import puppeteer from 'puppeteer-core';
import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import fs from 'node:fs';import assert from 'node:assert/strict';
const out=path.resolve(process.argv[3]||'audit-remediation-evidence');const root=path.resolve(import.meta.dirname,'..');const base=process.argv[2]||'http://127.0.0.1:8748/';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const findings=[];
try{
 const p=await browser.newPage();await p.setBypassServiceWorker(true);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setViewport({width:390,height:844,deviceScaleFactor:2});
 await p.evaluateOnNewDocument(()=>{localStorage.setItem('kona.profile.v1',JSON.stringify({v:1,name:'',appearance:'dark',quality:'low'}));localStorage.setItem('kona.onboarding.cards.v1','seen');localStorage.setItem('kona.onboarding.v1','seen');});
 await p.goto(base,{waitUntil:'networkidle2'});await p.waitForFunction(()=>window.__konaShell);await p.click('#buildSelf');await p.evaluate(()=>window.__konaShell.me());await p.waitForSelector('[data-race-self-stage]');await p.waitForFunction(()=>document.querySelector('[data-race-self-stage]')?.__studioFrame);
 await p.evaluate(()=>window.__konaSettingsUI.open());await p.$eval('input[autocomplete="nickname"]',e=>{e.value='Test Athlete';e.dispatchEvent(new Event('change',{bubbles:true}));});await p.evaluate(()=>window.__konaSettingsUI.close());
 const name=await p.$eval('.studio-stage-caption span',e=>e.textContent);assert.equal(name,'Test Athlete');findings.push({test:'profile refresh',name});
 await p.click('[data-race-self-action="races"]');await p.waitForSelector('[data-race-results] [data-race-rel="interested"]');await p.click('[data-race-results] [data-race-rel="interested"]');await p.waitForFunction(()=>document.querySelector('[data-race-feedback]')?.textContent.startsWith('Saved'));await p.click('[data-hub-close]');
 const races=await p.$eval('[data-race-self-action="races"] small',e=>e.textContent);assert.equal(races,'1 race badges');findings.push({test:'race refresh',races});
 await p.evaluate(()=>{window.__konaProfile.set({motion:'reduced'});});await p.waitForFunction(()=>Math.abs(document.querySelector('[data-race-self-stage]').__studioFrame.objects[0].matrixWorld.elements[13]-.03)<1e-8);
 const before=await p.evaluate(()=>{const f=document.querySelector('[data-race-self-stage]').__studioFrame;return {matrix:f.objects[0].matrixWorld.elements.slice(),width:document.querySelector('[data-race-self-stage]').width,css:document.querySelector('[data-race-self-stage]').clientWidth};});await new Promise(r=>setTimeout(r,300));
 const after=await p.evaluate(()=>document.querySelector('[data-race-self-stage]').__studioFrame.objects[0].matrixWorld.elements.slice());assert.deepEqual(after,before.matrix);assert.ok(Math.abs(before.width-before.css)<2);findings.push({test:'reduced motion and low DPR',dpr:before.width/before.css});
 await p.screenshot({path:out+'/studio-fixed-390.png'});
 // A blocked lazy stylesheet must show a retry state, then recover without an unhandled rejection.
 await p.setRequestInterception(true);let blocked=true;
 p.on('request',req=>blocked&&req.url().endsWith('web/styles/garage.css')?req.abort('failed'):req.continue());
 await p.evaluate(()=>window.__konaShell.garage());await p.waitForSelector('#konaPanelBody [role="alert"]');assert.match(await p.$eval('#konaPanelBody',e=>e.textContent),/Try again/);blocked=false;await p.click('#konaPanelBody button');await p.waitForSelector('.garage-setup-copy');findings.push({test:'failed route retries',ok:true});
 await p.close();
 // Serve local build at its canonical URL so the actual production consent boundary runs.
 const a=await browser.newPage();let analytics=[];
 await a.setRequestInterception(true);a.on('request',async req=>{const u=new URL(req.url());if(u.host==='mtvpnoqwjpoqaiocrklq.supabase.co'){if(req.method()==='OPTIONS')return req.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'apikey,content-type','access-control-allow-methods':'POST'}});analytics.push(JSON.parse(req.postData()||'{}'));return req.respond({status:202,body:'{}',headers:{'access-control-allow-origin':'*'}});}if(u.host==='joaoccaldas.github.io'){const file=root+'/'+(u.pathname.replace(/^\/konam\//,'')||'index.html');if(fs.existsSync(file)&&fs.statSync(file).isFile())return req.respond({status:200,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html',body:fs.readFileSync(file)});}return req.abort();});
 await a.goto('https://joaoccaldas.github.io/konam/?analytics_mode=public',{waitUntil:'networkidle0'});assert.equal(analytics.length,0);assert.equal(await a.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('kona.analytics.')).length),0);
 await a.evaluate(()=>window.__konaProfile.set({analytics:true}));await new Promise(r=>setTimeout(r,200));assert.ok(analytics.some(e=>e.event_type==='page_view'));
 const sent=analytics.length;await a.evaluate(()=>window.__konaProfile.set({analytics:false}));await a.evaluate(()=>window.__konaAnalytics.track('me_opened'));await new Promise(r=>setTimeout(r,100));assert.equal(analytics.length,sent);assert.equal(await a.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('kona.analytics.')).length),0);findings.push({test:'real production consent, opt-out and session erasure',events:sent});await a.close();
 assert.deepEqual(errors,[]);findings.push({test:'page errors',count:errors.length});
 fs.writeFileSync(out+'/regressions.json',JSON.stringify({source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),bundle_sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'app/kona-core.js'))).digest('hex'),checks:findings},null,2));console.log(findings);
}finally{await browser.close();}
