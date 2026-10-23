// Offline deterministic material studies; no runtime change. Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

export const MATERIALS = Object.freeze(['basalt', 'travertine', 'brushed-metal']);
export function validateOptions({material='basalt',size=256,seed=7}={}) {
  if(!MATERIALS.includes(material)) throw Error('unsupported material');
  if(!Number.isInteger(size)||size<32||size>1024||(size&(size-1))) throw Error('size must be power of two 32..1024');
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff) throw Error('seed must be uint32');
  return {material,size,seed};
}
function hash(x,y,seed){let n=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,2246822519))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function lerp(a,b,t){return a+(b-a)*t;}
function smooth(t){return t*t*(3-2*t);}
function periodicNoise(x,y,period,seed){
  const x0=Math.floor(x),y0=Math.floor(y),fx=smooth(x-x0),fy=smooth(y-y0);
  const mod=v=>(v%period+period)%period;
  const v=(a,b)=>hash(mod(a),mod(b),seed);
  return lerp(lerp(v(x0,y0),v(x0+1,y0),fx),lerp(v(x0,y0+1),v(x0+1,y0+1),fx),fy);
}
export function bakeTexture(opts={}){
  const {material,size,seed}=validateOptions(opts);const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const n=periodicNoise(u*8,v*8,8,seed);
    const micro=periodicNoise(u*64,v*64,64,seed+13);
    const vein=Math.pow(Math.max(0,1-Math.abs(Math.sin((v*8+n*.8)*Math.PI*2))),12);
    const grain=periodicNoise(u*8,v*64,8,seed+23);
    let value,color;
    if(material==='basalt'){value=.10+.21*n+.095*micro;color=[value*.94,value*.97,value*1.04];}
    else if(material==='travertine'){value=.76+.13*n-.17*vein+.035*micro;color=[value,value*.94,value*.84];}
    else {value=.54+.21*grain+.05*micro;color=[value*.96,value*.99,value*1.03];}
    const i=(y*size+x)*4;for(let c=0;c<3;c++)data[i+c]=Math.min(255,Math.max(0,Math.round(color[c]*255)));data[i+3]=255;
  }
  return {material,size,seed,data};
}
const table=(()=>{const a=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;a[n]=c>>>0;}return a})();
function crc(b){let c=0xffffffff;for(const k of b)c=table[(c^k)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([len,name,data,sum]);}
export function encodePNG({size,data}){
  if(data.length!==size*size*4)throw Error('invalid data size');
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  const rows=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++){rows[y*(size*4+1)]=0;Buffer.from(data.buffer,data.byteOffset+y*size*4,size*4).copy(rows,y*(size*4+1)+1);}
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
export function evidence(opts={}){const tex=bakeTexture(opts);const png=encodePNG(tex);const sum=tex.data.reduce((a,v,i)=>a+(i%4===3?0:v),0);return {material:tex.material,size:tex.size,seed:tex.seed,pixels:tex.size**2,png_bytes:png.length,sha256:crypto.createHash('sha256').update(png).digest('hex'),mean_rgb:sum/(tex.size**2*3),png};}
export function main(argv=process.argv.slice(2)){
  if(argv.length!==4)throw Error('usage: node tools/texture-bake.mjs <basalt|travertine|brushed-metal> <32..1024 power-of-two> <uint32 seed> <output.png>');
  const [material,n,s,file]=argv;const size=Number(n),seed=Number(s);
  const result=evidence({material,size,seed});
  fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,result.png);
  const {png,...receipt}=result;console.log(JSON.stringify({...receipt,output:path.resolve(file)},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname))main();
