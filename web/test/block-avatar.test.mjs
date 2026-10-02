import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AVATAR_SCHEMA_VERSION, AVATAR_ARCHETYPES, AVATAR_PRESENTATIONS, AVATAR_ITEMS, AVATAR_SLOTS,
  avatarItem, defaultAvatarStyle, normaliseAvatarStyle, patchAvatarItem, setAvatarArchetype, setAvatarPresentation,
} from '../src/engine/avatar.js';

const stage=fs.readFileSync(new URL('../src/ui/race-self-stage.js',import.meta.url),'utf8');
const models=fs.readFileSync(new URL('../src/engine/avatar-models.js',import.meta.url),'utf8');
const home=fs.readFileSync(new URL('../src/ui/avatar-home.js',import.meta.url),'utf8');

test('avatar platform exposes four scalable archetypes and item slots',()=>{
  assert.equal(AVATAR_SCHEMA_VERSION,5);
  assert.deepEqual(AVATAR_ARCHETYPES.map(x=>x.id),['minecraft','renegade','aero','islander']);
  for(const slot of ['skin','hair','trisuit','top','bottoms','shoes','accessory','tattoo']){
    assert.ok(AVATAR_SLOTS.includes(slot));
    assert.ok(Array.isArray(AVATAR_ITEMS[slot])&&AVATAR_ITEMS[slot].length>=2);
  }
});

test('legacy voxel settings migrate into v5 without losing choices',()=>{
  const migrated=normaliseAvatarStyle({v:2,model:'voxel',skin:'deep',hair:'crop',top:'lava',bottoms:'navy',shoes:'ocean',accessory:'visor',accent:'#138a8f'});
  assert.equal(migrated.v,5);
  assert.equal(migrated.archetype,'minecraft');
  assert.equal(migrated.items.skin.id,'deep');
  assert.equal(migrated.items.top.id,'lava');
  assert.ok(migrated.items.trisuit);
  assert.equal(migrated.items.accessory.id,'visor');
  assert.equal(migrated.accent,'#138a8f');
  assert.equal(migrated.presentation,'prefer-not');
  assert.equal(migrated.presentation,'prefer-not');
});

test('each avatar item supports independent custom colour and safe image overlay',()=>{
  let style=defaultAvatarStyle();
  style=patchAvatarItem(style,'top',{color:'#123456',overlay:{src:'data:image/png;base64,AAAA',name:'team.png',opacity:.7}});
  assert.equal(avatarItem(style,'top').color,'#123456');
  assert.equal(style.items.top.overlay.name,'team.png');
  style=patchAvatarItem(style,'trisuit',{color:'#222222',accentColor:'#ff00aa',overlay:{src:'data:image/webp;base64,AAAA',name:'club.webp',opacity:1}});
  assert.equal(avatarItem(style,'trisuit').accentColor,'#ff00aa');
  assert.equal(style.items.trisuit.overlay.name,'club.webp');
  const rejected=patchAvatarItem(style,'shoes',{overlay:{src:'javascript:alert(1)',name:'bad'}});
  assert.equal(rejected.items.shoes.overlay,null);
});

test('presentation is independent from archetype and wardrobe',()=>{
  assert.deepEqual(AVATAR_PRESENTATIONS.map(x=>x.id),['male','female','prefer-not']);
  const styled=patchAvatarItem(defaultAvatarStyle(),'trisuit',{id:'split-wave',color:'#112233'});
  const next=setAvatarPresentation(styled,'female');
  assert.equal(next.presentation,'female');
  assert.equal(next.archetype,'minecraft');
  assert.equal(next.items.trisuit.id,'split-wave');
  assert.equal(next.items.trisuit.color,'#112233');
});
test('presentation is independent from archetype and wardrobe',()=>{
  assert.deepEqual(AVATAR_PRESENTATIONS.map(x=>x.id),['male','female','prefer-not']);
  const styled=patchAvatarItem(defaultAvatarStyle(),'trisuit',{id:'split-wave',color:'#112233'});
  const next=setAvatarPresentation(styled,'female');
  assert.equal(next.presentation,'female');
  assert.equal(next.archetype,'minecraft');
  assert.equal(next.items.trisuit.id,'split-wave');
  assert.equal(next.items.trisuit.color,'#112233');
});
test('archetype switching preserves customized items',()=>{
  const styled=patchAvatarItem(defaultAvatarStyle(),'bottoms',{id:'navy',color:'#112233'});
  const next=setAvatarArchetype(styled,'renegade');
  assert.equal(next.archetype,'renegade');
  assert.equal(next.items.bottoms.id,'navy');
  assert.equal(next.items.bottoms.color,'#112233');
});

test('Race Self stage renders distinct procedural archetypes and live updates',()=>{
  for(const builder of ['minecraftAvatar','renegadeAvatar','aeroAvatar','islanderAvatar']) assert.match(models,new RegExp(builder));
  assert.match(stage,/setAvatarStyle/);
  assert.match(stage,/avatarAnimation/);
  assert.match(models,/textureLoader\.load/);
  assert.match(models,/avatarPresentation/);
  assert.match(models,/avatarPresentation/);
});

test('avatar builder owns archetype, item, colour and image controls while bike stays separate',()=>{
  assert.match(home,/data-avatar-presentation/);
  assert.match(home,/data-avatar-presentation/);
  assert.match(home,/data-avatar-archetype/);
  assert.match(home,/data-avatar-item/);
  assert.match(home,/data-avatar-color/);
  assert.match(home,/data-avatar-overlay/);
  assert.match(home,/data-avatar-accent-color/);
  assert.match(home,/Choose & customize in 3D/);
  assert.doesNotMatch(home,/patchBike|setBikeStyle|bikeOverlay/);
});
