#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const spec=JSON.parse(fs.readFileSync(path.join(root,'integrations/merch/concepts.json'),'utf8'));
const outDir=path.join(root,'assets/merch/concepts');fs.mkdirSync(outDir,{recursive:true});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const projection={schema_version:1,catalog_version:spec.catalog_version,concepts:[]};
for(const c of spec.concepts){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="${esc(c.background)}"/><circle cx="930" cy="220" r="160" fill="${esc(c.accent)}" opacity=".92"/><text x="90" y="120" fill="${esc(c.accent)}" font-family="monospace" font-size="28" letter-spacing="6">KONA.M · ${esc(c.product.toUpperCase())} CONCEPT</text><text x="90" y="610" fill="${esc(c.ink)}" font-family="Georgia,serif" font-size="92">${esc(c.headline)}</text><text x="92" y="690" fill="${esc(c.ink)}" font-family="Arial,sans-serif" font-size="30" letter-spacing="5">${esc(c.subline)}</text><path d="M90 780 H1110" stroke="${esc(c.accent)}" stroke-width="8"/><text x="90" y="1080" fill="${esc(c.ink)}" opacity=".7" font-family="Arial,sans-serif" font-size="22">CONCEPT ONLY · SAMPLE BEFORE SALE · ${esc(c.rights)}</text></svg>`;
 const file='assets/merch/concepts/'+c.id+'.svg';fs.writeFileSync(path.join(root,file),svg);
 projection.concepts.push({...c,visual:file,provider:null,sellable:false});
}
fs.writeFileSync(path.join(root,'app/admin-merch-concepts.json'),JSON.stringify(projection,null,2)+'\n');
console.log('built '+projection.concepts.length+' merch concepts');
