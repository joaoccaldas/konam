// engine/route.js — waypoint plans between museum rooms.
// The hall loop still walks the points. This module only decides them, so a
// gallery-to-gallery trip stays on the nave lane instead of cutting plinths.
import { clamp } from './dom.js';

// east: rooms whose hall door is in the east wall (the default side room door is west).
// links: rooms reached through another room, e.g. { breitling: { via: 'beast', pts: [inside, through] } }.
export function planRoute(args) {
  const { to, fromRoom, toRoom, links = {} } = args;
  if (fromRoom !== toRoom && links[toRoom]) {
    const L = links[toRoom];
    const head = fromRoom === L.via ? [] : planRoute({ ...args, to: L.pts[0], toRoom: L.via });
    return [...head, ...L.pts, { x: to.x, z: to.z }];
  }
  if (fromRoom !== toRoom && links[fromRoom]) {
    const L = links[fromRoom], back = [...L.pts].reverse(), last = back[back.length - 1];
    if (toRoom === L.via) return [...back, { x: to.x, z: to.z }];
    return [...back, ...planRoute({ ...args, x: last.x, z: last.z, fromRoom: L.via })];
  }
  return planDirect(args);
}

function planDirect({ x, z, to, fromRoom, toRoom, doors = {}, east = new Set(), pierIn = [], naveLane = 13.6 }) {
  const pts = [];
  const side = room => east.has(room) ? 1 : -1;
  const aisleX = v => clamp(v, -1.2, 1.2);
  const viaAisle = (from, zz) => {
    pts.push({ x: aisleX(from.x), z: from.z });
    if (Math.abs(from.z - zz) > .6) pts.push({ x: 0, z: zz });
  };

  if (fromRoom === 'gallery' && toRoom === 'gallery') {
    pts.push({ x: naveLane, z }, { x: naveLane, z: to.z }, { x: to.x, z: to.z });
    return pts;
  }
  if (fromRoom === 'stair' && toRoom === 'gallery') {
    pts.push({ x: 10, z: 5.6 }, { x: naveLane, z: to.z }, { x: to.x, z: to.z });
    return pts;
  }
  if (fromRoom === toRoom && fromRoom !== 'hall') {
    pts.push({ x: to.x, z: to.z });
    return pts;
  }

  let from = { x, z };
  if (fromRoom === 'pier') { pts.push(...[...pierIn].reverse()); from = pierIn[0]; }
  else if (fromRoom === 'sanctuary') { pts.push({ x: 0, z: 6.2 }, { x: 0, z: 3.2 }); from = { x: 0, z: 3.2 }; }
  else if (fromRoom === 'gallery' || fromRoom === 'stair') {
    pts.push({ x: 10, z: 5.7 }, { x: 10, z: 1.5 }, { x: 8.8, z: 3.2 }, { x: 6.5, z: 3.7 }, { x: 0, z: 3.7 });
    from = { x: 0, z: 3.7 };
  } else if (fromRoom !== 'hall' && doors[fromRoom] != null) {
    pts.push({ x: 9.2 * side(fromRoom), z: doors[fromRoom] }, { x: 5.4 * side(fromRoom), z: doors[fromRoom] });
    from = pts[pts.length - 1];
  }

  if (toRoom === 'pier') { viaAisle(from, -38); pts.push(...pierIn, { x: to.x, z: to.z }); return pts; }
  if (toRoom === 'sanctuary') { viaAisle(from, 3.2); pts.push({ x: 0, z: 6.4 }, { x: to.x, z: to.z }); return pts; }
  if (toRoom === 'gallery' || toRoom === 'stair') {
    viaAisle(from, 3.0);
    pts.push({ x: 4.5, z: 3.7 }, { x: 6.5, z: 3.7 }, { x: 8.8, z: 3.2 }, { x: 10, z: 1.5 }, { x: 10, z: 5.7 }, { x: naveLane, z: to.z }, { x: to.x, z: to.z });
    return pts;
  }
  if (toRoom !== 'hall' && doors[toRoom] != null) {
    viaAisle(from, doors[toRoom]);
    pts.push({ x: 5.4 * side(toRoom), z: doors[toRoom] }, { x: 9.2 * side(toRoom), z: doors[toRoom] }, { x: to.x, z: to.z });
    return pts;
  }
  viaAisle(from, to.z);
  pts.push({ x: to.x, z: to.z });
  return pts;
}

// Sliding along a wall can still reduce distance. Progress counts only when the
// waypoint gets meaningfully closer; otherwise the waypoint is dropped.
export function noteProgress(path, waypoint, distance, dt, epsilon = 0.03, limit = 0.6) {
  if (path.goal !== waypoint || distance < (path.best ?? Infinity) - epsilon) {
    path.goal = waypoint;
    path.best = distance;
    path.stuck = 0;
    return false;
  }
  path.stuck = (path.stuck || 0) + dt;
  if (path.stuck > limit) {
    path.stuck = 0;
    path.goal = null;
    return true;
  }
  return false;
}
