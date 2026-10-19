import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCompatibility } from './compatibility.mjs';
import { auditedGeometryCell, compareGeometry } from './comparison.mjs';
const context = { bikeId: 'bike-a', componentId: 'part-a', frameSize: 'M', modelYear: 2027, buildRevision: 'rev1' };
const rule = { id: 'fit-1', bike_id: 'bike-a', component_id: 'part-a', frame_size: 'M', model_year: 2027,
  build_revision: 'rev1', result: 'compatible', review_status: 'verified', source_ref: 'OEM-MANUAL',
  source_locator: 'manual p. 15', reviewed_at: '2026-10-19' };
const catalog = { products: [
  {id:'bike-a',origin:'canyon-model'}, {id:'bike-b',origin:'photo-rebuild'},
  {id:'edition-a',origin:'museum-edition',base:'bike-a'} ] };
const s1 = {productId:'bike-a',frameSize:'M',modelYear:2027,buildRevision:'rev1'};
const s2 = {productId:'bike-b',frameSize:'L',modelYear:2024,buildRevision:'rev2'};
const dim = (metric,value) => ({metric,value,unit:'mm',definition:`${metric==='wheelbase'?'wheelbase':`frame-${metric}`}-v1`,review_status:'verified',source_ref:'OEM',source_locator:'table 1'});
const records = [
  {product_id:'bike-a',frame_size:'M',model_year:2027,build_revision:'rev1', dimensions:[dim('stack',540),dim('reach',410)]},
  {product_id:'bike-b',frame_size:'L',model_year:2024,build_revision:'rev2', dimensions:[dim('stack',560),dim('reach',420)]}
];
test('compatibility requires full variant scope',()=>{
  assert.equal(resolveCompatibility({bikeId:'bike-a',componentId:'part-a',rules:[rule]}).result,'unknown');
  assert.equal(resolveCompatibility({...context,rules:[rule]}).result,'compatible');
  assert.equal(resolveCompatibility({...context,frameSize:'S',rules:[rule]}).result,'unknown');
  assert.equal(resolveCompatibility({...context,buildRevision:'rev2',rules:[rule]}).result,'unknown');
  assert.equal(resolveCompatibility({...context,modelYear:2026,rules:[rule]}).result,'unknown');
});
test('source locator and review provenance are compulsory',()=>{
  assert.equal(resolveCompatibility({...context,rules:[{...rule,source_locator:''}]}).result,'unknown');
  assert.equal(resolveCompatibility({...context,rules:[{...rule,review_status:'candidate'}]}).result,'unknown');
});
test('conflicting reviewed compatibility fails closed',()=>{
  assert.equal(resolveCompatibility({...context,rules:[rule,{...rule,id:'fit-2',result:'incompatible'}]}).result,'unknown');
});
test('missing geometry is null, not fabricated zero',()=>{
  assert.deepEqual(auditedGeometryCell([],s1,'stack'),{status:'unknown',value:null,reason:'no reviewed, size-specific comparable geometry'});
  assert.equal(compareGeometry({catalog,selections:[s1,s2],geometryRecords:records}).deltas.wheelbase.value,null);
});
test('geometry compares only exact reviewed size and definition',()=>{
  const r=compareGeometry({catalog,selections:[s1,s2],geometryRecords:records});
  assert.equal(r.deltas.stack.value,20);
  assert.equal(r.deltas.reach.value,10);
  assert.equal(auditedGeometryCell(records,{...s1,frameSize:'S'},'stack').status,'unknown');
  const bogus={...records[0],dimensions:[{...dim('stack',600),unit:'cm'}]};
  assert.equal(auditedGeometryCell([bogus],s1,'stack').status,'unknown');
});
test('museum edition maps to physical base without creating a fake bike',()=>{
  const r=compareGeometry({catalog,selections:[{...s1,productId:'edition-a'},s2],geometryRecords:records});
  assert.equal(r.comparisons[0].baseProductId,'bike-a');
  assert.equal(r.comparisons[0].metrics.stack.value,540);
});
test('conflicting source values do not silently choose one',()=>{
  const other={...records[0],dimensions:[dim('stack',550)]};
  assert.equal(auditedGeometryCell([...records,other],s1,'stack').status,'unknown');
});
