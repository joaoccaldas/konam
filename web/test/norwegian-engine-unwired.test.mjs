import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('Norwegian Engine remains isolated from production navigation',()=>{const rooms=JSON.parse(read('world/konam/rooms-v1.json'));assert.equal(rooms.rooms.length,28);assert.equal(rooms.rooms.some(r=>/norwegian-engine|nor \/\/ 3/i.test((r.slug||'')+' '+(r.name||''))),false);const hall=read('web/src/hall.js'),entry=read('web/src/entry.js');assert.equal(/norwegian-engine|buildNorwegianEngine/i.test(hall),false);assert.equal(/norwegian-engine|buildNorwegianEngine/i.test(entry),false)});
test('candidate contains shared science and podium architecture',()=>{const d=JSON.parse(read('world/konam/candidates/athlete-norway-trio-engine-room-v1.json'));assert.equal(d.status,'production-candidate-unwired');assert.equal(d.public_navigation,false);assert.deepEqual(d.athletes,['Kristian Blummenfelt','Gustav Iden','Casper Stornes']);for(const id of ['rain-lock','three-rails','protocol-table','altitude-glasshouse','heat-cool','podium-vault','fjord-wall','kona-line'])assert.ok(d.zones.some(z=>z.id===id),'missing '+id);assert.ok(d.evidence.length>=6);assert.equal(d.asset_policy.exact_medal_replica,false)});
test('room exposes candidate metadata and disposal',()=>{const src=read('web/src/rooms/norwegian-engine.js');assert.match(src,/productionCandidate=true/);assert.match(src,/publicNavigation=false/);assert.match(src,/disposeNorwegianEngine/);assert.match(src,/PODIUM_VAULT/);assert.match(src,/ALTITUDE_GLASSHOUSE/)});
test('review surface provides mobile-friendly preset navigation',()=>{const html=read('review/norwegian-engine/index.html');for(const id of ['overview','lanes','protocol','altitude','vault','fjord','kona'])assert.match(html,new RegExp('id="'+id+'"'));assert.match(html,/viewport-fit=cover/);assert.match(html,/min-height:44px/)});
