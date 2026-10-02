// ui/avatar-registration.js — fast first-run Race Self setup.
// Account creation remains optional; avatar/trisuit setup is part of becoming a Race Self.
import { AVATAR_ARCHETYPES, AVATAR_ITEMS, avatarItem, normaliseAvatarStyle, patchAvatarItem, setAvatarArchetype, setAvatarPresentation } from '../engine/avatar.js';
import { avatarItemAccess } from '../engine/access.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readImage(file){
  if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type)||file.size>500000)return Promise.resolve(null);
  return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve({src:String(r.result||''),name:file.name,opacity:1,updatedAt:new Date().toISOString()});r.onerror=()=>resolve(null);r.readAsDataURL(file);});
}
function preview(style){
  const skin=avatarItem(style,'skin'),hair=avatarItem(style,'hair'),tri=avatarItem(style,'trisuit'),shoes=avatarItem(style,'shoes');
  return '<div class="registration-avatar-figure" style="--skin:'+esc(skin.color)+';--hair:'+esc(hair.color)+';--kit:'+esc(tri.color)+';--kit-accent:'+esc(tri.accentColor)+';--shoes:'+esc(shoes.color)+'">'+
    '<i class="raf-hair"></i><i class="raf-head"></i><i class="raf-body"></i><i class="raf-panel"></i><i class="raf-arm l"></i><i class="raf-arm r"></i><i class="raf-leg l"></i><i class="raf-leg r"></i><i class="raf-shoe l"></i><i class="raf-shoe r"></i></div>';
}

export function renderAvatarRegistration(host,{profile,onContinue,onBack}={}){
  let style=normaliseAvatarStyle(profile?.get?.().avatarStyle);
  let gender=style.presentation||profile?.get?.().gender||'prefer-not';
  const paint=()=>{
    const tri=avatarItem(style,'trisuit');
    host.innerHTML='<section class="registration-avatar">'+
      '<div class="registration-avatar-copy"><p class="eyebrow">1 · MEET YOUR RACE SELF</p><h2>Who are we sending into the lava?</h2><p class="kona-note">Pick a character, decide how your Race Self presents, then make the trisuit dangerously yours. Nothing here locks you in.</p></div>'+
      '<div class="registration-avatar-preview">'+preview(style)+'<p class="t-hand">Progress looks good on you.</p></div>'+
      '<section class="registration-choice"><small>HOW SHOULD YOUR RACE SELF PRESENT?</small><div class="registration-choice-grid gender">'+[['male','Male'],['female','Female'],['prefer-not','Prefer not to answer']].map(([id,label])=>'<button type="button" class="quest-choice '+(gender===id?'on':'')+'" data-reg-gender="'+id+'"><b>'+label+'</b><span>'+(id==='prefer-not'?'No explanation required.':'This does not limit hair, kit, colors or style.')+'</span></button>').join('')+'</div></section>'+
      '<section class="registration-choice"><small>CHARACTER</small><div class="registration-choice-grid">'+AVATAR_ARCHETYPES.map(a=>'<button type="button" class="quest-choice '+(style.archetype===a.id?'on':'')+'" data-reg-archetype="'+esc(a.id)+'"><b>'+esc(a.label)+'</b><span>'+esc(a.note)+'</span></button>').join('')+'</div></section>'+
      '<section class="registration-choice"><small>TRISUIT LAYOUT</small><div class="registration-choice-grid trisuits">'+AVATAR_ITEMS.trisuit.map(item=>{const gate=avatarItemAccess('trisuit',item.id);return '<button type="button" class="quest-choice '+(tri.id===item.id?'on':'')+(gate.unlocked?'':' locked')+'" data-reg-trisuit="'+esc(item.id)+'"'+(gate.unlocked?'':' disabled aria-label="'+esc(item.label)+' · unlocks at Level '+gate.requiredLevel+'"')+'><i style="--kit:'+esc(item.color)+';--kit-accent:'+esc(item.accent)+'"></i><b>'+esc(item.label)+(gate.unlocked?'':' · LVL '+gate.requiredLevel)+'</b></button>';}).join('')+'</div></section>'+
      '<section class="registration-custom"><label class="ui-field"><span>Base color</span><input type="color" value="'+esc(tri.color)+'" data-reg-color></label><label class="ui-field"><span>Accent color</span><input type="color" value="'+esc(tri.accentColor)+'" data-reg-accent></label>'+
      '<label class="btn-secondary registration-upload"><span>'+(tri.overlay?'Replace trisuit image':'Add image to trisuit')+'</span><input type="file" accept="image/png,image/jpeg,image/webp" data-reg-overlay></label>'+(tri.overlay?'<button type="button" class="btn-text" data-reg-remove>Remove image</button>':'')+'</section>'+
      '<p class="kona-note" data-reg-note>'+(tri.overlay?'Your image is stored locally with your Race Self.':'PNG, JPEG or WebP. Maximum 500 KB. It stays on this device unless you choose cloud backup.')+'</p>'+
      '<div class="quest-nav"><button type="button" class="btn-secondary" data-reg-back>Back</button><button type="button" class="btn-primary" data-reg-continue>Good enough. Let’s make trouble →</button></div>'+
    '</section>';
    const commit=next=>{style=normaliseAvatarStyle(next);profile?.set?.({avatarStyle:style});paint();};
    host.querySelectorAll('[data-reg-gender]').forEach(b=>b.addEventListener('click',()=>{gender=b.dataset.regGender;style=setAvatarPresentation(style,gender);profile?.set?.({gender,avatarStyle:style});paint();}));
    host.querySelectorAll('[data-reg-archetype]').forEach(b=>b.addEventListener('click',()=>commit(setAvatarArchetype(style,b.dataset.regArchetype))));
    host.querySelectorAll('[data-reg-trisuit]').forEach(b=>b.addEventListener('click',()=>commit(patchAvatarItem(style,'trisuit',{id:b.dataset.regTrisuit}))));
    host.querySelector('[data-reg-color]')?.addEventListener('input',e=>{style=normaliseAvatarStyle(patchAvatarItem(style,'trisuit',{color:e.target.value}));profile?.set?.({avatarStyle:style});host.querySelector('.registration-avatar-preview').innerHTML=preview(style)+'<p class="t-hand">Progress looks good on you.</p>';});
    host.querySelector('[data-reg-accent]')?.addEventListener('input',e=>{style=normaliseAvatarStyle(patchAvatarItem(style,'trisuit',{accentColor:e.target.value}));profile?.set?.({avatarStyle:style});host.querySelector('.registration-avatar-preview').innerHTML=preview(style)+'<p class="t-hand">Progress looks good on you.</p>';});
    host.querySelector('[data-reg-overlay]')?.addEventListener('change',async e=>{const overlay=await readImage(e.target.files?.[0]);if(!overlay){const n=host.querySelector('[data-reg-note]');n.textContent='Choose a PNG, JPEG or WebP image smaller than 500 KB.';n.setAttribute('role','alert');return;}commit(patchAvatarItem(style,'trisuit',{overlay}));});
    host.querySelector('[data-reg-remove]')?.addEventListener('click',()=>commit(patchAvatarItem(style,'trisuit',{overlay:null})));
    host.querySelector('[data-reg-back]')?.addEventListener('click',()=>onBack?.());
    host.querySelector('[data-reg-continue]')?.addEventListener('click',()=>onContinue?.());
  };
  paint();
}
