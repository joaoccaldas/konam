// Functional UI gate. Transport fixtures exercise controls; real GoTrue is tested separately.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8748/';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
fs.mkdirSync('output/playwright',{recursive:true});
let newsletterCalls=0,explicitSubscriptions=0,mode='success';const choices=[];
try {
 const page=await browser.newPage();await page.setBypassServiceWorker(true);await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=request.url();if(!url.includes('mtvpnoqwjpoqaiocrklq.supabase.co'))return request.continue();
  let body={},status=200;
  if(request.method()==='OPTIONS')return request.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'apikey,content-type,authorization','access-control-allow-methods':'POST,GET,PUT,OPTIONS'}});
  if(url.includes('/newsletter-subscribe')){newsletterCalls++;body={ok:true,status:JSON.parse(request.postData()||'{}').unsubscribe?'unsubscribed':'pending'};if(mode==='newsletter-failure'){status=503;body={error:'Service temporarily unavailable'};}}
  else if(url.includes('/signup')){choices.push(JSON.parse(request.postData()).data.kona_newsletter);body={id:'fixture-pending'};if(mode==='rate'){status=429;body={msg:'Rate limited'};}}
  else if(url.includes('grant_type=password')){status=400;body={error_code:'invalid_credentials',msg:'Invalid login credentials'};}
  else if(url.includes('/auth/v1/user'))body={id:'fixture-user',email:'fixture@example.com'};
  else if(url.endsWith('/rpc/subscribe_intern_newsletter')){explicitSubscriptions++;body='active';if(mode==='newsletter-failure')status=503;}
  request.respond({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
 });
 for(const [width,height] of [[280,480],[320,568],[390,844],[430,932],[600,360],[844,390],[768,1024],[1440,900]])for(const account of ['login','register']){
  await page.setViewport({width,height,isMobile:width<900,hasTouch:width<900,deviceScaleFactor:1});
  await page.goto(base+'?account='+account,{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${account} ${width}: sideways overflow`);
  const inputs=await page.$$eval('.account-form input:not([type=checkbox])',els=>els.map(el=>({size:parseFloat(getComputedStyle(el).fontSize),height:el.getBoundingClientRect().height,label:!!document.querySelector('label[for="'+el.id+'"]')})));
  assert.ok(inputs.every(x=>x.size>=16&&x.height>=48&&x.label),`${account} ${width}: input accessibility`);
  if(account==='register')assert.ok(await page.$eval('[name=updates]',el=>el.getBoundingClientRect().width<=28&&el.getBoundingClientRect().height<=28),'legacy rules stretched the consent checkbox');
  assert.notEqual(await page.$eval('.account-panel h2',el=>getComputedStyle(el).color),await page.$eval('.account-panel',el=>getComputedStyle(el).backgroundColor),'account heading is invisible');
  await page.$eval('[type=submit]',el=>el.scrollIntoView({block:'center'}));assert.ok(await page.$eval('[type=submit]',el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===hit||el.contains(hit);}),`${account} ${width}: submit obstructed`);
  if([320,390,844,1440].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/playwright/account-${account}-${width}.png`,fullPage:true});}
 }
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 async function fillRegistration(optIn=false){await page.goto(base+'?account=register',{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');await page.type('[name=email]','fixture@example.com');await page.type('[name=password]','fixture-password-only');await page.type('[name=confirm]','fixture-password-only');assert.equal(await page.$eval('[name=updates]',el=>el.checked),false);if(optIn)await page.click('[name=updates]');await page.click('[type=submit]');await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);}
 await fillRegistration();assert.equal(newsletterCalls,0);assert.match(await page.$eval('.account-status',el=>el.textContent),/confirm your email/);assert.equal(await page.evaluate(()=>localStorage.getItem('kona.supabase.session.v1')),null);
 assert.deepEqual(choices.at(-1),{id:'kona-intern',version:1,opt_in:false});
 await fillRegistration(true);assert.equal(newsletterCalls,0);assert.deepEqual(choices.at(-1),{id:'kona-intern',version:1,opt_in:true});assert.match(await page.$eval('.account-status',el=>el.textContent),/confirms this optional newsletter subscription/);
 mode='rate';await fillRegistration(true);assert.match(await page.$eval('.account-status',el=>el.textContent),/Too many attempts/);assert.doesNotMatch(await page.$eval('.account-status',el=>el.textContent),/Check your inbox/);assert.equal(newsletterCalls,0);
 mode='success';await page.goto(base+'?account=login',{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');await page.type('[name=email]','fixture@example.com');await page.type('[name=password]','incorrect');await page.click('[data-show]');assert.equal(await page.$eval('[name=password]',el=>el.type),'text');await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-status').textContent.includes('didn’t match'));assert.equal(await page.$eval('[name=password]',el=>el.value),'');
 await page.click('[data-mode=forgot]');await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-status').textContent.includes('If an account'));
 await page.goto(base+'#access_token=fixture-token&refresh_token=fixture-refresh&type=recovery&expires_in=3600',{waitUntil:'networkidle2'});await page.waitForSelector('[name=confirm]');assert.equal(await page.evaluate(()=>location.hash),'');await page.type('[name=password]','fixture-new-password');await page.type('[name=confirm]','fixture-new-password');await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-status').textContent.includes('Password updated'));
 await page.goto(base+'?account=register',{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'200% text overflow');await page.click('[data-local]');await page.waitForFunction(()=>document.body.dataset.entryMode==='app');
 const token='a'.repeat(64);
 await page.goto(base+'?account=unsubscribe&token='+token,{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');assert.equal(newsletterCalls,0);assert.ok(!await page.evaluate(()=>location.search.includes('token=')));assert.ok(!await page.evaluate(token=>JSON.stringify(localStorage).includes(token),token));
 await page.screenshot({path:'output/playwright/newsletter-unsubscribe-390.png',fullPage:true});
 await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-panel h2').textContent==='You’re off the list.');assert.equal(newsletterCalls,1);
 mode='newsletter-failure';await page.goto(base+'?account=unsubscribe&token='+token,{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-status').getAttribute('role')==='alert');assert.ok(await page.$eval('[type=submit]',el=>!el.disabled));assert.equal(newsletterCalls,2);
 mode='success';await page.goto(base+'?account=unsubscribe&token=invalid',{waitUntil:'networkidle2'});await page.waitForSelector('.account-form');assert.equal(await page.$('[type=submit]'),null);assert.equal(newsletterCalls,2);
 await page.evaluate(()=>localStorage.removeItem('kona.supabase.session.v1'));await page.goto(base+'?account=newsletter',{waitUntil:'networkidle2'});await page.waitForSelector('[data-newsletter-auth]');assert.equal(explicitSubscriptions,0);assert.match(await page.$eval('.account-story',e=>e.textContent),/Three things/);await page.click('[data-newsletter-auth="register"]');await page.waitForSelector('[name=updates]');assert.equal(await page.$eval('[name=updates]',e=>e.checked),false);await page.click('[data-back]');await page.waitForSelector('[data-newsletter-auth]');
 await page.goto(new URL('index.html',base).href+'?account=newsletter#access_token=fixture-token&refresh_token=fixture-refresh&expires_in=3600',{waitUntil:'networkidle2'});await page.waitForSelector('[data-newsletter-access] [type=submit]');assert.equal(explicitSubscriptions,0);assert.equal(await page.evaluate(()=>location.hash),'');await page.screenshot({path:'output/playwright/newsletter-signup-390.png',fullPage:true});await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-status').textContent.includes('subscription is confirmed'));assert.equal(explicitSubscriptions,1);
 mode='newsletter-failure';await page.goto(base+'?account=newsletter',{waitUntil:'networkidle2'});await page.waitForSelector('[data-newsletter-access] [type=submit]');assert.equal(explicitSubscriptions,1);await page.click('[type=submit]');await page.waitForFunction(()=>document.querySelector('.account-status').getAttribute('role')==='alert');assert.ok(await page.$eval('[type=submit]',e=>!e.disabled));assert.equal(explicitSubscriptions,2);
 console.log('Account forms PASS: 16 viewport/mode combinations, opt-in isolation, confirmation-linked newsletter, rate limit, password error/show, recovery callback, reset, 200% text, local continuation, unsubscribe confirmation/token stripping/failure.');
} finally {await browser.close();}
