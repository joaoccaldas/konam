import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// Synthetic concept fixture, not an engineering-certified pump.
export function build({segments=24}={}){
 if(!Number.isInteger(segments)||segments<8||segments>64||segments%4!==0)throw Error('segments must be divisible by four, 8..64');
 const parts=[];
 function cube(id,cx,cy,cz,sx,sy,sz){
  const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x,y,z])=>[cx+x*sx/2,cy+y*sy/2,cz+z*sz/2]);
  parts.push({id,v,f:[[1,2,3,4],[5,8,7,6],[1,5,6,2],[2,6,7,3],[3,7,8,4],[4,8,5,1]]});
 }
 function cyl(id,cx,cy,cz,r,len){
  const v=[];for(const z of [-len/2,len/2])for(let k=0;k<segments;k++){const t=2*Math.PI*k/segments;v.push([cx+r*Math.cos(t),cy+r*Math.sin(t),cz+z]);}
  const f=[];for(let k=0;k<segments;k++){const n=(k+1)%segments;f.push([k+1,n+1,n+segments+1,k+segments+1]);}
  f.push([...Array(segments)].map((_,i)=>segments-i));f.push([...Array(segments)].map((_,i)=>segments+i+1));parts.push({id,v,f});
 }
 cube('base',0,0,0,2.4,1.2,.16);cube('motor_housing',-.7,0,.52,.9,.75,.85);
 cyl('shaft',0,0,.56,.12,1.5);cyl('pump_housing',.75,0,.56,.5,.38);cyl('impeller',.75,0,.56,.28,.12);
 cube('outlet',.75,.55,.73,.30,.36,.3);cube('inlet',1.13,0,.55,.30,.30,.30);
 for(let i=0;i<4;i++)cyl('bolt_'+i,i<2?-1:1,i%2?-.42:.42,.16,.055,.14);
 const lines=['# Synthetic training fixture; metres; Z-up; not safety-certified'];let offset=0;const stats=[];
 for(const p of parts){lines.push('o '+p.id);for(const xyz of p.v)lines.push('v '+xyz.map(n=>n.toFixed(6)).join(' '));for(const f of p.f)lines.push('f '+f.map(n=>n+offset).join(' '));stats.push({id:p.id,vertices:p.v.length,faces:p.f.length});offset+=p.v.length;}
 return {obj:lines.join('\n')+'\n',stats};
}
export function write(out,options={}){
 const {obj,stats}=build(options);fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'synthetic-pump.obj'),obj);
 const manifest={id:'fixture/industrial-pump-001',representation:'concept',units:'meters',axis:'Z-up',rights:'original-synthetic-candidate',approval:false,semantic_parts:stats,sha256:crypto.createHash('sha256').update(obj).digest('hex'),limitations:['Not dimensionally or mechanically validated','OBJ intermediate, GLB import not tested','No calibrated PBR or runtime tests']};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){if(process.argv.length!==3)throw Error('usage: node tools/synthetic-pump-fixture.mjs <output-directory>');console.log(JSON.stringify(write(process.argv[2]),null,2));}
