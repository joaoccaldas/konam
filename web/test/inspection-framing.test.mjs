import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitPerspectiveBounds} from '../src/engine/framing.js';

test('inspection framing fits actual corners and uses the space between controls',()=>{
  const bounds=new THREE.Box3(new THREE.Vector3(-2,0,-.3),new THREE.Vector3(2,1,.3));
  for(const region of [
    {x:16,y:80,width:358,height:470,fullWidth:390,fullHeight:844},
    {x:16,y:72,width:812,height:190,fullWidth:844,fullHeight:390},
    {x:16,y:124,width:456,height:182,fullWidth:844,fullHeight:390},
  ]){
    const camera=new THREE.PerspectiveCamera(42,1,.01,50);
    const controls={target:new THREE.Vector3(),update(){camera.lookAt(this.target);}};
    fitPerspectiveBounds(camera,controls,bounds,{direction:[.2,.08,1],padding:1.12,region});
    const projected=[];
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const p=new THREE.Vector3(x,y,z).project(camera),px=(p.x+1)*region.fullWidth/2,py=(1-p.y)*region.fullHeight/2;
      assert.ok(px>=region.x&&px<=region.x+region.width&&py>=region.y&&py<=region.y+region.height);
      projected.push({x:px,y:py});
    }
    const width=Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x));
    const height=Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y));
    assert.ok(Math.max(width/region.width,height/region.height)>.7,'A fitted bike must remain large enough to inspect');
  }
});
