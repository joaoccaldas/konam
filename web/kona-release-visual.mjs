import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const base=process.argv[2]||'http://127.0.0.1:8754/';
const out=process.argv[3]||'release-visual';
fs.mkdirSync(out,{recursive:true});
const chrome=process.env.CHROME_PATH;
if(!chrome) throw new Error('CHROME_PATH required');

const browser=await puppeteer.launch({executablePath:chrome,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader']});
const rows=[];
async function shot(theme,view){
  const p=await browser.newPage();
  const errors=[];
  p.on('pageerror',e=>errors.push('page:'+e.message));
  p.on('console',m=>{ if(m.type()==='error') errors.push('console:'+m.text()); });
  await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.evaluateOnNewDocument((theme)=>{
    localStorage.setItem('speedmax.profile.v1',JSON.stringify({v:1,appearance:theme,quality:'low',motion:'reduced',travel:'teleport'}));
    localStorage.setItem('speedmax.coach.v1','1');
  },theme);
  if(view==='setup'){
    await p.goto(base+'Studio.html#setup',{waitUntil:'load',timeout:180000});
    await new Promise(r=>setTimeout(r,4500));
  }else{
    await p.goto(base,{waitUntil:'domcontentloaded',timeout:180000});
    await p.waitForFunction(()=>window.__konaShell || window.__app?.konaShell,{timeout:180000});
    if(view==='explore3d'){
      await p.evaluate(()=>window.__museum?.enter?.() || (window.__konaShell || window.__app?.konaShell)?.explore?.());
      await p.waitForFunction(()=>window.__museum?.renderer,{timeout:180000});
      await new Promise(r=>setTimeout(r,5000));
    }else if(view==='landing'){
      await new Promise(r=>setTimeout(r,500));
    }else if(view==='now'){
      await p.evaluate(()=>(window.__konaShell || window.__app?.konaShell)?.now?.());
      await new Promise(r=>setTimeout(r,900));
    }else if(view==='discover'){
      await p.evaluate(()=>(window.__konaShell || window.__app?.konaShell)?.explore?.());
      await new Promise(r=>setTimeout(r,1200));
    }else if(view==='garage'){
      await p.evaluate(()=>(window.__konaShell || window.__app?.konaShell)?.garage?.());
      await new Promise(r=>setTimeout(r,700));
    }else if(view==='plan'){
      await p.evaluate(()=>(window.__konaShell || window.__app?.konaShell)?.plan?.());
      await new Promise(r=>setTimeout(r,900));
    }else if(view==='me'){
      await p.evaluate(()=>(window.__konaShell || window.__app?.konaShell)?.me?.());
      await new Promise(r=>setTimeout(r,700));
    }
  }
  const name=theme+'-'+view;
  await p.screenshot({path:path.join(out,name+'.png'),fullPage:false});
  const metrics=await p.evaluate(()=>({
    theme:document.documentElement.dataset.theme||'auto',
    renderer:window.__museum?.renderer?{
      calls:window.__museum.renderer.info.render.calls,
      triangles:window.__museum.renderer.info.render.triangles,
      dpr:window.__museum.renderer.getPixelRatio()
    }:null,
    panelOpen:document.body.classList.contains('kona-panel-open')
  }));
  rows.push({theme,view,errors,metrics});
  await p.close();
}
for(const theme of ['light','dark','random']) for(const view of ['landing','now','discover','garage','plan','me']) await shot(theme,view);
await browser.close();
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(rows,null,2)+'\n');
const bad=rows.flatMap(r=>r.errors.map(e=>r.theme+'/'+r.view+': '+e));
if(bad.length){ console.error(bad.join('\n')); process.exitCode=1; }
console.log('captured',rows.length,'release screenshots');
