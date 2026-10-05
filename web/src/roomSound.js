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

  { // Haunt: a house-sized drone (two sines that beat), wind in the eaves, rain on glass
    const g = bed('haunt');
    const d1 = osc('sine', 46), d2 = osc('sine', 49.4), dg = gain(.16); lfo(.07, .06, dg.gain); d1.connect(dg); d2.connect(dg); dg.connect(g);
    const wind = noise(6), wbp = filt('bandpass', 420, 1.4), wg = gain(.1); lfo(.05, 200, wbp.frequency); lfo(.11, .05, wg.gain); wind.connect(wbp).connect(wg).connect(g);
    const rain = noise(4), rhp = filt('highpass', 3200, .5), rg = gain(.028); rain.connect(rhp).connect(rg).connect(g);
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

  // One-shots the Hollow House's director asks for. All synthesised; nothing plays unless the visitor opted in to sound.
  const burst = (secs, f, type, v, t0, q = 1) => { const n = noise(secs + .2), fl = filt(type, f, q), e = gain(0); e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(v, t0 + .02); e.gain.exponentialRampToValueAtTime(.0001, t0 + secs); n.connect(fl).connect(e).connect(beds.haunt); n.stop(t0 + secs + .2); };
  const CUES = {
    slam: t => { burst(.5, 220, 'lowpass', .5, t); thump(beds.haunt, t, .8); },
    thunder: t => { burst(3.2, 140, 'lowpass', .55, t); burst(2.2, 70, 'lowpass', .5, t + .15); },
    whisper: t => { for (let i = 0; i < 3; i++) burst(1.1, 1800 + i * 500, 'bandpass', .05, t + i * .7, 5); },
    drip: t => drip(beds.haunt),
    thud: t => { thump(beds.haunt, t, .7); burst(.25, 600, 'bandpass', .12, t); },
    flicker: t => { burst(.2, 2400, 'highpass', .08, t); burst(.35, 110, 'lowpass', .2, t); },
    musicbox: t => { [659, 622, 659, 622, 659, 494, 587, 523, 440, 0, 262, 330, 440, 494].forEach((f, i) => { if (!f) return; const o = osc('sine', f), e = gain(0), at = t + i * .42; e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(.05, at + .01); e.gain.exponentialRampToValueAtTime(.0001, at + 1.3); o.connect(e).connect(beds.haunt); o.stop(at + 1.4); }); },
    stinger: t => { const a = osc('sawtooth', 77), b = osc('sawtooth', 81.5), lp = filt('lowpass', 900, 3), e = gain(0); a.frequency.exponentialRampToValueAtTime(240, t + 1.4); b.frequency.exponentialRampToValueAtTime(250, t + 1.4); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.16, t + 1.2); e.gain.linearRampToValueAtTime(0, t + 1.6); a.connect(lp); b.connect(lp); lp.connect(e).connect(beds.haunt); a.stop(t + 1.7); b.stop(t + 1.7); },
    heartbeat: t => { for (let i = 0; i < 9; i++) { const at = t + i * (.72 - i * .04); thump(beds.haunt, at, .55); thump(beds.haunt, at + .22, .33); } },
    run: t => { for (let i = 0; i < 4; i++) { const o = osc('sine', 392 * 2 ** (i / 4)), e = gain(0), at = t + i * .18; e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(.04, at + .01); e.gain.exponentialRampToValueAtTime(.0001, at + 1.2); o.connect(e).connect(beds.haunt); o.stop(at + 1.3); } },
  };
  let active = null, beat = 0;
  const timer = setInterval(() => {
    if (ctx.state !== 'running' || !active) return;
    if (Math.random() < .35) blip('bio', drip);
    if (active === 'horror' && (beat = (beat + 1) % 4) === 0) { const t = now() + .02; thump(beds.horror, t, .5); thump(beds.horror, t + .24, .32); }
    if (Math.random() < .07) blip('zombie', groan);
    if (Math.random() < .09) blip('alien', ping);
    if (Math.random() < .06) blip('haunt', groan);
    if (Math.random() < .03) blip('haunt', g => thump(g, now() + .02, .22));       // footsteps somewhere upstairs
  }, 280);

  return {
    set(id) {                                                         // id: 'bio' | 'horror' | 'alien' | 'zombie' | null
      if (id === active) return;
      active = id;
      for (const [k, g] of Object.entries(beds)) g.gain.setTargetAtTime(k === id ? 1 : 0, now(), .8);
    },
    cue(name, delay = 0) { const fn = CUES[name]; if (fn && ctx.state === 'running' && active === 'haunt') fn(now() + .03 + delay); },
    stop() { clearInterval(timer); },
  };
}
