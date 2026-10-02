// Visit every published page at phone + desktop sizes. Check errors, local assets and overflow.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8744';
const out=new URL('../output/playwright/pages/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const files=fs.readdirSync(new URL('../',import.meta.url)).filter(x=>x.endsWith('.html'));
const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:process.env.CI?['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader']:['--use-angle=metal']});
const report=[];
try{for(const [width,height] of [[390,844],[1440,900]])for(const file of files){
 const p=await b.newPage();await p.setBypassServiceWorker(true);await p.setViewport({width,height,deviceScaleFactor:1});
 const errors=[],missing=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(`${r.status()} ${r.url().slice(base.length)}`)});
 await p.goto(`${base}/${file}`,{waitUntil:'networkidle0',timeout:60000});
 if(file.startsWith('Speedmax_'))await p.waitForFunction(()=>document.body.classList.contains('ready')&&Number(getComputedStyle(document.querySelector('#loader')).opacity)<.02,{timeout:30000});
 if(file==='Studio.html')await p.waitForFunction(()=>!!window.__studio?.current);
 const state=await p.evaluate(()=>({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth+1,canvas:[...document.querySelectorAll('canvas')].map(x=>({w:x.clientWidth,h:x.clientHeight})),headings:[...document.querySelectorAll('h1,h2')].filter(x=>x.getClientRects().length).map(x=>x.textContent).slice(0,5)}));
 await p.screenshot({path:new URL(`${file.replace('.html','')}-${width}.jpg`,out).pathname,type:'jpeg',quality:65});
 const row={file,width,height,...state,errors,missing,status:errors.length||missing.length||state.overflow?'FAIL':'PASS'};report.push(row);console.log(JSON.stringify(row));await p.close();
}}finally{fs.writeFileSync(new URL('report.json',out),JSON.stringify(report,null,2));await b.close();}
if(report.some(x=>x.status==='FAIL'))process.exitCode=1;
