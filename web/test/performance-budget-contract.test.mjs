import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const budgets=JSON.parse(fs.readFileSync(path.join(root,'config/performance-budgets.json'),'utf8'));

test('3D quality budgets are monotonic and bounded',()=>{
  const {eco,balanced,high}=budgets.tiers;
  assert.ok(eco.max_visible_triangles < balanced.max_visible_triangles);
  assert.ok(balanced.max_visible_triangles < high.max_visible_triangles);
  assert.ok(eco.max_draw_calls < balanced.max_draw_calls);
  assert.ok(balanced.max_draw_calls < high.max_draw_calls);
  assert.ok(eco.texture_gpu_target_mb < balanced.texture_gpu_target_mb);
  assert.ok(balanced.texture_gpu_target_mb < high.texture_gpu_target_mb);
  for(const tier of [eco,balanced,high]){
    assert.ok(tier.dpr_min>0);
    assert.ok(tier.dpr_max>=tier.dpr_min);
    assert.ok(tier.dpr_max<=2);
  }
});

test('adaptive quality thresholds degrade in increasing frame-cost order',()=>{
  const q=budgets.quality_controller_ms;
  assert.ok(q.raise_quality_below_for_sustained_window < q.lower_dpr_above);
  assert.ok(q.lower_dpr_above < q.disable_expensive_ao_above);
  assert.ok(q.disable_expensive_ao_above < q.reduce_shadows_or_lod_above);
});

test('performance evidence covers the critical representative scenes',()=>{
  const scenes=new Set(budgets.representative_scenes);
  for(const required of ['landing-hero','garage-hero','queen-k-hall','heavy-themed-room','machine-engineering-inspection']){
    assert.ok(scenes.has(required),required+' missing from performance evidence contract');
  }
});
