import * as THREE from 'three';
import {BIKE} from './data.js';
import {DEFAULT_AIR,STOCK,active,signature,parseCurve,compare,forces} from './aero.mjs';
const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x));
const names={rearDisc:'Rear disc',shield:'AeroShield',aerofuel:'Fuel tray',frontBottle:'Front bottle',rearBottles:'Rear bottles'};
export function makeLab({getCfg,setCfg,enter,leave,download,onResult}) {
 const state={env:{...DEFAULT_AIR,mass:84.1},model:{base:.23,deltas:{rearDisc:-.004,shield:0,aerofuel:0,frontBottle:0,rearBottles:0},source:'Illustrative sensitivity assumptions; not measured'},baseCfg:{...STOCK},baseline:null,uncertainty:.004,paused:false};state.baseline=clone(state.model);
 const panel=document.createElement('aside');panel.id='lab';panel.className='drawer glass';panel.setAttribute('aria-label','Wind tunnel lab');
 const input=(key,label,min,max,step,value)=>`<label class="lab-field">${label}<input id="lab-${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
 panel.innerHTML=`<button class="x" aria-label="Close lab controls">✕</button><div class="eyebrow">Aerodynamics lab · 01</div><h2>Make air visible.</h2><p class="lead">Compare your build against a pinned baseline. Calculated forces; illustrative airflow.</p>
 <div id="lab-status" class="lab-status">ASSUMPTIONS · NOT A MEASURED BIKE TEST</div>
 <div class="lab-metrics" aria-live="polite"><div><b id="lab-watts">—</b><span>W saved at test speed</span></div><div><b id="lab-time">—</b><span>s saved at equal power</span></div></div>
 <p class="lab-small" id="lab-range"></p><svg id="lab-chart" viewBox="0 0 320 142" role="img" aria-label="Pedal power versus ground speed: baseline and current configuration"></svg><div class="lab-legend"><span>● Current</span><span>● Baseline</span><span>Power / speed</span></div>
 <div class="actions"><button id="lab-pin">Pin current as baseline</button><button id="lab-export">Export results</button></div>
 <h3>Test configuration</h3>${Object.keys(names).map(k=>`<label class="check"><div>${names[k]}</div><input type="checkbox" data-lab-config="${k}"></label>`).join('')}
 <h3>Wind & speed</h3><div class="lab-grid">${input('speed','Ground speed · km/h',10,90,1,40)}${input('headwind','Headwind · km/h (− = tail)',-20,50,1,0)}${input('crosswind','Crosswind · km/h',-30,30,1,0)}${input('power','Equal pedal power · W',50,700,5,250)}${input('distance','Steady course · km',1,250,1,90)}${input('mass','Total rider + bike · kg',40,180,.1,84.1)}</div>
 <details><summary>Air & rolling resistance</summary><div class="lab-grid">${input('temp','Temperature · °C',-10,45,1,15)}${input('pressure','Station pressure · hPa',700,1080,.01,1013.25)}${input('humidity','Relative humidity · %',0,100,1,50)}${input('crr','Rolling coefficient',.001,.02,.0001,.0035)}${input('grade','Constant gradient · %',-5,15,.1,0)}${input('efficiency','Drivetrain efficiency',.8,1,.005,.975)}</div></details>
 <details id="lab-assumptions"><summary>Coefficient assumptions</summary><p class="lab-small">Whole bike axial CdA, referenced to apparent wind. The rider is excluded from this system — this lab models the bike only. Constant across ±25° yaw. No CFD or measured Canyon coefficients. Zero accessory deltas mean unknown, not “no effect”. Paint has no assigned aero effect. Disc −0.004 m² is a demonstration hypothesis.</p>${input('base','Reference system CdAx · m²',.02,1,.001,.23)}<div class="lab-grid">${Object.keys(names).map(k=>input('delta-'+k,names[k]+' · ΔCdAx m²',-.05,.05,.001,k==='rearDisc'?-.004:0)).join('')}${input('uncertainty','ΔCdAx sensitivity ± m²',0,.1,.001,.004)}</div><button id="lab-use-assumptions" class="lab-action">Use these assumptions</button></details>
 <details><summary>Use your wind-tunnel measurements</summary><p class="lab-small">Upload a yaw curve for the current visible setup, then pin it to compare another. Use bicycle-axis drag area from your test, not wind-axis CdA. Match rider posture, wheel speed, tyres and reference air speed. No extrapolation. Uploads stay on this device.</p><label class="lab-field">Test source / conditions<input id="lab-source" type="text" maxlength="240" placeholder="Facility, date, rider, tyre, test speed"></label><label class="lab-upload">Load CdAx CSV<input id="lab-csv" type="file" accept=".csv,text/csv"></label><button id="lab-template" class="lab-action">Download example CSV</button><p class="lab-small" id="lab-import-message" role="status"></p></details>
 <details><summary>Equations & limits</summary><p class="lab-small">U = √((v + headwind)² + crosswind²). Yaw = atan2(crosswind, v + headwind). Fₓ = ½ρU²CdAx. Pedal power = (Fₓv + Crr·mg·cosθ·v + mg·sinθ·v) / η. Density uses humid ideal-gas mixing. Time uses a bracketed steady-speed power solve over a constant course. No acceleration, gusts, steering stability, wheel rotation drag, rider motion or route integration. Unsupported yaw returns no result. Negative savings mean a loss. Sensitivity bands are user-selected bounds, not statistical confidence.</p><p class="lab-small"><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/" target="_blank" rel="noopener">NASA drag equation</a> · <a href="https://www.gribble.org/cycling/power_v_speed.html" target="_blank" rel="noopener">Cycling force balance</a> · <a href="https://www.dtswiss.com/en/arc-disc" target="_blank" rel="noopener">DT Swiss disc testing</a>. DT Swiss’s published comparison uses 80/80 versus 80/disc; its gains are not assigned to this 85 mm build.</p></details><button id="lab-exit" class="lab-action">Return to the gallery</button>`;
 document.body.append(panel);
 const hud=document.createElement('div');hud.id='lab-hud';hud.hidden=true;hud.innerHTML='<div class="eyebrow">Live test conditions</div><b id="lab-flow">40.0 km/h · 0.0° yaw</b><span id="lab-force"></span><small>Airflow paths are illustrative · not CFD</small><button id="lab-pause">Pause airflow</button>';document.body.append(hud);
 let result=null;
 function redraw(){
  const cfg=getCfg();result=compare(state.env,state.model,state.baseline,cfg,state.baseCfg);
  for(const k of Object.keys(names))$(`[data-lab-config="${k}"]`).checked=!!cfg[k];
  for(const k of ['aerofuel','frontBottle'])$(`[data-lab-config="${k}"]`).disabled=k==='aerofuel'?!cfg.shield:!(cfg.shield&&cfg.aerofuel);
  const imported=!!state.model.curve,valid=!imported||state.model.signature===signature(cfg);
  $('#lab-status').textContent=!valid?'SETUP CHANGED · LOAD A MATCHING CURVE':imported?'USER-SUPPLIED CURVE · NOT INDEPENDENTLY VERIFIED':'ASSUMPTIONS · NOT A MEASURED BIKE TEST';
  const fmt=(n,d=1)=>n===null?'—':(n>0?'+':'')+n.toFixed(d);
  $('#lab-watts').textContent=fmt(result.wattsSaved);$('#lab-time').textContent=fmt(result.timeSaved,0);
  const n=result.now,b=result.before;
  const bound=n?.q*n?.v/state.env.efficiency*state.uncertainty;
  $('#lab-range').textContent=n&&b?`ΔCdAx sensitivity: ${fmt(result.wattsSaved-bound)} to ${fmt(result.wattsSaved+bound)} W. ${state.env.distance} km at ${state.env.power} W: ${result.baseSpeed?.toFixed(1)||'—'} → ${result.speed?.toFixed(1)||'—'} km/h.`:'Outside supported yaw or invalid CdAx. Adjust inputs or supply matching data.';
  const v=state.env.speed/3.6,ux=v+state.env.headwind/3.6,uz=state.env.crosswind/3.6,air=Math.hypot(ux,uz),yaw=Math.atan2(uz,ux);
  $('#lab-flow').textContent=`${(air*3.6).toFixed(1)} km/h air · ${(yaw*180/Math.PI).toFixed(1)}° yaw`;
  $('#lab-force').textContent=n?`${n.drag.toFixed(1)} N axial drag · ${n.power.toFixed(0)} W pedals · ρ ${n.rho.toFixed(3)} kg/m³`:'No supported force result';
  drawChart();onResult({air,yaw,paused:state.paused,result});return result;
 }
 function drawChart(){
  const sets=[state.model,state.baseline].map((m,i)=>Array.from({length:41},(_,j)=>({x:20+j,y:forces({...state.env,speed:20+j},m,i?state.baseCfg:getCfg())?.power})));
  const vals=sets.flat().filter(p=>Number.isFinite(p.y)).map(p=>p.y),max=Math.max(100,...vals),min=Math.min(0,...vals),Y=y=>115-(y-min)/(max-min)*98;
  const path=s=>{let pen=false;return s.map(p=>{if(!Number.isFinite(p.y)){pen=false;return '';}const r=`${pen?'L':'M'}${26+(p.x-20)*7},${Y(p.y)}`;pen=true;return r;}).join(' ');};
  $('#lab-chart').innerHTML=`<path d="M26 14V115H306" stroke="#465561" fill="none"/><text x="2" y="15">${Math.round(max)}</text><text x="4" y="115">${Math.round(min)}</text><text x="24" y="135">20</text><text x="153" y="135">40</text><text x="255" y="135">60 km/h</text><path d="${path(sets[1])}" stroke="#ca9aff" stroke-dasharray="5 4"/><path d="${path(sets[0])}" stroke="#6aefed"/><text x="100" y="25">${state.model.curve?'SUPPLIED DATA':'ASSUMPTION STUDY'}</text>`;
 }
 for(const k of Object.keys(DEFAULT_AIR))$('#lab-'+k).addEventListener('input',e=>{if(e.target.value!==''&&e.target.checkValidity()){state.env[k]=Number(e.target.value);redraw();}});
 for(const k of Object.keys(names))$(`[data-lab-config="${k}"]`).onchange=e=>setCfg({[k]:e.target.checked});
 $('#lab-base').oninput=e=>{if(e.target.value!==''&&e.target.checkValidity()){state.model.base=+e.target.value;redraw();}};
 for(const k of Object.keys(names))$('#lab-delta-'+k).oninput=e=>{if(e.target.value!==''&&e.target.checkValidity()){state.model.deltas[k]=+e.target.value;redraw();}};
 $('#lab-uncertainty').oninput=e=>{if(e.target.value!==''&&e.target.checkValidity()){state.uncertainty=+e.target.value;redraw();}};
 $('#lab-use-assumptions').onclick=()=>{delete state.model.curve;delete state.model.signature;state.model.source='User-edited sensitivity assumptions';redraw();};
 $('#lab-pin').onclick=()=>{if(!result.now){$('#lab-import-message').textContent='Cannot pin unsupported configuration.';return;}state.baseline=clone(state.model);state.baseCfg=clone(getCfg());redraw();};
 $('#lab-csv').onchange=async e=>{const file=e.target.files[0];try{if(!file)return;if(file.size>65536)throw Error('CSV limit is 64 KB.');const source=$('#lab-source').value.trim();if(!source)throw Error('Describe test source and conditions before loading.');const curve=parseCurve(await file.text());state.model={...state.model,curve,signature:signature(getCfg()),source};$('#lab-import-message').textContent=`${curve.length} angles loaded for this setup. Configuration changes require a new curve.`;redraw();}catch(err){$('#lab-import-message').textContent=err.message;}e.target.value='';};
 $('#lab-template').onclick=()=>download(new Blob(['yaw_deg,cda_m2\n-20,0.245\n-10,0.235\n0,0.230\n10,0.235\n20,0.245\n'],{type:'text/csv'}),'EXAMPLE-NOT-MEASURED.csv');
 $('#lab-export').onclick=()=>download(new Blob([JSON.stringify({schema:'museum-aero-study-v1',bike:'canyon-speedmax-cfr-axs-my2027-m',created:new Date().toISOString(),...state,cfg:active(getCfg()),result,limits:'Calculated from supplied/assumed coefficients, not CFD or a validated prediction. No steering safety estimate. Sensitivity is not confidence.'},null,2)],{type:'application/json'}),'speedmax-aero-study.json');
 $('#lab-pause').onclick=()=>{state.paused=!state.paused;$('#lab-pause').textContent=state.paused?'Resume airflow':'Pause airflow';redraw();};
 $('#lab-exit').onclick=()=>{panel.classList.remove('open');leave();};
 const open=()=>{enter();panel.classList.add('open');redraw();};
 // Closing the lab leaves the tunnel: on phones the view dock is hidden in there, so a bare close stranded visitors.
 const exit=()=>{panel.classList.remove('open');leave();};
 panel.querySelector('.x').onclick=exit;
 $('#labOpen').onclick=()=>document.body.classList.contains('in-lab')?exit():open();
 return {state,refresh:redraw,open,setVisible(v){hud.hidden=!v;if(!v)panel.classList.remove('open');},get result(){return result;}};
}
export function makeChamber(){
 const g=new THREE.Group();g.name='Aerodynamics chamber';
 const frame=new THREE.MeshStandardMaterial({color:0x17232b,metalness:.65,roughness:.4}),light=new THREE.MeshBasicMaterial({color:0x58b9c0});
 for(const x of [-2.8,-1.65,1.65,2.8]){
  for(const z of [-1.25,1.25]){const m=new THREE.Mesh(new THREE.BoxGeometry(.045,2.65,.045),frame);m.position.set(x,1.325,z);g.add(m);const l=new THREE.Mesh(new THREE.BoxGeometry(.008,2.4,.008),light);l.position.set(x+.024,1.3,z+.025);g.add(l);}
  const m=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,2.55),frame);m.position.set(x,2.65,0);g.add(m);
 }
 const grid=new THREE.GridHelper(10,40,0x28626c,0x193039);grid.position.y=.002;grid.material.transparent=true;grid.material.opacity=.55;g.add(grid);
 return g;
}
