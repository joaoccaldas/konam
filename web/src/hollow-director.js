// hollow-director.js — the dread director for The Hollow House. Pure logic, no three.js, so the rules of the
// scares are testable. The room feeds it the visitor's position and view each frame and gets back what the house
// is doing: how bright each flame is, whether lightning is up, where the Lodger stands, and which sounds to cue.
//
// House rules (these are the contract; the tests hold them):
//  - nothing ever touches, blocks or traps the visitor, and nothing takes control of the camera
//  - the Lodger only ever moves while it is out of view or while the lights are out
//  - it never comes closer than STANDOFF metres
//  - at most one lightning flash every FLASH_GAP seconds, each with a soft attack (no strobe)
//  - with reduced motion: no lightning, no flicker, no blackouts, no figure movement, only static dread
const STANDOFF = 5.2, FLASH_GAP = 13, LOOK_COS = Math.cos(.95);       // ~54 degrees either side of where the visitor is looking

export const ZONES = ['foyer', 'corridor', 'parlor', 'nursery', 'library', 'dining', 'cellar', 'door'];

export function createDirector({ zoneOf, lodgerPath, bikePos, sconces = 6, seed = 7 }) {
  let s = seed >>> 0;
  const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seen = new Set(), cues = [];
  const st = {
    nextFlash: 9 + rand() * 8, flashAt: -99, thunderAt: -1, lastFlash: -99,
    wave: null, chase: null, blackout: null,
    lodger: { i: 0, visible: false, hideUntil: 0, lookT: 0, awayT: 0, x: 0, z: 0 },
    slam: { closed: false, since: 0 }, rock: 0, bookFell: false, stingerArmed: true, cellarLeftAt: 0, windGust: 0,
  };
  const cue = (name, delay = 0) => cues.push({ name, delay });
  const lookingAt = (P, x, z) => {
    const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz) || 1;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    return (dx * fx + dz * fz) / d > LOOK_COS;
  };

  function update(t, dt, P, reduce) {
    const zone = zoneOf(P.x, P.z), inside = zone !== 'out';
    const out = { zone, inside, flash: 0, level: { all: 1, sconce: Array(sconces).fill(1), furnace: 1 }, lodger: null, doorClosed: false, rock: 0, blackout: false, cues: [] };
    if (!inside) { if (st.lodger.visible) st.lodger.visible = false; return out; }

    // ---- lightning: a soft attack and a long decay, never closer together than FLASH_GAP
    if (!reduce) {
      if (t >= st.nextFlash && t - st.lastFlash > FLASH_GAP) { st.flashAt = t; st.lastFlash = t; st.thunderAt = t + .5 + rand() * 1.8; st.nextFlash = t + 16 + rand() * 22; cue('flash'); }
      if (st.thunderAt > 0 && t >= st.thunderAt) { st.thunderAt = -1; cue('thunder'); }
      const a = t - st.flashAt;
      if (a >= 0 && a < 1.6) out.flash = a < .09 ? a / .09 : Math.exp(-(a - .09) * 3.2) * (1 + .22 * Math.sin(a * 30) * Math.exp(-a * 4));
      out.flash = Math.max(0, Math.min(1, out.flash));
    }

    // ---- first steps into each place
    const first = k => { if (seen.has(k)) return false; seen.add(k); return true; };
    if (zone === 'foyer' && P.x > 9.6 && first('slam')) { st.slam = { closed: !reduce, since: t }; if (!reduce) cue('slam'); }
    if (zone === 'foyer' && st.slam.closed && P.x < 9.2 && t - st.slam.since > 6) st.slam.closed = false;     // it lets you leave
    out.doorClosed = st.slam.closed && P.x > 10.4;
    if (zone === 'corridor' && first('wave')) { st.wave = { t0: t }; cue('whisper', .4); }
    if (zone === 'nursery' && first('nursery')) cue('musicbox', .6);
    if (zone === 'library' && first('library')) st.bookT = t + 3.2;
    if (zone === 'cellar' && first('cellar')) cue('drip');

    // ---- the corridor's lights die from the far end, then come back one by one
    if (st.wave && !reduce) {
      const a = t - st.wave.t0;
      for (let i = 0; i < sconces; i++) {
        const die = .15 + (sconces - 1 - i) * .38, back = 4.2 + i * .35;
        out.level.sconce[i] = a < die ? 1 : a < back ? 0 : Math.min(1, (a - back) * 1.6);
      }
      if (a > 4.2 + sconces * .35 + 1) st.wave = null;
      if (a > .15 && a < 4.2) out.blackout = true;
    }

    // ---- the Lodger (corridor): moves only unseen; vanishes if you hold its gaze too close
    const L = st.lodger, path = lodgerPath;
    if (reduce) {
      if (zone === 'corridor' || zone === 'foyer') { L.visible = true; L.i = path.length - 3; L.x = path[L.i][0]; L.z = path[L.i][1]; }
    } else if (zone === 'corridor' && seen.has('wave') && (!st.wave || t - st.wave.t0 > 4.5)) {
      if (!L.visible && t > L.hideUntil) { L.visible = true; L.i = path.length - 1; L.awayT = 0; L.lookT = 0; }
      if (L.visible) {
        const [lx, lz] = path[L.i], d = Math.hypot(lx - P.x, lz - P.z), seenNow = lookingAt(P, lx, lz) && d < 16;
        L.x = lx; L.z = lz;
        if (seenNow) { L.lookT += dt; L.awayT = 0; if (d < STANDOFF + 2.2 && L.lookT > 1.4) { L.visible = false; L.hideUntil = t + 22; cue('flicker'); st.blackout = { t0: t, len: .55 }; } }
        else { L.awayT += dt; L.lookT = 0; if (L.awayT > .9 && L.i > 0) { const nx = path[L.i - 1]; if (Math.hypot(nx[0] - P.x, nx[1] - P.z) >= STANDOFF) { L.i--; L.awayT = 0; } } }
      }
    } else if (zone !== 'cellar' && zone !== 'door' && !st.cellar) L.visible = false;

    // ---- brief flicker-out used when the Lodger vanishes
    if (st.blackout && !reduce && !st.blackout.cellar) { const a = t - st.blackout.t0; if (a < st.blackout.len) { out.level.all = a < .18 ? 1 - a / .18 : a > st.blackout.len - .2 ? (a - (st.blackout.len - .2)) / .2 : 0; out.blackout = true; } else st.blackout = null; }

    // ---- nursery: the chair rocks, harder while you are in the room
    st.rock += ((zone === 'nursery' ? 1 : .35) - st.rock) * (1 - Math.exp(-dt * .8));
    out.rock = reduce ? 0 : st.rock;

    // ---- library: a book leaves its shelf the moment you are not looking
    if (zone === 'library' && st.bookT && !st.bookFell && t > st.bookT && !reduce) { st.bookFell = true; st.bookFall = t; cue('thud'); }
    out.bookFall = st.bookFell ? t - st.bookFall : -1;

    // ---- the cellar: the machine nobody finished. Reach it and the lights go. The way out is lit for you.
    const nearBike = zone === 'cellar' && Math.hypot(P.x - bikePos[0], P.z - bikePos[1]) < 2.7;
    if (zone === 'cellar') st.cellarLeftAt = t; else if (t - st.cellarLeftAt > 10) st.stingerArmed = true;
    if (nearBike && st.stingerArmed && !reduce) { st.stingerArmed = false; st.cellar = { t0: t }; cue('stinger'); cue('heartbeat', .3); }
    if (st.cellar) {
      const a = t - st.cellar.t0;
      if (a < 4.6) { out.level.all = a < .12 ? 1 - a / .12 : a < 4.0 ? .02 : (a - 4.0) / .6; out.level.furnace = a < 4 ? .12 : 1; out.blackout = true; L.visible = a > .9 && a < 3.7; L.x = path[0][0] - 1.1; L.z = path[0][1]; L.cellar = true; }
      else if (a < 9.5) { L.visible = false; L.cellar = false; const b = a - 4.6; for (let i = 0; i < sconces; i++) { const lit = Math.max(0, Math.min(1, (b - (sconces - 1 - i) * .18) * 3)); out.level.sconce[i] = Math.max(out.level.sconce[i], 1) * (1 + .5 * (1 - Math.abs(lit - .5) * 2)); } if (!st.cellar.ran) { st.cellar.ran = true; cue('run'); } }
      else st.cellar = null;
    }
    out.lodger = L.visible ? { x: L.x, z: L.z, face: Math.atan2(P.x - L.x, P.z - L.z), cellar: !!L.cellar } : null;
    out.cues = cues.splice(0);                                              // each frame owns its cues; nothing is shared between frames
    return out;
  }
  return { update, state: st, STANDOFF, FLASH_GAP };
}
