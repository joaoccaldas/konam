// SI physics; CdAx is axial drag area referenced to apparent air speed.
// Values describing a bike/rider must be measured or supplied as assumptions.
export const DEFAULT_AIR = {speed:40,headwind:0,crosswind:0,temp:15,pressure:1013.25,humidity:50,mass:84.1,crr:.0035,grade:0,efficiency:.975,power:250,distance:90};
export const STOCK = {rearDisc:false,shield:true,aerofuel:true,frontBottle:false,rearBottles:false};
export function density(temp,pressure,humidity) {
  const vapour=humidity/100*610.94*Math.exp(17.625*temp/(temp+243.04));
  return (pressure*100-vapour)/(287.05*(temp+273.15))+vapour/(461.495*(temp+273.15));
}
export function active(cfg) {return {rearDisc:!!cfg.rearDisc,shield:!!cfg.shield,aerofuel:!!(cfg.aerofuel&&cfg.shield),frontBottle:!!(cfg.frontBottle&&cfg.aerofuel&&cfg.shield),rearBottles:!!cfg.rearBottles};}
export function signature(cfg) {return JSON.stringify({...active(cfg),wheelModel:cfg.rearDisc?(cfg.wheelModel||'cover'):'stock'});}
export function interpolate(curve,yaw) {
 if(yaw<curve[0][0]-1e-8||yaw>curve.at(-1)[0]+1e-8)return null;
 for(let i=1;i<curve.length;i++)if(yaw<=curve[i][0]+1e-8){const [x,a]=curve[i-1],[z,b]=curve[i];return a+(b-a)*(yaw-x)/(z-x);}
 return curve.at(-1)[1];
}
export function parseCurve(text) {
 const lines=text.trim().split(/\r?\n/);if(lines.shift()?.trim()!=='yaw_deg,cda_m2')throw Error('CSV header must be yaw_deg,cda_m2');
 if(lines.length<2||lines.length>181)throw Error('Use 2–181 data rows.');
 const rows=lines.map(l=>{const s=l.split(',');if(s.length!==2||s.some(x=>!x.trim()))throw Error('Each row needs two numbers.');const r=s.map(Number);if(!r.every(Number.isFinite)||Math.abs(r[0])>45||r[1]<=0||r[1]>1.5)throw Error('Yaw must be −45…45° and CdAx >0…1.5 m².');return r;}).sort((a,b)=>a[0]-b[0]);
 if(rows.some((r,i)=>i&&r[0]===rows[i-1][0]))throw Error('Duplicate yaw angle.');
 return rows;
}
export function cdaAt(model,cfg,yaw) {
 if(model.curve){if(model.signature!==signature(cfg))return null;return interpolate(model.curve,yaw);}
 if(Math.abs(yaw)>25)return null; // Constant axial coefficient is only a bounded sensitivity assumption.
 const a=active(cfg),b=active(STOCK);
 const value=model.base+Object.keys(a).reduce((sum,k)=>sum+(Number(a[k])-Number(b[k]))*(model.deltas[k]||0),0);
 return value>0&&value<=1.5?value:null;
}
export function forces(env,model,cfg,speed=env.speed) {
 const v=speed/3.6,ux=v+env.headwind/3.6,uz=env.crosswind/3.6;
 if(ux<=0||v<=0)return null;
 const air=Math.hypot(ux,uz),yaw=Math.atan2(uz,ux)*180/Math.PI,cda=cdaAt(model,cfg,yaw);
 if(cda===null)return null;
 const rho=density(env.temp,env.pressure,env.humidity),q=.5*rho*air*air,theta=Math.atan(env.grade/100);
 const drag=q*cda,rolling=env.crr*env.mass*9.80665*Math.cos(theta),gravity=env.mass*9.80665*Math.sin(theta);
 return {v,air,yaw,cda,rho,q,drag,aero:drag*v,rolling:rolling*v,climb:gravity*v,power:(drag+rolling+gravity)*v/env.efficiency};
}
export function solveSpeed(env,model,cfg) {
 // Bracket only adjacent valid samples; never bridge a curve's unsupported yaw range.
 let prev=null;
 for(let speed=.25;speed<=120;speed+=.25){const f=forces(env,model,cfg,speed);if(!f){prev=null;continue;}
  if(prev&&prev.f.power<=env.power&&f.power>=env.power){let lo=prev.speed,hi=speed;
   for(let i=0;i<45;i++){const mid=(lo+hi)/2,m=forces(env,model,cfg,mid);if(!m)return null;if(m.power>env.power)hi=mid;else lo=mid;}
   return (lo+hi)/2;
  }prev={speed,f};
 }return null;
}
export function compare(env,current,baseline,cfg,baseCfg) {
 const now=forces(env,current,cfg),before=forces(env,baseline,baseCfg);
 const speed=solveSpeed(env,current,cfg),baseSpeed=solveSpeed(env,baseline,baseCfg);
 return {now,before,speed,baseSpeed,wattsSaved:now&&before?before.power-now.power:null,timeSaved:speed&&baseSpeed?env.distance*3600*(1/baseSpeed-1/speed):null};
}
