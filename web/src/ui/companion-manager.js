import {escapeHTML as esc,safeURL} from './companion-data.js';
import {subscriptions,saveSubscriptions,fetchSources,personalRSS,supportedPublishers} from './companion-subscriptions.js';
export function sourceManager(root,{scope,defaults,onChange,signal}){
 let selected=subscriptions(scope,defaults);
 const rss=root.parentElement.querySelector('[data-personal-rss]');
 const draw=()=>{
  if(rss){rss.href=personalRSS(selected)||'integrations/companion/rss.xml';rss.hidden=!selected.some(s=>s.enabled);}
  root.innerHTML='<details class="companion-manager"><summary>Make this feed yours <span>+</span></summary><p>Follow the sources you like. Your choices stay on this device. Add a YouTube channel or an RSS / Atom URL from a supported publisher; up to 12 sources.</p><p>Publishers: '+esc(supportedPublishers.join(', '))+'. Availability depends on the publisher.</p><div data-source-list>'+selected.map((s,i)=>'<div class="companion-subscription"><label><input type="checkbox" data-toggle="'+i+'" '+(s.enabled?'checked':'')+'><span>'+esc(s.name||new URL(s.url).hostname)+'</span></label><button type="button" data-remove="'+i+'" aria-label="Remove '+esc(s.name||'source')+'">Remove</button></div>').join('')+'</div><form class="companion-source-form"><label>Source URL<input type="url" name="url" placeholder="https://…/feed or youtube.com/@channel" required maxlength="1200" autocomplete="off"></label><label>Lane<select name="kind"><option value="'+(scope==='travel'?'kona':'news')+'">'+(scope==='travel'?'Island news':'Triathlon')+'</option><option value="'+(scope==='travel'?'news':'kona')+'">'+(scope==='travel'?'Triathlon':'Island news')+'</option></select></label><button class="companion-button" type="submit">Add source</button></form><p class="companion-manager-status" data-source-status role="status"></p></details>';
  const status=root.querySelector('[data-source-status]');
  const commit=()=>{if(!saveSubscriptions(scope,selected)){status.textContent='Storage is full. These changes have not been saved.';return false;}if(rss){rss.href=personalRSS(selected)||'';rss.hidden=!selected.some(s=>s.enabled);}onChange();return true;};
  root.querySelectorAll('[data-toggle]').forEach(b=>b.onchange=()=>{selected[Number(b.dataset.toggle)].enabled=b.checked;commit();});
  root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{selected=selected.filter((_,i)=>i!==Number(b.dataset.remove));if(commit()){draw();root.querySelector('details').open=true;}});
  root.querySelector('form').onsubmit=async e=>{
   e.preventDefault();if(selected.length>=12){status.textContent='A full start list: remove a source before adding another.';return;}
   const form=e.currentTarget,button=form.querySelector('button'),url=safeURL(form.elements.url.value.trim());
   if(!url){status.textContent='Use a public HTTPS URL.';return;}button.disabled=true;status.textContent='Checking that source…';
   try{
    const result=await fetchSources([{url,kind:form.elements.kind.value,enabled:true}],signal),source=result.sources?.[0];
    if(!source)throw new Error(result.errors?.[0]?.error||'No feed found at that URL.');
    if(selected.some(s=>s.url===source.feed_url)){status.textContent='Already on your start list.';return;}
    selected.push({url:source.feed_url,kind:source.kind,name:source.name,enabled:true});
    if(commit()){draw();root.querySelector('details').open=true;root.querySelector('[data-source-status]').textContent='Added. Your feed and RSS link now include this source.';}
   }catch(error){if(!signal?.aborted)status.textContent=error.message||'Could not add that source.';}finally{button.disabled=false;}
  };
 };
 draw();
}
