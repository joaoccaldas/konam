import * as THREE from 'three';
import reference from '../../assets/reference/zipp-super9-b1.png';
export const ZIPP={name:'Zipp Super-9 · B1',url:'https://www.sram.com/en/zipp/models/wh-sp9-tld-b1',mass:1050,inside:23,outside:30.4,minTyre:28,maxBar:5,systemKg:115};
export function makeZipp(parent){
 const profile=[[.012,.019],[.035,.016],[.075,.0152],[.23,.0152],[.285,.0152],[.303,.0148],[.311,.012],[.311,-.012],[.303,-.0148],[.285,-.0152],[.23,-.0152],[.075,-.0152],[.035,-.016],[.012,-.019],[.012,.019]];
 const geo=new THREE.LatheGeometry(profile.map(x=>new THREE.Vector2(...x)),160);geo.rotateX(Math.PI/2);const pos=geo.attributes.position,uv=geo.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,.5+pos.getX(i)/.311*(543/1336)*(pos.getZ(i)>0?1:-1),.5+pos.getY(i)/.311*(543/1336));
 const tex=new THREE.TextureLoader().load(reference);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
 const mat=new THREE.MeshPhysicalMaterial({map:tex,color:0x999999,roughness:.63,clearcoat:.10,envMapIntensity:.3});const mesh=new THREE.Mesh(geo,mat);mesh.name='Zipp Super-9 B1 reconstructed shell';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.baseMat=mat;
 const group=new THREE.Group();group.name='Zipp Super-9 B1 option';group.add(mesh);group.visible=false;parent.add(group);return group;
}
