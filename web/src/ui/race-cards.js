// One Race Card renderer and one delegated controller for add, edit and remove.
import { searchRaces, getRace } from '../engine/race-catalog.js';
import { readRaceHistory, setRaceRelationship, removeRace, RACE_RELATIONSHIPS } from '../engine/race-history.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABELS = Object.freeze({completed:'Completed', registered:'Registered', interested:'Interested'});
const relationLabel = value => LABELS[value] || 'Not saved';

export function raceCardMarkup(r, {relationship=null, interactive=false, removable=false}={}) {
  const label = relationLabel(relationship);
  return '<article class="race-card" data-race-id="'+esc(r.id)+'">'+
    '<div class="race-card-top"><small>'+esc(r.brand || 'Race')+'</small><b>'+esc(r.year || '')+'</b></div>'+
    '<h4>'+esc(r.name || 'Saved race edition')+'</h4><p>'+esc(r.distance || '')+' · '+esc(r.date || r.year || 'Date not available')+'</p>'+
    '<span class="race-card-badge" data-race-saved-label>'+esc(label)+'</span>'+
    (interactive ? '<div class="race-card-actions" role="group" aria-label="Your relationship to '+esc(r.name)+'">'+RACE_RELATIONSHIPS.map(rel =>
      '<button type="button" class="'+(relationship===rel?'btn-primary':'btn-secondary')+'" data-race-rel="'+rel+'" aria-pressed="'+String(relationship===rel)+'" aria-label="Mark '+esc(r.name)+' as '+LABELS[rel]+'">'+LABELS[rel]+'</button>'
    ).join('')+'</div>' : '')+
    (removable ? '<button type="button" class="btn-text" data-remove-race aria-label="Remove '+esc(r.name)+' from your race cards">Remove race</button>' : '')+'</article>';
}

export async function renderRaceBadges(root, {limit=12, empty=true, editable=false, storage=globalThis.localStorage, resolveRace=getRace, isCurrent=()=>true}={}) {
  if (!root) return;
  const history=readRaceHistory(storage).slice().reverse().slice(0,limit);
  const cards=await Promise.all(history.map(async row => {
    let race=null;
    try { race=await resolveRace(row.race_id); } catch { /* Preserve saved cards even while offline. */ }
    return raceCardMarkup(race || {id:row.race_id, name:'Saved race edition', brand:'Details unavailable'}, {relationship:row.relationship, interactive:editable, removable:editable});
  }));
  if (isCurrent()) root.innerHTML=cards.join('') || (empty ? '<p class="kona-source-note">No race badges yet.</p>' : '');
}

export function renderRacePicker(root, {onChange, storage=globalThis.localStorage, search=searchRaces, resolveRace=getRace, signal}={}) {
  if (!root) return ()=>{};
  root.innerHTML='<div class="race-picker">'+
    '<label><span>Search IRONMAN races</span><input type="search" data-race-search autocomplete="off" placeholder="Try Kalmar, Oman, Copenhagen…"></label>'+
    '<p class="kona-source-note">These are your personal race labels. Choosing Registered does not enter you in a race.</p>'+
    '<p class="kona-source-note" data-race-feedback role="status" aria-live="polite"></p>'+
    '<div class="race-picker-results" data-race-results aria-busy="false"></div>'+
    '<div class="race-picker-selected" data-race-selected><div class="kona-section-head"><h3>Your race cards</h3><small>Profile badges</small></div><div data-race-badges></div></div></div>';
  const picker=root.firstElementChild, input=picker.querySelector('[data-race-search]'), results=picker.querySelector('[data-race-results]'), badges=picker.querySelector('[data-race-badges]'), feedback=picker.querySelector('[data-race-feedback]');
  let token=0, badgeToken=0, disposed=false, saving=false;
  const alive=()=>!disposed && root.firstElementChild===picker && !signal?.aborted;
  const report=(text, error=false)=>{ if(alive()){feedback.textContent=text;feedback.setAttribute('role',error?'alert':'status');} };
  const paintSelection=()=>{
    const selected=new Map(readRaceHistory(storage).map(r=>[r.race_id,r.relationship]));
    picker.querySelectorAll('[data-race-id]').forEach(card=>{
      const rel=selected.get(card.dataset.raceId);
      card.querySelector('[data-race-saved-label]').textContent=relationLabel(rel);
      card.querySelectorAll('[data-race-rel]').forEach(b=>{const active=b.dataset.raceRel===rel;b.setAttribute('aria-pressed',String(active));b.className=active?'btn-primary':'btn-secondary';});
    });
  };
  const refreshBadges=async()=>{
    const mine=++badgeToken;
    await renderRaceBadges(badges,{limit:200,editable:true,storage,resolveRace,isCurrent:()=>alive()&&mine===badgeToken});
  };
  const paint=async query=>{
    const mine=++token;
    results.setAttribute('aria-busy','true');
    results.innerHTML='<p class="kona-source-note">Looking through the race archive…</p>';
    try {
      const races=await search(query,{limit:8});
      if(!alive()||mine!==token)return;
      const saved=new Map(readRaceHistory(storage).map(row=>[row.race_id,row.relationship]));
      results.innerHTML=races.map(r=>raceCardMarkup(r,{interactive:true,relationship:saved.get(r.id)||null})).join('') || '<p class="kona-source-note">No matching race. Try a place or a year.</p>';
    } catch {
      if(alive()&&mine===token) results.innerHTML='<p class="kona-source-note" role="alert">Race search could not load. Your saved races are still here.</p><button type="button" class="btn-secondary" data-race-retry>Try again</button>';
    } finally { if(alive()&&mine===token)results.setAttribute('aria-busy','false'); }
  };
  const clicked=async event=>{
    const button=event.target.closest?.('button');
    if(!button||!picker.contains(button)||!alive()||button.disabled)return;
    if(button.hasAttribute('data-race-retry')){await paint(input.value);return;}
    const card=button.closest('[data-race-id]');
    if(!card||saving)return;
    if(!button.hasAttribute('data-race-rel')&&!button.hasAttribute('data-remove-race'))return;
    const id=card.dataset.raceId, rel=button.dataset.raceRel;
    saving=true;
    picker.querySelectorAll('[data-race-rel],[data-remove-race]').forEach(b=>b.disabled=true);
    try {
      const rows=rel?setRaceRelationship(id,rel,storage):removeRace(id,storage);
      // Repaint only after persistence succeeds; never invent a saved state.
      await refreshBadges();
      if(!alive())return;
      paintSelection();
      report(rel?'Saved as '+relationLabel(rel)+' on this device.':'Race removed from your cards.');
      onChange?.(rows);
      if(!button.isConnected) input.focus({preventScroll:true});
    } catch(error) { report(error.message || 'Could not save that change. Please try again.',true); }
    finally { saving=false;if(alive())picker.querySelectorAll('[data-race-rel],[data-remove-race]').forEach(b=>b.disabled=false); }
  };
  picker.addEventListener('click',clicked);
  input.addEventListener('input',()=>paint(input.value));
  paint('');refreshBadges();
  const dispose=()=>{disposed=true;token++;badgeToken++;picker.removeEventListener('click',clicked);};
  signal?.addEventListener('abort',dispose,{once:true});
  return dispose;
}
