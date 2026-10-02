import test from 'node:test';
import assert from 'node:assert/strict';
import {readRaceHistory,writeRaceHistory,setRaceRelationship,removeRace} from '../src/engine/race-history.js';
import {raceCardMarkup} from '../src/ui/race-cards.js';
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};

test('race relationship changes preserve result and original selected date',()=>{
 const s=memory();writeRaceHistory([{race_id:'race:test',relationship:'completed',selected_at:'2022-10-29',result:{bib:'123',finish_time_seconds:16000}}],s);
 setRaceRelationship('race:test','interested',s);
 const row=readRaceHistory(s)[0];assert.equal(row.result.bib,'123');assert.equal(row.result.finish_time_seconds,16000);assert.equal(row.selected_at,'2022-10-29');
 setRaceRelationship('race:test','registered',s);assert.equal(readRaceHistory(s).length,1);
});
test('repeated race tap is idempotent and remove persists',()=>{
 const s=memory();setRaceRelationship('race:a','interested',s);const before=s.getItem('kona.raceHistory.v1');
 setRaceRelationship('race:a','interested',s);assert.equal(s.getItem('kona.raceHistory.v1'),before);
 removeRace('race:a',s);assert.deepEqual(readRaceHistory(s),[]);
});
test('failed race storage never reports a successful save or removal',()=>{
 const s=memory();setRaceRelationship('race:a','completed',s);s.setItem=()=>{throw new Error('quota');};
 assert.throws(()=>setRaceRelationship('race:a','registered',s),/Could not save/);
 assert.throws(()=>removeRace('race:a',s),/Could not save/);
 assert.equal(readRaceHistory(s)[0].relationship,'completed');
});
test('race buttons expose selected state and a genuine removal control',()=>{
 const r={id:'race:a',name:'A race',year:2022};
 const html=raceCardMarkup(r,{relationship:'completed',interactive:true,removable:true});
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 assert.match(html,/data-race-rel="completed" aria-pressed="true"/);
 assert.match(html,/data-remove-race/);
 assert.match(raceCardMarkup(r),/Not saved/);
});
test('race state rejects invalid actions and preserves null result time',()=>{
 const s=memory();assert.throws(()=>setRaceRelationship('','completed',s));
 assert.throws(()=>setRaceRelationship('race:a','enrolled',s));
 writeRaceHistory([{race_id:'race:a',relationship:'interested',result:{finish_time_seconds:null}}],s);
 assert.equal(readRaceHistory(s)[0].result.finish_time_seconds,null);
});
test('race card text and attribute values remain inert',()=>{
 const html=raceCardMarkup({id:'x" onclick="alert(1)',name:'<script>bad</script>'},{interactive:true});
 assert.doesNotMatch(html,/<script>| onclick="/);assert.match(html,/&lt;script&gt;/);
});
test('race catalog can recover after its first failed request',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return calls===1?{ok:false}:{ok:true,json:async()=>({races:[{id:'r',name:'Kona',year:2026}]})};};
 try{const mod=await import('../src/engine/race-catalog.js?retry-test');await assert.rejects(mod.loadRaceCatalog());assert.equal((await mod.loadRaceCatalog()).races.length,1);assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
