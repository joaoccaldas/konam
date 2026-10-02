// rooms/beast-cave-story-wing.js
// Narrative expansion for the unwired Lionel Sanders Beast Cave prototype.
// Procedural/original geometry only. No copied race photography or athlete likeness.
// Race/story beats are sourced in the companion prototype contract/docs.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const LAVA = '#ff6a2a';
const DARK = '#121212';
const PAPER = '#e9e0d3';

const m = (color, roughness=.8, metalness=0) =>
  new THREE.MeshStandardMaterial({color, roughness, metalness});

const addPickable = (pickables, object, hotspot, label) => {
  object.traverse(o => {
    if (!o.isMesh) return;
    o.userData.beastCave = {hotspot, label};
    pickables?.push?.(o);
  });
};

const obstacle = (obstacles,x,z,r) => obstacles?.push?.({c:new THREE.Vector3(x,0,z),r});

function tex(w,h,paint){
  const c=document.createElement('canvas'); c.width=w;c.height=h;
  const g=c.getContext('2d'); paint(g,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}

function panelTexture({kicker='',title='',sub='',style='editorial',year=''}) {
  return tex(1000,1300,(g,w,h)=>{
    const bg = style==='manga' ? '#ece6dc' : style==='blueprint' ? '#14202a' : style==='sketch' ? '#d9d0c3' : '#111111';
    const fg = style==='manga' ? '#161616' : style==='blueprint' ? '#dce9ef' : style==='sketch' ? '#26211d' : '#eee5d9';
    g.fillStyle=bg;g.fillRect(0,0,w,h);

    if(style==='manga'){
      g.strokeStyle='#1a1a1a';g.lineWidth=4;
      for(let i=0;i<36;i++){const y=150+i*28;g.beginPath();g.moveTo(40,y);g.lineTo(w-40,y-(i%3)*18);g.stroke();}
      g.fillStyle='rgba(255,106,42,.12)';g.beginPath();g.arc(w*.72,h*.36,250,0,Math.PI*2);g.fill();
    } else if(style==='blueprint'){
      g.strokeStyle='rgba(220,233,239,.13)';g.lineWidth=1;
      for(let x=0;x<w;x+=50){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
      for(let y=0;y<h;y+=50){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
      g.strokeStyle='rgba(255,106,42,.7)';g.lineWidth=3;g.strokeRect(70,230,w-140,540);
    } else if(style==='sketch'){
      g.strokeStyle='rgba(40,32,27,.23)';
      for(let i=0;i<90;i++){g.beginPath();g.moveTo(Math.random()*w,Math.random()*h);g.lineTo(Math.random()*w,Math.random()*h);g.stroke();}
    } else {
      const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'rgba(255,255,255,.04)');gr.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=gr;g.fillRect(0,0,w,h);
    }

    // Original race study, not a portrait reproduction.
    g.save(); g.translate(w*.52,h*.49);
    const ink=style==='manga'?'#151515':style==='sketch'?'#504840':'#080808';
    g.strokeStyle=ink; g.fillStyle=ink; g.lineCap='round'; g.lineJoin='round';
    if(style==='blueprint'){
      g.lineWidth=8;
      const wx1=-250,wx2=230,wy=130,r=115;
      g.beginPath();g.arc(wx1,wy,r,0,Math.PI*2);g.arc(wx2,wy,r,0,Math.PI*2);g.stroke();
      g.beginPath();g.moveTo(wx1,wy);g.lineTo(-45,wy-40);g.lineTo(115,wy);g.lineTo(-35,-40);g.lineTo(wx1,wy);g.moveTo(-45,wy-40);g.lineTo(-35,-40);g.lineTo(150,-55);g.lineTo(230,wy);g.stroke();
      g.lineWidth=16;g.beginPath();g.moveTo(-25,-95);g.lineTo(95,-80);g.lineTo(165,-30);g.stroke();
      g.beginPath();g.arc(-40,-155,42,0,Math.PI*2);g.fill();
      g.lineWidth=13;g.beginPath();g.moveTo(-10,-115);g.lineTo(80,-15);g.moveTo(5,-85);g.lineTo(-80,-25);g.stroke();
    } else {
      if(style==='manga'){
        g.strokeStyle='rgba(25,25,25,.45)';g.lineWidth=5;
        for(let i=0;i<18;i++){g.beginPath();g.moveTo(-420+i*18,-260+i*8);g.lineTo(340-i*7,270-i*10);g.stroke();}
        g.strokeStyle=ink;
      }
      // runner: angled torso, bent arms and split stride
      g.beginPath();g.arc(-35,-190,52,0,Math.PI*2);g.fill();
      g.beginPath();g.moveTo(-85,-125);g.lineTo(45,-140);g.lineTo(95,35);g.lineTo(-30,85);g.lineTo(-115,-20);g.closePath();g.fill();
      g.lineWidth=32;
      g.beginPath();g.moveTo(-55,-80);g.lineTo(-180,5);g.lineTo(-110,100);g.stroke();
      g.beginPath();g.moveTo(20,-85);g.lineTo(150,-20);g.lineTo(95,80);g.stroke();
      g.lineWidth=42;
      g.beginPath();g.moveTo(-5,70);g.lineTo(-150,235);g.lineTo(-255,300);g.stroke();
      g.beginPath();g.moveTo(55,58);g.lineTo(175,205);g.lineTo(275,230);g.stroke();
      g.fillStyle=style==='editorial'?LAVA:ink;g.fillRect(-10,-25,58,45);
    }
    g.restore();

    g.fillStyle=LAVA;g.fillRect(70,68,84,9);
    g.fillStyle=fg;g.font='500 28px Arial';g.letterSpacing='5px';g.fillText(kicker.toUpperCase(),70,125);
    g.font='700 64px Arial';g.fillText(title,70,1000);
    g.font='italic 34px Georgia';
    const words=sub.split(' ');let line='',yy=1065;
    for(const word of words){const test=line+word+' ';if(g.measureText(test).width>820){g.fillText(line,70,yy);line=word+' ';yy+=44;}else line=test;}
    g.fillText(line,70,yy);
    if(year){g.textAlign='right';g.font='700 34px Arial';g.fillText(year,w-70,125);}
  });
}

function makePanel(data,w=1.75,h=2.25){
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:panelTexture(data),toneMapped:false}));
}

function buildTreadmill(group,obstacles,pickables){
  const metal=m('#2f3031',.38,.72),rubber=m('#0e0e0e',.92),screen=m('#111111',.35,.35);
  const treadmill=new THREE.Group();treadmill.name='RUN_LAB_TREADMILL';treadmill.position.set(9.1,0,1.0);treadmill.rotation.y=-Math.PI/2;group.add(treadmill);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(2.75,.18,.82),rubber);deck.position.set(0,.14,0);treadmill.add(deck);
  for(const x of [-1.15,1.12]){const roller=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.70,24),metal);roller.rotation.x=Math.PI/2;roller.position.set(x,.20,0);treadmill.add(roller);}
  for(const z of [-.38,.38]){const post=new THREE.Mesh(new THREE.BoxGeometry(.09,1.25,.09),metal);post.position.set(.9,.8,z);post.rotation.z=-.16;treadmill.add(post);}
  const bar=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.88),metal);bar.position.set(.75,1.36,0);treadmill.add(bar);
  const console=new THREE.Mesh(new THREE.BoxGeometry(.46,.30,.76),screen);console.position.set(.70,1.52,0);console.rotation.z=-.1;treadmill.add(console);
  addPickable(pickables,treadmill,'run-lab','Treadmill / run lab');
  obstacle(obstacles,9.1,1.0,1.7);
  return treadmill;
}

function buildIterationsGallery(group,pickables){
  const frames=[
    {kicker:'CHAPTER 01',title:'LEARN THE SYSTEM',sub:'Early years: build the engine, expose the weaknesses, keep moving.',style:'sketch',year:'2014–16'},
    {kicker:'KONA',title:'SO CLOSE',sub:'2017: second in Kona after leading much of the marathon. A huge day and an unfinished question.',style:'editorial',year:'2017'},
    {kicker:'ITERATION',title:'BACK TO THE LAB',sub:'Bad days become information. Training becomes more controlled, measured and deliberate.',style:'blueprint',year:'2018–23'},
    {kicker:'REALITY',title:'ADAPT AGAIN',sub:'Recovery, age, health and context are inputs. Acknowledge reality, then build from it.',style:'manga',year:'2024–26'}
  ];
  const wallZ=10.72;
  frames.forEach((f,i)=>{
    const p=makePanel(f,1.9,2.45);p.position.set(-3.5+i*2.35,2.85,wallZ);p.rotation.y=Math.PI;group.add(p);
    addPickable(pickables,p,'iterations-gallery',f.title);
  });
}

function buildSculptures(group,pickables){
  const black=m('#111111',.42,.25),stone=m('#57504a',.95),orange=new THREE.MeshStandardMaterial({color:'#27150d',roughness:.65,emissive:new THREE.Color(LAVA),emissiveIntensity:.32});
  // "The Gap": two basalt monoliths separated by a narrow line of orange light.
  const gap=new THREE.Group();gap.name='SCULPTURE_THE_GAP';gap.position.set(-10.0,0,5.0);group.add(gap);
  for(const x of [-.62,.62]){const s=new THREE.Mesh(new THREE.BoxGeometry(.95,3.1,.85),stone);s.position.set(x,1.55,0);s.rotation.z=x<0?.09:-.09;gap.add(s);}
  const slit=new THREE.Mesh(new THREE.BoxGeometry(.08,2.7,.06),orange);slit.position.set(0,1.48,-.46);gap.add(slit);
  addPickable(pickables,gap,'sculpture-gap','The Gap');

  // "Repeat": concentric trainer/flywheel rings.
  const repeat=new THREE.Group();repeat.name='SCULPTURE_REPEAT';repeat.position.set(-9.6,1.5,-6.8);repeat.rotation.y=.55;group.add(repeat);
  [1.1,.82,.54,.28].forEach((r,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.055,12,48),i===3?orange:black);repeat.add(ring);});
  addPickable(pickables,repeat,'sculpture-repeat','Repeat');

  // "Silver lining": a fractured dark sphere with one bright ring.
  const silver=new THREE.Group();silver.name='SCULPTURE_SILVER_LINING';silver.position.set(-10.2,1.35,6.7);group.add(silver);
  const halves=[];
  for(const sx of [-1,1]){const s=new THREE.Mesh(new THREE.SphereGeometry(.68,24,16,0,Math.PI*2,0,Math.PI),black);s.scale.x=.82;s.position.x=sx*.18;halves.push(s);silver.add(s);}
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.88,.035,10,48),orange);halo.rotation.x=Math.PI/2;silver.add(halo);
  addPickable(pickables,silver,'sculpture-silver','Silver lining');
}

function buildNotesWall(group,pickables){
  const t=tex(1400,900,(g,w,h)=>{
    g.fillStyle='#2b2927';g.fillRect(0,0,w,h);
    g.fillStyle='#dfd4c6';g.font='italic 68px Georgia';g.fillText('experiment → miss → inspect → adapt → return',70,150);
    g.strokeStyle='#7e746a';g.lineWidth=2;
    const notes=[
      ['swim',150,330],['bike',430,300],['run',690,360],['heat',930,285],['fuel',1130,380],
      ['recovery',230,650],['data',520,620],['reality',790,690],['KONA',1100,610]
    ];
    g.font='500 42px Arial';
    for(const [s,x,y] of notes){g.strokeRect(x-45,y-70,180,110);g.fillText(s,x,y);}
    g.strokeStyle=LAVA;g.lineWidth=5;g.beginPath();g.moveTo(130,205);g.bezierCurveTo(380,250,850,160,1250,215);g.stroke();
  });
  const p=new THREE.Mesh(new THREE.PlaneGeometry(5.4,3.2),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
  p.position.set(-6.1,2.65,-10.76);group.add(p);addPickable(pickables,p,'notes-wall','Iteration notes');
}

function buildHumour(group,pickables){
  const t=tex(700,500,(g,w,h)=>{
    g.fillStyle='#f0e7d8';g.fillRect(0,0,w,h);
    g.fillStyle='#151515';g.font='700 52px Arial';g.fillText('TODAY\'S PLAN',48,82);
    g.font='italic 36px Georgia';
    ['1. show up','2. do the work','3. overthink it','4. simplify it','5. repeat'].forEach((s,i)=>g.fillText(s,54,158+i*61));
    g.fillStyle=LAVA;g.fillRect(48,h-50,w-96,8);
  });
  const p=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.25),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
  p.position.set(12.9,2.15,7.1);p.rotation.y=-Math.PI/2;group.add(p);addPickable(pickables,p,'humour-board','Today\'s plan');
}


function buildPainCaveArchive(group,obstacles,pickables){
  const steel=m('#2a2b2c',.34,.72),dark=m('#121212',.68,.15),pad=m('#3d3935',.92),mirror=m('#8d969e',.08,.92);

  // Mirror bank: a documented habit from Sanders' earlier pain-cave setup for front/side form checks.
  for(let i=0;i<3;i++){
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(1.75,2.45),new THREE.MeshPhysicalMaterial({color:'#9aa4aa',metalness:.92,roughness:.08,envMapIntensity:1.6,clearcoat:1,clearcoatRoughness:.08}));
    pane.position.set(13.80,2.25,-7.8+i*2.05); pane.rotation.y=-Math.PI/2; group.add(pane);
  }

  // VASA-style swim erg study: bench, mast, flywheel and paired cable handles.
  const erg=new THREE.Group();erg.name='SWIM_ERG_ARCHIVE';erg.position.set(9.4,0,-8.0);erg.rotation.y=-.08;group.add(erg);
  const bench=new THREE.Mesh(new THREE.BoxGeometry(2.7,.22,.62),pad);bench.position.set(0,.72,0);erg.add(bench);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(3.05,.10,.14),steel);rail.position.set(-.05,.47,0);erg.add(rail);
  const mast=new THREE.Mesh(new THREE.BoxGeometry(.16,1.85,.16),steel);mast.position.set(1.28,1.36,0);mast.rotation.z=-.08;erg.add(mast);
  const fly=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.20,40),dark);fly.position.set(1.15,1.95,0);fly.rotation.x=Math.PI/2;erg.add(fly);
  for(const side of [-1,1]){
    const cable=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.55,8),steel);
    cable.position.set(.35,1.64,side*.34); cable.rotation.z=Math.PI*.42;erg.add(cable);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.24,12),dark);
    grip.position.set(-.28,1.11,side*.48); grip.rotation.z=Math.PI/2;erg.add(grip);
  }
  addPickable(pickables,erg,'swim-erg','Swim-erg archive');
  obstacle(obstacles,9.4,-8.0,1.8);

  const tag=makeArchiveTag();
  tag.position.set(12.5,3.6,-8.95);tag.rotation.y=-Math.PI/2;group.add(tag);
}

function makeArchiveTag(){
  const t=tex(900,520,(g,w,h)=>{
    g.fillStyle='#151515';g.fillRect(0,0,w,h);
    g.fillStyle=LAVA;g.fillRect(55,55,65,7);
    g.fillStyle='#eee5d9';g.font='700 44px Arial';g.fillText('PAIN CAVE ARCHIVE',55,130);
    g.fillStyle='#a9a097';g.font='500 25px Arial';g.fillText('DOCUMENTED SETUP · 2019',55,176);
    g.fillStyle='#d8cfc3';g.font='italic 30px Georgia';
    g.fillText('Bike. Run. Swim. Mirrors. Data.',55,280);
    g.fillText('The room was always a laboratory.',55,330);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(2.25,1.30),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
}

export function buildBeastCaveStoryWing({group,lite=false,pickables=[],obstacles=[]}={}){
  if(!group) throw new Error('buildBeastCaveStoryWing requires group');
  buildTreadmill(group,obstacles,pickables);
  buildIterationsGallery(group,pickables);
  buildSculptures(group,pickables);
  buildNotesWall(group,pickables);
  buildHumour(group,pickables);
  buildPainCaveArchive(group,obstacles,pickables);

  return {
    id:'beast-cave-story-wing',
    zones:['run-lab','swim-erg','pain-cave-archive','iterations-gallery','sculpture-gap','sculpture-repeat','sculpture-silver','notes-wall','humour-board'],
    lite
  };
}
