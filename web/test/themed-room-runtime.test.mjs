import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));

test('every themed gallery room declares its surface, staging and lamp data',()=>{
  const rooms=json('museum/world/rooms.json').areas.filter(a=>a.presentation?.kind==='room');
  assert.ok(rooms.length>=4);
  for(const room of rooms){
    const p=room.presentation;
    assert.ok(p.surface?.floor?.kind,room.id+' floor surface');
    assert.ok(p.surface?.wall?.kind,room.id+' wall surface');
    assert.ok(p.staging,room.id+' staging');
    assert.ok(p.lamp,room.id+' lamp');
  }
});

test('galleries host does not branch on named installation identities',()=>{
  const src=read('web/src/galleries.js');
  for(const id of ['bio','horror','alien','zombie','norwegian']){
    assert.doesNotMatch(src,new RegExp("r\\.id\\s*===\\s*['\"]"+id+"['\"]"),'host knows '+id);
    assert.doesNotMatch(src,new RegExp("L\\.id\\s*===\\s*['\"]"+id+"['\"]"),'host animates '+id);
  }
  assert.match(src,/L\.update\?\.\(t\)/);
});

test('installation builders own their local animation lifecycle',()=>{
  const src=read('web/src/engine/room-installations.js');
  assert.ok((src.match(/L\.update\s*=\s*t=>/g)||[]).length>=4);
});
