// Public travel projection. The place registry remains the editing authority.
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const places=read('museum/places/kona-v1.json'), travel=read('integrations/companion/travel-sources.json');
const publicPlaces=places.places.map(p=>({id:p.id,name:p.name,type:p.type,categories:p.categories,address:p.location?.address,website:p.website,source:p.source,notes:p.race_week_relevance,commercial:p.partner?.commercial===true}));
fs.writeFileSync(new URL('../integrations/companion/travel.json',import.meta.url),JSON.stringify({...travel,places:publicPlaces},null,2)+'\n');
console.log('companion: '+publicPlaces.length+' canonical places; '+travel.links.length+' travel sources');
