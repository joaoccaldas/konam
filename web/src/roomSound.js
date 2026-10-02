// roomSound.js — one synthesised bed per theme room, crossfaded by where you stand.
// No audio files: noise buffers, oscillators and a few scheduled one-shots (drips, a heartbeat,
// a groan), which only fire while their room is the one you are in. Opt-in with the Sound button.
export function createRoomSound(ctx, out) {
  const now = () => ctx.currentTime;
  const noise = (secs = 3) => {
    const len = ctx.sampleRate * secs, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.start(); return src;
  };
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const lfo = (f, depth, param) => { const o = osc('sine', f), g = gain(depth); o.connect(g).connect(param); return o; };
  const beds = {};
  const bed = id => { const g = gain(0); g.connect(out); beds[id] = g; return g; };

  { // Bio: a wet low hum, leaves moving, and drips
    const g = bed('bio');
    const hum = osc('sine', 55), hg = gain(.18); lfo(.13, .08, hg.gain); hum.connect(hg).connect(g);
    const rustle = noise(), bp = filt('bandpass', 2400, .7), rg = gain(.05); lfo(.21, .04, rg.gain); rustle.connect(bp).connect(rg).connect(g);
  }
  { // Horror: two saws a hair apart (they beat), a mains buzz for the bulb, and a heartbeat
    const g = bed('horror');
    const lp = filt('lowpass', 170, .8), dg = gain(.16);
    osc('sawtooth', 41).connect(lp); osc('sawtooth', 43.3).connect(lp); lp.connect(dg).connect(g);
    const buzz = osc('square', 100), bz = filt('bandpass', 1200, 6), bg = gain(.012); buzz.connect(bz).connect(bg).connect(g);
  }
  { // Alien: three sines in fifths drifting against each other, and a swept air band (the scan)
    const g = bed('alien');
    for (const [f, v] of [[196, .05], [294, .035], [441, .02]]) { const o = osc('sine', f); lfo(.07 + f / 4000, 1.6, o.frequency); const og = gain(v); o.connect(og).connect(g); }
    const air = noise(), bp = filt('bandpass', 900, 8), ag = gain(.06); lfo(.14, 700, bp.frequency); air.connect(bp).connect(ag).connect(g);
  }
  { // Zombie: wind across an open yard and the sodium lamp's hum
    const g = bed('zombie');
    const wind = noise(), bp = filt('bandpass', 380, .9), wg = gain(.2); lfo(.09, .1, wg.gain); lfo(.05, 160, bp.frequency); wind.connect(bp).connect(wg).connect(g);
    const hum = osc('sawtooth', 120), lp = filt('lowpass', 420), hg = gain(.012); hum.connect(lp).connect(hg).connect(g);
  }

  const blip = (id, fn) => { if (active === id) fn(beds[id]); };
  const drip = g => {
    const o = osc('sine', 900 + Math.random() * 1400), e = gain(0), t = now();
    o.frequency.setTargetAtTime(o.frequency.value * .45, t, .05);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.12, t + .005); e.gain.exponentialRampToValueAtTime(.0001, t + .35);
    o.connect(e).connect(g); o.stop(t + .4);
  };
  const thump = (g, t, v) => {
    const o = osc('sine', 62), e = gain(0);
    o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(42, t + .16);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(v, t + .012); e.gain.exponentialRampToValueAtTime(.0001, t + .28);
    o.connect(e).connect(g); o.stop(t + .32);
  };
  const groan = g => {
    const o = osc('sawtooth', 90 + Math.random() * 40), lp = filt('lowpass', 520, 4), e = gain(0), t = now(), len = 1.2 + Math.random() * 1.4;
    o.frequency.setTargetAtTime(o.frequency.value * .72, t, len * .5); lfo(5 + Math.random() * 3, 3, o.frequency);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.05, t + .3); e.gain.linearRampToValueAtTime(0, t + len);
    o.connect(lp).connect(e).connect(g); o.stop(t + len + .1);
  };
  const ping = g => {
    const o = osc('sine', 1760 + Math.random() * 880), e = gain(0), t = now();
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.035, t + .01); e.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
    o.connect(e).connect(g); o.stop(t + 1.7);
  };
  let active = null, beat = 0;
  const timer = setInterval(() => {
    if (ctx.state !== 'running' || !active) return;
    if (Math.random() < .35) blip('bio', drip);
    if (active === 'horror' && (beat = (beat + 1) % 4) === 0) { const t = now() + .02; thump(beds.horror, t, .5); thump(beds.horror, t + .24, .32); }
    if (Math.random() < .07) blip('zombie', groan);
    if (Math.random() < .09) blip('alien', ping);
  }, 280);

  return {
    set(id) {                                                         // id: 'bio' | 'horror' | 'alien' | 'zombie' | null
      if (id === active) return;
      active = id;
      for (const [k, g] of Object.entries(beds)) g.gain.setTargetAtTime(k === id ? 1 : 0, now(), .8);
    },
    stop() { clearInterval(timer); },
  };
}
