import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import { roomOverview } from '../src/world/map-model.js';
const landing=fs.readFileSync(new URL('../src/landing.js',import.meta.url),'utf8');

// A bay's own exhibit view: stand on the open side and face the display wall.
const bay={id:'bay-las-vegas',floor:'upper',x0:8.4,x1:14.8,z0:11.2,z1:14.8,overview:{to:{x:13.4,z:13.2},face:{x:9.4,y:1.6,z:13}}};

test('a declared room view wins over the generic edge-to-centre view',()=>{
 const o=roomOverview(bay,{floorAt:()=>4.7,groundY:1.6});
 assert.deepEqual(o.to,{x:13.4,z:13.2});
 assert.equal(o.face.x,9.4);assert.ok(Math.abs(o.face.y-6.3)<1e-9);
 assert.ok(o.face.x<o.to.x,'faces the display wall at the low-x side');
});

test('a declared view that is not walkable falls back to the generic overview',()=>{
 const o=roomOverview(bay,{isWalkable:(x)=>x<10,floorAt:()=>4.7});
 assert.ok(o.to.x<10);
 assert.equal(o.face.x,(bay.x0+bay.x1)/2);
});

test('bays, wing rooms and the nave declare showcase views without changing arrival',()=>{
 assert.match(landing,/const OV = \(to, face\) => \(\{ showcase:/);
 assert.match(landing,/showcase&&area\.showcase\?\{\.\.\.area,overview:area\.showcase\}:area/);
 assert.doesNotMatch(landing,/OV = \(to, face\) => \(\{ overview:/);
 assert.match(landing,/kind: 'bay', \.\.\.OV\(\{ x: b\.view\.x \+ \.3, z: b\.z \+ 1\.3 \}/);
 assert.match(landing,/r\.view && r\.look \? OV\(r\.view, r\.look\)/);
 assert.doesNotMatch(landing,/stair: OV\(/);assert.match(landing,/nave: OV\(\{ x: NAVE_LANE/);
});
