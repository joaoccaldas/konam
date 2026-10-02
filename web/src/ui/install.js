// One install controller for entry, User Studio and the lazily mounted museum.
// Native browser prompts are single-use and may only run from a visitor's click.
import {installState,installInstructions} from '../engine/install-state.js';
function ensureInstallSheet(){
 let sheet=document.getElementById('appSheet');if(sheet)return sheet;
 sheet=document.createElement('div');sheet.id='appSheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','appSheetTitle');
 sheet.innerHTML='<div><button class="close" aria-label="Close">×</button><img src="assets/pwa/icon-v3-192.png" alt="" aria-hidden="true"><h3 id="appSheetTitle">KONA, on your phone</h3><p>Install KONA as a lightweight app. The 3D world stays optional and loads only when you enter it.</p><button class="opt" type="button" data-pwa-action hidden><b>Install KONA now</b><small>Use Chrome\'s native app-install prompt.</small></button><div class="opt" data-pwa hidden><b>Add KONA to your phone</b><small>Chrome: menu ⋮ → Install app / Add to Home screen. KONA then opens full-screen from your Home screen.</small></div><div class="opt" data-ios hidden>On iPhone or iPad<small>Tap the Share button, then “Add to Home Screen”.</small></div></div>';
 document.body.append(sheet);return sheet;
}
export function initInstall(){
 const sheet=ensureInstallSheet();
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const android=/android/i.test(navigator.userAgent);
 const display=matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
 let installed=display.matches||navigator.standalone===true,deferred=null,busy=false,trigger=null,background=[];
 const state=()=>installState({standalone:installed,ios,android,deferred:Boolean(deferred)});
 const selectors='#entryInstall,#installBtn,[data-install-app]';
 const sync=()=>{
  const s=state();document.body.classList.toggle('installed',installed);
  document.querySelectorAll(selectors).forEach(b=>{b.hidden=!s.show;b.dataset.installKind=s.kind;b.textContent=s.label;});
  return s;
 };
 const close=()=>{
  sheet.hidden=true;document.body.classList.remove('install-open');
  background.forEach(([el,inert])=>el.inert=inert);background=[];
  if(trigger?.isConnected&&!trigger.hidden)trigger.focus();
 };
 const status=document.createElement('p');status.setAttribute('role','status');status.className='install-status';sheet.querySelector('div').append(status);
 function rows(){
  const s=sync(),action=sheet.querySelector('[data-pwa-action]'),row=sheet.querySelector('[data-pwa]'),iosRow=sheet.querySelector('[data-ios]');
  if(action){action.hidden=s.action!=='prompt';action.disabled=busy;}
  if(row){row.hidden=s.action==='prompt'||ios;row.querySelector('small').textContent=installInstructions(s.kind);}
  if(iosRow){iosRow.hidden=!ios;iosRow.querySelector('small').textContent=installInstructions(s.kind);}
 }
 function open(){
  if(installed)return;
  if(sheet.hidden){trigger=document.activeElement;background=[...document.body.children].filter(el=>el!==sheet&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);background.forEach(([el])=>el.inert=true);}
  status.textContent='';rows();sheet.hidden=false;document.body.classList.add('install-open');sheet.querySelector('.close')?.focus();
 }
 sheet.querySelector('[data-pwa-action]')?.addEventListener('click',async()=>{
  if(!deferred||busy)return;
  busy=true;const prompt=deferred;deferred=null;
  const action=sheet.querySelector('[data-pwa-action]');action.disabled=true;
  try{
   await prompt.prompt();const choice=await prompt.userChoice;
   if(choice?.outcome==='accepted')status.textContent='Installation requested. Your browser will confirm when KONA is ready.';
   else status.textContent='No problem. You can keep using KONA here and install later.';
  }catch{status.textContent='The install prompt is unavailable. You can use the browser menu below.';}
  finally{busy=false;rows();if(installed)close();else sheet.querySelector('.close')?.focus();}
 });
 document.addEventListener('click',e=>{if(e.target.closest(selectors)){sync();open();}});
 sheet.querySelector('.close')?.addEventListener('click',close);
 sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
 sheet.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  if(e.key==='Tab'){
   const items=[...sheet.querySelectorAll('button,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
 });
 addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;sync();if(!sheet.hidden)rows();});
 addEventListener('appinstalled',()=>{installed=true;deferred=null;close();sync();});
 display.addEventListener('change',e=>{installed=e.matches||navigator.standalone===true;sync();if(installed)close();});
 // The museum and User Studio controls mount after this controller.
 const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(selectors)||n.querySelector?.(selectors)))))sync();});
 observer.observe(document.body,{subtree:true,childList:true});sync();
}
