// Neshimot — generative breath audio (Web Audio API, no samples).
// Inhale: a warm, rising pad in a higher register (D major, open voicing).
// Exhale: a soft, settling bass on the root. Holds: a quiet singing-bowl tone.
// Fast pumps: a muted frame-drum "dum". Optional ambience: filtered desert wind.

const N = { D2: 73.42, A2: 110, D3: 146.83, D4: 293.66, A4: 440, D5: 587.33, Fs5: 739.99, A5: 880, D6: 1174.66 };

export class BreathAudio {
  constructor() {
    this.ctx = null;
    this.muted = false; // master mute: tones + wind
    this.tonesOn = true; // breath tones only (wind keeps playing)
    this.volume = 0.85;
    this.voices = new Set();
    this.wind = null;
    this.windOn = false;
  }

  get supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Must be called synchronously inside a user gesture. */
  unlock() {
    if (!this.supported) return Promise.resolve(false);
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS: play even with the silent switch on
    } catch (_) {}
    if (!this.ctx) this._build();
    const p = this.ctx.state === 'running' ? Promise.resolve() : this.ctx.resume();
    return Promise.race([p, new Promise((r) => setTimeout(r, 600))]).then(() => this.running, () => false);
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  _build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.5;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    // tones bus — separate from the master so "Breath tones off" leaves the wind playing
    this.tones = ctx.createGain();
    this.tones.gain.value = this.tonesOn ? 1 : 0;
    this.tones.connect(this.master);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.85;
    this.dry.connect(this.tones);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(4, 2.8);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.5;
    this.reverb.connect(this.wet);
    this.wet.connect(this.tones);

    this.bus = ctx.createGain();
    this.bus.connect(this.dry);
    this.bus.connect(this.reverb);

    this.noise = this._pinkNoise(6);
    if (this.windOn) this._startWind();
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _pinkNoise(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
    }
    return buf;
  }

  _track(gain, sources, until) {
    const v = { gain, sources, until };
    this.voices.add(v);
    const last = sources[sources.length - 1];
    if (last) last.onended = () => this.voices.delete(v);
  }

  _osc(type, freq, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    return o;
  }

  _air(when, dur, f0, f1, peak, dest) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0, when);
    bp.frequency.exponentialRampToValueAtTime(f1, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.35);
    n.connect(bp);
    bp.connect(g);
    g.connect(dest);
    n.start(when, Math.random() * 3);
    n.stop(when + dur + 0.5);
    return n;
  }

  /** Rising pad — higher register. */
  inhale(when, dur) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const end = when + dur;
    const rel = Math.min(1.5, 0.45 + dur * 0.16);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, when);
    out.gain.linearRampToValueAtTime(0.15, when + Math.min(dur * 0.45, 1.8));
    out.gain.linearRampToValueAtTime(0.24, end);
    out.gain.setTargetAtTime(0.0001, end, rel / 4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(480, when);
    lp.frequency.exponentialRampToValueAtTime(2800, end);
    lp.frequency.setTargetAtTime(900, end, rel / 3);
    lp.connect(out);
    out.connect(this.bus);

    const sources = [];
    const voicing = [
      [N.D4, 0.26],
      [N.A4, 0.22],
      [N.D5, 0.15],
      [N.Fs5, 0.07],
    ];
    for (const [f, g] of voicing) {
      for (const det of [-6, 6]) {
        const o = this._osc('triangle', f, det);
        const og = ctx.createGain();
        og.gain.value = g;
        o.connect(og);
        og.connect(lp);
        o.start(when);
        o.stop(end + rel + 0.2);
        sources.push(o);
      }
    }
    // a slow shimmer an octave up
    const sh = this._osc('sine', N.A5);
    const shg = ctx.createGain();
    shg.gain.setValueAtTime(0.0001, when);
    shg.gain.linearRampToValueAtTime(0.025, end);
    shg.gain.setTargetAtTime(0.0001, end, rel / 4);
    sh.connect(shg);
    shg.connect(lp);
    sh.start(when);
    sh.stop(end + rel + 0.2);
    sources.unshift(sh);
    sources.unshift(this._air(when, dur, 900, 2600, 0.22, out));
    this._track(out, sources, end + rel);
  }

  /** Settling bass — lower register. Harmonics keep it audible on phone speakers. */
  exhale(when, dur) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const end = when + dur;
    const rel = Math.min(1.8, 0.6 + dur * 0.16);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, when);
    out.gain.linearRampToValueAtTime(0.32, when + Math.min(0.7, dur * 0.3));
    out.gain.linearRampToValueAtTime(0.16, end);
    out.gain.setTargetAtTime(0.0001, end, rel / 4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(1100, when);
    lp.frequency.exponentialRampToValueAtTime(280, end);
    lp.connect(out);
    out.connect(this.bus);

    const sources = [];
    const layers = [
      ['sine', N.D2, 0.5, 0],
      ['sawtooth', N.D2, 0.07, 4],
      ['sine', N.A2, 0.2, 0],
      ['triangle', N.D3, 0.22, -4],
    ];
    for (const [type, f, g, det] of layers) {
      const o = this._osc(type, f, det);
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(lp);
      o.start(when);
      o.stop(end + rel + 0.2);
      sources.push(o);
    }
    sources.unshift(this._air(when, dur, 700, 260, 0.14, out));
    this._track(out, sources, end + rel);
  }

  /** Singing-bowl partials with gentle beating. */
  bowl(when, base = N.A4, amp = 0.09) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.bus);
    const sources = [];
    // longest-lived partial last, so the voice is cleaned up only when it has fully rung out
    const partials = [
      [8.93, 0.06, 1.1],
      [5.4, 0.14, 1.8],
      [2.76, 0.32, 2.8],
      [1, 1, 4.2],
    ];
    for (const [ratio, g, decay] of partials) {
      for (const beat of [1, 1.0035]) {
        const o = this._osc('sine', base * ratio * beat);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, when);
        og.gain.linearRampToValueAtTime(amp * g * 0.5, when + 0.012);
        og.gain.exponentialRampToValueAtTime(0.0001, when + decay);
        o.connect(og);
        og.connect(out);
        o.start(when);
        o.stop(when + decay + 0.05);
        sources.push(o);
      }
    }
    this._track(out, sources, when + 4.3);
  }

  tick(when) {
    this.bowl(when, N.D6, 0.035);
  }

  /** Muted frame-drum "dum" for fast, percussive exhales. */
  drum(when, amp = 0.42) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.dry);
    const o = this._osc('sine', 150);
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(58, when + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(amp, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.38);
    o.connect(g);
    g.connect(out);
    o.start(when);
    o.stop(when + 0.42);
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, when);
    ng.gain.linearRampToValueAtTime(0.5, when + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(out);
    n.start(when, Math.random() * 3);
    n.stop(when + 0.12);
    this._track(out, [n, o], when + 0.45);
  }

  /** Fade out and silence everything that is playing or scheduled. */
  stopAll(fade = 0.25) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(v.gain.gain.value, t);
        v.gain.gain.linearRampToValueAtTime(0, t + fade);
        for (const s of v.sources) {
          try {
            s.stop(t + fade + 0.05);
          } catch (_) {}
        }
      } catch (_) {}
    }
    this.voices.clear();
  }

  /** True when nothing scheduled would be heard — lets the session skip scheduling. */
  get silent() {
    return this.muted || !this.tonesOn;
  }

  setTonesOn(on) {
    this.tonesOn = on;
    if (this.ctx) this.tones.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.06);
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.06);
  }

  setWind(on) {
    this.windOn = on;
    if (!this.ctx) return;
    if (on) this._startWind();
    else this._stopWind();
  }

  _startWind() {
    if (this.wind) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.6;
    const bp = ctx.createBiquadFilter();
    bp.type = 'peaking';
    bp.frequency.value = 900;
    bp.gain.value = 5;
    bp.Q.value = 1.4;
    const lfo = this._osc('sine', 0.06);
    const lfoG = ctx.createGain();
    lfoG.gain.value = 260;
    lfo.connect(lfoG);
    lfoG.connect(lp.frequency);
    const lfo2 = this._osc('sine', 0.11);
    const lfo2G = ctx.createGain();
    lfo2G.gain.value = 350;
    lfo2.connect(lfo2G);
    lfo2G.connect(bp.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 2.5);
    src.connect(lp);
    lp.connect(bp);
    let tail = bp;
    let lfo3 = null;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      lfo3 = this._osc('sine', 0.045);
      const lfo3G = ctx.createGain();
      lfo3G.gain.value = 0.6;
      lfo3.connect(lfo3G);
      lfo3G.connect(pan.pan);
      bp.connect(pan);
      tail = pan;
      lfo3.start(t);
    }
    tail.connect(g);
    g.connect(this.master);
    src.start(t);
    lfo.start(t);
    lfo2.start(t);
    this.wind = { src, g, lfos: [lfo, lfo2, lfo3].filter(Boolean) };
  }

  _stopWind() {
    if (!this.wind) return;
    const t = this.ctx.currentTime;
    const { src, g, lfos } = this.wind;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 1.5);
    src.stop(t + 1.6);
    lfos.forEach((l) => l.stop(t + 1.6));
    this.wind = null;
  }

  /** A short preview so people can hear the voices before starting. */
  preview() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    this.inhale(t, 2.2);
    this.exhale(t + 2.3, 2.6);
  }
}
