function texturesFromMaterial(material){
 const out=[]; if(!material||typeof material!=='object') return out;
 for(const value of Object.values(material)) if(value&&value.isTexture) out.push(value);
 return out;
}
// The caller owns residency. Pass resources retained by other live rooms before
// evicting a tree; local de-duplication alone cannot establish global ownership.
export function disposeObject3D(root,{removeFromParent=true,retainedGeometries=new Set(),retainedMaterials=new Set(),retainedTextures=new Set()}={}){
 if(!root?.traverse) return {geometries:0,materials:0,textures:0};
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(node=>{
  if(node.geometry?.dispose) geometries.add(node.geometry);
  const mats=Array.isArray(node.material)?node.material:[node.material];
  for(const m of mats.filter(Boolean)){if(m.dispose)materials.add(m);for(const t of texturesFromMaterial(m))textures.add(t);}
 });
 // A retained material also retains its textures, even when the caller only
 // supplied material ownership. Do not mutate the caller's retention sets.
 const protectedTextures=new Set(retainedTextures);
 for(const material of retainedMaterials)for(const texture of texturesFromMaterial(material))protectedTextures.add(texture);
 for(const t of protectedTextures)textures.delete(t);
 for(const m of retainedMaterials)materials.delete(m);
 for(const g of retainedGeometries)geometries.delete(g);
 for(const t of textures)t.dispose?.();
 for(const m of materials)m.dispose?.();
 for(const g of geometries)g.dispose?.();
 if(removeFromParent)root.parent?.remove?.(root);
 return {geometries:geometries.size,materials:materials.size,textures:textures.size};
}
