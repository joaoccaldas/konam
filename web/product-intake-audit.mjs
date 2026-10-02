import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8754/';
const outDir=process.argv[3]||'proof-artifacts';
fs.mkdirSync(outDir,{recursive:true});
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('Chrome/Chromium not found');
const VIEWS=[['320',320,844],['360',360,800],['390',390,844],['430',430,932],['landscape',844,390]];
const MODE_IDS={
  harness:[],
  cervelo:['cervelo-p5-disc-mk2-size54'],
  alphafly:['nike-alphafly-3-study'],
  both:['cervelo-p5-disc-mk2-size54','nike-alphafly-3-study']
};
const MODE_QUERY={harness:'mode=harness',cervelo:'mode=single&candidate=0',alphafly:'mode=single&candidate=1',both:'mode=both'};
const candidateFiles=['cervelo-p5-disc-mk2-size54.glb','nike-alphafly-3-study.glb'];
const browser=await puppeteer.launch({executablePath,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-precise-memory-info']});
const results=[]; let failures=0;

async function openCase(mode,name,w,h,{screenshots=false}={}){
  const page=await browser.newPage();
  await page.setViewport({width:w,height:h,isMobile:w<900,hasTouch:w<900,deviceScaleFactor:w<900?2:1});
  const errors=[],requestFailures=[],badResponses=[],requests=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  page.on('requestfailed',r=>requestFailures.push({url:r.url(),reason:r.failure()?.errorText||'unknown'}));
  page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
  page.on('request',r=>requests.push(r.url()));

  const started=Date.now();
  let navError=null;
  try{await page.goto(base+`Product_Intake_Proof.html?${MODE_QUERY[mode]}`,{waitUntil:'load',timeout:15000});}
  catch(e){navError=String(e?.message||e);}
  let ready=false;
  try{
    await page.waitForFunction(()=>window.__intakeProofReady===true||window.__intakeProofDiagnostics?.errors?.length>0,{timeout:15000});
    ready=await page.evaluate(()=>window.__intakeProofReady===true);
  }catch(_){}
  const startupMs=Date.now()-started;
  const diag=await page.evaluate(()=>window.__intakeProofDiagnostics||null).catch(()=>null);
  const issues=[];
  if(navError)issues.push('navigation '+navError);
  if(!ready){
    const last=diag?.stages?.at(-1)??'NONE';
    issues.push('startup not ready; last stage='+JSON.stringify(last));
    if(diag?.errors?.length)issues.push('startup errors='+JSON.stringify(diag.errors.slice(-3)));
  }
  if(startupMs>15000)issues.push('startup exceeded 15s');

  const preCandidate=requests.filter(u=>candidateFiles.some(f=>u.includes(f)));
  if(preCandidate.length)issues.push('candidate requested before explicit load');

  let metrics=null;
  if(ready&&mode!=='harness'){
    await page.click('#loadCandidates');
    try{await page.waitForFunction(()=>window.__intakeProof.loaded||window.__intakeProof.loadError,{timeout:30000});}
    catch(_){issues.push('candidate load timeout');}
    const load=await page.evaluate(()=>({loaded:window.__intakeProof.loaded,error:window.__intakeProof.loadError,metrics:window.__intakeProof.metrics()}));
    metrics=load.metrics;
    if(load.error)issues.push('candidate load error '+load.error.slice(0,220));
    if(!load.loaded)issues.push('candidate not loaded');

    for(const id of MODE_IDS[mode]){
      const t=await page.evaluate(id=>{
        const ok=window.__intakeProof.inspectById(id);
        const focused=window.__intakeProof.focusById(id);
        return {ok,focused,shown:document.querySelector('#info')?.dataset.productId||'',text:document.querySelector('#info')?.textContent||''};
      },id);
      if(!t.ok||t.shown!==id)issues.push('inspect failed '+id);
      if(!t.focused)issues.push('focus failed '+id);
      if(!/candidate/.test(t.text))issues.push('readiness missing '+id);
    }

    if(MODE_IDS[mode].length===1){
      await page.evaluate(id=>window.__intakeProof.focusById(id),MODE_IDS[mode][0]);
      await new Promise(r=>setTimeout(r,350));
    }
    metrics=await page.evaluate(()=>window.__intakeProof.metrics());
    if(metrics.draw_calls<=0||metrics.triangles<=0)issues.push('renderer metrics empty');
    if(MODE_IDS[mode].length===1){
      const expectedTris=await page.evaluate(id=>window.__INTAKE_PROOF.products.find(p=>p.id===id)?.metrics?.triangles_approx||0,MODE_IDS[mode][0]);
      if(expectedTris>0 && metrics.triangles<expectedTris*.35)
        issues.push('candidate not visibly framed; rendered triangles '+metrics.triangles+' expected approx '+expectedTris);
    }
    if(metrics.load_ms==null)issues.push('load timing missing');

    const expected=MODE_IDS[mode].map(id=>id==='cervelo-p5-disc-mk2-size54'?'cervelo-p5-disc-mk2-size54.glb':'nike-alphafly-3-study.glb');
    for(const f of expected)if(!metrics.requested.some(x=>x.includes(f)))issues.push('asset request missing '+f);

    if(screenshots){
      const slug=mode==='cervelo'?'cervelo':'alphafly';
      await page.evaluate(id=>{document.getElementById('info').hidden=true;window.__intakeProof.focusById(id);},MODE_IDS[mode][0]);
      await new Promise(r=>setTimeout(r,350));
      await page.screenshot({path:path.join(outDir,slug+'-room-'+name+'.png'),fullPage:false});
      const id=MODE_IDS[mode][0];
      await page.evaluate(id=>window.__intakeProof.inspectById(id),id);
      await page.screenshot({path:path.join(outDir,`${slug}-info-${name}.png`),fullPage:false});
    }
  }

  const layout=ready?await page.evaluate(()=>{
    const vw=innerWidth,vh=innerHeight,out=[];
    if(document.documentElement.scrollWidth>vw+1)out.push('horizontal page overflow');
    for(const el of document.querySelectorAll('button,#info')){
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      if(s.display==='none'||s.visibility==='hidden'||r.width<2||r.height<2)continue;
      if(r.left<-1||r.right>vw+1)out.push('horizontal overflow '+(el.id||el.textContent.trim().slice(0,24)));
      if(el.matches('button')&&(r.width<40||r.height<40))out.push('small tap target '+el.textContent.trim().slice(0,24));
      if(el.id==='info'&&(r.bottom>vh+1||r.top<-1))out.push('info panel unreachable');
    }
    return out;
  }):[];
  const relevantErrors=errors.filter(x=>!/favicon\.ico/i.test(x) && !/Failed to load resource: the server responded with a status of 404/i.test(x));
  const relevantRequestFailures=requestFailures.filter(x=>!/favicon\.ico/i.test(x.url));
  const relevantBadResponses=badResponses.filter(x=>!/favicon\.ico/i.test(x.url));
  issues.push(...layout,...relevantErrors,...relevantRequestFailures.map(x=>'requestfailed '+x.url+' '+x.reason),...relevantBadResponses.map(x=>'http '+x.status+' '+x.url));
  const unique=[...new Set(issues)];
  const result={mode,viewport:name,width:w,height:h,startup_ms:startupMs,ready,last_stage:diag?.stages?.at(-1)||null,diagnostic_errors:diag?.errors||[],request_failures:requestFailures,issues:unique,metrics};
  results.push(result);
  console.log(`CASE ${mode}/${name}: ${unique.length?'FAIL':'PASS'} startup=${startupMs}ms last=${JSON.stringify(result.last_stage)} metrics=${JSON.stringify(metrics)}`);
  if(unique.length){console.log('ISSUES '+JSON.stringify(unique));failures++;}
  await page.close();
}

await openCase('harness','desktop',1280,800);
if(!results.at(-1).issues.length){
  for(const mode of ['cervelo','alphafly','both'])
    for(const [name,w,h] of VIEWS)
      await openCase(mode,name,w,h,{screenshots:(mode==='cervelo'||mode==='alphafly')&&name==='390'});
  for(const mode of ['cervelo','alphafly'])
    await openCase(mode,'desktop',1280,800,{screenshots:true});
}

await browser.close();
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
console.log('RESULTS '+JSON.stringify(results));
console.log(failures?`FAIL ${failures}`:'ALL OK');
process.exitCode=failures?1:0;
