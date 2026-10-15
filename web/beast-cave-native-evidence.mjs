import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {isVibrationActivationNotice} from '../tools/lib/browser-console-policy.mjs';

const base=process.argv[2]||'http://127.0.0.1:8765/';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/evidence/beast-cave-native');
fs.mkdirSync(out,{recursive:true});

const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});
const browserVersion=await browser.version();

async function open(viewport,label){
  const page=await browser.newPage();
  await page.setViewport(viewport);
  const errors=[],warnings=[];
  page.on('console',m=>{if(m.type()==='error'){
    if(isVibrationActivationNotice(m.text()))warnings.push('browser-policy: '+m.text());
    else errors.push('console: '+m.text());
  }});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('response',res=>{if(res.status()>=400)errors.push('http '+res.status()+': '+res.url())});
  const url=new URL(base);
  url.searchParams.set('reviewRoom','beast-cave');
  url.searchParams.set('room','beast');
  await page.goto(url.href,{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction(()=>window.__museum?.beast?.group && window.__museumGo,{timeout:60000});
  await page.evaluate(()=>window.__museumGo('beast'));
  await new Promise(r=>setTimeout(r,1800));
  const state=await page.evaluate(()=>{
    const card=document.getElementById('card'),coach=document.getElementById('coach');
    const shown=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0;
    const overlap=(a,b)=>{if(!a||!b)return false;const r=a.getBoundingClientRect(),s=b.getBoundingClientRect();return r.width>0&&s.width>0&&Math.min(r.right,s.right)>Math.max(r.left,s.left)&&Math.min(r.bottom,s.bottom)>Math.max(r.top,s.top);};
    return {
    room:window.__museum?.beast?.group?.name||null,
    visible:window.__museum?.beast?.group?.visible??null,
    pickables:window.__museum?.pickables?.length||0,
    obstacles:window.__museum?.obstacles?.length||0,
    url:location.href,
    viewport:{width:innerWidth,height:innerHeight,coarse:matchMedia('(pointer:coarse)').matches},
    card_open:!!card?.classList.contains('on'),
    coach_visible:shown(coach),
    title_header_overlap:overlap(card?.querySelector('h2'),document.querySelector('#konaWorld>header')||document.querySelector('header'))
  };});
  if(state.card_open&&state.coach_visible)errors.push('layout: story card and walking coach compete');
  if(state.card_open&&state.title_header_overlap)errors.push('layout: story heading overlaps host header');
  if(viewport.isMobile&&!state.viewport.coarse)errors.push('harness: touch emulation is missing');
  await page.screenshot({path:path.join(out,label+'.png'),fullPage:false});
  let walkState=null;
  if(state.card_open){
    await page.click('#card .close');
    await new Promise(r=>setTimeout(r,750));
    walkState=await page.evaluate(()=>{const coach=document.getElementById('coach');return {card_open:document.getElementById('card')?.classList.contains('on')||false,room_visible:window.__museum?.beast?.group?.visible??null,coach_visible:!!coach&&!coach.hidden&&getComputedStyle(coach).display!=='none'};});
    if(walkState.card_open)errors.push('interaction: story card did not close');
    await page.screenshot({path:path.join(out,label+'-walking.png'),fullPage:false});
  }
  fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({browserVersion,state,walkState,errors,warnings},null,2)+'\n');
  await page.close();
  return {label,browserVersion,state,walkState,errors,warnings};
}

const results=[];
results.push(await open({width:1440,height:900,deviceScaleFactor:1},'desktop'));
results.push(await open({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true},'phone390'));
results.push(await open({width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true},'landscape'));

await browser.close();
const bad=results.flatMap(x=>x.errors.map(e=>x.label+': '+e));
if(results.some(x=>x.state.room!=='beastCaveRoom'||x.state.visible!==true)) throw new Error('Beast Cave native room did not become visible');
if(bad.length) throw new Error(bad.join('\n'));
console.log(JSON.stringify(results,null,2));
