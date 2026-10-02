import fs from 'node:fs';import path from 'node:path';import {build} from '../web/node_modules/esbuild/lib/main.js';
const root=path.resolve(import.meta.dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'museum/catalog.json')));
function makeImage(t){try{return 'data:image/png;base64,'+fs.readFileSync(path.join(root,t)).toString('base64');}catch{return null;}}
const entries=catalog.entries.map(e=>{
  const base={...e,image:e.thumbnail?makeImage(e.thumbnail):null,...e.comparison};
  if(!e.viewerProfile)return {...base,notModelled:true};
  const profile=JSON.parse(fs.readFileSync(path.join(root,e.viewerProfile)));
  // Heritage bikes: take identity from the generated studio profile (tools/make_studio_profiles.py).
  const studioPath=path.join(root,'museum/studio',`viewer-${e.id}-studio.json`);
  if(!profile.bike.specs&&fs.existsSync(studioPath)){const sb=JSON.parse(fs.readFileSync(studioPath)).bike;
    return {...base,key:e.id,heritage:true,year:sb.year,size:sb.size,weightKg:sb.weight,gear:sb.gear,cassette:sb.gearSub,priceSEK:null};}
  return {...base,...profile.bike.specs};
});
const app=await build({entryPoints:[path.join(root,'web/src/collection.js')],bundle:true,format:'iife',minify:true,write:false,target:'es2020'});const html=fs.readFileSync(path.join(root,'web/collection.template.html'),'utf8').replace('__COLLECTION__',()=>JSON.stringify(entries).replaceAll('<','\\u003c')).replace('__ARCHIVE__',()=>JSON.stringify(catalog.heritage||[]).replaceAll('<','\\u003c')).replace('__APP__',()=>app.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
for(const file of ['Canyon_Collection.html','web/dist/Canyon_Collection.html','web/dist/index.html'])fs.writeFileSync(path.join(root,file),html);
for(const e of entries)if(e.viewer&&fs.existsSync(path.join(root,e.viewer)))fs.copyFileSync(path.join(root,e.viewer),path.join(root,'web/dist',e.viewer));
console.log('Collection:',entries.length,'exhibits;',Math.round(html.length/1000),'KB');

fs.mkdirSync(path.join(root,'web/dist/docs'),{recursive:true});fs.copyFileSync(path.join(root,'docs/FIT_RESEARCH_AND_ROADMAP.md'),path.join(root,'web/dist/docs/FIT_RESEARCH_AND_ROADMAP.md'));
