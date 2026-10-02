// Canonical procedural avatar geometry. Stage owns camera, lighting and lifecycle.
import * as THREE from 'three';
import { avatarItem, normaliseAvatarStyle } from './avatar.js';

const textureLoader=new THREE.TextureLoader();
function material(item,roughness=.72){
  const opts={color:item?.color||'#777777',roughness,metalness:.02};
  if(item?.overlay?.src){
    try{
      const tex=textureLoader.load(item.overlay.src);
      tex.colorSpace=THREE.SRGBColorSpace;
      tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      tex.repeat.set(1,1);
      opts.map=tex;
    }catch(_){}
  }
  return new THREE.MeshStandardMaterial(opts);
}
const plain=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.02});
const box=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o;};
const sphere=(r,m,x=0,y=0,z=0,s=1)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),m);o.position.set(x,y,z);o.scale.y=s;return o;};
const cyl=(rt,rb,h,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,18),m);o.position.set(x,y,z);return o;};
function raceKit(style){
  const trisuit=avatarItem(style,'trisuit'),separates=trisuit.layout==='separates';
  return {
    trisuit,
    top:separates?avatarItem(style,'top'):trisuit,
    bottoms:separates?avatarItem(style,'bottoms'):trisuit,
    accent:trisuit.accentColor||style.accent,
  };
}
function addTrisuitLayout(g,style,shape='block'){
  const kit=raceKit(style),tri=kit.trisuit;if(tri.layout==='separates'||tri.layout==='blank')return;
  const m=plain(kit.accent,.52);
  if(shape==='block'){
    if(tri.layout==='classic')g.add(box(.035,.62,.016,m,0,1.12,.151));
    if(tri.layout==='panel'){g.add(box(.12,.62,.016,m,-.18,1.12,.151),box(.12,.62,.016,m,.18,1.12,.151));}
    if(tri.layout==='split')g.add(box(.50,.09,.016,m,0,1.18,.151),box(.50,.05,.016,m,0,.58,.141));
    if(tri.layout==='stripe'){const stripe=box(.10,.78,.016,m,.11,1.04,.151);stripe.rotation.z=-.18;g.add(stripe);}
  }else{
    const stripe=box(tri.layout==='panel'?.30:.055,.58,.018,m,tri.layout==='panel'?.13:0,1.18,.165);
    if(tri.layout==='stripe')stripe.rotation.z=-.18;
    if(tri.layout==='split'){stripe.scale.x=1.55;stripe.scale.y=.16;}
    g.add(stripe);
  }
}

function addFace(g,y=1.78,z=.27,scale=1){
  const dark=plain('#15191b',.82),white=plain('#f4f1e8',.8);
  g.add(box(.07*scale,.07*scale,.018,dark,-.11*scale,y,z),box(.07*scale,.07*scale,.018,dark,.11*scale,y,z));
  g.add(box(.02*scale,.02*scale,.02,white,-.095*scale,y+.016*scale,z+.01),box(.02*scale,.02*scale,.02,white,.125*scale,y+.016*scale,z+.01));
  g.add(box(.12*scale,.03*scale,.019,dark,0,y-.15*scale,z));
}
function addHairAndAccessory(g,style,shape='block'){
  const hair=avatarItem(style,'hair'),acc=avatarItem(style,'accessory');
  const hairMat=material(hair,.82),accent=plain(style.accent,.58),dark=plain('#15191b',.78);
  if(hair.id!=='none'){
    if(shape==='block') {
      g.add(box(.54,hair.id==='crop'?.13:.17,.54,hairMat,0,2.015,0));
      if(hair.id==='short')g.add(box(.54,.20,.08,hairMat,0,1.91,-.27));
    } else {
      const h=sphere(.29,hairMat,0,1.985,0,.62);g.add(h);
      if(hair.id==='crop')h.scale.y=.42;
    }
    if(hair.id==='cap')g.add(box(.34,.055,.24,accent,0,1.95,.32));
  }
  if(acc.id==='visor')g.add(box(.48,.10,.045,dark,0,1.76,.30));
  else if(acc.id==='headband')g.add(box(.54,.07,.54,material(acc,.72),0,1.86,0));
}
function addTattoo(g,style,arms){
  const ink=avatarItem(style,'tattoo');
  if(ink.id==='none')return;
  const m=material(ink,.8);
  for(const arm of arms){
    if(ink.id==='bands'){
      const band=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,20),m);band.rotation.x=Math.PI/2;band.position.copy(arm.position);band.position.y+=.08;g.add(band);
    } else if(ink.id==='geo'){
      const mark=box(.11,.22,.012,m,arm.position.x,arm.position.y+.03,arm.position.z+.115);mark.rotation.z=arm.position.x<0?.22:-.22;g.add(mark);
    } else {
      g.add(box(.08,.18,.013,m,arm.position.x,arm.position.y+.04,arm.position.z+.116));
    }
  }
}

// Pixel-scale fabric stays crisp at every zoom. Colors and uploaded designs still
// come from avatar.js; geometry never owns a second wardrobe or persistence model.
function pixelFabric(item){
  const m=material(item,.76);
  if(m.map)return m;
  const c=document.createElement('canvas');c.width=c.height=32;
  const ctx=c.getContext('2d');
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const v=224+((x*17+y*31+x*y*7)%5)*7;
    ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,1,1);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;m.map=t;return m;
}
function minecraftAvatar(style){
  const g=new THREE.Group(),skin=pixelFabric(avatarItem(style,'skin')),kit=raceKit(style);
  const top=pixelFabric(kit.top),bottoms=pixelFabric(kit.bottoms);
  const shoes=pixelFabric(avatarItem(style,'shoes')),accent=plain(kit.accent,.6);
  const foam=plain('#eee9de',.9),rubber=plain('#181e23',.94),seam=plain('#656e75',.8);
  const head=box(.52,.52,.52,skin,0,1.72,0),torso=box(.52,.72,.28,top,0,1.10,0);
  const armL=box(.19,.70,.22,skin,-.36,1.10,0),armR=box(.19,.70,.22,skin,.36,1.10,0);
  g.add(head,torso,armL,armR);
  // One-piece race silhouette: short sleeves, side panels, zip and thigh grippers.
  for(const side of [-1,1]){
    g.add(box(.202,.24,.235,top,side*.36,1.33,0));
    g.add(box(.205,.025,.238,accent,side*.36,1.22,0));
    g.add(box(.035,.60,.014,accent,side*.235,1.08,.15));
    g.add(box(.23,.36,.26,bottoms,side*.14,.60,0));
    g.add(box(.234,.05,.265,accent,side*.14,.44,0));
    g.add(box(.21,.29,.23,skin,side*.14,.28,0));
    // Sculpted, block-built race shoes: stacked foam, outsole, upper and laces.
    g.add(box(.245,.035,.39,rubber,side*.14,.018,.065));
    g.add(box(.255,.055,.40,foam,side*.14,.063,.067));
    g.add(box(.225,.075,.34,shoes,side*.14,.125,.07));
    g.add(box(.20,.04,.12,shoes,side*.14,.118,.23));
    g.add(box(.07,.07,.06,accent,side*.14,.15,-.08));
    for(let i=0;i<3;i++)g.add(box(.11,.012,.022,foam,side*.14,.169,.04+i*.04));
    g.add(box(.22,.055,.24,foam,side*.14,.19,0));
  }
  g.add(box(.012,.39,.015,seam,0,1.245,.15));
  g.add(box(.025,.045,.018,foam,0,1.39,.16));
  // Tiny geometric K mark, deliberately not a texture or external brand asset.
  g.add(box(.015,.06,.015,foam,-.15,1.29,.15),box(.045,.014,.015,foam,-.12,1.30,.15),box(.045,.014,.015,foam,-.12,1.27,.15));
  addTrisuitLayout(g,style,'block');addFace(g);addHairAndAccessory(g,style,'block');addTattoo(g,style,[armL,armR]);
  g.name='minecraft-triathlete';return g;
}
function renegadeAvatar(style){
  const kit=raceKit(style),g=new THREE.Group(),skin=material(avatarItem(style,'skin'),.88),top=material(kit.top,.62);
  const bottoms=material(kit.bottoms,.7),shoes=material(avatarItem(style,'shoes'),.58);
  g.add(sphere(.285,skin,0,1.78,0,1.03));
  const chest=box(.58,.62,.31,top,0,1.18,0);chest.scale.set(1,.98,.95);g.add(chest);
  const armL=cyl(.12,.105,.68,skin,-.39,1.19,0),armR=cyl(.12,.105,.68,skin,.39,1.19,0);armL.rotation.z=-.08;armR.rotation.z=.08;g.add(armL,armR);
  const legL=cyl(.135,.12,.72,bottoms,-.16,.48,0),legR=cyl(.135,.12,.72,bottoms,.16,.48,0);g.add(legL,legR);
  g.add(box(.25,.15,.40,shoes,-.16,.09,.08),box(.25,.15,.40,shoes,.16,.09,.08));
  addTrisuitLayout(g,style,'round');addFace(g,1.80,.276,.92);addHairAndAccessory(g,style,'round');addTattoo(g,style,[armL,armR]);
  const brow=box(.38,.035,.025,plain('#191715'),0,1.895,.278);brow.rotation.z=-.025;g.add(brow);
  return g;
}
function aeroAvatar(style){
  const kit=raceKit(style),g=new THREE.Group(),skin=material(avatarItem(style,'skin'),.86),top=material(kit.top,.48);
  const bottoms=material(kit.bottoms,.58),shoes=material(avatarItem(style,'shoes'),.42);
  g.add(sphere(.255,skin,0,1.82,0,1.08));
  const torso=cyl(.255,.20,.72,top,0,1.16,0);g.add(torso);
  const armL=cyl(.085,.075,.71,skin,-.31,1.15,0),armR=cyl(.085,.075,.71,skin,.31,1.15,0);g.add(armL,armR);
  g.add(cyl(.105,.09,.74,bottoms,-.12,.45,0),cyl(.105,.09,.74,bottoms,.12,.45,0));
  g.add(box(.21,.12,.40,shoes,-.12,.075,.09),box(.21,.12,.40,shoes,.12,.075,.09));
  addTrisuitLayout(g,style,'round');addFace(g,1.83,.251,.83);addHairAndAccessory(g,style,'round');addTattoo(g,style,[armL,armR]);
  return g;
}
function islanderAvatar(style){
  const kit=raceKit(style),g=new THREE.Group(),skin=material(avatarItem(style,'skin'),.92),top=material(kit.top,.78);
  const bottoms=material(kit.bottoms,.82),shoes=material(avatarItem(style,'shoes'),.8);
  g.add(sphere(.29,skin,0,1.78,0,1.04));
  const torso=box(.50,.65,.30,top,0,1.14,0);torso.scale.x=.95;g.add(torso);
  const armL=cyl(.10,.09,.65,skin,-.34,1.15,0),armR=cyl(.10,.09,.65,skin,.34,1.15,0);armL.rotation.z=-.05;armR.rotation.z=.05;g.add(armL,armR);
  g.add(cyl(.12,.105,.68,bottoms,-.14,.46,0),cyl(.12,.105,.68,bottoms,.14,.46,0));
  g.add(box(.24,.12,.36,shoes,-.14,.075,.075),box(.24,.12,.36,shoes,.14,.075,.075));
  addTrisuitLayout(g,style,'round');addFace(g,1.80,.286,.94);addHairAndAccessory(g,style,'round');addTattoo(g,style,[armL,armR]);
  return g;
}
export function buildAvatar(styleInput={}){
  const style=normaliseAvatarStyle(styleInput);
  const builders={minecraft:minecraftAvatar,renegade:renegadeAvatar,aero:aeroAvatar,islander:islanderAvatar};
  const body=(builders[style.archetype]||minecraftAvatar)(style);
  // Presentation changes silhouette only. It never gates wardrobe, colors, hair or archetype.
  const shape=style.presentation==='male'?{x:1.035,y:1,z:1.02}:style.presentation==='female'?{x:.94,y:1.015,z:.96}:{x:1,y:1,z:1};
  body.scale.set(shape.x,shape.y,shape.z);
  const g=new THREE.Group();g.add(body);
  g.userData.avatarArchetype=style.archetype;
  g.userData.avatarPresentation=style.presentation;
  g.userData.avatarAnimation={minecraft:'bounce',renegade:'swagger',aero:'ready',islander:'sway'}[style.archetype]||'bounce';
  g.userData.baseY=0;
  g.rotation.y=-.08;
  return g;
}
