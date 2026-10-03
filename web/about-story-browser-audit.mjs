import puppeteer from 'puppeteer-core';

const base=process.argv[2]||'http://127.0.0.1:8744';
const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,
  args:process.env.CI?['--no-sandbox','--disable-dev-shm-usage']:[],
});

const cases=[
  {file:'about.html',target:'#why-three-ways',view:[390,844]},
  {file:'about.html',target:'#why-three-ways',view:[844,390]},
  {file:'why.html',target:'#scenic',view:[390,844]},
  {file:'why.html',target:'#scenic',view:[844,390]},
];
const results=[];
try{
  for(const item of cases){
    const [width,height]=item.view;
    const page=await browser.newPage();
    await page.setViewport({width,height,deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/${item.file}`,{waitUntil:'networkidle0',timeout:60000});
    await page.evaluate(target=>document.querySelector(target)?.scrollIntoView({block:'start'}),item.target);
    await new Promise(r=>setTimeout(r,180));
    const metrics=await page.evaluate(({file,target})=>{
      const R=e=>e?e.getBoundingClientRect():null;
      const overlap=(a,b)=>a&&b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):0;
      const header=R(document.querySelector(file==='about.html'?'.promo-header':'.about-header'));
      const rail=R(document.querySelector('.field-rail-toggle'));
      const targetRect=R(document.querySelector(target));
      const copy=file==='about.html'
        ? R(document.querySelector(target+' .promo-manifesto-copy'))
        : R(document.querySelector(target+' .about-story-copy'));
      return {
        width:innerWidth,height:innerHeight,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        headerCopyOverlap:overlap(header,copy),
        railCopyOverlap:overlap(rail,copy),
        targetTop:targetRect?.top??null,
        headerBottom:header?.bottom??null,
        rail:{left:rail?.left??null,top:rail?.top??null,right:rail?.right??null,bottom:rail?.bottom??null},
        whyContinuous:file==='why.html'&&Boolean(document.querySelector('#short')&&document.querySelector('#scenic')&&document.querySelector('#unfiltered')),
        productShape:file==='about.html'&&Boolean(document.querySelector('#shape .product-shape-flow')),
      };
    },{file:item.file,target:item.target});
    const problems=[];
    if(errors.length)problems.push(...errors);
    if(metrics.overflow)problems.push('horizontal overflow');
    if(metrics.headerCopyOverlap>1)problems.push('header overlaps editorial copy');
    if(metrics.railCopyOverlap>1)problems.push('Guide control overlaps editorial copy');
    if(item.file==='why.html'&&!metrics.whyContinuous)problems.push('Why story is not continuous');
    if(item.file==='about.html'&&!metrics.productShape)problems.push('About missing NOW/YOU/WORLD chapter');
    const result={...item,width,height,metrics,problems,status:problems.length?'FAIL':'PASS'};
    results.push(result);console.log(JSON.stringify(result));
    await page.close();
  }
}finally{await browser.close();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
