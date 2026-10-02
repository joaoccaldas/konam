import * as THREE from 'three';
import {BIKE} from './data.js';
const P = globalThis.__BIKE_PROFILE || {};
export const TOUR = (P.tour && P.tour.length ? P.tour : [
  { view: 'side', title: 'A silhouette shaped by air', text: 'Deep aero sections, a close-fitting front-wheel cutout and dropped stays. This reconstruction follows Canyon’s studio profile at a fixed, wheelbase-calibrated scale.' },
  { view: 'cockpit', title: 'One integrated cockpit', text: 'AeroShield, extensions and the rear fuel tray form one continuous surface. The side profile is traced; hidden depths and internal fittings remain interpreted.' },
  { view: 'drivetrain', title: 'Every revolution counts', text: 'A 50/37 crankset, a 10–33 cassette and individually modelled chain links. Switch to Ride to see cadence drive the wheels through the selected 50 × 14 ratio.' },
  { view: 'nds', title: 'The other side of speed', text: 'Disc rotors, calipers and the wide fork stance come into view. The Splitter Plate seatpost continues the aerodynamic profile behind the saddle.' },
  { view: 'hero', title: 'The first exhibit', text: 'A study of the MY2027 Speedmax CFR AXS. Orbit freely, inspect a part, or explore the construction in exploded view. Earlier bikes will enter the collection as individually researched exhibits.' },
]);
export function makeGallery() {
  const g = new THREE.Group(); g.name = 'Museum architecture';
  const stone = new THREE.MeshStandardMaterial({color:0x070b10,roughness:.9,envMapIntensity:.15});
  const glow = new THREE.MeshBasicMaterial({color:0x384956});
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14,4,.12),stone); wall.position.set(0,2,-3.6);g.add(wall);
  for (let i=-3;i<=3;i++) {
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.085,3.2,.38),stone);
    fin.position.set(i*1.15,1.6,-3.4);g.add(fin);
    const light=new THREE.Mesh(new THREE.BoxGeometry(.008,2.7,.008),glow);
    light.position.set(i*1.15+.055,1.5,-3.18);g.add(light);
  }
  return g;
}
