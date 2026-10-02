import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../../museum/places/kona-v1.json',import.meta.url),'utf8'));
test('places use stable ids and sourced websites',()=>{for(const p of data.places){assert.match(p.id,/^place:/);assert.match(p.website,/^https:\/\//);assert.match(p.source.url,/^https:\/\//);}});
test('commercial status cannot silently imply ranking',()=>{assert.match(data.ranking_policy,/independent of commercial status/);for(const p of data.places)assert.ok(p.partner?.status);});
