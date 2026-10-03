import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('mutable direct-viewer profile copy is escaped before HTML insertion',()=>{
  const src=read('web/src/main.js');
  assert.match(src,/const escHTML =/);
  assert.match(src,/escHTML\(H\.title \|\| B\.family\)/);
  assert.match(src,/escHTML\(H\.titleSpan \|\| B\.name\)/);
  assert.match(src,/escHTML\(sub\)/);
  assert.match(src,/escHTML\(PROFILE\.unavailableNote/);
});

test('external companion feed fields pass through escape and safe URL helpers',()=>{
  const src=read('web/src/ui/companion.js');
  for(const field of ['item.source','item.intern_note','data.headline','data.dek']){
    assert.match(src,new RegExp('esc\\('+field.replace('.','\\.')+''));
  }
  assert.match(src,/external\(item\.url,item\.title\)/);
  assert.match(src,/const external=.*safeURL\(url\).*esc\(label\)/s);
  assert.match(src,/safeURL/);
});

test('passport escapes user-entered profile fields before rendering',()=>{
  const src=read('web/src/passport.js');
  assert.match(src,/esc\(s\.profile\.name\)/);
  assert.match(src,/esc\(s\.profile\.country\)/);
  assert.match(src,/esc\(s\.profile\.emoji\)/);
});
