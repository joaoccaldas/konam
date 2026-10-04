// Beast Cave — native KONA.m athlete room.
// Same architecture as Lava Night / Sanctuary: one room module built into landing.js,
// shared renderer, camera, cards, pickables, obstacles, map, route, quality and loading.
//
// v3 (2026-10-04): an athlete room with no third-party brands in it and no door to any other room.
// Lived-in rather than designed: block wall with a sprayed stencil and a chalk tally, bare bulbs,
// worn rug, patchy foam. The 60-second interval is the product: a result you can share, a personal
// best, and an empty slot for the athlete's own line that stays empty until he rides it.
import * as THREE from 'three';
import { motes, lightShaft } from './roomkit.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createInterval, bandAt, INTERVAL_SECONDS } from './beast-interval.js';
import facts from '../../pitch/lionel-sanders/career-facts-v1.json' with { type: 'json' };

const seededRandom=(seed=0xB34C)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};

export const BROOM = { x0: 7.35, x1: 35.35, z0: -4.0, z1: -17.7, h: 5.4 };
export const BDOOR = { z0: -9.6, z1: -6.4, h: 3.4 };
// v3: no door to any neighbouring room and no third-party brand inside the athlete room.
// cinematic mood the host applies while the visitor is inside (exposure + global light dimming)
export const BEAST_MOOD = Object.freeze({ exposure: .78, hemi: .06, sun: .03, fog: { near: 5, far: 34 }, fogColor: new THREE.Color('#0b0908') });
// generated equipment (Higgsfield → Meshy image-to-3D, optimised with gltf-transform); procedural stand-ins until loaded
const TRAINER_YAW = 0;                                              // orientation of the generated trainer mesh in trainer space (x = bike forward)
export const BEAST_ASSETS = Object.freeze({ trainer: 'assets/rooms/beast-cave/hf-trainer.glb', fan: 'assets/rooms/beast-cave/hf-drum-fan.glb', treadmill: 'assets/rooms/beast-cave/hf-curved-treadmill.glb' });
let rectLib = false;

export function beastCaveWalkable(x, z, WALK) {
  const inDoor = x > WALK.x1 - .1 && x < BROOM.x0 + .75 && z < BDOOR.z1 - .35 && z > BDOOR.z0 + .35;
  const inRoom = x > BROOM.x0 + .55 && x < BROOM.x1 - .55 && z < BROOM.z0 - .55 && z > BROOM.z1 + .55;
  return inDoor || inRoom;
}

const SOURCE = 'Published race result';
const loopFacts = facts.facts;

export function buildBeastCave(ctx) {
  const { scene, canvasTex, lettering, lightPool, contactShadow, basaltTex, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);
  const RW = BROOM.x1 - BROOM.x0, RD = BROOM.z0 - BROOM.z1;
  const CX = (BROOM.x0 + BROOM.x1) / 2, CZ = (BROOM.z0 + BROOM.z1) / 2;
  const at = (o,x,y,z) => { o.position.set(x,y,z); group.add(o); return o; };
  const rand = seededRandom(0xBEA57);

  // ---------------------------------------------------------------- shell: dark concrete, black ceiling
  const basalt = basaltTex.clone(); basalt.repeat.set(RW/2.4,RD/2.4); basalt.needsUpdate = true;
  const floorMat = new THREE.MeshStandardMaterial({ map: basalt, color:'#121010', roughness:.7, metalness:.05, envMapIntensity:.06 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW,.16,RD),floorMat);
  floor.position.set(CX,-.074,CZ); floor.receiveShadow=true;   // 6 mm proud of the hall floor that runs under the doorway
  floor.userData.floor=true; group.add(floor); pickables.push(floor);

  const concrete = canvasTex(512,512,(g,w,h)=>{
    const r=seededRandom();
    g.fillStyle='#2a2624';g.fillRect(0,0,w,h);
    for(let i=0;i<1700;i++){const v=42+r()*30;g.fillStyle=`rgba(${v},${v-3},${v-6},${.04+r()*.08})`;g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}
    g.strokeStyle='rgba(235,220,205,.03)';for(let y=90;y<h;y+=120){g.beginPath();g.moveTo(0,y);g.lineTo(w,y+8);g.stroke();}
    for(let i=0;i<9;i++){const x=r()*w;const gr=g.createLinearGradient(x,0,x,h);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=gr;g.fillRect(x,h*.4,6+r()*14,h*.6);}   // damp streaks
  },[6,3]);
  const wallMat = new THREE.MeshStandardMaterial({map:concrete,color:'#3e3733',roughness:.93,envMapIntensity:.06});
  const dark = new THREE.MeshStandardMaterial({color:'#0f1012',roughness:.55,metalness:.25,envMapIntensity:.35});
  const steel = new THREE.MeshStandardMaterial({color:'#3a3d40',roughness:.3,metalness:.8,envMapIntensity:.5});
  const pale = new THREE.MeshStandardMaterial({color:'#bdb3a6',roughness:.86,envMapIntensity:.2});
  const rubber = new THREE.MeshStandardMaterial({color:'#141415',roughness:.94,metalness:.02});
  const ember = new THREE.MeshBasicMaterial({color:'#ff6a00',toneMapped:false});
  const wall=(w,h,d,x,y,z,mat=wallMat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=!lite;group.add(m);return m;};

  wall(RW,BROOM.h,.28,CX,BROOM.h/2,BROOM.z0+.14);                                  // north
  wall(.28,BROOM.h,RD,BROOM.x1+.14,BROOM.h/2,CZ);                                    // east (screen wall)
  wall(RW,BROOM.h,.28,CX,BROOM.h/2,BROOM.z1-.14);                                  // south: solid party wall
  // west wall, sharing the hall glass line, with the doorway cut out
  wall(.28,BROOM.h,BROOM.z0-BDOOR.z1,BROOM.x0-.14,BROOM.h/2,(BROOM.z0+BDOOR.z1)/2);
  wall(.28,BROOM.h,BDOOR.z0-BROOM.z1,BROOM.x0-.14,BROOM.h/2,(BDOOR.z0+BROOM.z1)/2);
  wall(.28,BROOM.h-BDOOR.h,BDOOR.z1-BDOOR.z0,BROOM.x0-.14,BDOOR.h+(BROOM.h-BDOOR.h)/2,(BDOOR.z0+BDOOR.z1)/2);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW,.12,RD),new THREE.MeshStandardMaterial({color:'#0a0a0b',roughness:.9,envMapIntensity:.05}));
  ceil.position.set(CX,BROOM.h+.06,CZ); ceil.castShadow=true; group.add(ceil);                 // blocks the hall sun
  // exposed ceiling trusses: give the dark something to read against
  for(let x=BROOM.x0+2.5;x<BROOM.x1-1;x+=3.5){const b=new THREE.Mesh(new THREE.BoxGeometry(.18,.32,RD),dark);b.position.set(x,BROOM.h-.16,CZ);group.add(b);}
  // ---------------------------------------------------------------- acoustic foam: real pyramids, one draw call
  const foamGeo=new THREE.ConeGeometry(.104,.075,4,1);foamGeo.rotateY(Math.PI/4);foamGeo.rotateX(Math.PI/2);foamGeo.translate(0,0,.0375);   // apex along +z
  const foamMat=new THREE.MeshStandardMaterial({color:'#1b1918',roughness:1,metalness:0,envMapIntensity:.04,flatShading:true});
  const foamRuns=[];                                                  // [origin, along, normal, length, y0, y1, holes]
  const addRun=(o,along,normal,len,y0,y1)=>foamRuns.push({o,along,normal,len,y0,y1});
  // east wall behind the screen (the cinema backdrop), north wall east of the mirrors, west wall interior
  addRun(new THREE.Vector3(BROOM.x1-.01,0,BROOM.z0-.05),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),RD-.1,.25,BROOM.h-.45);
  addRun(new THREE.Vector3(BROOM.x0+.01,0,BROOM.z0-.05),new THREE.Vector3(0,0,-1),new THREE.Vector3(1,0,0),RD-.1,1.0,BROOM.h-.45);
  const screenHole=(r,u,y)=>r.normal.x<0&&Math.abs((BROOM.z0-.05-u)-CZ)<3.75&&y>.6&&y<4.9;
  const doorHole=(r,u,y)=>r.normal.x>0&&(BROOM.z0-.05-u)<BDOOR.z1+.2&&(BROOM.z0-.05-u)>BDOOR.z0-.2&&y<BDOOR.h+.25;
  const tired=(i)=>((i*2654435761)>>>0)%100<9;                       // ~9% of panels fell off or were never replaced
  const P=.15,cells=[];
  for(const r of foamRuns)for(let u=P/2;u<r.len;u+=P)for(let y=r.y0+P/2;y<r.y1;y+=P){if(screenHole(r,u,y)||doorHole(r,u,y))continue;const tile=Math.floor(u/.6)*97+Math.floor(y/.6);if(tired(tile))continue;cells.push([r,u,y]);}
  const foam=new THREE.InstancedMesh(foamGeo,foamMat,cells.length),fd=new THREE.Object3D(),fc=new THREE.Color();
  cells.forEach(([r,u,y],i)=>{fd.position.copy(r.o).addScaledVector(r.along,u);fd.position.y=y;fd.lookAt(fd.position.clone().add(r.normal));
    const tile=(Math.floor(u/.6)+Math.floor(y/.6))%2;fd.rotateZ(tile?Math.PI/4:0);fd.scale.set(1,1,.8+((i*7919)%13)/40);fd.updateMatrix();foam.setMatrixAt(i,fd.matrix);
    const panel=Math.floor(u/.6)*97+Math.floor(y/.6),odd=((panel*40503)>>>0)%100;fc.setScalar(odd<7?1.9:odd<15?1.35:.8+((i*104729)%17)/70);foam.setColorAt(i,fc);});   // mismatched replacement panels
  foam.instanceMatrix.needsUpdate=true;foam.receiveShadow=true;group.add(foam);

  // ---------------------------------------------------------------- painted block wall: a stencil someone sprayed at 6 a.m.
  if(!rectLib){RectAreaLightUniformsLib.init();rectLib=true;}
  const bwX0=27.3,bwX1=BROOM.x1-.02,bwW=bwX1-bwX0,bwH=BROOM.h;
  const blockTex=canvasTex(2048,1408,(g,w,h)=>{
    const r=seededRandom(0xB10C);g.fillStyle='#3b3734';g.fillRect(0,0,w,h);
    const bw=w/(bwW/.4),bh=h/(bwH/.2);                                 // 400×200 mm blocks
    for(let row=0;row*bh<h;row++)for(let col=-1;col*bw<w;col++){const x=col*bw+(row%2?bw/2:0),y=row*bh,v=50+r()*18;
      g.fillStyle=`rgb(${v},${v-3},${v-6})`;g.fillRect(x+3,y+3,bw-6,bh-6);
      for(let k=0;k<14;k++){g.fillStyle=`rgba(0,0,0,${.05+r()*.08})`;g.fillRect(x+r()*bw,y+r()*bh,2+r()*5,2+r()*5);}}
    for(let k=0;k<7;k++){const x=r()*w,gr=g.createLinearGradient(0,h*.55,0,h);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(20,14,10,.35)');g.fillStyle=gr;g.fillRect(x,h*.55,20+r()*60,h*.45);}   // damp
    // stencil, sprayed: overspray halo, then the letters, then drips
    g.save();g.translate(w*.5,h*.33);g.rotate(-.012);g.textAlign='center';g.textBaseline='middle';g.font=`900 ${h*.105}px ${FONT}`;g.letterSpacing=`${h*.012}px`;
    g.shadowColor='rgba(255,106,0,.55)';g.shadowBlur=h*.02;g.fillStyle='rgba(255,106,0,.88)';g.fillText('THE WORK',0,-h*.07);g.fillText('NOBODY SEES',0,h*.07);
    g.shadowBlur=0;for(let k=0;k<900;k++){g.fillStyle=`rgba(255,110,10,${r()*.25})`;g.fillRect((r()-.5)*w*.62,(r()-.5)*h*.36,1+r()*2,1+r()*2);}
    for(let k=0;k<11;k++){const x=(r()-.5)*w*.55,y=h*.11+r()*h*.02,len=h*(.02+r()*.07);g.fillStyle='rgba(230,95,10,.7)';g.fillRect(x,y,2.5,len);}
    g.restore();
    // chalk tally of sessions, grouped in fives, and a strip of tape holding nothing any more
    g.strokeStyle='rgba(235,230,220,.65)';g.lineWidth=4;g.lineCap='round';
    for(let grp=0;grp<9;grp++){const x0=w*.08+grp*w*.042,y0=h*.66;for(let k=0;k<4;k++){g.beginPath();g.moveTo(x0+k*16+r()*3,y0+r()*4);g.lineTo(x0+k*16+r()*3,y0+80+r()*5);g.stroke();}if(grp<8){g.beginPath();g.moveTo(x0-8,y0+64);g.lineTo(x0+60,y0+12);g.stroke();}}
    g.fillStyle='rgba(220,210,180,.55)';g.fillRect(w*.72,h*.6,90,26);g.fillRect(w*.8,h*.62,70,24);
  });
  const blockMat=new THREE.MeshStandardMaterial({map:blockTex,roughness:.95,envMapIntensity:.05});
  const blockWall=new THREE.Mesh(new THREE.PlaneGeometry(bwW,bwH),blockMat);blockWall.rotation.y=Math.PI;blockWall.position.set((bwX0+bwX1)/2,bwH/2,BROOM.z0-.015);blockWall.receiveShadow=true;group.add(blockWall);
  // printed sheets taped to the blocks: generic sessions, a calendar crossed off (no dates claimed)
  const sheetTex=(kind)=>canvasTex(256,340,(g,w,h)=>{g.fillStyle='#ece8df';g.fillRect(0,0,w,h);g.fillStyle='#2a2a2a';g.font=`600 16px ${FONT}`;
    if(kind==='cal'){g.fillText('THIS MONTH',16,28);for(let d=0;d<35;d++){const x=16+(d%7)*32,y=48+Math.floor(d/7)*52;g.strokeStyle='#9a958c';g.strokeRect(x,y,30,48);if(d<26){g.strokeStyle='#c0392b';g.lineWidth=3;g.beginPath();g.moveTo(x+4,y+6);g.lineTo(x+26,y+42);g.moveTo(x+26,y+6);g.lineTo(x+4,y+42);g.stroke();g.lineWidth=1;}}}
    else{g.fillText(kind==='a'?'SESSION A':'SESSION B',16,30);g.font=`500 13px ${FONT}`;const L=kind==='a'?['10′ easy','4 × 10′ steady','  3′ easy','10′ easy']:['15′ easy','6 × 4′ hard','  4′ easy','tempo run off the bike'];L.forEach((t,i)=>g.fillText(t,16,62+i*24));g.fillStyle='#8a847c';g.font=`500 10px ${FONT}`;g.fillText('example sessions · not an athlete plan',16,h-14);}
    g.fillStyle='rgba(225,215,170,.8)';g.fillRect(w*.35,0,w*.3,14);});
  [['a',28.4,2.35,.04],['b',29.05,2.3,-.05],['cal',34.2,2.4,.02]].forEach(([k,x,y,rot])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(.42,.56),new THREE.MeshStandardMaterial({map:sheetTex(k),roughness:.9}));m.rotation.set(0,Math.PI,rot);m.position.set(x,y,BROOM.z0-.03);group.add(m);});
  info(blockWall,{eyebrow:'THE WALL',title:'The work nobody sees.',sub:'Sprayed stencil · chalk tally · taped sessions',text:'Every mark on this wall is the kind a training room collects: a tally of sessions, plans taped up and torn down. The sessions are generic examples, not anyone’s real plan.'});
  // bare bulbs on cords: the only "design" in the room
  const bulbs=[];
  for(const [bx,bz,len] of [[31.0,BROOM.z0-1.4,1.6],[22.6,-10.9,1.3],[13.0,-9.0,1.5]]){
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,len,6),new THREE.MeshBasicMaterial({color:'#0b0b0b'}));cord.position.set(bx,BROOM.h-len/2,bz);group.add(cord);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshBasicMaterial({color:'#ffd7a0',toneMapped:false}));bulb.position.set(bx,BROOM.h-len-.06,bz);group.add(bulb);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({map:canvasTex(128,128,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);gr.addColorStop(0,'rgba(255,214,160,.9)');gr.addColorStop(1,'rgba(255,190,120,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    glow.position.copy(bulb.position);group.add(glow);bulbs.push(glow);
    const pl=new THREE.PointLight('#ffc98f',lite?3:5,7,1.8);pl.position.copy(bulb.position);group.add(pl);
  }
  // exposed ducts and pipes along the ceiling
  const duct=new THREE.MeshStandardMaterial({color:'#5d5f60',roughness:.45,metalness:.7,envMapIntensity:.3});
  {const d=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,RW-1,20),duct);d.rotation.z=Math.PI/2;d.position.set(CX,BROOM.h-.55,BROOM.z0-1.0);group.add(d);
   for(const [z,r,y] of [[-15.9,.035,BROOM.h-.3],[-16.1,.025,BROOM.h-.42],[-5.2,.03,BROOM.h-.35]]){const pp=new THREE.Mesh(new THREE.CylinderGeometry(r,r,RW-.6,10),new THREE.MeshStandardMaterial({color:'#7a3e22',roughness:.5,metalness:.6}));pp.rotation.z=Math.PI/2;pp.position.set(CX,y,z);group.add(pp);}}

  const coveMat = new THREE.MeshBasicMaterial({color:'#ff6a00',transparent:true,opacity:lite?.35:.6,toneMapped:false,fog:false});
  for(const z of [BROOM.z0-.01,BROOM.z1+.01]){const p=new THREE.Mesh(new THREE.PlaneGeometry(RW-1.2,.04),coveMat);p.position.set(CX,.12,z);p.rotation.y=z===BROOM.z0?Math.PI:0;group.add(p);}   // floor-line ember

  // hall-side sign over the door
  const sign=lettering(4.6,.9,g=>{
    g.fillStyle='#12181d';g.font=`700 .14px ${FONT}`;g.letterSpacing='.06px';g.fillText('LIONEL SANDERS · BEAST CAVE',0,.28);
    g.fillStyle='#b4541f';g.font=`italic 400 .25px ${SERIF}`;g.letterSpacing='0px';g.fillText('The work nobody sees.',0,.69);
  },1024);
  sign.position.set(hallWallX+.02,BDOOR.h+.75,(BDOOR.z0+BDOOR.z1)/2+.2);sign.rotation.y=-Math.PI/2;

  const infos=[];
  const info=(mesh,rec)=>{ for(const m of [].concat(mesh)){m.userData.info=rec;pickables.push(m);} infos.push(rec); return rec; };

  // ---------------------------------------------------------------- lights: almost nothing, placed with intent
  const fill=new THREE.PointLight('#c9b7a8',lite?3:1.4,26,1.4);fill.position.set(CX-4,BROOM.h-.6,CZ);group.add(fill);
  const heroX=25.2, heroZ=CZ;                                         // the bike faces east, into the screen
  const spot=new THREE.SpotLight('#ffd8b0',lite?60:85,9,.42,.65,1.3);
  spot.position.set(heroX-.4,BROOM.h-.25,heroZ);spot.target.position.set(heroX-.2,.6,heroZ);
  spot.castShadow=!lite;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0004;group.add(spot,spot.target);
  const shaft=lightShaft({top:.14,bottom:1.55,height:BROOM.h-.3,color:'#ffcf9e',opacity:lite?.10:.16});
  shaft.position.set(heroX-.4,BROOM.h-.25,heroZ);shaft.rotation.z=-.03;group.add(shaft);
  const screenGlow=new THREE.PointLight('#6f9bd8',lite?7:10,14,1.6);screenGlow.position.set(BROOM.x1-1.6,2.4,heroZ);group.add(screenGlow);
  const rim=new THREE.SpotLight('#ff8a3a',lite?0:55,8,.5,.7,1.4);rim.position.set(heroX-2.6,3.6,heroZ+1.9);rim.target.position.set(heroX+.2,.9,heroZ);if(!lite)group.add(rim,rim.target);   // ember rim from behind the rider
  const rimL=new THREE.PointLight('#ff7a2a',lite?0:3.2,7,1.8);rimL.position.set(heroX-3.4,.6,heroZ+2.2);group.add(rimL);   // low ember kicker from behind

  // ---------------------------------------------------------------- hero: empty saddle on a direct-drive trainer
  const rugTex=canvasTex(512,340,(g,w,h)=>{const r=seededRandom(0x5A6);g.fillStyle='#4a2f2a';g.fillRect(0,0,w,h);
    for(let i=0;i<9;i++){g.fillStyle=i%2?'rgba(170,120,80,.35)':'rgba(40,55,70,.35)';g.fillRect(0,18+i*36,w,14);}
    g.strokeStyle='rgba(220,190,150,.35)';g.lineWidth=6;g.strokeRect(10,10,w-20,h-20);
    const gr=g.createRadialGradient(w*.55,h*.5,10,w*.55,h*.5,w*.45);gr.addColorStop(0,'rgba(15,10,8,.55)');gr.addColorStop(1,'rgba(15,10,8,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);   // worn where the bike lives
    for(let i=0;i<3000;i++){g.fillStyle=`rgba(0,0,0,${r()*.12})`;g.fillRect(r()*w,r()*h,2,2);}});
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.0),new THREE.MeshStandardMaterial({map:rugTex,roughness:1,envMapIntensity:.02}));rug.rotation.x=-Math.PI/2;rug.rotation.z=.04;at(rug,heroX-.2,.009,heroZ);rug.receiveShadow=true;
  const matPad=new THREE.Mesh(new THREE.BoxGeometry(2.1,.012,1.0),new THREE.MeshStandardMaterial({color:'#0a0b0c',roughness:.8,envMapIntensity:.1}));
  at(matPad,heroX,.014,heroZ);
  const sweat=new THREE.MeshPhysicalMaterial({color:'#050506',roughness:.15,metalness:0,clearcoat:.6,clearcoatRoughness:.2,envMapIntensity:.25,transparent:true,opacity:.8});
  for(let i=0;i<7;i++){const d=new THREE.Mesh(new THREE.CircleGeometry(.03+rand()*.07,20),sweat);d.rotation.x=-Math.PI/2;d.scale.set(1,.6+rand()*.6,1);at(d,heroX+.15+rand()*.6,.022,heroZ-.25+rand()*.5);}
  const trainer=new THREE.Group();trainer.name='beast-trainer';group.add(trainer);
  const tbox=(n,s,p,m=dark,r=[0,0,0])=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.name=n;o.position.set(...p);o.rotation.set(...r);o.castShadow=!lite;trainer.add(o);return o;};
  // geometry in trainer space: origin on the floor under the rear axle, x = bike forward, z = across
  tbox('trainer-spine',[.86,.07,.12],[-.08,.045,0]);
  tbox('trainer-foot-rear',[.1,.06,.82],[-.48,.03,0],steel);
  tbox('trainer-foot-front',[.1,.06,.62],[.32,.03,0],steel);
  const housing=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.16,40),dark);housing.rotation.x=Math.PI/2;housing.position.set(-.06,.26,-.1);housing.name='trainer-flywheel';housing.castShadow=!lite;trainer.add(housing);
  const flyRing=new THREE.Mesh(new THREE.TorusGeometry(.2,.012,8,48),ember);flyRing.position.set(-.06,.26,-.185);trainer.add(flyRing);
  const cassette=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.06,24),steel);cassette.rotation.x=Math.PI/2;cassette.position.set(0,.34,.06);trainer.add(cassette);
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.2,10),steel);axle.rotation.x=Math.PI/2;axle.position.set(0,.34,0);trainer.add(axle);
  const riser=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.05,32),rubber);riser.name='front-riser';group.add(riser);
  trainer.position.set(heroX-.5,0,heroZ);riser.position.set(heroX+.55,.025,heroZ);   // replaced once the bike arrives
  const trainerInfo={eyebrow:'THE MACHINE',title:'The place where excuses get boring.',sub:'Bike · trainer · screen · airflow',
    text:'A direct-drive trainer, a screen, two fans and a mat. Nothing here is for show. Take the saddle and hold one interval.',model:act=>machineCard(act)};
  info([housing,matPad],trainerInfo);
  obstacles.push({c:new THREE.Vector3(heroX,0,heroZ),r:1.45});

  const bikeSpot={kind:'beast',pos:new THREE.Vector3(heroX,0,heroZ),rotY:0,bike:null};
  const portrait=coarse&&innerHeight>innerWidth;
  // three-quarter rear: the bike silhouetted against the screen
  bikeSpot.view=portrait?new THREE.Vector3(heroX-3.3,0,heroZ+1.7):new THREE.Vector3(heroX-4.6,0,heroZ+2.3);
  bikeSpot.face=new THREE.Vector3(heroX+1.1,1.05,heroZ-.2);
  bikeSpot.info=trainerInfo;
  bikeSpot.cockpit={x:heroX-.35,z:heroZ,yaw:-Math.PI/2,pitch:-.12,drop:-.42};

  // ---------------------------------------------------------------- screen: original Queen K / Energy Lab route study
  const SW=1024,SH=576,scr=document.createElement('canvas');scr.width=SW;scr.height=SH;const sg=scr.getContext('2d');
  const screenTex=new THREE.CanvasTexture(scr);screenTex.colorSpace=THREE.SRGBColorSpace;screenTex.anisotropy=4;
  const screenW=7.2,screenH=4.05;
  const bezel=new THREE.Mesh(new THREE.BoxGeometry(.08,screenH+.18,screenW+.18),dark);at(bezel,BROOM.x1-.06,2.75,heroZ);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(screenW,screenH),new THREE.MeshBasicMaterial({map:screenTex,toneMapped:false,fog:false}));
  screen.rotation.y=-Math.PI/2;at(screen,BROOM.x1-.11,2.75,heroZ);
  const screenPool=lightPool(5.5,7.5,'#7aa7e0',lite?.05:.09);screenPool.position.set(BROOM.x1-3,.02,heroZ);group.add(screenPool);
  const screenRect=new THREE.RectAreaLight('#9fb6e8',lite?1.6:2.4,screenW,screenH);screenRect.position.set(BROOM.x1-.2,2.75,heroZ);screenRect.lookAt(BROOM.x1-5,2.2,heroZ);group.add(screenRect);
  // the screen in the polished floor: the same live texture, mirrored and fading away from the wall
  const reflect=new THREE.Mesh(new THREE.PlaneGeometry(screenH*1.1,screenW),new THREE.ShaderMaterial({uniforms:{map:{value:screenTex},strength:{value:lite?.16:.24}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:'uniform sampler2D map; uniform float strength; varying vec2 vUv; void main(){ vec3 c=texture2D(map, vec2(1.-vUv.y, 1.-vUv.x)).rgb; float fade=pow(vUv.x,2.2)*smoothstep(0.,.12,vUv.y)*smoothstep(1.,.88,vUv.y); gl_FragColor=vec4(c*strength*fade,1.); }',
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  reflect.rotation.x=-Math.PI/2;reflect.position.set(BROOM.x1-.1-screenH*.55,.013,heroZ);group.add(reflect);
  info(screen,{eyebrow:'SCIENCE LAB',title:'Queen K, on loop.',sub:'Route study · power · repeatability',
    text:'An original KONA.m route study of the Queen K out to the Energy Lab, with a live power trace. No third-party training-app screens or route art are reproduced.',model:act=>screenCard(act)});
  const elev=[];for(let i=0;i<=120;i++){const u=i/120;elev.push(.5+.22*Math.sin(u*9.2)+.12*Math.sin(u*23+1)+(u>.7&&u<.82?-.25*Math.sin((u-.7)/.12*Math.PI):0));}
  const ghost={t:0,w:0,trace:[]};
  let ride=null;                                                      // { iv, holding } while a visitor is in the saddle
  function drawScreen(t){
    const w=SW,h=SH,g=sg,dist=(t*.011)%1,horizon=h*.47;
    const sky=g.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#1a1f3a');sky.addColorStop(.55,'#5b3a52');sky.addColorStop(1,'#f08a4b');
    g.fillStyle=sky;g.fillRect(0,0,w,horizon);
    g.fillStyle='rgba(255,214,150,.9)';g.beginPath();g.arc(w*.7,horizon-8,26,Math.PI,0);g.fill();
    g.fillStyle='#173c55';g.fillRect(0,horizon,w*.42,h*.06);                                     // the Pacific, makai side
    g.fillStyle='rgba(255,190,120,.35)';for(let i=0;i<14;i++){g.fillRect((i*73+t*30)%(w*.42),horizon+3+(i%4)*7,28,2);}
    g.fillStyle='#4a3b36';g.beginPath();g.moveTo(w*.38,horizon);for(let x=w*.38;x<=w;x+=32)g.lineTo(x,horizon-10-14*Math.sin(x*.013+1.7)-(x>w*.78?26:0));g.lineTo(w,horizon);g.fill(); // Hualālai shoulder
    const lava=g.createLinearGradient(0,horizon,0,h);lava.addColorStop(0,'#2a2220');lava.addColorStop(1,'#0e0b0a');g.fillStyle=lava;g.fillRect(0,horizon+h*.06*(0),w,h-horizon);
    g.fillStyle='#173c55';g.fillRect(0,horizon,w*.42,h*.035);
    for(let i=0;i<70;i++){const u=((i*.137+dist*3)%1),y=horizon+Math.pow(u,2.2)*(h-horizon),s=1+u*7;g.fillStyle=`rgba(${70+i%5*8},${52+i%3*6},${44},.55)`;g.fillRect(((i*271)%w),y,s*3,s*.8);}
    // road: two-lane highway to a vanishing point
    const vx=w*.52;g.fillStyle='#2b2b2d';g.beginPath();g.moveTo(vx-6,horizon);g.lineTo(vx+6,horizon);g.lineTo(w*.92,h);g.lineTo(w*.12,h);g.fill();
    g.strokeStyle='rgba(240,236,220,.85)';g.lineWidth=2;g.beginPath();g.moveTo(vx-5,horizon);g.lineTo(w*.14,h);g.moveTo(vx+5,horizon);g.lineTo(w*.9,h);g.stroke();
    g.fillStyle='#f2c14e';for(let i=0;i<12;i++){const u=((i/12+dist*9)%1),u2=Math.pow(u,2.4),y=horizon+u2*(h-horizon),hw=1+u2*7,len=4+u2*46;g.fillRect(vx-hw/2+u2*(w*.52-vx)*.02,y,hw,len);}
    // HUD
    const power=ride?ride.iv.state.power:ghost.w,band=ride?bandAt(ride.iv.state.t):null;
    g.fillStyle='rgba(6,8,10,.72)';g.fillRect(26,26,300,190);
    g.fillStyle=band&&power>=band.lo&&power<=band.hi?'#ffb36b':'#ffffff';g.font='700 66px Arial';g.fillText(ride?`${Math.round(power)} W`:'— W',46,98);
    g.fillStyle='#cfd6da';g.font='500 30px Arial';
    g.fillText(ride?`${Math.round(84+power*.035)} RPM`:'EMPTY SADDLE',46,146);
    const el=ride?ride.iv.state.t:0;g.fillText(ride?`00:${String(Math.floor(el)).padStart(2,'0')} / 01:00`:'TAP RIDE',46,190);
    g.textAlign='right';g.fillStyle='#ff7a1a';g.font='700 30px Arial';g.fillText('QUEEN K → ENERGY LAB',w-36,62);
    g.fillStyle='rgba(235,230,220,.7)';g.font='500 20px Arial';g.fillText('KONA.M ORIGINAL ROUTE STUDY',w-36,92);
    if(band){g.fillStyle='#fff';g.font='700 34px Arial';g.fillText(`${band.label.toUpperCase()} · ${band.lo}–${band.hi} W`,w-36,138);}
    g.textAlign='left';
    // power trace with the target band
    const gx=26,gy=h-150,gw=w-52,gh=96;g.fillStyle='rgba(6,8,10,.62)';g.fillRect(gx,gy,gw,gh);
    const tr=ride?ride.iv.state.trace:ghost.trace,Wmax=480,Y=v=>gy+gh-(Math.min(Wmax,v)/Wmax)*gh;
    if(ride){for(const b of [0,1,2,3]){const bb=[[0,15,240,280],[15,30,280,320],[30,45,310,350],[45,60,340,385]][b];g.fillStyle='rgba(255,122,26,.18)';g.fillRect(gx+bb[0]/INTERVAL_SECONDS*gw,Y(bb[3]),(bb[1]-bb[0])/INTERVAL_SECONDS*gw,Y(bb[2])-Y(bb[3]));}}
    g.strokeStyle='#ff7a1a';g.lineWidth=3;g.beginPath();
    tr.forEach((p,i)=>{const x=ride?gx+p.t/INTERVAL_SECONDS*gw:gx+i/Math.max(1,tr.length-1)*gw,y=Y(p.w);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();
    // elevation strip with position
    const ey=h-44,eh=30;g.fillStyle='rgba(6,8,10,.62)';g.fillRect(gx,ey,gw,eh);
    g.fillStyle='rgba(230,220,200,.55)';g.beginPath();g.moveTo(gx,ey+eh);elev.forEach((v,i)=>g.lineTo(gx+i/120*gw,ey+eh-v*eh*.9));g.lineTo(gx+gw,ey+eh);g.fill();
    const pos=ride?ride.iv.state.t/INTERVAL_SECONDS:dist;g.fillStyle='#ff7a1a';g.fillRect(gx+pos*gw-2,ey-4,4,eh+8);
    screenTex.needsUpdate=true;
  }
  drawScreen(0);

  // ---------------------------------------------------------------- fans: pedestal fans aimed at the empty saddle
  const fanRotors=[],fanGroups=[];
  for(const [fx,fz] of [[heroX+2.25,heroZ-1.15],[heroX+2.25,heroZ+1.15]]){
    const fan=new THREE.Group();fan.position.set(fx,0,fz);group.add(fan);fanGroups.push(fan);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.26,.3,.05,28),dark);base.position.y=.025;fan.add(base);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.02,10),steel);pole.position.y=.53;fan.add(pole);
    const head=new THREE.Group();head.position.y=1.08;fan.add(head);
    fan.updateMatrixWorld(true);head.lookAt(heroX-.35,1.1,heroZ);                                // aim at the saddle
    const cage=new THREE.Mesh(new THREE.TorusGeometry(.34,.018,8,40),steel);head.add(cage);
    for(let i=0;i<8;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.008,.66,.008),steel);s.rotation.z=i*Math.PI/8;s.position.z=.07;head.add(s);}
    const motor=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.16,18),dark);motor.rotation.x=Math.PI/2;motor.position.z=-.1;head.add(motor);
    const rotor=new THREE.Group();head.add(rotor);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3,b=new THREE.Mesh(new THREE.BoxGeometry(.12,.28,.012),new THREE.MeshStandardMaterial({color:'#1f2124',roughness:.5,transparent:true,opacity:.9}));b.position.set(Math.cos(a)*.16,Math.sin(a)*.16,0);b.rotation.z=a+Math.PI/2+.35;rotor.add(b);}
    fanRotors.push(rotor);obstacles.push({c:new THREE.Vector3(fx,0,fz),r:.45});
    fan.userData.info=info([cage,motor],{eyebrow:'AIRFLOW',title:'Wind you have to bring yourself.',sub:'Two pedestal fans · aimed at the saddle',text:'Indoors there is no headwind to cool you. The fans are the only weather in the room — and they spin with the watts when someone rides.'});
  }

  const fanBlurMat=new THREE.MeshBasicMaterial({map:canvasTex(256,256,(g,w,h)=>{g.translate(w/2,h/2);for(let k=0;k<5;k++){g.rotate(Math.PI*2/5);const gr=g.createLinearGradient(0,0,w*.45,0);gr.addColorStop(0,'rgba(10,10,12,.55)');gr.addColorStop(1,'rgba(10,10,12,0)');g.fillStyle=gr;g.beginPath();g.moveTo(0,0);g.arc(0,0,w*.46,-.5,.25);g.fill();}}),transparent:true,depthWrite:false,side:THREE.DoubleSide});
  // ---------------------------------------------------------------- mess: bottles, towel (draped once the bike arrives), whiteboard
  const bottleM=new THREE.MeshPhysicalMaterial({color:'#e9e5dc',roughness:.3,clearcoat:.6,envMapIntensity:.6,transparent:true,opacity:.92});
  const capM=new THREE.MeshStandardMaterial({color:'#ff6a00',roughness:.5});
  const bottle=(x,z,lying)=>{const b=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.037,.037,.21,18),bottleM);body.position.y=.105;b.add(body);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,.04,12),capM);cap.position.y=.23;b.add(cap);
    if(lying){b.rotation.z=Math.PI/2;b.position.set(x,.037,z);b.rotation.y=rand()*3;}else b.position.set(x,0,z);group.add(b);return b;};
  bottle(heroX+.95,heroZ+.75,false);bottle(heroX+1.15,heroZ+.6,true);bottle(heroX-1.3,heroZ-.9,false);
  const gels=new THREE.MeshStandardMaterial({color:'#d9c9a3',roughness:.6});
  for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.11,.006,.05),gels);p.rotation.y=rand()*3;at(p,heroX-1.6+rand()*.4,.035,heroZ+.8+rand()*.3);}
  const towelMat=new THREE.MeshStandardMaterial({map:canvasTex(128,128,(g,w,h)=>{g.fillStyle='#6f6862';g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.06)';for(let y=0;y<h;y+=3)g.fillRect(0,y,w,1);g.fillStyle='#b4541f';g.fillRect(0,h*.86,w,h*.05);}),roughness:1,side:THREE.DoubleSide,envMapIntensity:.05});
  const towelGeo=new THREE.PlaneGeometry(.3,.56,6,16);{const p=towelGeo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i);p.setZ(i,-Math.pow(Math.abs(y)/.39,1.7)*.32+Math.sin(x*14+y*6)*.012);}towelGeo.computeVertexNormals();}
  const towel=new THREE.Mesh(towelGeo,towelMat);towel.rotation.x=-Math.PI/2;towel.castShadow=!lite;
  // a second towel, thrown on the floor
  const floorTowel=new THREE.Mesh(new THREE.PlaneGeometry(.5,.8,4,8),towelMat);{const p=floorTowel.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.abs(Math.sin(p.getY(i)*9))*.03);floorTowel.geometry.computeVertexNormals();}
  floorTowel.rotation.set(-Math.PI/2,0,.6);at(floorTowel,heroX-1.7,.05,heroZ+.95);

  // interval whiteboard on a rolling stand, angled to the saddle
  const wb=new THREE.Group();wb.position.set(heroX+1.1,0,heroZ+2.25);wb.rotation.y=Math.PI*.82;group.add(wb);
  for(const s of [-.6,.6]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.04,1.85,.04),steel);leg.position.set(s,.93,0);wb.add(leg);const foot=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.5),steel);foot.position.set(s,.04,0);wb.add(foot);}
  const board=lettering(1.3,.9,g=>{
    g.fillStyle='#efede8';g.fillRect(0,0,1.3,.9);
    g.fillStyle='#1d3c8f';g.font=`italic 400 .085px ${SERIF}`;g.fillText('today —',.07,.12);
    g.font=`600 .072px ${FONT}`;g.fillText('WU 15′ easy',.07,.24);g.fillText('5 × 8′ @ threshold',.07,.35);g.fillText('   2′ spin between',.07,.45);
    g.fillStyle='#c0392b';g.fillText('cadence 90+  ·  don’t fade',.07,.57);
    g.fillStyle='#1d3c8f';g.fillText('CD 10′',.07,.68);
    g.strokeStyle='#1d3c8f';g.lineWidth=.008;for(let i=0;i<5;i++){g.beginPath();g.moveTo(.92+i*.05,.66);g.lineTo(.92+i*.05,.8);g.stroke();}
    g.beginPath();g.moveTo(.9,.78);g.lineTo(1.16,.68);g.stroke();
    g.fillStyle='rgba(20,20,20,.35)';g.font=`500 .035px ${FONT}`;g.fillText('example session · not an athlete’s plan',.07,.84);
  },512);
  board.material.toneMapped=true;board.position.set(0,1.32,.03);wb.add(board);
  const boardBack=new THREE.Mesh(new THREE.BoxGeometry(1.36,.96,.03),dark);boardBack.position.set(0,1.32,0);wb.add(boardBack);
  info([board,boardBack],{eyebrow:'THE PLAN',title:'Written down, then done.',sub:'Interval whiteboard',text:'A generic threshold session written the way a pain cave keeps them: on a board, in marker, ticked off with a shaking hand. It is an example, not an athlete’s actual plan.'});
  obstacles.push({c:wb.position.clone(),r:.6});

  // ---------------------------------------------------------------- experiment wall: the loop, as published results
  const EXW=1.62,EXH=2.1,ex0=11.4;
  const panels=loopFacts.map((f,i)=>{
    const x=ex0+(loopFacts.length-1-i)*(EXW+.22);                  // read left to right from inside the room (facing +z)
    const p=lettering(EXW,EXH,g=>{
      g.fillStyle='rgba(14,13,13,.92)';g.fillRect(0,0,EXW,EXH);
      g.fillStyle='#ff6a00';g.fillRect(.1,.1,.32,.025);
      g.font=`800 .085px ${FONT}`;g.letterSpacing='.03px';g.fillText(f.loop,.1,.26);
      g.fillStyle='#eee5d9';g.letterSpacing='0px';g.font=`italic 400 .42px ${SERIF}`;g.fillText(String(f.year),.1,.72);
      g.font=`700 .066px ${FONT}`;wrap(g,f.headline.toUpperCase(),.1,.92,EXW-.2,.085);
      g.fillStyle='#ffb36b';g.font=`700 .16px ${FONT}`;g.fillText(f.value,.1,1.34);
      g.fillStyle='#bdb3a6';g.font=`italic 400 .085px ${SERIF}`;wrap(g,f.line,.1,1.56,EXW-.2,.11);
      g.fillStyle='#7d746c';g.font=`600 .04px ${FONT}`;g.fillText('PUBLISHED RESULT · TAP FOR SOURCE',.1,EXH-.1);
    },640);
    p.position.set(x+EXW/2,1.75,BROOM.z0-.03);p.rotation.y=Math.PI;group.add(p);
    // pins + string between cards: the loop is a sequence
    const pin=new THREE.Mesh(new THREE.SphereGeometry(.03,10,8),ember);pin.position.set(x+EXW/2,1.75+EXH/2-.06,BROOM.z0-.05);group.add(pin);
    info(p,{eyebrow:`${f.loop} · ${f.year}`,title:f.headline,sub:f.value,text:f.line,model:()=>factCard(f)});
    return p;
  });
  const string=new THREE.Mesh(new THREE.BoxGeometry(5*(EXW+.22)-.22-EXW,.008,.008),ember);string.position.set(ex0+EXW/2+2*(EXW+.22),1.75+EXH/2-.06,BROOM.z0-.05);group.add(string);
  const loopTitle=lettering(9.2,.9,g=>{
    g.fillStyle='#eee5d9';g.font=`700 .2px ${FONT}`;g.letterSpacing='.05px';fitText(g,'EXPERIMENT → MISS → INSPECT → ADAPT → RETURN',0,.34,9.1);
    g.fillStyle='#8b8178';g.letterSpacing='0px';g.font=`italic 400 .17px ${SERIF}`;fitText(g,'Five published results, read as one loop. A KONA.m reading, not the athlete’s words.',0,.72,9.1);
  },1536);
  loopTitle.position.set(ex0+4.6,3.4,BROOM.z0-.03);loopTitle.rotation.y=Math.PI;group.add(loopTitle);
  const exWash=lightPool(9.6,1.6,'#ffd2a6',lite?.05:.08);exWash.position.set(ex0+4.6,.02,BROOM.z0-.9);group.add(exWash);
  const exSpot=new THREE.SpotLight('#ffe0c0',lite?0:26,7,.75,.8,1.4);exSpot.position.set(ex0+4.6,BROOM.h-.4,BROOM.z0-2.2);exSpot.target.position.set(ex0+4.6,1.8,BROOM.z0);if(!lite)group.add(exSpot,exSpot.target);

  // ---------------------------------------------------------------- story wall (south)
  const story=lettering(8.2,2.4,g=>{
    g.fillStyle='#ff6a00';g.fillRect(.1,.12,.45,.035);
    g.fillStyle='#eee5d9';g.font=`italic 400 .5px ${SERIF}`;fitText(g,'Not a trophy room.',.1,.82,8);
    fitText(g,'A room for the work nobody sees.',.1,1.48,8);
    g.fillStyle='#8b8178';g.font=`600 .11px ${FONT}`;g.letterSpacing='.08px';fitText(g,'KONA.M · ATHLETE ROOM · INDEPENDENT EDITORIAL STUDY',.1,2.05,8);
  },1536);
  story.position.set(14.2,3.1,BROOM.z1+.03);group.add(story);

  // ---------------------------------------------------------------- run station: curved-slat treadmill, south side
  const treadmill=new THREE.Group();treadmill.position.set(19.6,0,-15.9);group.add(treadmill);
  const slatGeo=new THREE.BoxGeometry(.105,.07,.78),slatCount=28;
  const slats=new THREE.InstancedMesh(slatGeo,rubber,slatCount),slatDummy=new THREE.Object3D();
  for(let i=0;i<slatCount;i++){
    const x=-1.45+i*(2.9/(slatCount-1)),curve=.17+.23*Math.pow(Math.abs(x)/1.45,2);
    slatDummy.position.set(x,curve,0);slatDummy.rotation.set(0,0,-.28*(x/1.45));slatDummy.updateMatrix();slats.setMatrixAt(i,slatDummy.matrix);
  }
  slats.instanceMatrix.needsUpdate=true;treadmill.add(slats);
  for(const z of [-.43,.43])for(const x of [-1.25,1.0]){const p=new THREE.Mesh(new THREE.BoxGeometry(.11,1.44,.11),steel);p.position.set(x,.82,z);p.rotation.z=x>0?-.18:.12;treadmill.add(p);}
  const runConsole=new THREE.Mesh(new THREE.BoxGeometry(.60,.36,.74),dark);runConsole.position.set(.80,1.58,0);treadmill.add(runConsole);
  const treadDisplay=new THREE.Mesh(new THREE.PlaneGeometry(.42,.20),ember);treadDisplay.position.set(.49,1.61,0);treadDisplay.rotation.y=Math.PI/2;treadmill.add(treadDisplay);
  info([runConsole,slats],{eyebrow:'RUN LAB',title:'Same cave, different suffering.',sub:'Run · form · repeat',text:'An original KONA.m curved-slat treadmill study. No motor: you move the belt or nothing moves.'});
  obstacles.push({c:new THREE.Vector3(19.6,0,-15.9),r:1.6});
  const runPool=lightPool(3.6,1.8,'#ffb36b',lite?.03:.06);runPool.position.set(19.6,.02,-15.9);group.add(runPool);

  // ---------------------------------------------------------------- gear wall: a slatwall that has been used for years
  const gx0=22.4,gx1=28.8,gz=BROOM.z1+.02,gcx=(gx0+gx1)/2;
  const slatM=new THREE.MeshStandardMaterial({color:'#24211f',roughness:.7,metalness:.15,envMapIntensity:.1});
  const slatI=new THREE.InstancedMesh(new THREE.BoxGeometry(gx1-gx0,.07,.05),slatM,22),sd=new THREE.Object3D();
  for(let k=0;k<22;k++){sd.position.set(gcx,.35+k*.16,gz+.03);sd.updateMatrix();slatI.setMatrixAt(k,sd.matrix);}slatI.receiveShadow=true;group.add(slatI);
  const shelf=(y,w=1.6,x=gcx)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.035,.3),dark);m.position.set(x,y,gz+.2);m.castShadow=!lite;group.add(m);return m;};
  shelf(1.9,2.2,gx0+1.3);shelf(1.9,2.2,gx1-1.3);shelf(1.1,6.0);
  const shell=new THREE.MeshPhysicalMaterial({color:'#121315',roughness:.25,metalness:.2,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:.6});
  const visor=new THREE.MeshPhysicalMaterial({color:'#2a1408',roughness:.05,metalness:.6,clearcoat:1,envMapIntensity:1});
  const aeroHelmet=(x,y,rot)=>{const h=new THREE.Group();const dome=new THREE.Mesh(new THREE.SphereGeometry(.15,28,18),shell);dome.scale.set(1,.85,1.05);h.add(dome);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(.12,.34,24),shell);tail.rotation.x=-Math.PI/2-.25;tail.position.set(0,.02,-.2);tail.scale.set(1,1,.55);h.add(tail);
    const v=new THREE.Mesh(new THREE.SphereGeometry(.152,24,10,-Math.PI*.42,Math.PI*.84,Math.PI*.42,Math.PI*.2),visor);h.add(v);
    h.position.set(x,y,gz+.22);h.rotation.y=rot;h.traverse(o=>{if(o.isMesh)o.castShadow=!lite;});group.add(h);return h;};
  const helmet=aeroHelmet(gx0+.7,2.05,Math.PI/2);const helmet2=aeroHelmet(gx0+1.45,2.05,Math.PI/2+.4);
  const bottleRow=(x0,n,y)=>{for(let k=0;k<n;k++){const b=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.036,.036,.2,16),k%3?bottleM:new THREE.MeshPhysicalMaterial({color:'#1a1a1c',roughness:.4}));body.position.y=.1;b.add(body);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.02,.028,.04,10),k%2?capM:dark);cap.position.y=.22;b.add(cap);b.position.set(x0+k*.11,y+.02,gz+.2);group.add(b);}};
  bottleRow(gx1-2.2,9,1.92);
  const shoeM=[new THREE.MeshStandardMaterial({color:'#e8e2d6',roughness:.7}),new THREE.MeshStandardMaterial({color:'#ff5a1f',roughness:.6}),dark];
  for(let k=0;k<4;k++)for(const side of [-.07,.07]){const sh=new THREE.Mesh(new THREE.CapsuleGeometry(.05,.2,4,10),shoeM[k%3]);sh.rotation.z=Math.PI/2;sh.scale.set(1,1,.8);sh.position.set(gx0+.7+k*.55+side,.06,gz+.32);group.add(sh);}
  const ribbonM=[ember,new THREE.MeshBasicMaterial({color:'#1d6fb8'}),new THREE.MeshBasicMaterial({color:'#e8e2d6'})];
  for(let k=0;k<7;k++){const x=gx0+.5+k*.82;const rib=new THREE.Mesh(new THREE.BoxGeometry(.035,.62,.006),ribbonM[k%3]);rib.position.set(x,3.12,gz+.1);rib.rotation.z=(k%2?.05:-.05);group.add(rib);
    const med=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.012,28),new THREE.MeshStandardMaterial({color:k%2?'#b08d57':'#9aa0a6',metalness:1,roughness:.25,envMapIntensity:1.2}));med.rotation.x=Math.PI/2;med.position.set(x+(k%2?.015:-.015),2.76,gz+.11);group.add(med);}
  const bibTex=canvasTex(256,192,(g,w,h)=>{g.fillStyle='#f2efe8';g.fillRect(0,0,w,h);g.fillStyle='#d64a1a';g.fillRect(0,0,w,26);g.fillStyle='#1a1a1a';g.font=`800 92px ${FONT}`;g.textAlign='center';g.fillText('— —',w/2,128);g.fillStyle='#8a847c';g.font=`600 14px ${FONT}`;g.fillText('RACE BIB · NUMBER LEFT BLANK',w/2,170);});
  for(let k=0;k<3;k++){const bib=new THREE.Mesh(new THREE.PlaneGeometry(.32,.24),new THREE.MeshStandardMaterial({map:bibTex,roughness:.8}));bib.position.set(gx1-.6-k*.42,2.5+(k%2)*.08,gz+.09);bib.rotation.z=(k-1)*.06;group.add(bib);}
  const hangTowel=new THREE.Mesh(new THREE.PlaneGeometry(.38,.9,4,10),towelMat);{const p=hangTowel.geometry.attributes.position;for(let k=0;k<p.count;k++)p.setZ(k,Math.sin(p.getY(k)*7)*.02);hangTowel.geometry.computeVertexNormals();}
  hangTowel.position.set(gx1-.2,1.45,gz+.12);group.add(hangTowel);
  const gearSpot=new THREE.SpotLight('#ffd2a6',lite?0:22,6,.55,.8,1.5);gearSpot.position.set(gcx,BROOM.h-.4,gz+1.6);gearSpot.target.position.set(gcx,1.6,gz);if(!lite)group.add(gearSpot,gearSpot.target);
  info([helmet.children[0],helmet2.children[0]],{eyebrow:'GEAR WALL',title:'Objects remember work.',sub:'Equipment · race objects · memory',text:'A working wall, not a shop wall: helmets, bottles, shoes, blank bibs, medals on tired ribbons. Nothing here is labelled as any athlete’s own equipment — that stays unlabelled until it is sourced.'});

  // ---------------------------------------------------------------- clutter: what a training room collects (no labels, no brands)
  const cardboard=new THREE.MeshStandardMaterial({color:'#7d6044',roughness:.95});
  const pile=new THREE.Group();pile.position.set(21.2,0,-7.6);pile.rotation.y=-.35;group.add(pile);
  [[.7,.45,.5,0,0],[.5,.32,.42,.05,.45],[.42,.26,.34,-.4,0]].forEach(([w,h,d,x,y],i)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),cardboard);b.position.set(x,y+h/2,i===2?.45:0);b.rotation.y=i*.3;b.castShadow=!lite;pile.add(b);});
  const pump=new THREE.Group();pump.position.set(22.0,0,-16.9);group.add(pump);
  {const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.62,12),new THREE.MeshStandardMaterial({color:'#b02a1a',roughness:.4}));barrel.position.y=.36;pump.add(barrel);
   const handle=new THREE.Mesh(new THREE.BoxGeometry(.24,.03,.03),dark);handle.position.y=.7;pump.add(handle);
   const foot=new THREE.Mesh(new THREE.BoxGeometry(.22,.025,.08),dark);foot.position.y=.012;pump.add(foot);}
  for(let k=0;k<3;k++){const tube=new THREE.Mesh(new THREE.TorusGeometry(.16,.012,8,32),dark);tube.position.set(22.6+k*.12,2.25-k*.03,BROOM.z1+.08);tube.rotation.y=.1*k;group.add(tube);}   // spare tubes on a nail
  const fridge=new THREE.Group();fridge.position.set(33.6,0,-6.9);fridge.rotation.y=-Math.PI/2;group.add(fridge);
  {const body=new THREE.Mesh(new THREE.BoxGeometry(.5,.85,.52),new THREE.MeshStandardMaterial({color:'#cfcac0',roughness:.55,metalness:.1,envMapIntensity:.2}));body.position.y=.425;body.castShadow=!lite;fridge.add(body);
   const handleF=new THREE.Mesh(new THREE.BoxGeometry(.02,.3,.03),steel);handleF.position.set(.18,.55,.27);fridge.add(handleF);
   for(let k=0;k<3;k++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.036,.036,.21,14),k%2?bottleM:new THREE.MeshStandardMaterial({color:'#1a1a1c',roughness:.4}));b.position.set(-.12+k*.11,.955,0);fridge.add(b);}}
  info(fridge.children[0],{eyebrow:'FUEL',title:'Within arm’s reach of the bike.',sub:'Bottles · a fridge that hums',text:'Long indoor sessions run on whatever is closest. Generic props, no products shown.'});
  obstacles.push({c:fridge.position.clone(),r:.45});
  const chair=new THREE.Group();chair.position.set(heroX-2.3,0,heroZ-1.7);chair.rotation.y=.7;group.add(chair);
  {const legM=steel;for(const [x,z] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.45,6),legM);l.position.set(x,.225,z);chair.add(l);}
   const seat=new THREE.Mesh(new THREE.BoxGeometry(.44,.03,.42),dark);seat.position.y=.46;chair.add(seat);
   const back=new THREE.Mesh(new THREE.BoxGeometry(.44,.36,.03),dark);back.position.set(0,.66,-.2);back.rotation.x=-.12;chair.add(back);}
  obstacles.push({c:chair.position.clone(),r:.4});
  // extension cord from the trainer to the wall
  {const pts=[new THREE.Vector3(heroX-.6,.02,heroZ+.2),new THREE.Vector3(heroX-1.4,.015,heroZ+1.3),new THREE.Vector3(heroX-.6,.015,heroZ+2.6),new THREE.Vector3(heroX+1.4,.015,BROOM.z0-.6),new THREE.Vector3(heroX+2.0,.25,BROOM.z0-.06)];
   const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.008,6),new THREE.MeshStandardMaterial({color:'#e8a12a',roughness:.6}));group.add(cable);}

  // ---------------------------------------------------------------- archive: mirrors + swim erg (north-east)
  const mirrorMat=new THREE.MeshPhysicalMaterial({color:'#3a3f44',metalness:.95,roughness:.12,envMapIntensity:.25,clearcoat:1,clearcoatRoughness:.08});
  for(let i=0;i<3;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.4),mirrorMat);p.rotation.y=Math.PI;p.position.set(22.8+i*1.7,1.6,BROOM.z0-.03);group.add(p);}
  const erg=new THREE.Group();erg.position.set(31.6,0,-6.0);group.add(erg);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(2.5,.2,.55),pale);bench.position.set(0,.68,0);erg.add(bench);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(2.85,.10,.14),steel);rail.position.set(-.05,.45,0);erg.add(rail);
  const mast=new THREE.Mesh(new THREE.BoxGeometry(.15,1.75,.15),steel);mast.position.set(1.18,1.3,0);mast.rotation.z=-.08;erg.add(mast);
  const efly=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.18,40),dark);efly.position.set(1.06,1.86,0);efly.rotation.x=Math.PI/2;erg.add(efly);
  info(efly,{eyebrow:'PAIN CAVE ARCHIVE',title:'The laboratory came first.',sub:'Archive · mirrors · swim erg',text:'Mirrors for form checks and a swim erg: the kind of indoor work a pain cave is known for. History of the idea, not a claim about any athlete’s current setup.'});
  obstacles.push({c:new THREE.Vector3(31.6,0,-6.0),r:1.5});

  // ---------------------------------------------------------------- recovery (south-east corner)
  wall(2.4,.42,1.4,33.9,.21,-16.75,new THREE.MeshStandardMaterial({color:'#24201e',roughness:.96}));
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.72,24),dark);roller.rotation.z=Math.PI/2;roller.position.set(33.6,.16,-15.6);group.add(roller);
  info(roller,{eyebrow:'RESET',title:'Recovery is part of the work.',sub:'Reset · restore · return',text:'A quiet corner keeps recovery inside the same story rather than treating it as the opposite of training.'});
  obstacles.push({c:new THREE.Vector3(33.9,0,-16.75),r:.9});
  // ---------------------------------------------------------------- sculptures
  const stone=new THREE.MeshStandardMaterial({map:basaltTex,color:'#4a443f',roughness:.95,envMapIntensity:.2});
  const gap=new THREE.Group();gap.position.set(9.6,0,-13.7);gap.rotation.y=.75;group.add(gap);
  for(const x of [-.62,.62]){const s=new THREE.Mesh(new THREE.BoxGeometry(.95,3.1,.85),stone);s.position.set(x,1.55,0);s.rotation.z=x<0?.09:-.09;s.castShadow=!lite;gap.add(s);}
  const slit=new THREE.Mesh(new THREE.BoxGeometry(.07,2.3,.05),ember);slit.position.set(0,1.75,.46);gap.add(slit);
  const gapNum=lettering(1.0,.36,g=>{g.fillStyle='#ffb36b';g.font=`700 .3px ${FONT}`;g.textAlign='center';g.fillText(facts.gap.value,.5,.29);},512);
  gapNum.position.set(0,.3,.44);gap.add(gapNum);
  const gapLight=new THREE.PointLight('#ff7a1a',lite?1.5:2.6,4,1.8);gapLight.position.set(0,1.4,.9);gap.add(gapLight);
  info([slit,...gap.children.filter(c=>c.isMesh&&c!==slit)],{eyebrow:`THE GAP · KONA ${facts.gap.year}`,title:'Almost is still information.',sub:`${facts.gap.athlete_time} · ${facts.gap.value} behind`,text:facts.gap.line,model:()=>gapCard()});
  obstacles.push({c:new THREE.Vector3(9.6,0,-13.7),r:1.25});

  const repeat=new THREE.Group();repeat.position.set(14.9,1.55,-12.7);repeat.rotation.y=.45;group.add(repeat);
  for(const [i,r] of [1.0,.75,.5,.25].entries()){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.045,10,44),i===3?ember:dark);repeat.add(ring);}
  info(repeat.children[0],{eyebrow:'REPEAT',title:'Same circle. Different athlete.',sub:'Original KONA.m sculpture',text:'Repetition becomes useful only when the feedback changes what happens next.'});
  obstacles.push({c:new THREE.Vector3(14.9,0,-12.7),r:1.1});

  // ---------------------------------------------------------------- haze in the light
  const dust=motes({n:lite?60:180,box:[heroX-2.2,heroX+1.6,.3,BROOM.h-.4,heroZ-1.4,heroZ+1.4],color:'#ffd9b0',size:.022,rise:.02,sway:.25,opacity:.6,seed:71});
  group.add(dust.points);
  const screenDust=motes({n:lite?30:90,box:[BROOM.x1-4,BROOM.x1-.6,.6,4.4,heroZ-3.4,heroZ+3.4],color:'#a9c6ff',size:.02,rise:.015,sway:.3,opacity:.45,seed:73});
  group.add(screenDust.points);

  // ---------------------------------------------------------------- cards (models rendered by the host's card engine)
  const src=urls=>urls.map((u,i)=>({label:`Source ${urls.length>1?i+1:''} ↗`.replace('  ',' '),href:u}));
  function factCard(f){
    return {kind:'beast',eyebrow:`${f.loop} · ${f.year}`,title:f.headline,kicker:f.value,lede:f.line,
      facts:[{cls:'P',text:`${f.headline}, ${f.year}: ${f.value}.`},{cls:'I',text:`“${f.loop}” is a KONA.m reading of the result, not the athlete’s own words.`}],
      notes:[{summary:'About this wall',text:[facts.editorial_note,`Retrieved ${facts.retrieved}.`]}],
      actions:src(f.sources)};
  }
  function gapCard(){
    const g=facts.gap;
    return {kind:'beast',eyebrow:`THE GAP · KONA ${g.year}`,title:'Almost is still information.',kicker:`${g.athlete_time} · second`,
      lede:'Two basalt forms, one unresolved line. The number at its foot is the distance between second and first on the hardest day of the year.',
      stats:[{value:g.value,label:'to the winner'},{value:g.athlete_time,label:'finish'},{value:'2nd',label:'place'}],
      facts:[{cls:'P',text:g.line},{cls:'P',text:`Winner: ${g.winner}, ${g.winner_time}.`},{cls:'G',text:'Sculpture is an original KONA.m work.'}],
      actions:src(g.sources)};
  }
  function screenCard(act){
    return {kind:'beast',eyebrow:'SCIENCE LAB',title:'Queen K, on loop.',kicker:'Original route study · live power trace',
      lede:'Out along the Queen K toward the Energy Lab: ocean on one side, lava on the other, one road. The trace is whatever the person in the saddle is doing right now.',
      facts:[{cls:'G',text:'Route art, HUD and terrain are drawn by KONA.m. No third-party training-app screens, routes or marks are reproduced.'}],
      actions:[{label:'Ride it →',primary:true,onClick:()=>act.ride()},{label:'Keep walking',onClick:()=>act.close()}]};
  }
  function machineCard(act){
    return {kind:'beast',eyebrow:'THE MACHINE · EMPTY SADDLE',title:'The place where excuses get boring.',kicker:'Speedmax CFR · direct-drive trainer · two fans',
      lede:'Nobody is here. That is the point: the saddle is open. Climb on and hold one 60-second interval inside a moving power band — tap or hold to push.',
      stats:[{value:'60 s',label:'interval'},{value:'4',label:'power bands'},{value:'240–385',label:'watts'}],
      facts:[{cls:'I',text:'The bike is the KONA.m Speedmax CFR study — not presented as Lionel Sanders’ race build.'},{cls:'G',text:'Trainer, fans and room are original KONA.m geometry.'}],
      actions:[{label:'Ride →',primary:true,onClick:()=>act.ride()},{label:'Keep walking',onClick:()=>act.close()}]};
  }
  // ---------------------------------------------------------------- the visitor in the saddle
  function startRide(){ ride={iv:createInterval(),holding:false}; return ride; }
  let lastTrace=[];
  function stopRide(){ const r=ride; ride=null; if(!r) return null; lastTrace=r.iv.state.trace.slice(); return r.iv.result(); }
  function introCard(act){
    return {kind:'beast',eyebrow:'AN INDEPENDENT ROOM · LIONEL SANDERS',title:'The work nobody sees.',kicker:'Not a trophy room.',
      lede:'A training room with nobody in it. Five published results on the wall, one empty saddle, one 60-second interval. Take the saddle, or walk the room first.',
      facts:[{cls:'G',text:'An independent KONA.m editorial room. Not affiliated with, endorsed by or sponsored by Lionel Sanders or any brand.'},{cls:'P',text:'Every result on the wall is published and linked to its source.'}],
      actions:[{label:'Take the saddle →',primary:true,onClick:()=>act.ride()},{label:'Walk the room',onClick:()=>act.close()}]};
  }
  // a 1080×1350 card of the interval just ridden, for the share sheet
  function resultImage(res,best){
    const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#14100e');bg.addColorStop(1,'#060505');g.fillStyle=bg;g.fillRect(0,0,W,H);
    const glow=g.createRadialGradient(W*.5,H*.42,10,W*.5,H*.42,W*.7);glow.addColorStop(0,'rgba(255,106,0,.22)');glow.addColorStop(1,'rgba(255,106,0,0)');g.fillStyle=glow;g.fillRect(0,0,W,H);
    g.fillStyle='#ff6a00';g.fillRect(90,120,90,8);
    g.fillStyle='#eee5d9';g.font=`800 34px ${FONT}`;g.letterSpacing='6px';g.fillText('BEAST INTERVAL · 60 S',90,190);g.letterSpacing='0px';
    g.font=`italic 400 300px ${SERIF}`;g.fillText(`${res.inBand}s`,80,500);
    g.fillStyle='#bdb3a6';g.font=`600 40px ${FONT}`;g.fillText('inside a moving power band',90,575);
    // trace with the four bands
    const gx=90,gy=650,gw=W-180,gh=300,Y=v=>gy+gh-(Math.min(480,v)/480)*gh;
    g.fillStyle='rgba(255,255,255,.04)';g.fillRect(gx,gy,gw,gh);
    for(const [a,b,lo,hi] of [[0,15,240,280],[15,30,280,320],[30,45,310,350],[45,60,340,385]]){g.fillStyle='rgba(255,122,26,.2)';g.fillRect(gx+a/60*gw,Y(hi),(b-a)/60*gw,Y(lo)-Y(hi));}
    g.strokeStyle='#ff7a1a';g.lineWidth=6;g.lineJoin='round';g.beginPath();lastTrace.forEach((p,i)=>{const x=gx+p.t/60*gw,y=Y(p.w);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();
    g.fillStyle='#eee5d9';g.font=`700 44px ${FONT}`;
    [[`${res.avgWatts} W`,'average'],[`${res.bestStreak} s`,'best streak'],[`${best} s`,'personal best']].forEach(([v,l],i)=>{const x=90+i*320;g.fillText(v,x,1050);g.fillStyle='#8b8178';g.font=`600 26px ${FONT}`;g.fillText(l.toUpperCase(),x,1090);g.fillStyle='#eee5d9';g.font=`700 44px ${FONT}`;});
    g.fillStyle='#8b8178';g.font=`italic 400 40px ${SERIF}`;g.fillText('The work nobody sees.',90,1200);
    g.font=`600 22px ${FONT}`;g.fillText('KONA.M · AN INDEPENDENT ROOM · SIMULATED POWER FROM TAPS',90,1250);
    return new Promise(r=>c.toBlob(b=>r(b),'image/jpeg',.92));
  }

  return {
    group,floor,sign,bikeSpot,infos,mood:BEAST_MOOD,
    get ride(){return ride;},
    // swap procedural stand-ins for the generated GLBs (BEAST_ASSETS) as each one arrives
    async useAssets(loader){
      if(this._assets)return; this._assets=true;
      const load=async url=>{try{return (await loader.loadAsync(url)).scene;}catch(e){console.warn('beast asset',url,e?.message||e);return null;}};
      const seat=(root,height,yaw=0)=>{root.traverse(o=>{if(o.isMesh){o.castShadow=!lite;o.receiveShadow=true;if(o.material){o.material.envMapIntensity=.35;}}});
        const b=new THREE.Box3().setFromObject(root),sz=b.getSize(new THREE.Vector3());root.scale.setScalar(height/Math.max(.001,sz.y));
        const b2=new THREE.Box3().setFromObject(root),c=b2.getCenter(new THREE.Vector3());root.position.set(-c.x,-b2.min.y,-c.z);
        const h=new THREE.Group();const spin=new THREE.Group();spin.rotation.y=yaw;spin.add(root);h.add(spin);return h;};
      const [fanG,treadG,trainerG]=await Promise.all([load(BEAST_ASSETS.fan),load(BEAST_ASSETS.treadmill),load(BEAST_ASSETS.trainer)]);
      if(fanG){
        fanGroups.forEach((old,k)=>{
          const f=seat(k?fanG.clone(true):fanG,.52);f.position.copy(old.position);
          const d=new THREE.Vector3(heroX-.3-old.position.x,0,heroZ-old.position.z);f.rotation.y=Math.atan2(d.x,d.z);   // the grille (+z) looks at the saddle
          const blur=new THREE.Mesh(new THREE.CircleGeometry(.2,40),fanBlurMat);blur.position.set(0,.28,.12);f.add(blur);fanRotors[k]=blur;
          group.add(f);old.visible=false;f.traverse(o=>{if(o.isMesh&&o!==blur){o.userData.info=old.userData.info;pickables.push(o);}});
        });
      }
      if(treadG){const t=seat(treadG,1.45,Math.PI/2);t.position.copy(treadmill.position);group.add(t);treadmill.visible=false;t.traverse(o=>{if(o.isMesh){o.userData.info=runConsole.userData.info;pickables.push(o);}});}
      if(trainerG){const t=seat(trainerG,.56,TRAINER_YAW);t.name='beast-trainer-glb';trainer.add(t);for(const c of trainer.children)if(c!==t)c.visible=false;t.traverse(o=>{if(o.isMesh){o.userData.info=trainerInfo;pickables.push(o);}});}
    },
    startRide,stopRide,introCard,resultImage,
    hold(on){ if(ride) ride.holding=!!on; },
    setBike(bike,dress){
      bike.traverse(o=>{if(!o.isMesh)return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.userData.info=bikeSpot.info;o.castShadow=!lite;delete o.userData.piece;pickables.push(o);});
      dress?.(bike);
      const box=new THREE.Box3().setFromObject(bike),c=box.getCenter(new THREE.Vector3());
      bike.position.set(-c.x,-box.min.y,-c.z);
      const holder=new THREE.Group();holder.add(bike);holder.position.set(heroX,.05,heroZ);group.add(holder);bikeSpot.bike=holder;
      const node=n=>bike.getObjectByName(n)||[...bike.children].find(ch=>ch.userData?.part===n);
      const centre=o=>new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      const front=node('wheel_front'),rear=node('wheel_rear');
      holder.updateMatrixWorld(true);
      if(front&&rear){
        const f=centre(front),r=centre(rear),dir=new THREE.Vector3(f.x-r.x,0,f.z-r.z);
        holder.rotation.y=Math.atan2(dir.z,dir.x);                  // wheelbase along +x: the rider faces the screen
        holder.updateMatrixWorld(true);
        if(centre(front).x<centre(rear).x){holder.rotation.y+=Math.PI;holder.updateMatrixWorld(true);}   // GLB axes vary: check, don't assume
        const r2=centre(rear),f2=centre(front);
        holder.position.x+=heroX-(r2.x+f2.x)/2;holder.position.z+=heroZ-(r2.z+f2.z)/2;holder.updateMatrixWorld(true);
        const ra=centre(rear),fa=centre(front),fb=new THREE.Box3().setFromObject(front);
        rear.visible=false;                                           // wheel off: the dropouts sit on the trainer axle
        trainer.position.set(ra.x,0,ra.z);trainer.scale.setScalar(Math.max(.8,Math.min(1.25,ra.y/.34)));
        riser.position.set(fa.x,.025,fa.z);
        bikeSpot.cockpit.x=ra.x+.5;
        const bars=node('basebar')||node('base_bar')||node('extensions');
        if(bars){const bb=new THREE.Box3().setFromObject(bars),bc=bb.getCenter(new THREE.Vector3());towel.position.set(bc.x-.04,bb.max.y+.02,bc.z);towel.rotation.set(-Math.PI/2,0,Math.PI/2);group.add(towel);}
        else{towel.position.set(fb.max.x-.35,1.0,heroZ);group.add(towel);}
      }else if(rear) rear.visible=false;
    },
    update(t,reduce,dt=1/60){
      const p=ride?ride.iv.state.power:0;
      if(ride&&!ride.iv.state.done) ride.iv.step(dt,ride.holding);
      // ghost trace when nobody rides: the screen idles at a quiet hum
      ghost.t+=dt;ghost.w=150+Math.sin(t*.7)*12;if(!ghost.trace.length||ghost.t>.5){ghost.t=0;ghost.trace.push({w:ghost.w});if(ghost.trace.length>90)ghost.trace.shift();}
      const spin=ride?2+p/26:1.2;
      if(!reduce) for(const [i,rotor] of fanRotors.entries()) rotor.rotation.z+=dt*spin*(1+i*.07);
      if(!reduce){ housing.rotation.y+=dt*(ride?p/18:0); dust.step(t); screenDust.step(t); }
      // light: cold until you find the band, then the room turns to ember
      const band=ride?bandAt(ride.iv.state.t):null,heat=ride?Math.min(1,ride.iv.state.streak/6):0;
      spot.color.setRGB(1,.85-.25*heat,.69-.45*heat);shaft.material.uniforms.color.value.copy(spot.color);
      shaft.material.uniforms.opacity.value=(lite?.10:.16)*(1+heat*.6);
      coveMat.opacity=(lite?.35:.6)*(.6+.4*Math.sin(t*.8))+(ride?heat*.4:0);
      rimL.intensity=(lite?0:3.2)*(1+heat*1.5);
      screenGlow.color.setRGB(.44+.5*heat,.6-.1*heat,.85-.5*heat);
      if(band&&!reduce) gapLight.intensity=(lite?1.5:2.6)*(1+.2*Math.sin(t*3));
      if(!this._sc||t-this._sc>(ride?.08:.15)){this._sc=t;drawScreen(t);}
      return { power:p, heat, riding:!!ride };
    }
  };
}

function wrap(g,text,x,y,maxW,lh){const words=String(text).split(' ');let line='';for(const w of words){const test=line?line+' '+w:w;if(g.measureText(test).width>maxW&&line){g.fillText(line,x,y);line=w;y+=lh;}else line=test;}if(line)g.fillText(line,x,y);}
function fitText(g,text,x,y,maxW){const m=g.measureText(text).width;if(m<=maxW){g.fillText(text,x,y);return;}g.save();g.translate(x,y);g.scale(maxW/m,1);g.fillText(text,0,0);g.restore();}
