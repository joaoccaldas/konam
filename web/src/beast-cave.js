// Beast Cave — native KONA.m athlete room.
// Same architecture as Lava Night / Sanctuary: one room module built into landing.js,
// shared renderer, camera, cards, pickables, obstacles, map, route, quality and loading.
import * as THREE from 'three';

export const BROOM = { x0: 7.35, x1: 35.35, z0: -4.0, z1: -26.0, h: 5.4 };
export const BDOOR = { z0: -12.2, z1: -9.0, h: 3.4 };

export function beastCaveWalkable(x, z, WALK) {
  const inDoor = x > WALK.x1 - .1 && x < BROOM.x0 + .75 && z < BDOOR.z1 - .35 && z > BDOOR.z0 + .35;
  const inRoom = x > BROOM.x0 + .55 && x < BROOM.x1 - .55 && z < BROOM.z0 - .55 && z > BROOM.z1 + .55;
  return inDoor || inRoom;
}

export function buildBeastCave(ctx) {
  const { scene, canvasTex, lettering, lightPool, basaltTex, FONT, SERIF, lite, coarse, pickables, obstacles, hallWallX } = ctx;
  const group = new THREE.Group(); group.name = 'beastCaveRoom'; scene.add(group);
  const RW = BROOM.x1 - BROOM.x0, RD = BROOM.z0 - BROOM.z1;
  const CX = (BROOM.x0 + BROOM.x1) / 2, CZ = (BROOM.z0 + BROOM.z1) / 2;
  const at = (o,x,y,z) => { o.position.set(x,y,z); group.add(o); return o; };

  const basalt = basaltTex.clone(); basalt.repeat.set(RW/2.4,RD/2.4); basalt.needsUpdate = true;
  const floorMat = new THREE.MeshStandardMaterial({ map: basalt, color:'#252223', roughness:.72, metalness:.04, envMapIntensity:.45 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(RW,.16,RD),floorMat);
  floor.position.set(CX,-.08,CZ); floor.receiveShadow=true; floor.userData.floor=true; group.add(floor);

  const concrete = canvasTex(512,512,(g,w,h)=>{
    g.fillStyle='#312d2a';g.fillRect(0,0,w,h);
    for(let i=0;i<1700;i++){const v=52+Math.random()*35;g.fillStyle=`rgba(${v},${v-3},${v-6},${.04+Math.random()*.08})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}
    g.strokeStyle='rgba(235,220,205,.035)';for(let y=90;y<h;y+=120){g.beginPath();g.moveTo(0,y);g.lineTo(w,y+8);g.stroke();}
  },[6,4]);
  const wallMat = new THREE.MeshStandardMaterial({map:concrete,color:'#5b524c',roughness:.93,envMapIntensity:.28});
  const dark = new THREE.MeshStandardMaterial({color:'#111214',roughness:.62,metalness:.18});
  const steel = new THREE.MeshStandardMaterial({color:'#35383b',roughness:.32,metalness:.72});
  const pale = new THREE.MeshStandardMaterial({color:'#ded5c8',roughness:.86});
  const wall=(w,h,d,x,y,z,mat=wallMat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=!lite;group.add(m);return m;};

  wall(RW,BROOM.h,.28,CX,BROOM.h/2,BROOM.z0+.14);
  wall(RW,BROOM.h,.28,CX,BROOM.h/2,BROOM.z1-.14);
  wall(.28,BROOM.h,RD,BROOM.x1+.14,BROOM.h/2,CZ);
  // west wall, sharing the hall glass line, with the doorway cut out
  wall(.28,BROOM.h,BROOM.z0-BDOOR.z1,BROOM.x0-.14,BROOM.h/2,(BROOM.z0+BDOOR.z1)/2);
  wall(.28,BROOM.h,BDOOR.z0-BROOM.z1,BROOM.x0-.14,BROOM.h/2,(BDOOR.z0+BROOM.z1)/2);
  wall(.28,BROOM.h-BDOOR.h,BDOOR.z1-BDOOR.z0,BROOM.x0-.14,BDOOR.h+(BROOM.h-BDOOR.h)/2,(BDOOR.z0+BDOOR.z1)/2);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW,.12,RD),new THREE.MeshStandardMaterial({color:'#151515',roughness:.84}));
  ceil.position.set(CX,BROOM.h+.06,CZ);group.add(ceil);
  const cove = new THREE.MeshBasicMaterial({color:'#ff6a00',transparent:true,opacity:lite?.22:.46,toneMapped:false,fog:false});
  for(const z of [BROOM.z0-.01,BROOM.z1+.01]){const p=new THREE.Mesh(new THREE.PlaneGeometry(RW-1.2,.05),cove);p.position.set(CX,BROOM.h-.28,z);p.rotation.y=z===BROOM.z0?Math.PI:0;group.add(p);}

  // same room-lighting pattern as WYLD: one fill, small accent lights only off lite.
  const fill=new THREE.PointLight('#f2e2d4',lite?18:14,30,1.25);fill.position.set(CX,BROOM.h-.6,CZ);group.add(fill);
  if(!lite){
    for(const [x,z,color,i,dist] of [
      [15,-13,'#ffb06f',8,12],[31,-13,'#78a9e6',7,12],[28,-20,'#ffd0aa',5,10]
    ]){const l=new THREE.PointLight(color,i,dist,1.5);l.position.set(x,3.0,z);group.add(l);}
  }

  const sign=lettering(4.6,.9,g=>{
    g.fillStyle='#12181d';g.font=`700 .14px ${FONT}`;g.letterSpacing='.06px';g.fillText('LIONEL SANDERS · BEAST CAVE',0,.28);
    g.fillStyle='#b4541f';g.font=`italic 400 .25px ${SERIF}`;g.letterSpacing='0px';g.fillText('The work nobody sees.',0,.69);
  },1024);
  sign.position.set(hallWallX+.02,BDOOR.h+.75,(BDOOR.z0+BDOOR.z1)/2+.2);sign.rotation.y=-Math.PI/2;

  const infos=[];
  const info=(mesh,eyebrow,title,sub,text)=>{
    const rec={eyebrow,title,sub,text};mesh.userData.info=rec;pickables.push(mesh);infos.push(rec);return rec;
  };

  // hero trainer station
  const heroX=15.2, heroZ=-13.3;
  const matPad=new THREE.Mesh(new THREE.BoxGeometry(6.6,.04,3.0),new THREE.MeshStandardMaterial({color:'#090a0b',roughness:1}));
  at(matPad,heroX,.02,heroZ);
  const trainer=new THREE.Group();trainer.position.set(heroX,.24,heroZ+.9);group.add(trainer);
  const tbox=(n,s,p,m=steel,r=[0,0,0])=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.name=n;o.position.set(...p);o.rotation.set(...r);o.castShadow=!lite;trainer.add(o);return o;};
  tbox('trainer-base',[1.5,.10,.30],[0,0,0]);
  tbox('trainer-leg-l',[.12,.09,.92],[-.62,-.01,0],steel,[0,.55,0]);
  tbox('trainer-leg-r',[.12,.09,.92],[.62,-.01,0],steel,[0,-.55,0]);
  const fly=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.22,40),dark);fly.rotation.x=Math.PI/2;fly.position.set(0,.34,0);trainer.add(fly);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.34,24),steel);hub.rotation.x=Math.PI/2;hub.position.set(0,.42,0);trainer.add(hub);
  info(fly,'THE MACHINE','The place where excuses get boring.','Bike · trainer · screen · airflow','The bike, trainer, screen, airflow and data collapse the room into one repeatable loop. Zwift is the companion. Kona stays ahead.');
  obstacles.push({c:new THREE.Vector3(heroX,0,heroZ),r:1.75});

  const bikeSpot={kind:'beast',pos:new THREE.Vector3(heroX,0,heroZ),rotY:Math.PI/2,bike:null};
  bikeSpot.view=new THREE.Vector3(heroX-4.0,0,heroZ+1.0+(coarse&&innerHeight>innerWidth?.8:0));
  bikeSpot.face=new THREE.Vector3(heroX,1.15,heroZ);
  bikeSpot.info={eyebrow:'THE MACHINE',title:'Speedmax CFR',sub:'Current KONA.m authored study',text:'The room uses the existing KONA.m Speedmax CFR asset as the hero machine. It is not presented as Lionel Sanders’ exact component build unless separately sourced.'};

  // training screen on east wall
  const screenTex=canvasTex(1024,576,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#18334e');gr.addColorStop(.55,'#355d7d');gr.addColorStop(1,'#141b22');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#17261e';g.beginPath();g.moveTo(0,h*.62);g.lineTo(w*.25,h*.38);g.lineTo(w*.43,h*.62);g.lineTo(w*.63,h*.31);g.lineTo(w,h*.58);g.lineTo(w,h);g.lineTo(0,h);g.fill();
    g.fillStyle='#555';g.beginPath();g.moveTo(w*.36,h);g.lineTo(w*.49,h*.61);g.lineTo(w*.57,h*.61);g.lineTo(w*.70,h);g.fill();
    g.fillStyle='rgba(7,9,12,.72)';g.fillRect(34,34,260,205);g.fillStyle='#fff';g.font='700 58px Arial';g.fillText('312 W',58,105);g.font='500 35px Arial';g.fillText('142 BPM',58,160);g.fillText('01:12:06',58,210);
    g.fillStyle='#ff6a00';g.font='700 38px Arial';g.textAlign='right';g.fillText('FLOW',w-42,74);
  });
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(7.8,4.35),new THREE.MeshBasicMaterial({map:screenTex,toneMapped:false}));
  screen.rotation.y=-Math.PI/2;screen.position.set(BROOM.x1-.02,3.0,-13.5);group.add(screen);
  info(screen,'SCIENCE LAB','Control the variables.','Data · repeatability · heat','A controlled room makes the work measurable. The display is an original KONA.m training visualization, not a copied Zwift screen.');

  // treadmill / run station
  const treadmill=new THREE.Group();treadmill.position.set(25.2,0,-18.7);treadmill.rotation.y=-Math.PI/2;group.add(treadmill);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(2.9,.18,.86),dark);deck.position.set(0,.15,0);treadmill.add(deck);
  for(const x of [-1.2,1.2]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.7,24),steel);r.rotation.x=Math.PI/2;r.position.set(x,.21,0);treadmill.add(r);}
  for(const z of [-.39,.39]){const p=new THREE.Mesh(new THREE.BoxGeometry(.09,1.3,.09),steel);p.position.set(.92,.83,z);p.rotation.z=-.15;treadmill.add(p);}
  const console=new THREE.Mesh(new THREE.BoxGeometry(.5,.32,.78),dark);console.position.set(.73,1.56,0);treadmill.add(console);
  info(console,'RUN LAB','Same cave, different suffering.','Run · form · repeat','The run station keeps the training loop inside one environment. The current treadmill is a KONA.m geometry study and will be replaced by a sourced production asset.');
  obstacles.push({c:new THREE.Vector3(25.2,0,-18.7),r:1.7});

  // documented pain-cave archive: mirrors + swim erg study
  const mirrorMat=new THREE.MeshPhysicalMaterial({color:'#9ca6ad',metalness:.92,roughness:.08,envMapIntensity:1.5,clearcoat:1,clearcoatRoughness:.08});
  for(let i=0;i<3;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.5),mirrorMat);p.rotation.y=Math.PI;p.position.set(29+i*2.1,2.25,BROOM.z0+.02);group.add(p);}
  const erg=new THREE.Group();erg.position.set(30.0,0,-7.3);group.add(erg);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(2.7,.22,.62),pale);bench.position.set(0,.72,0);erg.add(bench);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(3.05,.10,.14),steel);rail.position.set(-.05,.47,0);erg.add(rail);
  const mast=new THREE.Mesh(new THREE.BoxGeometry(.16,1.85,.16),steel);mast.position.set(1.28,1.36,0);mast.rotation.z=-.08;erg.add(mast);
  const efly=new THREE.Mesh(new THREE.CylinderGeometry(.47,.47,.20,40),dark);efly.position.set(1.15,1.95,0);efly.rotation.x=Math.PI/2;erg.add(efly);
  info(efly,'PAIN CAVE ARCHIVE','The laboratory came first.','Archive · mirrors · swim erg','The archive layer references publicly documented earlier pain-cave habits: indoor bike work, treadmill running, mirrors for form checks and swim-erg training. It is history, not a claim about his current 2026 setup.');
  obstacles.push({c:new THREE.Vector3(30,0,-7.3),r:1.7});

  // gear wall
  wall(7.0,2.0,.65,28.0,1.0,BROOM.z1+.5,new THREE.MeshStandardMaterial({color:'#242220',roughness:.82,metalness:.1}));
  for(let i=0;i<4;i++)wall(6.8,.05,.58,28.0,.35+i*.47,BROOM.z1+.84,dark);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.44,32,18,0,Math.PI*2,0,Math.PI*.66),dark);helmet.scale.set(1.2,.82,1);helmet.position.set(25.4,1.7,BROOM.z1+1.15);group.add(helmet);
  info(helmet,'GEAR WALL','Objects remember work.','Equipment · race objects · memory','The gear wall is deliberately a working memory, not a shop wall. Exact athlete-specific equipment remains unlabelled until sourced.');
  for(let i=0;i<6;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.035,.9,.035),i%2?pale:dark);rib.position.set(27+i*.55,3.2,BROOM.z1+.9);group.add(rib);const med=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.035,24),steel);med.rotation.x=Math.PI/2;med.position.set(27+i*.55,2.72,BROOM.z1+.88);group.add(med);}

  // recovery corner
  wall(4.6,.46,1.65,18.8,.3,BROOM.z1+1.4,new THREE.MeshStandardMaterial({color:'#2a2522',roughness:.96}));
  wall(4.6,1.2,.34,18.8,.92,BROOM.z1+.65,new THREE.MeshStandardMaterial({color:'#2a2522',roughness:.96}));
  const roller=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.8,24),dark);roller.rotation.z=Math.PI/2;roller.position.set(21.4,.2,BROOM.z1+3.3);group.add(roller);
  info(roller,'RESET','Recovery is part of the work.','Reset · restore · return','A quieter corner keeps recovery inside the same story rather than treating it as the opposite of training.');

  // original sculptures: same pattern as themed-room installations, built into the room.
  const stone=new THREE.MeshStandardMaterial({map:basaltTex,color:'#57504a',roughness:.95});
  const gap=new THREE.Group();gap.position.set(10.4,0,-20.8);group.add(gap);
  for(const x of [-.62,.62]){const s=new THREE.Mesh(new THREE.BoxGeometry(.95,3.1,.85),stone);s.position.set(x,1.55,0);s.rotation.z=x<0?.09:-.09;gap.add(s);}
  const slit=new THREE.Mesh(new THREE.BoxGeometry(.07,2.7,.05),new THREE.MeshBasicMaterial({color:'#ff6a00',toneMapped:false}));slit.position.set(0,1.48,-.46);gap.add(slit);
  info(slit,'THE GAP','Almost is still information.','Original KONA.m sculpture','Two basalt forms separated by one unresolved line. Some stories are more useful when they stay open.');

  const repeat=new THREE.Group();repeat.position.set(11.4,1.55,-6.0);repeat.rotation.y=.45;group.add(repeat);
  for(const [i,r] of [1.05,.78,.51,.26].entries()){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.05,10,44),i===3?new THREE.MeshBasicMaterial({color:'#ff6a00',toneMapped:false}):dark);repeat.add(ring);}
  info(repeat.children[0],'REPEAT','Same circle. Different athlete.','Original KONA.m sculpture','Repetition becomes useful only when the feedback changes what happens next.');

  // story wall
  const story=lettering(6.4,2.8,g=>{
    g.fillStyle='#ff6a00';g.fillRect(.12,.12,.45,.04);
    g.fillStyle='#eee5d9';g.font=`700 .18px ${FONT}`;g.letterSpacing='.04px';g.fillText('EXPERIMENT → MISS → INSPECT → ADAPT → RETURN',.12,.42);
    g.fillStyle='#eee5d9';g.font=`italic 400 .42px ${SERIF}`;g.fillText('Not a trophy room.',.12,1.1);
    g.fillText('A room for the work nobody sees.',.12,1.62);
    g.fillStyle='#948b82';g.font=`500 .10px ${FONT}`;g.fillText('KONA.M · ATHLETE ROOM',.12,2.25);
  },1024);
  story.position.set(21.5,2.75,BROOM.z0-.02);story.rotation.y=Math.PI;group.add(story);

  const fans=[];
  for(let j=0;j<2;j++){
    const fan=new THREE.Group();fan.position.set(21+j*2.0,1.0,-10.0+j*.5);fan.rotation.y=-.7;group.add(fan);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.62,.06,10,36),dark);fan.add(rim);
    const hub2=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.18,18),steel);hub2.rotation.x=Math.PI/2;fan.add(hub2);
    for(let i=0;i<6;i++){const a=i*Math.PI/3,b=new THREE.Mesh(new THREE.BoxGeometry(.10,.38,.035),steel);b.position.set(Math.cos(a)*.22,Math.sin(a)*.22,0);b.rotation.z=a;fan.add(b);}
    fans.push(fan);obstacles.push({c:new THREE.Vector3(fan.position.x,0,fan.position.z),r:.75});
  }

  // small floor glow at the hero station, same cheap additive convention as existing rooms.
  const heroGlow=lightPool(6.8,4.4,'#ff6a00',lite?.035:.07);heroGlow.position.set(heroX,.012,heroZ);group.add(heroGlow);

  return {
    group,floor,sign,bikeSpot,infos,
    setBike(bike,dress){
      bike.traverse(o=>{if(!o.isMesh)return;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.userData.info=bikeSpot.info;o.castShadow=!lite;delete o.userData.piece;pickables.push(o);});
      dress?.(bike);
      const rear=bike.getObjectByName('wheel_rear')||[...bike.children].find(c=>c.userData?.part==='wheel_rear');
      if(rear) rear.visible=false;
      const box=new THREE.Box3().setFromObject(bike),c=box.getCenter(new THREE.Vector3());
      bike.position.set(-c.x,-box.min.y,-c.z);
      const holder=new THREE.Group();holder.add(bike);holder.rotation.y=bikeSpot.rotY;holder.position.set(heroX,.34,heroZ);group.add(holder);bikeSpot.bike=holder;
    },
    update(t,reduce){
      if(!reduce) for(const [i,f] of fans.entries()) f.rotation.z=Math.sin(t*.45+i)*.025;
      if(!reduce) heroGlow.material.opacity=.06+Math.sin(t*.7)*.012;
    }
  };
}
