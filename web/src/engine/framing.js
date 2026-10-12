// Shared perspective framing. The caller owns the measured canvas and object bounds.
export function framingDistance(radius,verticalFov,aspect,padding=1.18){
  if(!(radius>0&&aspect>0&&verticalFov>0&&verticalFov<180))return 4;
  const vertical=verticalFov*Math.PI/360;
  const horizontal=Math.atan(Math.tan(vertical)*aspect);
  return radius/Math.sin(Math.min(vertical,horizontal))*padding;
}
export function setPerspectiveRegion(camera,{x=0,y=0,width,height,fullWidth,fullHeight}){
  camera.aspect=fullWidth/fullHeight;
  camera.setViewOffset(fullWidth,fullHeight,fullWidth/2-x-width/2,fullHeight/2-y-height/2,fullWidth,fullHeight);
  camera.updateProjectionMatrix();
  return {verticalFov:2*Math.atan(Math.tan(camera.fov*Math.PI/360)*height/fullHeight)*180/Math.PI,aspect:width/height};
}
export function fitPerspectiveBounds(camera,controls,bounds,{direction=[.24,.08,1],padding=1.18,region=null}={}){
  const center=bounds.getCenter(camera.position.clone());
  const radius=bounds.getSize(camera.position.clone()).length()/2;
  const fit=region?setPerspectiveRegion(camera,region):{verticalFov:camera.fov,aspect:camera.aspect};
  const axis=center.clone().set(...direction).normalize();
  const right=center.clone().crossVectors(camera.up,axis).normalize();
  if(right.lengthSq()<1e-8)right.set(1,0,0);
  const up=center.clone().crossVectors(axis,right).normalize();
  const vertical=Math.tan(fit.verticalFov*Math.PI/360),horizontal=vertical*fit.aspect;
  let distance=0;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const point=center.clone().set(x,y,z).sub(center);
    distance=Math.max(distance,point.dot(axis)+Math.max(Math.abs(point.dot(right))/horizontal,Math.abs(point.dot(up))/vertical));
  }
  distance=Math.max(.1,distance*padding);
  controls.target.copy(center);
  camera.position.copy(center).add(axis.multiplyScalar(distance));
  controls.minDistance=distance*.65;controls.maxDistance=distance*2;
  camera.far=Math.max(50,distance*4);camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld(true);
  return distance;
}
