import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const cfg=load('museum/game/progression-v2.json'), relics=load('museum/game/relics-v2.json'), unlocks=load('museum/game/unlocks-v2.json');
test('relic ids are unique and fixed rarity',()=>{const ids=relics.relics.map(x=>x.id);assert.equal(new Set(ids).size,ids.length);for(const x of relics.relics)assert.ok(cfg.rarity_rewards[x.rarity]);});
test('commercial actions never pay progression currency',()=>{for(const id of ['AFFILIATE_CLICK','SHARE_ATTEMPTED']){const rule=cfg.events[id];assert.ok(!rule||(rule.xp===0&&rule.credits===0&&rule.repeat==='never-reward'));}});
test('core information cannot be locked',()=>{assert.equal(cfg.unlock_policy.visible_product_info,'always');assert.equal(cfg.unlock_policy.safety_and_compatibility,'always');});
test('relic registry rejects commercial collectibles',()=>assert.equal(relics.relics.some(x=>x.commercial),false));
test('unlocks are nonessential progression surfaces',()=>assert.equal(unlocks.unlocks.some(x=>x.reward.type==='safety'),false));
