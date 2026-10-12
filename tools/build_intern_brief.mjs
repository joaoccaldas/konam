// A reviewable dated digest from the existing, validated Companion snapshot.
// This writes no news assertions beyond source titles and supplied excerpts.
import fs from 'node:fs';
import path from 'node:path';
import {internEditions} from '../web/src/ui/companion-data.js';
const root=path.resolve(import.meta.dirname,'..'),out=process.argv[2]||path.join(root,'output/intern');
const feed=JSON.parse(fs.readFileSync(path.join(root,'integrations/companion/feed.json')));
const editions=internEditions(feed);fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'editions.json'),JSON.stringify({schema_version:1,checked_at:feed.checked_at,editions},null,2)+'\n');
const clean=s=>String(s||'').replace(/[\[\]<>]/g,'').replace(/[\r\n]+/g,' ');
for(const edition of editions){
 const text='# '+edition.title+'\n\nSource digest · '+edition.story_count+' stories · snapshot checked '+feed.checked_at+'.\n\n'+edition.picks.map(item=>'## '+clean(item.title)+'\n\n'+(item.excerpt?'Publisher excerpt: '+clean(item.excerpt)+'\n\n':'')+'['+clean(item.publisher)+']('+item.url+') · published '+item.published_at+'\n').join('\n')+'\nReview sources and dates before publishing. This artifact does not publish itself.\n';
 fs.writeFileSync(path.join(out,edition.date+'.md'),text);
}
console.log('Intern: '+editions.length+' dated source editions → '+out);
