import test from 'node:test';
import assert from 'node:assert/strict';
import {internEditions,escapeHTML} from '../src/ui/companion-data.js';
const sources=[{id:'a',name:'Publisher A'},{id:'b',name:'Publisher B'}];
const item=(id,published_at,kind='news',source_id='a')=>({id,url:'https://example.com/'+id,title:id,published_at,kind,source_id});
test('RSS punctuation renders as text while decoded markup stays inert',()=>{
 const row={...item('story','2026-10-05T12:00:00Z'),title:'Race &#8211; ride &amp; recover &#x1F6B2; &#60;img onerror=alert(1)&#62;'};
 const title=internEditions({sources,items:[row]})[0].picks[0].title;
 assert.equal(title,'Race – ride & recover 🚲 <img onerror=alert(1)>');
 assert.match(escapeHTML(title),/&lt;img onerror=alert\(1\)&gt;/);
});
test('Intern editions use Honolulu publication dates, safe known sources and unique links',()=>{
 const data={sources,items:[item('today','2026-10-05T12:00:00Z'),item('night','2026-10-05T06:00:00Z'),item('night','2026-10-05T06:00:00Z','news','b'),item('unknown','2026-10-05T12:00:00Z','news','absent'),{...item('unsafe','2026-10-05T12:00:00Z'),url:'javascript:alert(1)'},item('invalid','not a date')]};
 const editions=internEditions(data);
 assert.deepEqual(editions.map(e=>e.date),['2026-10-05','2026-10-04']);
 assert.deepEqual(editions.map(e=>e.story_count),[1,1]);
 assert.equal(editions[1].picks[0].publisher,'Publisher A');
});
test('digest balances kinds, bounds publisher excerpts, and does not invent missing summaries',()=>{
 const items=Array.from({length:8},(_,i)=>({...item('n'+i,'2026-10-05T12:00:00Z'),excerpt:'source '.repeat(100)}));
 items.push(item('athlete','2026-10-05T12:00:00Z','video'),item('island','2026-10-05T12:00:00Z','kona'));
 const edition=internEditions({sources,items})[0];
 assert.equal(edition.story_count,10);
 assert.deepEqual(edition.picks.map(i=>i.kind),['news','news','video','kona']);
 assert.ok(edition.picks.every(i=>i.excerpt.length<=260));
 assert.equal(edition.picks[2].excerpt,'');
});
