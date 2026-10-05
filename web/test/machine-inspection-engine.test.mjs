import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {blenderVectorToThree,indexMachine,createExplosionController} from '../src/engine/machine-inspection.js';

function fixture(){
  const root=new THREE.Group();
  const frame=new THREE.Group();frame.userData.part='frame';frame.userData.explode=[0,0,0];root.add(frame);
  const fork=new THREE.Group();fork.userData.part='fork';fork.userData.explode=[1,2,3];root.add(fork);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());fork.add(mesh);
  return {root,frame,fork,mesh};
}

test('canonical Blender vector conversion is global',()=>{
  const v=blenderVectorToThree([1,2,3]);
  assert.deepEqual(v.toArray(),[1,3,-2]);
});

test('machine index discovers stable parts, meshes and explode nodes once',()=>{
  const {root,mesh}=fixture();
  const i=indexMachine(root);
  assert.ok(i.parts.frame);
  assert.ok(i.parts.fork);
  assert.equal(i.meshesByPart.fork[0],mesh);
  assert.equal(i.explodables.length,2);
});

test('global controller explodes and assembles the same nodes',()=>{
  const {root,fork}=fixture();
  const c=createExplosionController(indexMachine(root),{distanceScale:1.15});
  const base=fork.position.clone();
  c.explode({immediate:true});
  assert.ok(fork.position.distanceTo(base)>0.1);
  c.assemble({immediate:true});
  assert.ok(fork.position.distanceTo(base)<1e-9);
});

test('reduced motion uses the configured fast rate without forking explode math',()=>{
  const {root}=fixture();
  const c=createExplosionController(indexMachine(root),{speed:1,reducedSpeed:10});
  c.setExploded(true);
  c.update(1/60,{reduced:true});
  assert.ok(c.value>0.1 && c.value<1);
});

test('part lookup climbs from mesh to nearest semantic part',()=>{
  const {root,mesh}=fixture();
  const c=createExplosionController(indexMachine(root));
  assert.equal(c.partOf(mesh),'fork');
});


test('measuring expanded geometry restores the live part positions and target even after failure',()=>{
  const {root,fork}=fixture(),inspection=createExplosionController(indexMachine(root));
  inspection.setProgress(.25,{immediate:true});inspection.target=.75;
  const before=fork.position.clone();
  const full=inspection.measureAtProgress(1,root=>new THREE.Box3().setFromObject(root));
  const live=new THREE.Box3().setFromObject(root);
  assert.ok(full.max.distanceTo(live.max)>1);
  assert.deepEqual(fork.position.toArray(),before.toArray());assert.equal(inspection.value,.25);assert.equal(inspection.target,.75);
  assert.throws(()=>inspection.measureAtProgress(1,()=>{throw new Error('measurement failed');}));
  assert.deepEqual(fork.position.toArray(),before.toArray());assert.equal(inspection.target,.75);
});
