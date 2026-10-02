import * as THREE from 'three';
export function makePaint(material,{flyTo,download,getCfg}) {
 const root=document.querySelector('#build'),box=document.createElement('section');box.className='paint-studio';
 box.innerHTML=`<h3>Your artwork. Your bike.</h3><p class="note">Project an image onto the painted frame and fork. PNG, JPEG or WebP, up to 12 MB. Stays on this device.</p><label class="lab-upload">Upload artwork<input id="paintFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p id="paintStatus" class="note" role="status">No artwork loaded.</p><div id="paintControls" hidden><div class="lab-grid">${[['scale','Artwork size',.3,3,.01,1],['x','Move forward',-.8,.8,.01,0],['y','Move up',-.8,.8,.01,0],['angle','Rotate · degrees',-180,180,1,0],['opacity','Image opacity',0,1,.01,1]].map(([k,l,min,max,step,val])=>`<label class="lab-field">${l}<input type="range" id="paint-${k}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`).join('')}</div><label class="check">Repeat pattern<input id="paint-repeat" type="checkbox"></label><div class="actions"><button id="paint-save">Save painted exhibit</button><button id="paint-remove">Remove artwork</button></div><p class="note">Copy-link and master GLB omit artwork. “Save painted exhibit” embeds it in a new offline HTML file.</p></div>`;
 // after the colours and setup, so a phone opens straight onto the colourways
 root.insertBefore(box,[...root.querySelectorAll('h3')].find(h=>/Wheel artwork/.test(h.textContent))||root.querySelector('.actions'));
 const U={artTexture:{value:new THREE.Texture()},artOn:{value:0},artScale:{value:1},artOffset:{value:new THREE.Vector2()},artAngle:{value:0},artOpacity:{value:1},artAspect:{value:1},artRepeat:{value:0}};
 const prevOBC=material.onBeforeCompile,prevKey=material.customProgramCacheKey;   // chain: keep micro-noise / wyld shader edits
 material.onBeforeCompile=(shader,renderer)=>{
  if(prevOBC)prevOBC.call(material,shader,renderer);
  Object.assign(shader.uniforms,U);
  shader.vertexShader='varying vec3 artPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nartPosition = (modelMatrix * vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='varying vec3 artPosition; uniform sampler2D artTexture; uniform float artOn,artScale,artAngle,artOpacity,artAspect,artRepeat; uniform vec2 artOffset;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  if(artOn>0.5){vec2 p=(artPosition.xy-vec2(.12,.64)-artOffset);float c=cos(artAngle),s=sin(artAngle);p=mat2(c,-s,s,c)*p;vec2 uv=p/vec2(.95*artScale,.95*artScale/artAspect)+.5;float mask=step(0.,uv.x)*step(0.,uv.y)*step(uv.x,1.)*step(uv.y,1.);if(artRepeat>.5){uv=fract(uv);mask=1.;}vec4 art=texture2D(artTexture,uv);diffuseColor.rgb=mix(diffuseColor.rgb,art.rgb,art.a*artOpacity*mask);}`);
 };
 material.customProgramCacheKey=()=>'museum-art-v1'+(prevKey?'|'+prevKey.call(material):'');material.needsUpdate=true;
 let encoded=null,serial=0;
 const $=id=>document.getElementById(id);
 const settings=()=>Object.fromEntries(['scale','x','y','angle','opacity'].map(k=>[k,+$('paint-'+k).value]).concat([['repeat',$('paint-repeat').checked]]));
 function update(){const s=settings();U.artScale.value=s.scale;U.artOffset.value.set(s.x,s.y);U.artAngle.value=s.angle*Math.PI/180;U.artOpacity.value=s.opacity;U.artRepeat.value=+s.repeat;}
 for(const k of ['scale','x','y','angle','opacity','repeat'])$('paint-'+k).oninput=update;
 async function install(url,label){
  const id=++serial,img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This image could not be decoded.'));img.src=url;});if(id!==serial)return;
  if(img.width*img.height>60e6)throw Error('Image exceeds 60 megapixels. Resize it before uploading.');
  const c=document.createElement('canvas'),scale=Math.min(1,2048/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  encoded=c.toDataURL('image/png');const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;U.artTexture.value.dispose();U.artTexture.value=t;U.artAspect.value=c.width/c.height;U.artOn.value=1;
  document.body.classList.add('painting');$('paintControls').hidden=false;$('paintStatus').textContent=`${label} · ${c.width} × ${c.height} · local preview`;update();
 }
 $('paintFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;let url;try{if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>12*1024*1024)throw Error('Use PNG, JPEG or WebP up to 12 MB.');url=URL.createObjectURL(f);await install(url,f.name);flyTo('side');}catch(e){$('paintStatus').textContent=e.message;}finally{if(url)URL.revokeObjectURL(url);$('paintFile').value='';}};
 $('paint-remove').onclick=()=>{serial++;U.artOn.value=0;U.artTexture.value.dispose();U.artTexture.value=new THREE.Texture();encoded=null;document.body.classList.remove('painting');$('paintControls').hidden=true;$('paintStatus').textContent='Artwork removed.';};
 $('paint-save').onclick=()=>{
  if(!encoded)return;
  // Clone the document and return all UI to boot state. App creates its dynamic panels again.
  const doc=document.documentElement.cloneNode(true);for(const id of ['lab','lab-hud'])doc.querySelector('#'+id)?.remove();doc.querySelector('.paint-studio')?.remove();doc.querySelector('#museum-paint-data')?.remove();
  doc.querySelector('body').classList.remove('ready','engaged');doc.querySelectorAll('.drawer').forEach(d=>d.classList.remove('open'));doc.querySelector('#tour').hidden=true;
  const script=document.createElement('script');script.id='museum-paint-data';script.textContent='window.__MUSEUM_PAINT='+JSON.stringify({image:encoded,settings:settings()})+';window.__MUSEUM_CFG='+JSON.stringify(getCfg()).replace(/</g,'\\u003c')+';';doc.querySelector('body').prepend(script);
  download(new Blob(['<!doctype html>\n'+doc.outerHTML],{type:'text/html'}),'Speedmax_Your_Paint.html');
 };
 if(window.__MUSEUM_PAINT){const data=window.__MUSEUM_PAINT;for(const [k,v] of Object.entries(data.settings||{})){if($('paint-'+k))k==='repeat'?$('paint-'+k).checked=!!v:$('paint-'+k).value=v;}install(data.image,'Embedded artwork').catch(e=>$('paintStatus').textContent=e.message);}
 return {get enabled(){return U.artOn.value===1;},uniforms:U};
}
