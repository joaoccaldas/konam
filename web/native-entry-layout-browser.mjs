// Shared browser geometry gate for the public and packaged landing page.
// --web checks the public build; the default additionally requires the native bootstrap.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const native = !process.argv.includes('--web');
const base = process.argv[2] || 'http://127.0.0.1:8748/app/native/www/';
const out = new URL('../output/playwright/', import.meta.url);
fs.mkdirSync(out, {recursive:true});
const browser = await puppeteer.launch({
  executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
});
const checks = [];
try {
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await page.goto(base,{waitUntil:'networkidle2'});
  await page.waitForFunction(()=>window.__konaShell);
  await page.evaluate(()=>document.fonts.ready);
  // Sweep intermediate widths too: testing only named devices misses breakpoint collisions.
  const sizes = [[240,480],[280,320],[320,480],[320,568],[360,640],[390,844],[430,932],
    [600,360],[667,375],[844,390],[768,1024],[899,900],[900,900],[1024,768],[1440,900],[2560,1440]];
  for(let width=280;width<=1200;width+=37) sizes.push([width,width<600?640:800]);
  for(const [width,height] of sizes) {
    await page.setViewport({width,height,isMobile:width<900,hasTouch:width<900,deviceScaleFactor:1});
    await page.evaluate(()=>window.scrollTo(0,0));
    await new Promise(resolve=>setTimeout(resolve,60));
    const layout = await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const cta=document.querySelector('#entryWorld'),why=document.querySelector('.kona-why-global');
      const r=cta.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {native:document.documentElement.classList.contains('native-app'),width:innerWidth,height:innerHeight,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        header:rect('.entry-header'),mast:rect('.entry-mast'),why:rect('.kona-why-global'),title:rect('#intro h1'),lede:rect('#intro .lede'),cta:rect('#entryWorld'),
        regions:['.entry-header','.entry-copy','.entry-actions-wrap','.entry-notes'].map(rect),
        flow:why.parentElement.id==='entryWhy',ctaHit:hit===cta||cta.contains(hit)};
    });
    const label=`${native?'native':'web'} ${width}x${height}`;
    if(native) assert.ok(layout.native,`${label}: native bootstrap missing`);
    assert.equal(layout.overflow,false,`${label}: sideways overflow`);
    assert.ok(layout.flow,`${label}: Why shortcut must participate in the header layout`);
    assert.ok(layout.title.top>=layout.header.bottom,`${label}: headline covered by header`);
    assert.ok(layout.mast.right<=layout.why.left,`${label}: brand overlaps Why shortcut`);
    assert.ok(layout.lede.top>=layout.title.bottom-1,`${label}: description overlaps headline`);
    assert.ok(layout.cta.top>=layout.lede.bottom-1,`${label}: Enter overlaps description`);
    for(const region of layout.regions) assert.ok(region.left>=-1&&region.right<=layout.width+1,`${label}: content outside screen`);
    for(const control of [layout.cta,layout.why]) assert.ok(control.width>=48&&control.height>=48,`${label}: unusable tap target`);
    if(height>=480||width>=600) {
      assert.ok(layout.cta.bottom<=layout.height+1,`${label}: primary action below first viewport (${layout.cta.bottom})`);
      assert.ok(layout.ctaHit,`${label}: Enter covered by another element`);
    }
    // Extremely short windows may scroll vertically; controls must remain fully reachable.
    await page.$eval('#entryWorld',el=>el.scrollIntoView({block:'center'}));
    assert.ok(await page.$eval('#entryWorld',el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&(hit===el||el.contains(hit));}),`${label}: Enter unreachable after scrolling`);
    checks.push({width,height,ctaBottom:layout.cta.bottom,status:'PASS'});
  }
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';window.scrollTo(0,0);});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'200% text size causes horizontal overflow');
  await page.$eval('#entryWorld',el=>el.scrollIntoView({block:'center'}));
  await page.click('#buildSelf');
  await page.waitForSelector('#konaQuest');
  assert.ok(await page.$eval('.kona-why-global',el=>el.parentElement.id==='entryWhy'),'Onboarding must keep shared Why route in flow');
  // A phone requesting the desktop site reports a wider layout viewport.
  // The canonical viewport adapter and container layout must still fit its physical screen.
  const desktopPhone = await browser.newPage();
  await desktopPhone.setBypassServiceWorker(true);
  await desktopPhone.evaluateOnNewDocument(()=>{
    Object.defineProperty(screen,'width',{value:390});
    Object.defineProperty(screen,'height',{value:844});
  });
  await desktopPhone.setViewport({width:980,height:2120,isMobile:true,hasTouch:true});
  await desktopPhone.goto(base,{waitUntil:'networkidle2'});
  await desktopPhone.waitForFunction(()=>window.__konaShell);
  const phoneFit = await desktopPhone.evaluate(()=>{
    const cta=document.querySelector('#entryWorld').getBoundingClientRect();
    return {fit:window.__konaViewport.desktopViewPhone,overflow:document.documentElement.scrollWidth>innerWidth+1,
      stacked:getComputedStyle(document.querySelector('.intro-inner')).display==='flex',bottom:cta.bottom,height:innerHeight};
  });
  assert.ok(phoneFit.fit&&phoneFit.stacked&&!phoneFit.overflow,'Desktop-site phone must keep the stacked landing layout');
  assert.ok(phoneFit.bottom<=phoneFit.height,'Desktop-site phone Enter below viewport');
  checks.push({mode:'phone requesting desktop site',...phoneFit,status:'PASS'});
  console.log(JSON.stringify(checks,null,2));
} finally {
  fs.writeFileSync(new URL(`entry-responsive-${native?'native':'web'}.json`,out),JSON.stringify(checks,null,2));
  await browser.close();
}
