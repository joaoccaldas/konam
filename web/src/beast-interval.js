// beast-interval.js — the Beast Cave's 60-second interval, as pure state.
// Holding = pushing on the pedals: power climbs with a little inertia and sags when you let go.
// The target band steps up through the minute; the score is the time spent inside it.
// No DOM, no Three.js, no storage: the room draws it, the host awards progression.

export const INTERVAL_SECONDS = 60;
export const INTERVAL_BANDS = Object.freeze([
  Object.freeze({ from: 0, to: 15, lo: 240, hi: 280, label: 'Settle' }),
  Object.freeze({ from: 15, to: 30, lo: 280, hi: 320, label: 'Build' }),
  Object.freeze({ from: 30, to: 45, lo: 310, hi: 350, label: 'Hold' }),
  Object.freeze({ from: 45, to: 60, lo: 340, hi: 385, label: 'Empty it' }),
]);
export const REWARD_SECONDS = 30;                                     // mastery, not farming: half the minute in the band

export function bandAt(t) {
  return INTERVAL_BANDS.find(b => t >= b.from && t < b.to) || INTERVAL_BANDS[INTERVAL_BANDS.length - 1];
}

export function createInterval({ seconds = INTERVAL_SECONDS, idle = 150, floor = 90, ceiling = 520 } = {}) {
  const s = { t: 0, power: idle, rate: 0, inBand: 0, streak: 0, best: 0, sum: 0, done: false, trace: [] };
  function step(dt, holding) {
    if (s.done) return s;
    dt = Math.max(0, Math.min(.1, dt));
    const push = holding ? 130 : -120;                                // W/s of intent
    s.rate += (push - s.rate) * Math.min(1, dt * 3);                  // legs have inertia
    s.power = Math.max(floor, Math.min(ceiling, s.power + s.rate * dt));
    s.t = Math.min(seconds, s.t + dt);
    const band = bandAt(s.t);
    const inside = s.power >= band.lo && s.power <= band.hi;
    if (inside) { s.inBand += dt; s.streak += dt; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    s.sum += s.power * dt;
    if (!s.trace.length || s.t - s.trace[s.trace.length - 1].t >= .25) s.trace.push({ t: s.t, w: s.power, lo: band.lo, hi: band.hi });
    if (s.t >= seconds) s.done = true;
    return s;
  }
  function result() {
    return {
      seconds: Math.round(s.t),
      inBand: Math.round(s.inBand),
      bestStreak: Math.round(s.best),
      avgWatts: s.t > 0 ? Math.round(s.sum / s.t) : 0,
      rewarded: s.inBand >= REWARD_SECONDS,
    };
  }
  return { state: s, step, result, band: () => bandAt(s.t) };
}
