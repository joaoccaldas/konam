import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'museum/test/product-intake-v0.json'),'utf8'));
const res=await build({entryPoints:[path.join(root,'web/src/product-intake-proof.js')],bundle:true,format:'iife',minify:true,write:false,target:'es2020',legalComments:'none'});
const app=res.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const buttons=data.rooms.map(r=>`<button data-room="${r.id}">${r.title}</button>`).join('');
const html=fs.readFileSync(path.join(root,'web/product-intake-proof.template.html'),'utf8')
 .replace('__ROOM_BUTTONS__',()=>buttons)
 .replace('__DATA__',()=>JSON.stringify(data).replaceAll('<','\\u003c'))
 .replace('__APP__',()=>app);
const out=process.argv[2]||path.join(root,'Product_Intake_Proof.html');
fs.writeFileSync(out,html);
console.log('wrote',path.relative(root,out),Math.round(html.length/1024),'KB');
