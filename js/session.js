// Neshimot — breath session engine.
// Builds a flat timeline of phases, then drives it from the audio clock (sample-accurate),
// scheduling sound slightly ahead so timing stays exact even when the tab is in the background.

import { expandPattern, targetLevel, roundsFor } from './data.js';

const LOOKAHEAD = 1.6; // seconds of audio scheduled in advance
const TICK_MS = 60;

export function buildTimeline(plan, { pace = 1, prep = 4 } = {}) {
  const tl = [];
  let t = 0;
  let level = 0.32;
  const push = (ph) => {
    const from = level;
    const to = targetLevel(ph, level);
    tl.push({ ...ph, start: t, end: t + ph.s, from, to });
    t += ph.s;
    level = to;
  };

  plan.forEach((item, idx) => {
    const ex = item.exercise;
    const cyc = expandPattern(ex.pattern).map((p) => ({ ...p, s: +(p.s * pace).toFixed(3) }));
    const rounds = roundsFor(ex, item, pace);
    if (idx === 0) push({ t: 'prep', s: prep, cue: 'Get ready', hint: 'Settle in · sit tall · soften the shoulders', item: idx });
    else push({ t: 'interlude', s: 8, cue: 'Next', hint: ex.name, item: idx });
    for (let r = 1; r <= rounds; r++) {
      for (const p of cyc) push({ ...p, item: idx, round: r, rounds });
    }
    if (ex.outro) push({ ...ex.outro, item: idx, round: rounds, rounds, outro: true });
  });

  // Sound annotations: merge consecutive inhales/exhales into one sustained voice.
  for (let i = 0; i < tl.length; i++) {
    const ph = tl[i];
    const prev = tl[i - 1];
    if ((ph.t === 'in' || ph.t === 'out') && !ph.perc && ph.s >= 1.2) {
      if (prev && prev.t === ph.t && prev.item === ph.item && !prev.perc && prev.s >= 1.2) {
        ph.sound = 'tick';
      } else {
        let d = ph.s;
        for (let j = i + 1; j < tl.length && tl[j].t === ph.t && tl[j].item === ph.item && !tl[j].perc && tl[j].s >= 1.2; j++) d += tl[j].s;
        ph.sound = ph.t;
        ph.soundDur = d;
      }
    } else if (ph.perc) ph.sound = 'drum';
    else if (ph.t === 'hold' && ph.s >= 2) ph.sound = ph.to > 0.5 ? 'bowl-high' : 'bowl-low';
    else if (ph.t === 'prep' || ph.t === 'interlude') ph.sound = 'bowl-low';
  }

  return { tl, total: t };
}

export class Session {
  constructor(audio, hooks = {}) {
    this.audio = audio;
    this.hooks = hooks;
    this.state = 'idle';
    this.tl = [];
    this.total = 0;
    this._raf = 0;
    this._timer = 0;
    this._phaseIdx = -1;
    this._loop = this._loop.bind(this);
    this._onCtxState = this._onCtxState.bind(this);
  }

  load(plan, opts) {
    this.stop(true);
    const { tl, total } = buildTimeline(plan, opts);
    this.tl = tl;
    this.total = total;
    this.plan = plan;
    this.state = 'ready';
    this._phaseIdx = -1;
    this._pausedAt = 0;
  }

  _clock() {
    return this._useAudioClock ? this.audio.now() : performance.now() / 1000;
  }

  elapsed() {
    if (this.state === 'running') return Math.min(this.total, this._clock() - this._anchor);
    return this._pausedAt || 0;
  }

  /** Call inside a user gesture (after audio.unlock()). */
  start() {
    if (this.state !== 'ready') return;
    this._useAudioClock = this.audio.running;
    if (this.audio.ctx) this.audio.ctx.addEventListener('statechange', this._onCtxState);
    this._pausedAt = 0;
    this._run(0);
  }

  _run(from) {
    this.state = 'running';
    this._anchor = this._clock() - from;
    this._nextSound = this._indexAt(from);
    this._resumeOffset = from;
    this._schedule();
    clearInterval(this._timer);
    this._timer = setInterval(() => this._schedule(), TICK_MS);
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._loop);
    this.hooks.onState?.('running');
  }

  pause() {
    if (this.state !== 'running') return;
    this._pausedAt = this.elapsed();
    this.state = 'paused';
    clearInterval(this._timer);
    cancelAnimationFrame(this._raf);
    this.audio.stopAll(0.3);
    this.hooks.onState?.('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this._useAudioClock = this.audio.running;
    this._run(this._pausedAt);
  }

  stop(silent) {
    clearInterval(this._timer);
    cancelAnimationFrame(this._raf);
    if (this.audio.ctx) this.audio.ctx.removeEventListener('statechange', this._onCtxState);
    if (this.state === 'running' || this.state === 'paused') this.audio.stopAll(0.4);
    const was = this.state;
    this.state = 'idle';
    if (!silent && was !== 'idle') this.hooks.onState?.('idle');
  }

  _onCtxState() {
    // An audio interruption (phone call, Siri, tab suspension) freezes the clock: pause cleanly.
    if (this.state === 'running' && this._useAudioClock && !this.audio.running) this.pause();
  }

  _indexAt(t) {
    const tl = this.tl;
    let lo = 0, hi = tl.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (tl[mid].start <= t) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  _schedule() {
    if (this.state !== 'running') return;
    const e = this.elapsed();
    if (e >= this.total) return this._complete();
    if (!this._useAudioClock || this.audio.muted) {
      // keep the pointer moving so unmuting mid-session doesn't replay old sounds
      while (this._nextSound < this.tl.length && this.tl[this._nextSound].start <= e + LOOKAHEAD) this._nextSound++;
      return;
    }
    const a = this.audio;
    while (this._nextSound < this.tl.length && this.tl[this._nextSound].start <= e + LOOKAHEAD) {
      const ph = this.tl[this._nextSound++];
      if (!ph.sound) continue;
      let when = this._anchor + ph.start;
      let dur = ph.soundDur || ph.s;
      const late = a.now() - when;
      if (late > 0.05) {
        // resuming mid-phase: play only sustained sounds, for the remaining time
        if (ph.sound !== 'in' && ph.sound !== 'out') continue;
        dur -= late;
        if (dur < 0.6) continue;
        when = a.now() + 0.02;
      }
      when = Math.max(when, a.now());
      switch (ph.sound) {
        case 'in': a.inhale(when, dur); break;
        case 'out': a.exhale(when, dur); break;
        case 'tick': a.tick(when); break;
        case 'drum': a.drum(when); break;
        case 'bowl-high': a.bowl(when, 440, 0.07); break;
        case 'bowl-low': a.bowl(when, 293.66, 0.08); break;
      }
    }
  }

  _loop() {
    if (this.state !== 'running') return;
    const e = this.elapsed();
    if (e >= this.total) return this._complete();
    this._emit(e);
    this._raf = requestAnimationFrame(this._loop);
  }

  frameAt(e) {
    const i = this._indexAt(e);
    const ph = this.tl[i];
    const p = Math.min(1, Math.max(0, (e - ph.start) / ph.s));
    let level;
    if (ph.t === 'rest' || ph.t === 'prep' || ph.t === 'interlude') {
      // natural, small breaths around a resting level
      const base = ph.from + (ph.to - ph.from) * ease(Math.min(1, p * 3));
      level = base + 0.07 * Math.sin(((e - ph.start) / 4.5) * Math.PI * 2);
    } else level = ph.from + (ph.to - ph.from) * ease(p);
    return { i, ph, p, level, e, remaining: ph.end - e };
  }

  _emit(e) {
    const f = this.frameAt(e);
    if (f.i !== this._phaseIdx) {
      const prev = this._phaseIdx;
      this._phaseIdx = f.i;
      this.hooks.onPhase?.(f.ph, prev);
    }
    this.hooks.onFrame?.(f);
  }

  /** Render a still frame (used while paused). */
  renderStill() {
    this._emit(this.elapsed());
  }

  _complete() {
    if (this.state !== 'running') return;
    clearInterval(this._timer);
    cancelAnimationFrame(this._raf);
    this._pausedAt = this.total;
    this.state = 'done';
    if (this._useAudioClock) {
      const t = this.audio.now() + 0.3;
      this.audio.bowl(t, 293.66, 0.1);
      this.audio.bowl(t + 1.4, 440, 0.07);
    }
    this.hooks.onState?.('done');
  }
}

export function ease(p) {
  return 0.5 - 0.5 * Math.cos(Math.PI * p);
}
