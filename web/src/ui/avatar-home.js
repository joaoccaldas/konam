// ui/avatar-home.js — canonical User Studio surface.
// Both the persistent user menu and the Me tab enter this same game-style studio.
// Avatar building is a projection over engine/avatar.js; mobile and desktop share this exact UI.
import { readGameState, gameProgress } from '../engine/game-state.js';
import { collectionSummary } from '../engine/items.js';
import { getPublicProduct } from '../engine/catalog.js';
import { AVATARS } from '../engine/profile.js';
import {
  AVATAR_ARCHETYPES, AVATAR_PRESENTATIONS, AVATAR_ITEMS, AVATAR_SLOTS,
  avatarItem, normaliseAvatarStyle, patchAvatarItem, setAvatarArchetype, setAvatarPresentation,
} from '../engine/avatar.js';
import { renderRacePicker } from './race-cards.js';
import { renderProgressSurface } from './me.js';
import { avatarItemAccess } from '../engine/access.js';
import { shareProgress, whatsappProgressUrl, safeAppUrl, progressShareText } from '../growth/social-share.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const productId=id=>String(id||'').replace(/^product:/,'');

async function equipped(snapshot,equipmentId){
  const row=(snapshot.user_equipment||[]).find(x=>x.id===equipmentId);
  if(!row?.product_id)return null;
  return getPublicProduct(productId(row.product_id));
}
function readImage(file){
  if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type)||file.size>500000)return Promise.resolve(null);
  return new Promise(resolve=>{
    const r=new FileReader();
    r.onload=()=>resolve({src:String(r.result||''),name:file.name,opacity:1,updatedAt:new Date().toISOString()});
    r.onerror=()=>resolve(null);
    r.readAsDataURL(file);
  });
}

export async function renderAvatarHome(root,{profile,settings,onBack,openGarage,openCollection,openTour,openAssets,openFeed,openTravel,isAdmin=false,isCurrent=()=>true}={}){
  const snapshot=readGameState();
  const identity=snapshot.race_identity||{};
  const summary=collectionSummary(snapshot);
  const [bike,shoe]=await Promise.all([equipped(snapshot,identity.setup?.bike),equipped(snapshot,identity.setup?.shoe)]);
  if(!isCurrent())return ()=>{};
  const p=profile?.get?.()||{};
  const accent=p.avatar||AVATARS[0];
  let avatarStyle=normaliseAvatarStyle({...p.avatarStyle,accent});
  const goal=identity.goal?.label||'Build your Kona';
  const intent=String(identity.intent||identity.mode||'exploring').replace(/[-_]+/g,' ');
  const bikeTitle=bike?[bike.brand,bike.name||bike.label||bike.model].filter(Boolean).join(' '):'Choose a bike';
  const shoeTitle=shoe?.name||shoe?.label||shoe?.model||'Choose shoes';
  const studioHref=bike?'Studio.html?p='+encodeURIComponent(bike.id):'Studio.html';
  const raceCount=(snapshot.race_history||[]).length;

  const menuItem=(action,mark,title,note)=>'<button type="button" data-race-self-action="'+action+'"><i aria-hidden="true">'+mark+'</i><span><b>'+title+'</b><small>'+note+'</small></span><em aria-hidden="true">↗</em></button>';
  root.innerHTML=
    '<section class="race-self-experience" aria-label="User Studio">'+
      '<header class="studio-heading"><a href="index.html" class="studio-wordmark" aria-label="KONA title screen">KONA<span>USER STUDIO</span></a><button type="button" class="btn-text studio-home" data-studio-home>← Home</button><button class="studio-install" data-install-app type="button">Install app</button><span class="studio-save-state" role="status">● Saved on this device</span></header>'+
      '<div class="race-self-stage-wrap">'+
        '<div class="race-self-identity"><small>YOUR ATHLETE. YOUR STRANGE LITTLE UNIVERSE.</small><h1>Build the version of you that hasn’t raced yet.</h1><p>Make it yours. Then go find something you weren’t looking for.</p></div>'+
        '<div class="studio-canvas-frame"><canvas class="race-self-stage" data-race-self-stage aria-label="Interactive 3D User Studio"></canvas><p class="studio-stage-status" role="status">Preparing your athlete…</p></div>'+
        '<div class="studio-stage-caption"><span>'+esc(p.name||'Your athlete')+'</span><button type="button" data-stage-reset aria-label="Reset athlete view">↺ Reset view</button><small>Drag to rotate · Scroll or pinch to zoom</small></div>'+
      '</div>'+
      '<nav class="studio-destinations" aria-label="Your journey"><small class="studio-menu-label">YOUR JOURNEY</small>'+
        menuItem('races','◉','Races',raceCount+' race badges')+
        menuItem('collection','◇','Collection',summary.total+' things found')+
        menuItem('progress','☆','Progress','Badges, milestones & history')+
        menuItem('share','↗','Share KONA','Progress card, WhatsApp & more')+
        menuItem('tour','?','Quick tour','Replay the 30-second KONA intro')+
        menuItem('feed','≋','The Feed','News, YouTube & your RSS sources')+
        menuItem('travel','⌁','Travel to Kona','Island guide, arrivals & local stops')+
        (isAdmin?menuItem('assets','▦','Asset Library','Bikes, gear, rooms, art & world assets'):'')+
        '<p class="studio-menu-note">Your history lives here.<br>The world stays out there.</p>'+
      '</nav>'+
      '<nav class="race-self-controls" aria-label="Your athlete"><small class="studio-menu-label">YOUR ATHLETE</small>'+
        menuItem('customize','●','Avatar','Build your character')+
        '<a href="'+studioHref+'"><i aria-hidden="true">△</i><span><b>Bike Studio</b><small>Choose & customize in 3D</small></span><em aria-hidden="true">↗</em></a>'+
        '<button type="button" disabled aria-label="Gear customization, coming soon"><i aria-hidden="true">◇</i><span><b>Gear <mark>Soon</mark></b><small>Shoes, helmet & race kit</small></span></button>'+
        menuItem('settings','⚙','Settings','Profile, appearance & privacy')+
        '<p class="studio-menu-note">Build your Race Self here.<br>Explore from the main navigation.</p>'+
      '</nav>'+
      '<section class="hub-drawer" data-hub-drawer hidden role="dialog" aria-modal="true" aria-labelledby="studioDrawerTitle"><div class="hub-drawer-head"><div><small data-hub-kicker>USER STUDIO</small><h2 id="studioDrawerTitle" data-hub-title>Your athlete</h2></div><button type="button" data-hub-close aria-label="Close customization">×</button></div><div data-hub-body></div></section>'+
    '</section>';

  let stageApi=null, disposed=false;
  const status=root.querySelector('.studio-stage-status');
  const stageError=()=>{if(!disposed)status.textContent='3D preview unavailable. You can still customize your avatar and explore.';};
  const mountStage=async()=>{
    if(disposed)return;
    try{
      const api=await window.__mountRaceSelfStage?.(root.querySelector('[data-race-self-stage]'),{accent,avatarStyle,bike,shoe});
      if(disposed){api?.dispose?.();return;}
      stageApi=api;status.hidden=true;
    }catch(error){stageError();}
  };
  let script=null;
  if(window.__mountRaceSelfStage) mountStage();
  else {
    script=document.createElement('script');script.src='app/race-self-stage.js';
    script.onload=mountStage;script.onerror=stageError;document.body.append(script);
  }
  root.querySelector('[data-stage-reset]').addEventListener('click',()=>stageApi?.resetView?.());

  const drawer=root.querySelector('[data-hub-drawer]');
  const drawerBody=root.querySelector('[data-hub-body]');
  const drawerTitle=root.querySelector('[data-hub-title]');
  const drawerKicker=root.querySelector('[data-hub-kicker]');
  let drawerTrigger=null;
  const siblings=[...root.querySelector('.race-self-experience').children].filter(x=>x!==drawer);
  const openDrawer=()=>{drawerTrigger=document.activeElement;drawer.hidden=false;siblings.forEach(x=>x.inert=true);root.querySelector('[data-hub-close]').focus();};
  const closeDrawer=()=>{drawer.hidden=true;siblings.forEach(x=>x.inert=false);drawerBody.replaceChildren();drawerTrigger?.focus?.();};
  const handleKey=e=>{
    if(drawer.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDrawer();}
    if(e.key==='Tab'){
      const items=[...drawer.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);
      const first=items[0],last=items.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  };
  document.addEventListener('keydown',handleKey);
  root.querySelector('[data-hub-close]')?.addEventListener('click',closeDrawer);

  const commitStyle=next=>{
    avatarStyle=normaliseAvatarStyle(next);
    profile?.set?.({avatarStyle});
    const saved=root.querySelector('.studio-save-state');
    if(saved){saved.classList.toggle('save-failed',profile?.saved===false);saved.textContent=profile?.saved===false?'Storage full · changes are temporary':'● Saved on this device';}
    stageApi?.setAvatarStyle?.(avatarStyle);
  };

  const showSelf=()=>{
    const active=document.activeElement;
    const focusAttr=['data-avatar-archetype','data-avatar-item','data-avatar-overlay','data-avatar-overlay-remove'].find(attr=>active?.hasAttribute?.(attr));
    const focusValue=focusAttr?active.getAttribute(focusAttr):null;
    const scrollTop=drawer.scrollTop;
    avatarStyle=normaliseAvatarStyle(profile?.get?.().avatarStyle);
    const presentations=AVATAR_PRESENTATIONS.map(a=>
      '<button type="button" class="avatar-archetype '+(avatarStyle.presentation===a.id?'on':'')+'" data-avatar-presentation="'+a.id+'"><b>'+esc(a.label)+'</b><span>'+(a.id==='prefer-not'?'No explanation required.':'Every style option stays open.')+'</span></button>'
    ).join('');
    const archetypes=AVATAR_ARCHETYPES.map(a=>
      '<button type="button" class="avatar-archetype '+(avatarStyle.archetype===a.id?'on':'')+'" data-avatar-archetype="'+a.id+'">'+
      '<b>'+esc(a.label)+'</b><span>'+esc(a.note)+'</span></button>'
    ).join('');
    const rows=AVATAR_SLOTS.map(slot=>{
      const selected=avatarItem(avatarStyle,slot);
      const options=(AVATAR_ITEMS[slot]||[]).map(item=>{
        const gate=avatarItemAccess(slot,item.id,{admin:isAdmin});
        return '<button type="button" data-avatar-item="'+slot+':'+item.id+'" class="'+(selected.id===item.id?'on':'')+(gate.unlocked?'':' locked')+'" style="--slot-color:'+(item.color||'#777')+'"'+(gate.unlocked?'':' disabled aria-label="'+esc(item.label)+' · unlocks at Level '+gate.requiredLevel+'"')+'><i></i><span>'+esc(item.label)+(gate.unlocked?'':' · LVL '+gate.requiredLevel)+'</span></button>';
      }).join('');
      const overlay=avatarStyle.items[slot]?.overlay;
      return '<section class="avatar-slot" data-avatar-slot-card="'+slot+'">'+
        '<div class="avatar-slot-title"><small>'+slot.toUpperCase()+'</small><span>'+esc(selected.label||selected.id)+'</span></div>'+
        '<div class="avatar-options">'+options+'</div>'+
        '<div class="avatar-item-tools">'+
          '<label><span>Custom color</span><input type="color" data-avatar-color="'+slot+'" value="'+esc(/^#[0-9a-f]{6}$/i.test(selected.color)?selected.color:'#777777')+'"></label>'+
          (slot==='trisuit'?'<label><span>Accent color</span><input type="color" data-avatar-accent-color="'+slot+'" value="'+esc(/^#[0-9a-f]{6}$/i.test(selected.accentColor)?selected.accentColor:'#ff6a00')+'"></label>':'')+
          '<label class="avatar-upload"><span>'+(overlay?'Replace image':'Add image')+'</span><input type="file" accept="image/png,image/jpeg,image/webp" data-avatar-overlay="'+slot+'"></label>'+
          (overlay?'<button type="button" data-avatar-overlay-remove="'+slot+'">Remove image</button>':'')+
        '</div>'+
      '</section>';
    }).join('');

    drawerKicker.textContent='AVATAR STUDIO';drawerTitle.textContent='Build your character';
    drawerBody.innerHTML=
      '<div class="avatar-builder">'+
        '<section class="avatar-archetypes"><small>PRESENTATION</small><div class="avatar-archetype-grid">'+presentations+'</div></section>'+
        '<section class="avatar-archetypes"><small>CHARACTER</small><div class="avatar-archetype-grid">'+archetypes+'</div></section>'+
        rows+
        '<section class="avatar-accent"><small>ACCENT</small><div class="hub-swatches">'+AVATARS.map(c=>'<button type="button" data-avatar="'+c+'" style="--swatch:'+c+'" aria-label="Avatar accent '+c+'"'+(c===profile?.get?.().avatar?' class="on"':'')+'></button>').join('')+'</div></section>'+
        '<p class="avatar-builder-note">PNG, JPEG or WebP overlays are stored with your local avatar profile. Maximum 500 KB per image.</p>'+
      '</div>';
    if(drawer.hidden)openDrawer();
    else {
      const replacement=focusAttr?drawerBody.querySelector('['+focusAttr+'="'+CSS.escape(focusValue)+'"]'):null;
      (replacement||root.querySelector('[data-hub-close]')).focus({preventScroll:true});
      drawer.scrollTop=scrollTop;
    }

    drawerBody.querySelectorAll('[data-avatar-presentation]').forEach(btn=>btn.addEventListener('click',()=>{
      commitStyle(setAvatarPresentation(avatarStyle,btn.dataset.avatarPresentation));
      profile?.set?.({gender:btn.dataset.avatarPresentation,avatarStyle});
      showSelf();
    }));
    drawerBody.querySelectorAll('[data-avatar-archetype]').forEach(btn=>btn.addEventListener('click',()=>{
      commitStyle(setAvatarArchetype(avatarStyle,btn.dataset.avatarArchetype));
      showSelf();
    }));
    drawerBody.querySelectorAll('[data-avatar-item]').forEach(btn=>btn.addEventListener('click',()=>{
      const [slot,id]=btn.dataset.avatarItem.split(':');
      commitStyle(patchAvatarItem(avatarStyle,slot,{id}));
      showSelf();
    }));
    drawerBody.querySelectorAll('[data-avatar-color]').forEach(input=>input.addEventListener('input',()=>{
      commitStyle(patchAvatarItem(avatarStyle,input.dataset.avatarColor,{color:input.value}));
    }));
    drawerBody.querySelectorAll('[data-avatar-accent-color]').forEach(input=>input.addEventListener('input',()=>{
      commitStyle(patchAvatarItem(avatarStyle,input.dataset.avatarAccentColor,{accentColor:input.value}));
    }));
    drawerBody.querySelectorAll('[data-avatar-overlay]').forEach(input=>input.addEventListener('change',async()=>{
      const overlay=await readImage(input.files?.[0]);
      if(!overlay){const note=drawerBody.querySelector('.avatar-builder-note');note.textContent='Choose a PNG, JPEG or WebP image smaller than 500 KB.';note.setAttribute('role','alert');return;}
      if(disposed)return;
      commitStyle(patchAvatarItem(avatarStyle,input.dataset.avatarOverlay,{overlay}));
      showSelf();
    }));
    drawerBody.querySelectorAll('[data-avatar-overlay-remove]').forEach(btn=>btn.addEventListener('click',()=>{
      commitStyle(patchAvatarItem(avatarStyle,btn.dataset.avatarOverlayRemove,{overlay:null}));
      showSelf();
    }));
    drawerBody.querySelectorAll('[data-avatar]').forEach(btn=>btn.addEventListener('click',()=>{
      const nextAccent=btn.dataset.avatar;
      avatarStyle=normaliseAvatarStyle({...avatarStyle,accent:nextAccent});
      profile?.set?.({avatar:nextAccent,avatarStyle});
      stageApi?.setAvatarStyle?.(avatarStyle);
      drawerBody.querySelectorAll('[data-avatar]').forEach(x=>x.classList.toggle('on',x===btn));
    }));
  };

  const showRaces=()=>{
    drawerKicker.textContent='USER STUDIO · RACES';drawerTitle.textContent='Your race cards';
    const host=document.createElement('div');
    drawerBody.replaceChildren(host);
    renderRacePicker(host,{onChange:()=>{}});
    if(drawer.hidden)openDrawer();
  };

  const showProgress=async()=>{
    drawerKicker.textContent='USER STUDIO · PASSPORT';drawerTitle.textContent='Your progress';
    drawerBody.replaceChildren();
    await renderProgressSurface(drawerBody,{settings,admin:isAdmin});
    if(drawer.hidden)openDrawer();
  };

  const showShare=()=>{
    const progress=gameProgress(readGameState());
    const wa=whatsappProgressUrl(progress);
    drawerKicker.textContent='USER STUDIO · SHARE';drawerTitle.textContent='Share your KONA';
    drawerBody.innerHTML='<section class="kona-section artifact artifact--label share-studio">'+
      '<div class="kona-section-head"><h3>Give someone the rabbit hole.</h3><small>PRIVATE BY DEFAULT</small></div>'+
      '<p class="kona-source-note">'+esc(progressShareText(progress))+'</p>'+
      '<div class="share-studio-actions"><button type="button" class="kona-primary" data-share-progress>Share to apps…</button>'+
      (wa?'<a class="btn-secondary" data-share-whatsapp href="'+esc(wa)+'" target="_blank" rel="noopener noreferrer">WhatsApp</a>':'')+
      '<button type="button" class="btn-secondary" data-share-copy>Copy clean link</button></div>'+
      '<p class="kona-source-note" data-share-status>On phones, the system share sheet can offer Instagram, WhatsApp, Messages and any compatible app. No email, account ID or private local state is included.</p>'+
    '</section>';
    if(drawer.hidden)openDrawer();
    const status=drawerBody.querySelector('[data-share-status]');
    drawerBody.querySelector('[data-share-progress]')?.addEventListener('click',async e=>{
      const button=e.currentTarget;button.disabled=true;const result=await shareProgress(progress);
      status.textContent=result.ok?(result.method==='clipboard'?'Share sheet unavailable. KONA link copied.':'Share sheet opened safely.'):(result.reason==='cancelled'?'Not shared. Nothing left KONA.':'Sharing is unavailable here. Use WhatsApp or copy the link.');
      button.disabled=false;
    });
    drawerBody.querySelector('[data-share-copy]')?.addEventListener('click',async e=>{
      const url=safeAppUrl();if(!url)return;
      const button=e.currentTarget;
      try{await navigator.clipboard.writeText(url);status.textContent='Clean KONA link copied.';button.textContent='Copied';}catch{status.textContent='Could not copy automatically. Use Share to apps… instead.';}
    });
  };

  root.querySelector('[data-studio-home]')?.addEventListener('click',()=>onBack?.());
  root.querySelector('[data-race-self-action="customize"]')?.addEventListener('click',showSelf);
  root.querySelector('[data-race-self-action="tour"]')?.addEventListener('click',()=>openTour?.());
  root.querySelector('[data-race-self-action="races"]')?.addEventListener('click',showRaces);
  root.querySelector('[data-race-self-action="collection"]')?.addEventListener('click',()=>openCollection?.());
  root.querySelector('[data-race-self-action="progress"]')?.addEventListener('click',showProgress);
  root.querySelector('[data-race-self-action="share"]')?.addEventListener('click',showShare);
  root.querySelector('[data-race-self-action="feed"]')?.addEventListener('click',()=>openFeed?.());
  root.querySelector('[data-race-self-action="travel"]')?.addEventListener('click',()=>openTravel?.());
  root.querySelector('[data-race-self-action="assets"]')?.addEventListener('click',()=>openAssets?.());
  root.querySelector('[data-race-self-action="settings"]')?.addEventListener('click',()=>settings?.open?.());
  return ()=>{disposed=true;stageApi?.dispose?.();script?.remove();document.removeEventListener('keydown',handleKey);};
}
