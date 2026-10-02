import { readStorage, writeStorage } from '../engine/storage.js';
const ZONES=[['Pacific/Honolulu','Kona · HST'],['local','My timezone'],['UTC','UTC'],['Europe/Stockholm','Stockholm'],['Europe/London','London'],['America/New_York','New York'],['America/Los_Angeles','Los Angeles'],['America/Sao_Paulo','São Paulo'],['Australia/Sydney','Sydney']];
export function countdownTarget(event){
  if(event?.start_at&&/T.*(Z|[+-]\d\d:\d\d)$/.test(event.start_at)&&Number.isFinite(Date.parse(event.start_at)))return {at:Date.parse(event.start_at),label:'Race start'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event?.date||''))return null;
  const at=Date.parse(event.date+'T00:00:00-10:00');return Number.isFinite(at)?{at,label:'Race day begins · start time to be confirmed'}:null;
}
export function countdownText(at,mode='seconds',now=Date.now()){
  const seconds=Math.max(0,Math.ceil((at-now)/1000));
  if(!seconds)return 'Kona is here.';
  if(mode!=='normal')return seconds.toLocaleString('en')+' seconds';
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),s=seconds%60;
  return days+'d '+hours+'h '+minutes+'m '+s+'s';
}
export function mountCountdown(host,event,{}={}){
  const target=countdownTarget(event);if(!host||!target)return ()=>{};
  let pref;try{pref=JSON.parse(readStorage('countdown')||'null');}catch{}
  let mode=pref?.mode==='normal'?'normal':'seconds',zone=ZONES.some(x=>x[0]===pref?.zone)?pref.zone:'Pacific/Honolulu';
  const output=host.querySelector('[data-countdown-value]')||host.querySelector('strong,h3');
  const controls=document.createElement('details');controls.className='kona-countdown-options';
  controls.innerHTML='<summary>Countdown options</summary><div class="ui-cluster"><button type="button" class="btn-secondary" data-clock-mode="seconds">Seconds</button><button type="button" class="btn-secondary" data-clock-mode="normal">Normal</button><label class="ui-field"><span>Show the date in</span><select class="ui-select" aria-label="Countdown timezone">'+ZONES.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')+'</select></label></div><p class="kona-source-note" data-clock-target></p>';
  host.append(controls);
  const select=controls.querySelector('select');select.value=zone;
  const save=()=>writeStorage('countdown',JSON.stringify({mode,zone}));
  const paint=()=>{
    output.textContent=countdownText(target.at,mode);output.dataset.countdownMode=mode;
    controls.querySelectorAll('[data-clock-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.clockMode===mode)));
    const tz=zone==='local'?Intl.DateTimeFormat().resolvedOptions().timeZone:zone;
    controls.querySelector('[data-clock-target]').textContent=target.label+' · '+new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:tz}).format(new Date(target.at))+' · '+tz;
  };
  controls.querySelectorAll('[data-clock-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.clockMode;save();paint();});select.onchange=()=>{zone=select.value;save();paint();};
  paint();const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return;}if(!document.hidden)paint();},1000);
  return ()=>clearInterval(timer);
}
