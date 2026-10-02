import test from 'node:test';
import assert from 'node:assert/strict';
import {contentVisible,eventEnabled} from '../src/engine/event-visibility.js';
import {roomAccess,productAccess,levelContent} from '../src/engine/access.js';
import {visibleProgression,emptyProgression,rewardUnlocked} from '../src/engine/progression.js';
import {itemCollection} from '../src/engine/items.js';
import {entryCatalog} from '../../tools/lib/entry-catalog.mjs';

test('held WYLD event stays absent at every level, including admin bypass',()=>{
 assert.equal(eventEnabled('wyld'),false);assert.equal(contentVisible('edition-film-sunny-side'),false);assert.equal(contentVisible('film-sunny-side'),false);
 for(let level=1;level<=10;level++)for(const admin of [false,true]){
  const options={state:{...emptyProgression(),level},admin};
  assert.equal(roomAccess('wyld',options).unlocked,false);
  assert.equal(roomAccess('wyld',options).hidden,true);
  assert.equal(productAccess({id:'edition-wyld-pink',edition:'wyld'},options).informationVisible,false);
  assert.equal(rewardUnlocked(options.state,{type:'room',id:'wyld'},{admin}),false);
  assert.doesNotMatch(JSON.stringify(levelContent(options.state,{admin})),/wyld/i);
  assert.doesNotMatch(JSON.stringify(visibleProgression(options.state,{admin})),/wyld/i);
 }
});
test('all eligible bikes can enter the landing pool without level gating; held events cannot',()=>{
 const products=[{id:'visitor',type:'bike',name:'One'},{id:'level10',type:'bike',name:'Ten'},{id:'edition-wyld-pink',edition:'wyld',type:'bike'},{id:'hidden',type:'bike',public:false}];
 assert.deepEqual(entryCatalog(products).map(x=>x.id),['visitor','level10']);
 assert.equal(contentVisible({id:'edition-film-camp-miasma'}),true);
});
test('legacy saved WYLD collection entries are hidden without mutating stored history',()=>{
 const snapshot={user_equipment:[{product_id:'product:edition-wyld-pink'}],progression:{discoveries:['edition-wyld-pink','cfr']}};
 const before=structuredClone(snapshot);
 assert.doesNotMatch(JSON.stringify(itemCollection(snapshot)),/wyld/i);
 assert.deepEqual(snapshot,before);
});
