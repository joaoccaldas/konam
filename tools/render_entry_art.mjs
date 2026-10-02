// Reproducible landing art from the shipping Canyon model and canonical livery engine.
// Offline build tool only; visitors never download Three.js to see this hero.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(new URL('../web/package.json',import.meta.url));
const {build}=require('esbuild'),puppeteer=require('puppeteer-core'),sharp=require('sharp');
const root=path.resolve(import.meta.dirname,'..');
const art=JSON.parse(fs.readFileSync(path.join(root,'museum/entry-art.json'),'utf8'));
const product=JSON.parse(fs.readFileSync(path.join(root,'museum/catalog/products.json'),'utf8')).products.find(p=>p.id===art.product);
if(!product?.glb)throw new Error('Entry product needs a catalogue GLB');
const source=`
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {slotsOf,applySkin,skinFromWyld} from './src/engine/skins.js';
import {buildAvatar} from './src/engine/avatar-models.js';
import {defaultAvatarStyle} from './src/engine/avatar.js';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(1400,880);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(28,1400/880,.01,100);
const pm=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pm.fromScene(env).texture;env.dispose();pm.dispose();
scene.add(new THREE.HemisphereLight('#d6f6ff','#31324e',1.1));
for(const [color,intensity,pos] of [['#ffffff',2.5,[2,4,5]],['#aef4e9',1.8,[-3,2,-2]],['#ff7ac1',1.1,[3,1,-3]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);scene.add(l);}
const root=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/${product.glb}')).scene;
root.traverse(o=>{if(o.userData.optional_accessory)o.visible=false});
const b=new THREE.Box3().setFromObject(root),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());
root.position.sub(c);const wrap=new THREE.Group();wrap.add(root);if(s.z>s.x)wrap.rotation.y=Math.PI/2;scene.add(wrap);
const bounds=new THREE.Box3().setFromObject(wrap),size=bounds.getSize(new THREE.Vector3());
camera.position.set(size.x*.22,size.y*.31,size.x*1.67);camera.lookAt(0,0,0);
const wyld=await fetch('/museum/wyld_room.json').then(r=>r.json());const paint=slotsOf(root);
window.renderBike=async id=>{applySkin(paint,skinFromWyld(wyld.variants.find(v=>v.id===id)));renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');};
window.renderAthlete=()=>{scene.remove(wrap);const athlete=buildAvatar(defaultAvatarStyle());scene.add(athlete);renderer.setSize(540,880);camera.aspect=540/880;camera.position.set(.6,1.26,4.7);camera.lookAt(0,1.05,0);camera.updateProjectionMatrix();renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');};
window.ready=true;
`;
const bundled=await build({stdin:{contents:source,resolveDir:path.join(root,'web'),sourcefile:'entry-art.js'},bundle:true,format:'esm',write:false});
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<body style="margin:0"><script type="module" src="/render.js"></script>');return;}
 if(req.url==='/render.js'){res.setHeader('Content-Type','text/javascript');res.end(bundled.outputFiles[0].text);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(req.url));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end();return;}fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal']});
try{
 const page=await browser.newPage();page.on('pageerror',console.error);await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready,{timeout:60000});
 const dest=path.join(root,'assets/entry');fs.mkdirSync(dest,{recursive:true});
 for(const id of art.liveries){
  const src=await page.evaluate(id=>window.renderBike(id),id);
  await sharp(Buffer.from(src.split(',')[1],'base64')).webp({quality:88,alphaQuality:95}).toFile(path.join(dest,`canyon-${id}.webp`));
 }
 const src=await page.evaluate(()=>window.renderAthlete());await sharp(Buffer.from(src.split(',')[1],'base64')).trim().webp({quality:90}).toFile(path.join(dest,'triathlete.webp'));
 console.log('Rendered Canyon hero editions and block triathlete from canonical model/liveries.');
}finally{await browser.close();server.close();}
