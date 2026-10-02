// Shared perspective framing. The caller owns the measured canvas and object bounds.
export function framingDistance(radius,verticalFov,aspect,padding=1.18){
  if(!(radius>0&&aspect>0&&verticalFov>0&&verticalFov<180))return 4;
  const vertical=verticalFov*Math.PI/360;
  const horizontal=Math.atan(Math.tan(vertical)*aspect);
  return radius/Math.sin(Math.min(vertical,horizontal))*padding;
}
export function fitPerspectiveBounds(camera,controls,bounds,{direction=[.24,.08,1],padding=1.18}={}){
  const center=bounds.getCenter(camera.position.clone());
  const radius=bounds.getSize(camera.position.clone()).length()/2;
  const distance=framingDistance(radius,camera.fov,camera.aspect,padding);
  controls.target.copy(center);
  camera.position.copy(center).add(center.clone().set(...direction).normalize().multiplyScalar(distance));
  controls.minDistance=distance*.65;controls.maxDistance=distance*2;
  camera.far=Math.max(50,distance*4);camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld(true);
  return distance;
}
