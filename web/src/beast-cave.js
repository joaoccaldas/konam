// Beast Cave — native KONA.m athlete room.
// Same architecture as Lava Night / Sanctuary: one room module built into landing.js,
// shared renderer, camera, cards, pickables, obstacles, map, route, quality and loading.
//
// v2 (2026-10-03): the room shares its old footprint with the Breitling brand room — Beast Cave
// is the north half, Breitling the south, joined by one door in the party wall. The look is
// cinematic: dark room, one stage spot on an empty saddle, a glowing Queen K screen, haze.
import * as THREE from 'three';
import { motes, lightShaft } from './roomkit.js';
import { createInterval, bandAt, INTERVAL_SECONDS } from './beast-interval.js';
import facts from '../../pitch/lionel-sanders/career-facts-v1.json' with { type: 'json' };
import zwiftRoom from '../../integrations/sources/zwift-room-v0.json' with { type: 'json' };

const seededRandom=(seed=0xB34C)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};

export const BROOM = { x0: 7.35, x1: 35.35, z0: -4.0, z1: -17.7, h: 5.4 };
export const BDOOR = { z0: -9.6, z1: -6.4, h: 3.4 };
// door in the south party wall into the Breitling room (museum/world/brand_rooms.json bounds z0 -18)
export const BLINK = { x0: 29.4, x1: 31.6, h: 3.0, z: -17.85, toRoom: 'breitling' };
// cinematic mood the host applies while the visitor is inside (exposure + global light dimming)
export const BEAST_MOOD = Object.freeze({ exposure: 1.08, hemi: .1, sun: .06 });

export function beastCaveWalkable(x, z, WALK) {
  const inDoor = x > WALK.x1 - .1 && x < BROOM.x0 + .75 && z < BDOOR.z1 - .35 && z > BDOOR.z0 + .35;
  const inRoom = x > BROOM.x0 + .55 && x < BROOM.x1 - .55 && z < BROOM.z0 - .55 && z > BROOM.z1 + .55;
  const inLink = x > BLINK.x0 + .3 && x < BLINK.x1 - .3 && z <= BROOM.z1 + .6 && z > BROOM.z1 - .95;
  return inDoor || inRoom || inLink;
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
  floor.position.set(CX,-.08,CZ); floor.receiveShadow=true; floor.userData.floor=true; group.add(floor); pickables.push(floor);

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
  // south party wall with the Breitling link door
  wall(BLINK.x0-BROOM.x0,BROOM.h,.28,(BROOM.x0+BLINK.x0)/2,BROOM.h/2,BROOM.z1-.14);
  wall(BROOM.x1-BLINK.x1,BROOM.h,.28,(BLINK.x1+BROOM.x1)/2,BROOM.h/2,BROOM.z1-.14);
  wall(BLINK.x1-BLINK.x0,BROOM.h-BLINK.h,.28,(BLINK.x0+BLINK.x1)/2,BLINK.h+(BROOM.h-BLINK.h)/2,BROOM.z1-.14);
  // west wall, sharing the hall glass line, with the doorway cut out
  wall(.28,BROOM.h,BROOM.z0-BDOOR.z1,BROOM.x0-.14,BROOM.h/2,(BROOM.z0+BDOOR.z1)/2);
  wall(.28,BROOM.h,BDOOR.z0-BROOM.z1,BROOM.x0-.14,BROOM.h/2,(BDOOR.z0+BROOM.z1)/2);
  wall(.28,BROOM.h-BDOOR.h,BDOOR.z1-BDOOR.z0,BROOM.x0-.14,BDOOR.h+(BROOM.h-BDOOR.h)/2,(BDOOR.z0+BDOOR.z1)/2);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW,.12,RD),new THREE.MeshStandardMaterial({color:'#0a0a0b',roughness:.9,envMapIntensity:.05}));
  ceil.position.set(CX,BROOM.h+.06,CZ); ceil.castShadow=true; group.add(ceil);                 // blocks the hall sun
  // exposed ceiling trusses: give the dark something to read against
  for(let x=BROOM.x0+2.5;x<BROOM.x1-1;x+=3.5){const b=new THREE.Mesh(new THREE.BoxGeometry(.18,.32,RD),dark);b.position.set(x,BROOM.h-.16,CZ);group.add(b);}
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
  const fill=new THREE.PointLight('#c9b7a8',lite?5:3,26,1.4);fill.position.set(CX-4,BROOM.h-.6,CZ);group.add(fill);
  const heroX=25.2, heroZ=CZ;                                         // the bike faces east, into the screen
  const spot=new THREE.SpotLight('#ffd8b0',lite?60:85,9,.42,.65,1.3);
  spot.position.set(heroX-.4,BROOM.h-.25,heroZ);spot.target.position.set(heroX-.2,.6,heroZ);
  spot.castShadow=!lite;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0004;group.add(spot,spot.target);
  const shaft=lightShaft({top:.14,bottom:1.55,height:BROOM.h-.3,color:'#ffcf9e',opacity:lite?.10:.16});
  shaft.position.set(heroX-.4,BROOM.h-.25,heroZ);shaft.rotation.z=-.03;group.add(shaft);
  const screenGlow=new THREE.PointLight('#6f9bd8',lite?7:10,14,1.6);screenGlow.position.set(BROOM.x1-1.6,2.4,heroZ);group.add(screenGlow);
  const rimL=new THREE.PointLight('#ff7a2a',lite?0:3.2,7,1.8);rimL.position.set(heroX-3.4,.6,heroZ+2.2);group.add(rimL);   // low ember kicker from behind

  // ---------------------------------------------------------------- hero: empty saddle on a direct-drive trainer
  const matPad=new THREE.Mesh(new THREE.BoxGeometry(5.2,.03,2.4),new THREE.MeshStandardMaterial({color:'#08090a',roughness:.75,metalness:.1,envMapIntensity:.4}));
  at(matPad,heroX,.015,heroZ);
  const sweat=new THREE.MeshPhysicalMaterial({color:'#050506',roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.4});
  for(let i=0;i<7;i++){const d=new THREE.Mesh(new THREE.CircleGeometry(.05+rand()*.11,20),sweat);d.rotation.x=-Math.PI/2;d.scale.set(1,.6+rand()*.6,1);at(d,heroX+.15+rand()*.9,.033,heroZ-.35+rand()*.7);}
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
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(screenW,screenH),new THREE.MeshBasicMaterial({map:screenTex,toneMapped:false}));
  screen.rotation.y=-Math.PI/2;at(screen,BROOM.x1-.11,2.75,heroZ);
  const screenPool=lightPool(5.5,7.5,'#7aa7e0',lite?.05:.09);screenPool.position.set(BROOM.x1-3,.02,heroZ);group.add(screenPool);
  info(screen,{eyebrow:'SCIENCE LAB',title:'Queen K, on loop.',sub:'Route study · power · repeatability',
    text:'An original KONA.m route study of the Queen K out to the Energy Lab, with a live power trace. It is not a copied Zwift screen and uses no Zwift route art.',model:act=>screenCard(act)});
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
  const fanRotors=[];
  for(const [fx,fz] of [[heroX+2.25,heroZ-1.15],[heroX+2.25,heroZ+1.15]]){
    const fan=new THREE.Group();fan.position.set(fx,0,fz);group.add(fan);
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
    info([cage,motor],{eyebrow:'AIRFLOW',title:'Wind you have to bring yourself.',sub:'Two pedestal fans · aimed at the saddle',text:'Indoors there is no headwind to cool you. The fans are the only weather in the room — and they spin with the watts when someone rides.'});
  }

  // ---------------------------------------------------------------- mess: bottles, towel (draped once the bike arrives), whiteboard
  const bottleM=new THREE.MeshPhysicalMaterial({color:'#e9e5dc',roughness:.35,transmission:lite?0:.3,thickness:.05,envMapIntensity:.6});
  const capM=new THREE.MeshStandardMaterial({color:'#ff6a00',roughness:.5});
  const bottle=(x,z,lying)=>{const b=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.037,.037,.21,18),bottleM);body.position.y=.105;b.add(body);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,.04,12),capM);cap.position.y=.23;b.add(cap);
    if(lying){b.rotation.z=Math.PI/2;b.position.set(x,.037,z);b.rotation.y=rand()*3;}else b.position.set(x,0,z);group.add(b);return b;};
  bottle(heroX+.95,heroZ+.75,false);bottle(heroX+1.15,heroZ+.6,true);bottle(heroX-1.3,heroZ-.9,false);
  const gels=new THREE.MeshStandardMaterial({color:'#d9c9a3',roughness:.6});
  for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.11,.006,.05),gels);p.rotation.y=rand()*3;at(p,heroX-1.6+rand()*.4,.035,heroZ+.8+rand()*.3);}
  const towelMat=new THREE.MeshStandardMaterial({color:'#d8d0c2',roughness:1,side:THREE.DoubleSide});
  const towelGeo=new THREE.PlaneGeometry(.42,.78,6,16);{const p=towelGeo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i);p.setZ(i,-Math.pow(Math.abs(y)/.39,1.7)*.32+Math.sin(x*14+y*6)*.012);}towelGeo.computeVertexNormals();}
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
  const boardBack=new THREE.Mesh(new THREE.BoxGeometry(1.36,.96,.03),pale);boardBack.position.set(0,1.32,0);wb.add(boardBack);
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
    g.fillStyle='#8b8178';g.letterSpacing='0px';g.font=`italic 400 .17px ${SERIF}`;fitText(g,'Five published results, read as one loop. A KONA.m reading, not his words.',0,.72,9.1);
  },1536);
  loopTitle.position.set(ex0+4.6,3.4,BROOM.z0-.03);loopTitle.rotation.y=Math.PI;group.add(loopTitle);
  const exWash=lightPool(9.6,1.6,'#ffd2a6',lite?.05:.08);exWash.position.set(ex0+4.6,.02,BROOM.z0-.9);group.add(exWash);
  const exSpot=new THREE.SpotLight('#ffe0c0',lite?0:26,7,.75,.8,1.4);exSpot.position.set(ex0+4.6,BROOM.h-.4,BROOM.z0-2.2);exSpot.target.position.set(ex0+4.6,1.8,BROOM.z0);if(!lite)group.add(exSpot,exSpot.target);

  // ---------------------------------------------------------------- story wall (south, west of the link door)
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

  // ---------------------------------------------------------------- gear wall (south, east of the treadmill)
  wall(4.4,1.9,.5,25.4,.95,BROOM.z1+.4,new THREE.MeshStandardMaterial({color:'#1d1b1a',roughness:.82,metalness:.1,envMapIntensity:.15}));
  for(let i=0;i<4;i++)wall(4.2,.04,.46,25.4,.32+i*.46,BROOM.z1+.68,dark);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.3,32,18,0,Math.PI*2,0,Math.PI*.62),dark);helmet.scale.set(1.5,.75,1);helmet.position.set(24.2,1.98,BROOM.z1+.75);group.add(helmet);
  for(let i=0;i<3;i++){const shoe=new THREE.Mesh(new THREE.BoxGeometry(.28,.1,.11),i%2?pale:dark);shoe.position.set(25.6+i*.42,1.27,BROOM.z1+.72);group.add(shoe);}
  info(helmet,{eyebrow:'GEAR WALL',title:'Objects remember work.',sub:'Equipment · race objects · memory',text:'A working wall, not a shop wall. Athlete-specific equipment stays unlabelled until it is sourced.'});
  for(let i=0;i<6;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.03,.8,.03),i%2?pale:dark);rib.position.set(23.8+i*.5,3.1,BROOM.z1+.3);group.add(rib);const med=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.03,24),steel);med.rotation.x=Math.PI/2;med.position.set(23.8+i*.5,2.66,BROOM.z1+.3);group.add(med);}

  // ---------------------------------------------------------------- Zwift: "build this cave" (sourced, unofficial)
  const crate=new THREE.Group();crate.position.set(21.5,0,-8.0);crate.rotation.y=-.35;group.add(crate);
  const cardboard=new THREE.MeshStandardMaterial({color:'#8a6a48',roughness:.95});
  const box1=new THREE.Mesh(new THREE.BoxGeometry(.78,.5,.52),cardboard);box1.position.y=.25;crate.add(box1);
  const box2=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.4),cardboard);box2.position.set(.06,.65,.02);box2.rotation.y=.25;crate.add(box2);
  const label=lettering(.7,.3,g=>{g.fillStyle='#efe6d6';g.fillRect(0,0,.7,.3);g.fillStyle='#16181a';g.font=`800 .07px ${FONT}`;g.fillText('BUILD THIS CAVE',.04,.12);g.font=`500 .035px ${FONT}`;g.fillText('trainer · frame · controls',.04,.19);g.fillStyle='#b4541f';g.fillText('UNOFFICIAL · SOURCED 2026-09',.04,.25);},512);
  label.material.toneMapped=true;label.position.set(0,.3,.265);crate.add(label);
  info([box1,box2,label],{eyebrow:'BUILD THIS CAVE',title:'The hardware behind a room like this.',sub:'Zwift hardware · unofficial',text:'',model:()=>zwiftCard()});
  obstacles.push({c:crate.position.clone(),r:.6});

  // ---------------------------------------------------------------- archive: mirrors + swim erg (north-east)
  const mirrorMat=new THREE.MeshPhysicalMaterial({color:'#8d969c',metalness:.95,roughness:.06,envMapIntensity:.9,clearcoat:1,clearcoatRoughness:.08});
  for(let i=0;i<3;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.4),mirrorMat);p.rotation.y=Math.PI;p.position.set(22.8+i*1.7,1.6,BROOM.z0-.03);group.add(p);}
  const erg=new THREE.Group();erg.position.set(31.6,0,-6.0);group.add(erg);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(2.5,.2,.55),pale);bench.position.set(0,.68,0);erg.add(bench);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(2.85,.10,.14),steel);rail.position.set(-.05,.45,0);erg.add(rail);
  const mast=new THREE.Mesh(new THREE.BoxGeometry(.15,1.75,.15),steel);mast.position.set(1.18,1.3,0);mast.rotation.z=-.08;erg.add(mast);
  const efly=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.18,40),dark);efly.position.set(1.06,1.86,0);efly.rotation.x=Math.PI/2;erg.add(efly);
  info(efly,{eyebrow:'PAIN CAVE ARCHIVE',title:'The laboratory came first.',sub:'Archive · mirrors · swim erg',text:'Mirrors for form checks and a swim erg: the kind of indoor work a pain cave is known for. History of the idea, not a claim about any athlete’s current setup.'});
  obstacles.push({c:new THREE.Vector3(31.6,0,-6.0),r:1.5});

  // ---------------------------------------------------------------- recovery (south-east corner, by the link door)
  wall(2.4,.42,1.4,33.9,.21,-16.75,new THREE.MeshStandardMaterial({color:'#24201e',roughness:.96}));
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.72,24),dark);roller.rotation.z=Math.PI/2;roller.position.set(33.6,.16,-15.6);group.add(roller);
  info(roller,{eyebrow:'RESET',title:'Recovery is part of the work.',sub:'Reset · restore · return',text:'A quiet corner keeps recovery inside the same story rather than treating it as the opposite of training.'});
  obstacles.push({c:new THREE.Vector3(33.9,0,-16.75),r:.9});
  // the link door: a frame of ember light pulls you through to the next room
  const linkFrame=new THREE.Mesh(new THREE.BoxGeometry(BLINK.x1-BLINK.x0+.12,.04,.04),ember);linkFrame.position.set((BLINK.x0+BLINK.x1)/2,BLINK.h+.02,BROOM.z1+.02);group.add(linkFrame);
  const linkSign=lettering(2.2,.34,g=>{g.fillStyle='#8b8178';g.font=`700 .09px ${FONT}`;g.letterSpacing='.06px';fitText(g,'THROUGH HERE · BREITLING · ENDURANCE PRO',0,.2,2.18);},768);
  linkSign.position.set((BLINK.x0+BLINK.x1)/2,BLINK.h+.32,BROOM.z1+.03);group.add(linkSign);

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
      facts:[{cls:'G',text:'Route art, HUD and terrain are drawn by KONA.m. No Zwift screens, routes or marks are reproduced.'}],
      actions:[{label:'Ride it →',primary:true,onClick:()=>act.ride()},{label:'Keep walking',onClick:()=>act.close()}]};
  }
  function machineCard(act){
    return {kind:'beast',eyebrow:'THE MACHINE · EMPTY SADDLE',title:'The place where excuses get boring.',kicker:'Speedmax CFR · direct-drive trainer · two fans',
      lede:'Nobody is here. That is the point: the saddle is open. Climb on and hold one 60-second interval inside a moving power band — tap or hold to push.',
      stats:[{value:'60 s',label:'interval'},{value:'4',label:'power bands'},{value:'240–385',label:'watts'}],
      facts:[{cls:'I',text:'The bike is the KONA.m Speedmax CFR study — not presented as Lionel Sanders’ race build.'},{cls:'G',text:'Trainer, fans and room are original KONA.m geometry.'}],
      actions:[{label:'Ride →',primary:true,onClick:()=>act.ride()},{label:'Keep walking',onClick:()=>act.close()}]};
  }
  function zwiftCard(){
    const items=zwiftRoom.products.slice(0,4);
    return {kind:'beast',eyebrow:'BUILD THIS CAVE · UNOFFICIAL',title:'The hardware behind a room like this.',kicker:'Zwift hardware · prices source-dated',
      lede:'A smart trainer, a frame or bundle, and a way to steer and shift. Prices are from Zwift’s EU store on the date shown and change; check before you buy.',
      stats:items.slice(0,3).map(p=>({value:`€${Math.round(p.current_eu_price_eur)}`,label:p.name.replace(/^Wahoo /,'')})),
      facts:[...items.map(p=>({cls:'P',text:`${p.name} — €${p.current_eu_price_eur} (EU store, ${p.freshness}).`})),
        {cls:'I',text:zwiftRoom.disclaimer}],
      notes:[{summary:'No affiliate links',text:'The Zwift affiliate programme exists but is not approved for KONA.m, so these links go to Zwift’s own pages and earn nothing.'}],
      actions:items.slice(0,2).map(p=>({label:`${p.name.split(' with ')[0]} ↗`,href:p.source}))};
  }

  // ---------------------------------------------------------------- the visitor in the saddle
  function startRide(){ ride={iv:createInterval(),holding:false}; return ride; }
  function stopRide(){ const r=ride; ride=null; return r?r.iv.result():null; }

  return {
    group,floor,sign,bikeSpot,infos,mood:BEAST_MOOD,
    get ride(){return ride;},
    startRide,stopRide,
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
