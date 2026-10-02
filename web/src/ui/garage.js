// ui/garage.js — 2D Garage projection over canonical UserEquipment.
// Studio is optional configuration depth, not the ownership database.
import { readGarage, groupGarage } from '../engine/garage.js';
import { readGameState } from '../engine/game-state.js';
import { getPublicProduct } from '../engine/catalog.js';
import { renderRaceBadges } from './race-cards.js';
import { ensureProgression } from '../engine/progression.js';

const legacyId = id => String(id || '').replace(/^product:/, '');

const node = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

async function raceSetupHero(){
  const snapshot=readGameState();
  const identity=snapshot.race_identity||{};
  const bikeEquipment=(snapshot.user_equipment||[]).find(x=>x.id===identity.setup?.bike)
    || (snapshot.user_equipment||[]).find(x=>x.relationship==='owned'&&String(x.product_id||'').includes('bike'))
    || (snapshot.user_equipment||[]).find(x=>String(x.product_id||'').includes('bike'));
  const bike=bikeEquipment?.product_id?await getPublicProduct(legacyId(bikeEquipment.product_id)):null;
  const goal=identity.goal?.label||identity.goal||'Your setup is still taking shape.';
  const title=bike?[bike.brand,bike.label||bike.name||bike.model].filter(Boolean).join(' '):'Your Garage is waiting.';
  const meta=bike?[bike.year,bike.family||bike.product_type].filter(Boolean).join(' · '):'Choose a bike when you are ready.';
  const href=bike?'Studio.html?p='+encodeURIComponent(bike.id)+'#setup':'Studio.html#setup';
  return {bike,title,meta,goal,href};
}

export async function renderGarageSurface(root,{admin=false}={}) {
  const groups = groupGarage(readGarage());
  const setup=await raceSetupHero();
  const progression=ensureProgression();
  const bikeUnlocked=admin||progression.level>=2;
  root.replaceChildren();

  const hero=node('section','garage-setup-hero artifact artifact--hero');
  hero.innerHTML=
    '<div class="garage-setup-media" aria-hidden="true"><img src="assets/kona-years/kailua-bay.jpg" alt="" loading="lazy" decoding="async"></div>'+
    '<div class="garage-setup-overlay"></div>'+
    '<svg class="garage-bike-mark" viewBox="0 0 180 92" aria-hidden="true"><circle cx="38" cy="66" r="23"/><circle cx="142" cy="66" r="23"/><path d="M38 66 72 31l28 35H64l36-35 42 35M72 31h38m-10 0 14-14m-10 0h24"/></svg>'+
    '<div class="garage-setup-copy"><small>YOUR RACE SETUP</small><h3></h3><p class="garage-setup-meta"></p><p class="garage-setup-goal"></p>'+(bikeUnlocked?'<a class="kona-primary" href="'+setup.href+'">'+(setup.bike?'Configure':'Choose your first bike')+' <span>→</span></a>':'<button class="kona-primary" type="button" disabled>Bike ownership unlocks at Level 2</button><p class="garage-level-note">Browse anything now. Answer the intro questions or explore KONA to level up.</p>')+'</div>';
  hero.querySelector('h3').textContent=setup.title;
  hero.querySelector('.garage-setup-meta').textContent=setup.meta;
  hero.querySelector('.garage-setup-goal').textContent=setup.goal;
  root.append(hero);

  const relationshipSection=node('section','kona-section artifact artifact--label');
  const relationHead=node('div','kona-section-head');relationHead.append(node('h3','','Your equipment'),node('small','','Mine · Dreaming · Try'));
  relationshipSection.append(relationHead);

  for (const [relationship, label] of [['owned','Mine'],['dream','Dreaming'],['try','Try']]) {
    const section = node('div','garage-group');
    const head = node('div','garage-group-head');
    head.append(node('h4','',label), node('small','',String(groups[relationship].length)));
    section.append(head);
    const list = node('div','kona-list');

    if (!groups[relationship].length) {
      const empty = node('article','garage-empty');
      const wrap = node('div','');
      wrap.append(node('b','', relationship === 'owned' ? 'Nothing marked as yours yet.' : relationship === 'dream' ? 'Nothing in the dream pile yet.' : 'Nothing queued to try yet.'));
      empty.append(wrap);
      list.append(empty);
    } else {
      for (const item of groups[relationship]) {
        const product = await getPublicProduct(legacyId(item.product_id));
        const row = node('article','');
        const mark = node('i','', (product?.type || product?.product_type || 'gear').slice(0,4));
        const wrap = node('div','');
        wrap.append(
          node('b','', [product?.brand, product?.name || product?.label || product?.model].filter(Boolean).join(' ') || legacyId(item.product_id)),
          node('span','', product?.year ? String(product.year) : relationship)
        );
        const configure = node('a','', 'Configure →');
        configure.href = 'Studio.html?p=' + encodeURIComponent(legacyId(item.product_id)) + '#setup';
        row.append(mark, wrap, configure);
        list.append(row);
      }
    }
    section.append(list);
    relationshipSection.append(section);
  }
  root.append(relationshipSection);

  const raceSection=node('section','kona-section artifact artifact--label');
  const raceHead=node('div','kona-section-head'); raceHead.append(node('h3','','Race memories'),node('small','','Badges'));
  const raceHost=node('div','race-badge-strip');
  raceSection.append(raceHead,raceHost); root.append(raceSection);
  await renderRaceBadges(raceHost,{limit:8,empty:false});
}
