import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import { FUTURE_LEVELS, mapBounds, mapFloors, roomOverview, withFutureLevels } from '../src/world/map-model.js';
const mapSrc=fs.readFileSync(new URL('../src/map.js',import.meta.url),'utf8');
const landing=fs.readFileSync(new URL('../src/landing.js',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../styles/hall-mobile.css',import.meta.url),'utf8');

test('future levels are explicit non-interactive map data',()=>{
 assert.ok(FUTURE_LEVELS.length>=4);
 assert.ok(FUTURE_LEVELS.every(x=>x.status==='future'&&x.go===false&&x.floor==='future'));
 const all=withFutureLevels([{id:'hall',name:'Hall',floor:'ground',x0:0,x1:10,z0:0,z1:20}]);
 assert.equal(all.filter(x=>x.status==='future').length,FUTURE_LEVELS.length);
 assert.deepEqual(mapFloors(all),['ground','future']);
});
test('every ordinary room can derive a full-room overview pose',()=>{
 for(const area of [
  {id:'long',floor:'ground',x0:-5,x1:5,z0:-30,z1:0},
  {id:'wide',floor:'upper',x0:-15,x1:15,z0:-5,z1:5},
 ]){
  const o=roomOverview(area);assert.ok(o?.to);assert.ok(o?.face);assert.equal(o.roomId,area.id);
  assert.ok(o.to.x>=Math.min(area.x0,area.x1)&&o.to.x<=Math.max(area.x0,area.x1));
  assert.ok(o.to.z>=Math.min(area.z0,area.z1)&&o.to.z<=Math.max(area.z0,area.z1));
 }
});
test('map bounds scale from data rather than fixed dimensions',()=>{
 const b=mapBounds([{x0:-2,x1:8,z0:-5,z1:15}],2);assert.deepEqual(b,{minX:-4,maxX:10,minZ:-7,maxZ:17});
});
test('world renderer consumes the map model and map navigation uses overview policy',()=>{
 assert.match(mapSrc,/mapBounds/);assert.match(mapSrc,/mapFloors/);
 assert.match(landing,/roomOverview/);assert.match(landing,/withFutureLevels/);assert.match(landing,/room overview/);
});
test('mobile world map is full-screen and map-first',()=>{
 assert.match(mobile,/World map on phones/);assert.match(mobile,/height:100dvh/);assert.match(mobile,/map-plan svg/);
});
