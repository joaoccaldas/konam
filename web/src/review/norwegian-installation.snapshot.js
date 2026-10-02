// Review-only generated snapshot of the NOR // 3 candidate implementation.
// Source: PR #15 feat/norwegian-engine-room @ 6115139fd817663fac0a8e5a59297e6a2f65edae
// Not a production authority. Delete once the candidate implementation lands on main.
import * as THREE from 'three';
import {rng,motes} from '../roomkit.js';

function norwegian(ctx) {
  const {r,rg,put,box,seed,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds}=ctx;
  const rand=rng(seed+41);
  const rubber=new THREE.MeshStandardMaterial({color:'#101416',roughness:.96});
  const steel=new THREE.MeshStandardMaterial({color:'#39434a',roughness:.30,metalness:.76});
  const dark=new THREE.MeshStandardMaterial({color:'#11171a',roughness:.48,metalness:.34});
  const oak=new THREE.MeshStandardMaterial({color:'#382519',roughness:.72});
  const glass=new THREE.MeshPhysicalMaterial({color:'#b9dce3',roughness:.10,transmission:lite?.28:.62,transparent:true,opacity:lite?.24:.38,depthWrite:false});
  const warm=new THREE.MeshStandardMaterial({color:'#3a1707',roughness:.46,emissive:'#ff6a00',emissiveIntensity:lite?.35:.82});
  const cold=new THREE.MeshStandardMaterial({color:'#12313d',roughness:.52,emissive:'#67c7db',emissiveIntensity:lite?.12:.28});

  // Same themed-room grammar as Bio/Horror/Alien/Zombie: architecture belongs to
  // galleries.js; this builder contributes only the local installation and story props.
  const laneZ=[cz-rd*.28,cz,cz+rd*.28];
  const specimenSlots=[];
  laneZ.forEach((z,i)=>{
    box(rw*.55,.025,Math.min(.86,rd*.20),cx-.85,Y+.018,z,rubber);
    // Trainer flywheel + support. The actual bike, if approved, is loaded by the host
    // through the shared bike/livery path rather than authored again here.
    const fly=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.16,28),dark);
    fly.rotation.z=Math.PI/2;put(fly,cx+.68,Y+.42,z);
    box(.95,.10,.42,cx+.68,Y+.08,z,steel);
    // Short run deck keeps the swim-bike-run training loop legible without a second asset system.
    box(1.55,.08,.50,cx-2.35,Y+.08,z,rubber);
    box(.25,.72,.44,cx-1.58,Y+.72,z,steel);
    specimenSlots.push(new THREE.Vector3(cx-.20,Y,z));
    const tick=box(.05,.012,.38,cx-3.18,Y+.02,z,warm);
    tick.material=warm;
    if(i===1) obstacles.push({box:[cx-3.2,cx-1.35,z-.32,z+.32]});
  });

  // Shared protocol table: handled-looking objects rather than a sterile sci-fi lab.
  box(2.65,.12,1.12,cx+2.55,Y+1.02,cz,oak);
  box(.10,1.0,.92,cx+1.45,Y+.50,cz,steel);
  box(.10,1.0,.92,cx+3.65,Y+.50,cz,steel);
  const analyser=box(.62,.28,.46,cx+1.85,Y+1.28,cz-.24,dark);
  const screen=box(.42,.018,.20,cx+1.85,Y+1.44,cz-.08,cold);
  screen.rotation.x=-.16;
  const vialGeo=new THREE.CylinderGeometry(.025,.025,.18,12);
  const vials=new THREE.InstancedMesh(vialGeo,glass,lite?6:12);
  const dummy=new THREE.Object3D();
  for(let i=0;i<vials.count;i++){
    const row=i%2,col=Math.floor(i/2);
    dummy.position.set(cx+2.38+col*.13,Y+1.30,cz-.25+row*.18);
    dummy.updateMatrix();vials.setMatrixAt(i,dummy.matrix);
  }
  rg.add(vials);
  for(let i=0;i<(lite?2:4);i++){
    const card=box(.38,.012,.25,cx+2.15+i*.40,Y+1.15,cz+.36,PAPER_MAT());
    card.rotation.y=(i%2?1:-1)*.05;
  }
  obstacles.push({box:[cx+1.2,cx+3.9,cz-.72,cz+.72]});

  // Altitude/environment bay: translucent planes and the room's existing PMREM do the work.
  const ax=cx+3.30,az=cz-rd*.30,gw=1.75,gd=Math.min(1.15,rd*.22),gh=2.55;
  const pane=(w,h,x,y,z,ry=0)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glass);m.position.set(x,y,z);m.rotation.y=ry;rg.add(m);return m};
  pane(gw,gh,ax,Y+gh/2,az-gd/2);
  pane(gd,gh,ax-gw/2,Y+gh/2,az,Math.PI/2);
  pane(gd,gh,ax+gw/2,Y+gh/2,az,Math.PI/2);
  box(.58,.78,.18,ax+.45,Y+.85,az-gd/2+.12,dark);

  // Heat / cool: two canonical low-poly fans and a restrained warm counterpoint.
  const fanRotors=[];
  [cz+rd*.20,cz+rd*.36].forEach((z,i)=>{
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.42,.04,10,32),dark);
    rim.rotation.y=Math.PI/2;put(rim,cx+3.15,Y+1.22,z);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.14,16),steel);
    hub.rotation.z=Math.PI/2;put(hub,cx+3.15,Y+1.22,z);
    const rotor=new THREE.Group();rotor.position.set(cx+3.12,Y+1.22,z);rg.add(rotor);
    for(let b=0;b<5;b++){
      const blade=new THREE.Mesh(new THREE.BoxGeometry(.035,.22,.08),steel);
      const a=b*Math.PI*2/5;blade.position.set(0,Math.cos(a)*.18,Math.sin(a)*.18);blade.rotation.x=a;rotor.add(blade);
    }
    fanRotors.push({o:rotor,ph:i});
  });
  const heat=box(.08,.70,.52,cx+3.72,Y+2.65,cz+rd*.34,warm);
  heat.rotation.z=.08;

  // Podium Vault: original abstract objects, not medal or trophy replicas.
  const metals=[
    new THREE.MeshStandardMaterial({color:'#9c792d',roughness:.28,metalness:.82}),
    new THREE.MeshStandardMaterial({color:'#90989d',roughness:.24,metalness:.88}),
    new THREE.MeshStandardMaterial({color:'#7b4527',roughness:.31,metalness:.78})
  ];
  [-1,0,1].forEach((k,i)=>{
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.07,40),metals[i]);
    disc.rotation.x=Math.PI/2;put(disc,cx+2.35+k*.82,Y+2.72,r.z0-.10);
  });
  [-1,0,1].forEach((k,i)=>{
    const h=[1.65,1.42,1.26][i];
    box(.34,h,.12,cx+2.35+k*.82,Y+h/2+.12,r.z1+.10,metals[i]);
  });

  // Fjord relief: layered original geometry. No copied map tiles or landscape photography.
  for(let i=0;i<(lite?9:17);i++){
    const z=cz-rd*.43+i*(rd*.86/(lite?8:16));
    const x=cx+3.72-Math.abs(Math.sin(i*.71))*1.25;
    const h=.18+.16*(1+Math.sin(i*.93));
    box(.06,h,.16,x,Y+.35+h,z,dark);
  }
  box(.70,.20,Math.min(2.6,rd*.62),cx+3.54,Y+.22,cz,oak);

  // Kona remains one thin warm line, not another themed UI system.
  box(.035,.035,Math.min(3.4,rd*.82),bounds.x1-.12,Y+2.95,cz,warm);

  // Moisture/air movement reuses the shared motes implementation and therefore the
  // existing room visibility/reduced-motion lifecycle in galleries.update().
  const moisture=motes({
    n:lite?34:78,
    box:[bounds.x0+.20,bounds.x0+1.10,Y+.15,Y+3.55,r.z1+.18,r.z0-.18],
    color:'#bfe8ef',size:.025,rise:-.10,sway:.05,opacity:.32,seed:seed+7
  });
  rg.add(moisture.points);L.motes.push(moisture);

  const coolLight=new THREE.PointLight('#d9f2f5',lite?2.5:5.5,8,1.7);
  coolLight.position.set(cx+1.4,Y+3.25,cz);rg.add(coolLight);
  const konaLight=new THREE.PointLight('#ff7a24',lite?1.2:2.5,5,2);
  konaLight.position.set(bounds.x1-.5,Y+2.7,cz);rg.add(konaLight);

  // Host-facing metadata only. No renderer, camera, routing or extra room authority here.
  Object.assign(L,{specimenSlots,fanRotors,analyser,protocolScreen:screen,coolLight,konaLight});
}


function PAPER_MAT(){
  return new THREE.MeshStandardMaterial({color:'#d7d1c7',roughness:.94});
}


export function buildNorwegianReview(ctx){return norwegian(ctx);}
export const REVIEW_SOURCE_SHA='6115139fd817663fac0a8e5a59297e6a2f65edae';
