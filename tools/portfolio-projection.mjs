/** Read-only projection of canonical KONA product and room catalogs. Not a new asset authority. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const clean=x=>String(x??'').replace(/[\u0000-\u001f]/g,' ').trim();
const path=x=>typeof x==='string' && !x.startsWith('/') && !x.includes('..') && !/^[a-z]+:/i.test(x) && /^[\w.\-/]+$/.test(x)?x:null;
export function buildPortfolioProjection(products,inventory){
 if(!Array.isArray(products?.products)||!Array.isArray(inventory?.rooms))throw new TypeError('Canonical catalogs missing');
 const rooms=new Map(inventory.rooms.map(r=>[r.id,r])),seen=new Set();
 const cards=products.products.map(p=>{
  if(!p||typeof p.id!=='string'||!p.id||seen.has(p.id))throw Error('Missing or duplicate product id');
  seen.add(p.id);
  const explore=path(p.deepStudio),modelDownload=path(p.glb);
  return {id:p.id,title:clean(p.name),subtitle:[p.brand,p.family,p.year].filter(Boolean).map(clean).join(' · '),
   category:clean(p.category||p.type||'Object'),
   status:explore?'interactive-viewer':modelDownload?'model-available':'metadata-only',
   actions:{explore,modelDownload},preview:{status:'unverified',url:null},
   provenance:{sourceCount:Array.isArray(p.sources)?p.sources.length:0,rights:'not-reviewed-in-projection'},
   variants:Array.isArray(p.skins)?p.skins.map(s=>({id:clean(s.id),label:clean(s.name),kind:clean(s.kind)})):[],
   placements:Array.isArray(p.where)?p.where.map(w=>({id:clean(w.id),name:clean(rooms.get(w.id)?.name||w.name||w.id),known:rooms.has(w.id)})):[]
  };
 });
 return {schema_version:1,kind:'read-only-product-projection',source:['museum/catalog/products.json','app/admin-assets.json'],
 counts:{products:cards.length,rooms:rooms.size,interactive:cards.filter(x=>x.actions.explore).length,downloadable:cards.filter(x=>x.actions.modelDownload).length},cards};
}
export function main(args=process.argv.slice(2)){
 if(args.length!==2)throw Error('usage: node tools/portfolio-projection.mjs <products.json> <admin-assets.json>');
 const read=f=>JSON.parse(readFileSync(f,'utf8'));
 process.stdout.write(JSON.stringify(buildPortfolioProjection(read(args[0]),read(args[1])),null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
