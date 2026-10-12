// Interaction/geometry tests do not benchmark GPU throughput. On CI's CPU-only
// renderer, keep the real app simulation, DOM and loaded scene running while
// stepping genuine raster frames for assertions/screenshots. Full-resolution
// visual evidence and the physical device audit exercise continuous rendering.
export async function pauseSoftwareRaster(page){
 if(!process.env.CI)return;
 await page.waitForFunction(()=>window.__museum?.renderer,{polling:100});
 await page.evaluate(()=>{
  const a=window.__museum,r=a.renderer;
  if(r.__konaTestDraw)return;
  r.__konaTestDraw=r.render.bind(r);
  r.render=()=>{};
 });
}
export async function drawSoftwareFrame(page){
 if(!process.env.CI)return;
 await page.evaluate(()=>{
  const a=window.__museum;
  if(!a?.renderer.__konaTestDraw)throw Error('Software raster was not prepared');
  a.camera.updateMatrixWorld(true);
  a.renderer.__konaTestDraw(a.scene,a.camera);
  if(a.renderer.info.render.triangles<=1000)throw Error('Genuine museum geometry did not render');
 });
}
