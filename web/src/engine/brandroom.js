// engine/brandroom.js — the scaling contract for a themed product room.
//
// A brand room is pure DATA, not code. Nike today, Cervelo / HOKA / Breitling tomorrow:
// each supplies one descriptor and the landing page builds the room, wires the walkable
// region, the rail chip, the card and the products through exactly the same path.
//
// Descriptor:
// {
//   id, name, kicker, story,
//   theme: { wall, wallRough, floor:'marble'|'travertine'|'basalt', floorBase, accent, ceil, gloss },
//   bounds: { x0, x1, z0, z1 }, height,                     // metres; must not overlap a sibling room
//   door:  { wall:'west'|'east'|'north'|'south', z0, z1, h }, // opening in the shared museum wall
//   light: { fill, fillI, accents:[{x,y,z,color,i,dist}], skyStrip:boolean },
//   products: [{ id, brand, model, type, year, glb, sub, text, source, station:{kind,x,z,rotY,top}, stats:[], buy }],
//   stations: optional explicit layout (else products auto-place in an arc)
// }
export const STATION_KINDS = ['plinth', 'float', 'wall', 'vertical', 'ceiling', 'stand'];
export const floorStyles = ['marble', 'travertine', 'basalt', 'wood'];

export function validateBrandRoom(room, siblings = []) {
  const errs = [];
  const need = (k, t) => { if (room[k] == null) errs.push(`missing ${k}`); if (t && typeof room[k] !== t) errs.push(`${k} must be ${t}`); };
  need('id', 'string'); need('name', 'string'); need('bounds', 'object'); need('theme', 'object');
  if (room.bounds) {
    for (const k of ['x0', 'x1', 'z0', 'z1']) if (typeof room.bounds[k] !== 'number') errs.push(`bounds.${k} must be number`);
    if (room.bounds.x1 <= room.bounds.x0) errs.push('bounds.x1 must exceed x0');
    if (room.bounds.z0 <= room.bounds.z1) errs.push('bounds.z0 (near) must be greater than z1 (far, more negative)');
    for (const s of siblings) {
      const b = s.bounds; if (!b) continue;
      // z runs toward -z (far is more negative), so normalise both axes before the overlap test.
      const ax0 = Math.min(room.bounds.x0, room.bounds.x1), ax1 = Math.max(room.bounds.x0, room.bounds.x1);
      const az0 = Math.min(room.bounds.z0, room.bounds.z1), az1 = Math.max(room.bounds.z0, room.bounds.z1);
      const bx0 = Math.min(b.x0, b.x1), bx1 = Math.max(b.x0, b.x1), bz0 = Math.min(b.z0, b.z1), bz1 = Math.max(b.z0, b.z1);
      const overlap = ax0 < bx1 && ax1 > bx0 && az0 < bz1 && az1 > bz0;
      if (overlap) errs.push(`bounds overlap sibling room "${s.id}"`);
    }
  }
  (room.products || []).forEach((p, i) => {
    if (!p.id) errs.push(`products[${i}] missing id`);
    if (!p.glb) errs.push(`products[${i}] (${p.id || i}) missing glb`);
    if (p.glb && !/\.glb$/i.test(p.glb)) errs.push(`products[${i}].glb must end .glb`);
  });
  return errs;
}

// Auto-layout: products stand on plinths in a gentle arc facing the door, unless a
// product pins an explicit station. Returns the same product objects with .station filled.
export function layoutStations(room) {
  const b = room.bounds, n = (room.products || []).length;
  if (!n) return room;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const radius = Math.max(1.6, Math.min(3.2, (Math.abs(b.x1 - b.x0) / 2) - 1.4));
  room.products.forEach((p, i) => {
    if (p.station && p.station.x != null) return;
    const a = (i / n) * Math.PI * 2 - Math.PI / 4;
    p.station = { kind: p.station?.kind || 'plinth', x: cx + Math.cos(a) * radius, z: cz + Math.sin(a) * radius, rotY: Math.atan2(cx - (cx + Math.cos(a) * radius), cz - (cz + Math.sin(a) * radius)), top: p.station?.top ?? 0 };
  });
  return room;
}
