import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const base=process.argv[2]||'http://127.0.0.1:8744';
const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,
  args:process.env.CI?['--no-sandbox','--disable-dev-shm-usage']:[],
});
try{
  const page=await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.setViewport({width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/about.html#why-three-ways',{waitUntil:'networkidle0',timeout:60000});
  await page.evaluate(()=>document.getElementById('why-three-ways')?.scrollIntoView({block:'start'}));
  await new Promise(r=>setTimeout(r,120));
  const m=await page.evaluate(()=>{
    const header=document.querySelector('.promo-header');
    const rail=document.querySelector('.field-rail');
    const why=document.querySelector('#why-three-ways');
    const copy=document.querySelector('#why-three-ways .promo-manifesto-copy');
    const hr=header?.getBoundingClientRect();
    const cr=copy?.getBoundingClientRect();
    return {
      viewport:[innerWidth,innerHeight],
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      headerPosition:header?getComputedStyle(header).position:null,
      headerBottom:hr?.bottom??null,
      storyCopyTop:cr?.top??null,
      railDisplay:rail?getComputedStyle(rail).display:null,
      chapters:why?.querySelectorAll('.why-story-chapter').length||0,
      title:why?.querySelector('h2')?.textContent?.replace(/\s+/g,' ').trim()||'',
    };
  });
  console.log(JSON.stringify(m,null,2));
  assert.deepEqual(m.viewport,[844,390]);
  assert.equal(m.overflow,false,'About landscape must not overflow horizontally');
  assert.equal(m.headerPosition,'absolute','short touch landscape header must leave the reading flow');
  assert.ok(m.headerBottom<=0||m.headerBottom<m.storyCopyTop,'header must not cover Why copy');
  assert.equal(m.railDisplay,'none','floating Field Guide rail must not cover landscape prose');
  assert.equal(m.chapters,5,'Why Kona must render the five continuous story chapters');
  assert.match(m.title,/One story\. Keep scrolling\./);
  assert.deepEqual(errors,[]);
  await page.close();
}finally{
  await browser.close();
}
console.log('About landscape 844x390: PASS');
