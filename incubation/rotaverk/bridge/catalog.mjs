// Read-only audit of KONA's generated product catalog, not a replacement registry.
export function auditCatalog(input){
 if(!input||!Array.isArray(input.products))throw Error('products[] required');
 const ids=new Set(),errors=[],glbs=new Set(),base=new Set(),origin={};
 for(const p of input.products){
  if(!p.id||typeof p.id!=='string')errors.push('missing product ID');
  if(ids.has(p.id))errors.push('duplicate ID '+p.id);ids.add(p.id);
  if(!p.brand||!p.name||!p.type)errors.push('incomplete identity '+p.id);
  if(!Array.isArray(p.sources)||!p.sources.length)errors.push('no source '+p.id);
  if(p.glb)glbs.add(p.glb);
  const k=p.origin||'unknown';origin[k]=(origin[k]||0)+1;
  if(k==='museum-edition'){if(!p.base)errors.push('edition without base '+p.id);}else base.add(p.id);
 }
 for(const p of input.products)if(p.base&&!ids.has(p.base))errors.push('unknown base '+p.base);
 if(input.count!==undefined&&input.count!==input.products.length)errors.push('declared count mismatch');
 return {entries:input.products.length,distinctGlbs:glbs.size,nonEditionEntities:base.size,museumEditions:origin['museum-edition']||0,byOrigin:origin,errors};
}
