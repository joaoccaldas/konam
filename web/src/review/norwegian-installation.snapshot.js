// Review-only generated snapshot of the NOR // 3 candidate implementation.
// Source lineage: PR #15 feat/norwegian-engine-room @ 70e0efee80d0d16dcd6d7ef4fd8d35eb43b33a5a.
// This file is deliberately review-only until the candidate room implementation lands on main.
// Geometry is original editorial interpretation; athlete-specific equipment remains unassigned.

import * as THREE from 'three';
import {rng,motes} from '../roomkit.js';

function norwegian(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;
  const rand=rng(seed+41);
  const reviewPickables=[];

  const surfaceTexture=(kind,repeat=[2,2])=>{
    const c=document.createElement('canvas');c.width=c.height=512;
    const g=c.getContext('2d'),rr=rng(seed+(kind==='wood'?73:kind==='stone'?89:101));
    if(kind==='wood'){
      g.fillStyle='#2e1e14';g.fillRect(0,0,512,512);
      for(let y=0;y<512;y+=5+Math.floor(rr()*9)){
        g.strokeStyle='rgba(190,118,67,'+(.025+rr()*.055)+')';g.lineWidth=.8+rr()*1.4;
        g.beginPath();g.moveTo(0,y+rr()*8);
        for(let x=0;x<=512;x+=32)g.lineTo(x,y+Math.sin(x*.025+rr()*3)*5+rr()*5);
        g.stroke();
      }
    }else{
      g.fillStyle=kind==='stone'?'#171d20':'#0d1519';g.fillRect(0,0,512,512);
      for(let i=0;i<4200;i++){
        const v=kind==='stone'?50+rr()*55:25+rr()*55;
        g.fillStyle='rgba('+v+','+(v+3)+','+(v+5)+','+(.025+rr()*.07)+')';
        const z=.5+rr()*2.2;g.fillRect(rr()*512,rr()*512,z,z);
      }
      for(let i=0;i<32;i++){
        g.strokeStyle='rgba(126,158,168,'+(.015+rr()*.025)+')';g.lineWidth=.5+rr()*1.2;
        const y=rr()*512;g.beginPath();g.moveTo(0,y);g.lineTo(512,y+(rr()-.5)*20);g.stroke();
      }
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=lite?2:6;return t;
  };
  const textPanel=(text,w=.72,h=.18,fg='#dbe9ed',bg='rgba(8,13,16,.72)')=>{
    const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');
    g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);
    g.fillStyle=fg;g.font='700 58px Manrope, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));
  };
  const contactShadowTex=(()=>{
    const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');
    const grd=g.createRadialGradient(128,64,8,128,64,122);grd.addColorStop(0,'rgba(0,0,0,.52)');grd.addColorStop(.55,'rgba(0,0,0,.20)');grd.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=grd;g.fillRect(0,0,256,128);return new THREE.CanvasTexture(c);
  })();
  const contactShadow=(x,z,w,d,opacity=.55)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contactShadowTex,transparent:true,opacity,depthWrite:false,fog:false}));
    m.rotation.x=-Math.PI/2;m.position.set(x,Y+.022,z);rg.add(m);return m;
  };

  const rubber=new THREE.MeshStandardMaterial({color:'#0b0f11',roughness:.94});
  const steel=new THREE.MeshStandardMaterial({color:'#2d363b',roughness:.30,metalness:.78});
  const blackSteel=new THREE.MeshStandardMaterial({color:'#11171a',roughness:.42,metalness:.62});
  const basalt=new THREE.MeshStandardMaterial({color:'#171d20',roughness:.88,metalness:.06});
  const wet=new THREE.MeshPhysicalMaterial({color:'#111a1e',roughness:.20,metalness:.18,clearcoat:.72,clearcoatRoughness:.24,envMapIntensity:1.15});
  const oak=new THREE.MeshStandardMaterial({color:'#342216',roughness:.70});
  const paper=new THREE.MeshStandardMaterial({color:'#d8d0c3',roughness:.92});
  const linen=new THREE.MeshStandardMaterial({color:'#a8a29a',roughness:.98});
  const glass=new THREE.MeshPhysicalMaterial({color:'#a8d2dc',roughness:.08,transmission:lite?.22:.58,transparent:true,opacity:lite?.25:.34,depthWrite:false,envMapIntensity:1.1});
  const frost=new THREE.MeshPhysicalMaterial({color:'#82b8c7',roughness:.30,transmission:lite?.10:.26,transparent:true,opacity:lite?.16:.22,depthWrite:false});
  const warm=new THREE.MeshStandardMaterial({color:'#3b1605',roughness:.38,emissive:'#ff6a00',emissiveIntensity:lite?.48:1.05});
  const warmDim=new THREE.MeshStandardMaterial({color:'#2b160d',roughness:.48,emissive:'#d74c14',emissiveIntensity:lite?.18:.42});
  const cold=new THREE.MeshStandardMaterial({color:'#10323d',roughness:.46,emissive:'#5bbdd0',emissiveIntensity:lite?.14:.34});
  const lime=new THREE.MeshStandardMaterial({color:'#25311c',roughness:.52,emissive:'#c7f300',emissiveIntensity:lite?.20:.48});
  basalt.map=surfaceTexture('stone',[2.8,2.2]);basalt.needsUpdate=true;
  wet.map=surfaceTexture('wet',[3.2,2.5]);wet.needsUpdate=true;
  oak.map=surfaceTexture('wood',[2.0,1.3]);oak.needsUpdate=true;

  const mark=(obj,title,body)=>{
    obj.userData.review={title,body};
    reviewPickables.push(obj);
    return obj;
  };
  const rod=(a,b,radius,material,segments=10)=>{
    const mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a),len=dir.length();
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,segments),material);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    rg.add(mesh);
    return mesh;
  };
  const ring=(radius,tube,material,x,y,z,rx=Math.PI/2)=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,10,36),material);
    m.position.set(x,y,z);m.rotation.x=rx;rg.add(m);return m;
  };

  // Architectural depth inside the host shell: overhead ribs, wet floor, service spine.
  for(let i=0;i<(lite?5:8);i++){
    const z=r.z1+.45+i*((rd-.9)/((lite?5:8)-1));
    box(rw-.55,.09,.11,cx,Y+3.88,z,blackSteel);
    if(i%2===0) box(rw*.62,.025,.035,cx-.30,Y+3.72,z,warmDim);
  }
  box(.18,3.3,rd-.55,bounds.x0+.25,Y+1.65,cz,blackSteel);
  box(.07,3.0,rd-.75,bounds.x0+.39,Y+1.52,cz,cold);

  // Wet floor fields: subtle reflection zones rather than mirror slabs.
  [
    [cx-1.65,cz-rd*.29,2.35,.58],
    [cx-1.35,cz,2.65,.66],
    [cx-1.05,cz+rd*.29,2.45,.58],
    [cx+2.4,cz-.15,1.25,.74]
  ].forEach(([x,z,w,d])=>box(w,.012,d,x,Y+.014,z,wet));

  const laneZ=[cz-rd*.28,cz,cz+rd*.28];
  const specimenSlots=[];

  laneZ.forEach((z,i)=>{
    // Monumental lane portal.
    const left=cx-3.35,right=cx+1.30,headY=3.23;
    box(.10,3.05,.12,left,Y+1.53,z,blackSteel);
    box(.10,3.05,.12,right,Y+1.53,z,blackSteel);
    box(right-left+.10,.10,.12,(left+right)/2,Y+headY,z,blackSteel);
    box(right-left-.55,.025,.05,(left+right)/2,Y+headY-.22,z,warmDim);

    // Twin rails and lane pad.
    box(rw*.55,.025,Math.min(.92,rd*.20),cx-.85,Y+.018,z,rubber);
    for(const dz of [-.27,.27]){
      box(3.85,.016,.018,cx-1.0,Y+.037,z+dz,steel);
      box(.32,.012,.035,cx-2.95,Y+.045,z+dz,warm);
    }

    contactShadow(cx-.20,z,4.3,.72,.42);

    // Trainer: flywheel, axle, feet, support.
    const fly=mark(new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.17,36),blackSteel),
      'Direct-drive trainer','Generic equipment study. No athlete-specific trainer claim is attached.');
    fly.rotation.z=Math.PI/2;put(fly,cx+.68,Y+.43,z);
    const axle=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.34,14),steel);
    axle.rotation.z=Math.PI/2;put(axle,cx+.68,Y+.43,z);
    box(.98,.10,.42,cx+.68,Y+.08,z,steel);
    box(.16,.08,1.00,cx+.44,Y+.055,z,blackSteel);
    box(.16,.08,1.00,cx+.93,Y+.055,z,blackSteel);

    // Compact run deck with rollers and console.
    const deck=mark(box(1.62,.10,.54,cx-2.35,Y+.09,z,rubber),
      'Run deck','Compact treadmill-style deck: the lane reads as a complete training station rather than a bike pedestal.');
    for(const dx of [-.68,.68]){
      const roller=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.46,18),steel);
      roller.rotation.x=Math.PI/2;put(roller,cx-2.35+dx,Y+.13,z);
    }
    box(.24,.74,.48,cx-1.54,Y+.74,z,blackSteel);
    const console=mark(box(.30,.20,.42,cx-1.48,Y+1.35,z,cold),
      'Lane console','Environmental and session information lives here. It is editorial UI, not an athlete data claim.');
    console.rotation.z=-.05;

    // Canonical bike slot represented by a neutral spatial study only.
    const bx=cx-.22,by=Y+.66;
    const wf=ring(.42,.026,steel,bx-.55,by,z,Math.PI/2);
    const wr=ring(.42,.026,steel,bx+.55,by,z,Math.PI/2);
    mark(wf,'Canonical bike slot','The room reserves a bike position, but no athlete-specific bike is assigned without a verified source.');
    const pBB=new THREE.Vector3(bx,by-.05,z),pSeat=new THREE.Vector3(bx-.10,by+.54,z),pHead=new THREE.Vector3(bx+.42,by+.30,z);
    rod(pBB,pSeat,.026,blackSteel);rod(pSeat,pHead,.026,blackSteel);rod(pHead,pBB,.026,blackSteel);
    rod(pSeat,new THREE.Vector3(bx-.55,by,z),.022,blackSteel);rod(pHead,new THREE.Vector3(bx+.55,by,z),.022,blackSteel);
    rod(new THREE.Vector3(bx+.40,by+.34,z),new THREE.Vector3(bx+.70,by+.42,z),.018,steel);
    box(.34,.035,.10,bx-.14,by+.61,z,blackSteel);

    // Accessories and signs of use.
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.052,.34,16),glass);
    put(bottle,bx+.20,Y+.25,z-.34);
    const towel=box(.40,.025,.33,bx-.65,Y+.31,z+.34,linen);towel.rotation.y=.08*(i-1);
    const identity=ring(.11,.014,i===1?lime:warm,bx-1.10,Y+.16,z,Math.PI/2);
    const plaque=textPanel('0'+(i+1),.36,.13,i===1?'#c7f300':'#ff8b55');plaque.position.set(left+.02,Y+2.70,z-.075);plaque.rotation.y=Math.PI/2;rg.add(plaque);
    mark(identity,['Lane 01','Lane 02','Lane 03'][i],
      ['Kristian Blummenfelt concept lane','Gustav Iden concept lane','Casper Stornes concept lane'][i]+'. Subject presence does not imply endorsement.');

    // Small lane practical light.
    if(!lite||i===1){
      const pl=new THREE.PointLight(i===1?'#d9f7ff':'#ff8750',lite?1.0:2.0,4.5,2);
      pl.position.set(cx-.9,Y+2.75,z);rg.add(pl);
    }

    specimenSlots.push(new THREE.Vector3(bx,Y,z));
    obstacles.push({box:[left-.12,right+.12,z-.46,z+.46]});
  });

  // Protocol table and wall: a working bench, not a sci-fi hologram.
  box(2.75,.13,1.16,cx+2.55,Y+1.02,cz,oak);
  box(.10,1.0,.94,cx+1.42,Y+.50,cz,steel);
  box(.10,1.0,.94,cx+3.68,Y+.50,cz,steel);
  const analyser=mark(box(.64,.30,.48,cx+1.82,Y+1.30,cz-.25,blackSteel),
    'Protocol analyser','A generic lab instrument study. Exact Norwegian-team hardware is not asserted.');
  const screen=box(.44,.018,.21,cx+1.82,Y+1.47,cz-.08,cold);screen.rotation.x=-.16;
  box(2.65,1.65,.08,cx+2.55,Y+2.18,r.z0-.14,basalt);
  const protocolTitle=textPanel('MEASURE  /  ADAPT  /  REPEAT',2.20,.20,'#c8f2fb','rgba(6,12,15,.82)');protocolTitle.position.set(cx+2.55,Y+3.15,r.z0-.21);rg.add(protocolTitle);
  for(let i=0;i<4;i++){
    const bar=box(.08,.55+.12*i,.028,cx+1.75+i*.42,Y+2.05,r.z0-.19,i===3?warm:cold);
    bar.rotation.z=(i-1.5)*.025;
  }
  const vialGeo=new THREE.CylinderGeometry(.025,.025,.18,12);
  const vials=new THREE.InstancedMesh(vialGeo,glass,lite?8:16);
  const dummy=new THREE.Object3D();
  for(let i=0;i<vials.count;i++){
    const row=i%2,col=Math.floor(i/2);
    dummy.position.set(cx+2.28+col*.12,Y+1.31,cz-.27+row*.17);
    dummy.updateMatrix();vials.setMatrixAt(i,dummy.matrix);
  }
  rg.add(vials);mark(vials,'Sample rack','Repeated lab props are instanced to keep the room visually dense without multiplying draw calls.');
  for(let i=0;i<(lite?3:6);i++){
    const card=box(.34,.010,.23,cx+1.95+i*.31,Y+1.15,cz+.38,paper);
    card.rotation.y=(rand()-.5)*.12;
  }
  const protocolLight=new THREE.PointLight('#ffd0a6',lite?1.4:3.2,4.8,2);
  protocolLight.position.set(cx+2.5,Y+2.65,cz-.2);rg.add(protocolLight);
  obstacles.push({box:[cx+1.15,cx+3.95,cz-.76,cz+.76]});

  // Controlled-environment bay: framed low-iron glass with internal haze.
  const ax=cx+3.28,az=cz-rd*.30,gw=1.86,gd=Math.min(1.22,rd*.24),gh=2.65;
  const pane=(w,h,x,y,z,ry=0,mat=glass)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
    m.position.set(x,y,z);m.rotation.y=ry;rg.add(m);return m;
  };
  const backPane=mark(pane(gw,gh,ax,Y+gh/2,az-gd/2,0,glass),
    'Environment bay','A controlled-environment chamber for heat, cold and altitude storytelling. It is an original room device, not a replica of a specific facility.');
  pane(gd,gh,ax-gw/2,Y+gh/2,az,Math.PI/2,glass);
  pane(gd,gh,ax+gw/2,Y+gh/2,az,Math.PI/2,glass);
  for(const px of [ax-gw/2,ax+gw/2]){
    box(.035,gh,.035,px,Y+gh/2,az-gd/2,steel);
    box(.035,gh,.035,px,Y+gh/2,az+gd/2,steel);
  }
  box(gw,.035,.035,ax,Y+gh,az-gd/2,steel);
  box(gw,.035,.035,ax,Y+gh,az+gd/2,steel);
  box(.62,.82,.20,ax+.46,Y+.87,az-gd/2+.13,blackSteel);
  box(.42,.26,.025,ax+.46,Y+1.10,az-gd/2-.01,cold);
  for(let i=0;i<5;i++){
    const strip=box(.018,.52,.02,ax-gw*.34+i*(gw*.17),Y+1.6,az-gd/2-.02,frost);
    strip.rotation.z=(i-2)*.025;
  }

  // Heat/cool wall and moving fans.
  const fanRotors=[];
  [cz+rd*.20,cz+rd*.36].forEach((z,i)=>{
    const rim=mark(new THREE.Mesh(new THREE.TorusGeometry(.42,.04,10,36),blackSteel),
      i?'Cooling fan B':'Cooling fan A','Animated generic cooling hardware. Rotors stop in reduced-motion mode.');
    rim.rotation.y=Math.PI/2;put(rim,cx+3.13,Y+1.22,z);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.14,16),steel);
    hub.rotation.z=Math.PI/2;put(hub,cx+3.13,Y+1.22,z);
    const rotor=new THREE.Group();rotor.position.set(cx+3.10,Y+1.22,z);rg.add(rotor);
    for(let b=0;b<5;b++){
      const blade=new THREE.Mesh(new THREE.BoxGeometry(.035,.22,.08),steel);
      const a=b*Math.PI*2/5;blade.position.set(0,Math.cos(a)*.18,Math.sin(a)*.18);blade.rotation.x=a;rotor.add(blade);
    }
    fanRotors.push({o:rotor,ph:i});
  });
  const heat=mark(box(.10,.80,.55,cx+3.72,Y+2.62,cz+rd*.34,warm),
    'Heat panel','A restrained warm counterpoint in the heat/cool zone. It is an original environmental prop.');
  heat.rotation.z=.06;

  // Podium vault: museum-grade but abstract, with a shadow-gap cabinet.
  box(3.05,1.60,.20,cx+2.35,Y+2.63,r.z0-.22,blackSteel);
  box(2.80,1.36,.05,cx+2.35,Y+2.63,r.z0-.34,basalt);
  const metals=[
    new THREE.MeshStandardMaterial({color:'#9c792d',roughness:.25,metalness:.88}),
    new THREE.MeshStandardMaterial({color:'#8b949a',roughness:.21,metalness:.92}),
    new THREE.MeshStandardMaterial({color:'#74412a',roughness:.29,metalness:.82})
  ];
  [-1,0,1].forEach((k,i)=>{
    const disc=mark(new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.07,48),metals[i]),
      'Abstract result object','Original geometry evokes achievement without copying a medal, trophy or protected object.');
    disc.rotation.x=Math.PI/2;put(disc,cx+2.35+k*.82,Y+2.72,r.z0-.39);
    box(.52,.035,.26,cx+2.35+k*.82,Y+2.25,r.z0-.31,steel);
  });

  // Fjord relief: layered topographic memory, denser in high quality.
  const nRidges=lite?13:25;
  for(let i=0;i<nRidges;i++){
    const z=cz-rd*.44+i*(rd*.88/(nRidges-1));
    const phase=i*.71;
    const x=cx+3.77-Math.abs(Math.sin(phase))*1.46-(Math.sin(i*.31)*.10);
    const h=.22+.22*(1+Math.sin(i*.93))+.05*Math.sin(i*.33);
    const ridge=box(.045,h,.15,x,Y+.30+h/2,z,i%4===0?steel:blackSteel);
    ridge.rotation.z=.03*Math.sin(i*.7);
  }
  const fjordBase=mark(box(.72,.20,Math.min(2.9,rd*.70),cx+3.55,Y+.20,cz,oak),
    'Fjord relief','Original layered geometry brings landscape memory into the room without copying maps or landscape photography.');

  // Recovery corner and the deliberately mundane objects that make a room feel inhabited.
  contactShadow(cx+1.05,r.z1+.62,1.95,.78,.44);
  const bench=mark(box(1.65,.18,.52,cx+1.05,Y+.38,r.z1+.62,oak),
    'Recovery bench','A quiet recovery corner: practical, imperfect, and intentionally less ceremonial than the podium wall.');
  box(.10,.38,.46,cx+.42,Y+.19,r.z1+.62,steel);box(.10,.38,.46,cx+1.68,Y+.19,r.z1+.62,steel);
  for(let i=0;i<(lite?2:4);i++){
    const roller=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.52,16),i%2?rubber:linen);
    roller.rotation.z=Math.PI/2;put(roller,cx+.55+i*.32,Y+.20,r.z1+.25);
  }
  for(let i=0;i<3;i++){
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.052,.34,16),i===1?frost:glass);
    put(bottle,cx+1.55+i*.13,Y+.27,r.z1+.22);
  }

  // Kona line: destination signal, not a second UI system.
  const konaMark=textPanel('KONA  →',.88,.18,'#ff8a54','rgba(8,11,14,.62)');konaMark.position.set(bounds.x1-.17,Y+3.22,cz);konaMark.rotation.y=-Math.PI/2;rg.add(konaMark);
  const konaLine=mark(box(.035,.035,Math.min(3.7,rd*.86),bounds.x1-.12,Y+2.95,cz,warm),
    'Kona line','One thin warm destination line. Kona remains the destination, not the decoration theme.');

  // Atmosphere and air movement.
  const moisture=motes({
    n:lite?42:96,
    box:[bounds.x0+.18,bounds.x0+1.15,Y+.12,Y+3.55,r.z1+.18,r.z0-.18],
    color:'#bfe8ef',size:.026,rise:-.08,sway:.055,opacity:.34,seed:seed+7
  });
  rg.add(moisture.points);L.motes.push(moisture);
  const chamberMist=motes({
    n:lite?18:44,
    box:[ax-gw*.42,ax+gw*.42,Y+.20,Y+2.45,az-gd*.35,az+gd*.35],
    color:'#dff8ff',size:.020,rise:.035,sway:.025,opacity:.24,seed:seed+19
  });
  rg.add(chamberMist.points);L.motes.push(chamberMist);

  // Accents stay inside room lighting budget.
  const coolLight=new THREE.PointLight('#d6f6ff',lite?2.4:5.2,8,1.7);
  coolLight.position.set(cx+.40,Y+3.10,cz-.35);rg.add(coolLight);
  const konaLight=new THREE.PointLight('#ff6a22',lite?1.6:3.4,6,2);
  konaLight.position.set(bounds.x1-.55,Y+2.75,cz);rg.add(konaLight);
  const vaultLight=new THREE.PointLight('#ffcf9a',lite?1.1:2.2,4.5,2);
  vaultLight.position.set(cx+2.35,Y+3.25,r.z0-.50);rg.add(vaultLight);

  Object.assign(L,{
    specimenSlots,fanRotors,analyser,protocolScreen:screen,coolLight,konaLight,
    reviewPickables,environmentBay:backPane,fjordBase,bench,konaLine
  });
}

export function buildNorwegianReview(ctx){return norwegian(ctx);}
export const REVIEW_SOURCE_SHA='70e0efee80d0d16dcd6d7ef4fd8d35eb43b33a5a';
export const REVIEW_VARIANT='cinematic-production-v2';
