// Neshimot — application controller.
import { RITUALS, byId, cycleSeconds, roundsFor } from './data.js';
import { BreathAudio } from './audio.js';
import { Session } from './session.js';
import { segmentsFor, levelAt } from './graphs.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pad2 = (n) => String(n).padStart(2, '0');
const clock = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
};

/* ---------------- storage (per-device conveniences) ---------------- */
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (_) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (_) {}
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch (_) {}
  },
};

// one-time migration of saved settings and history from the site's earlier name
for (const k of ['prefs', 'log', 'cp']) {
  const old = store.get(`ruach.${k}`, null);
  if (old != null && store.get(`neshimot.${k}`, null) == null) store.set(`neshimot.${k}`, old);
}

const prefs = Object.assign({ sound: true, wind: false, voice: false, haptic: true, pace: 1 }, store.get('neshimot.prefs', {}));
const savePrefs = () => store.set('neshimot.prefs', prefs);

/* ---------------- stars ---------------- */
function scatterStars(el, n) {
  if (!el) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    const size = Math.random() < 0.12 ? 2.4 : Math.random() * 1.4 + 0.8;
    s.style.cssText = `left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.pow(Math.random(), 1.4) * 100).toFixed(2)}%;--s:${size.toFixed(1)}px;--o:${(Math.random() * 0.6 + 0.3).toFixed(2)};--d:${(Math.random() * 5 + 3).toFixed(1)}s;--delay:${(-Math.random() * 8).toFixed(1)}s`;
    frag.appendChild(s);
  }
  el.appendChild(frag);
}

/* ---------------- nav, reveal, parallax ---------------- */
function initChrome() {
  const nav = $('#nav');
  const hero = $('.hero');
  const dunes = $$('.dune');
  const sun = $('.sun');
  const heroInner = $('.hero-inner');
  let ticking = false;

  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (!reduceMotion.matches && y < hero.offsetHeight * 1.1) {
      dunes.forEach((d) => (d.style.transform = `translateY(${(y * +d.dataset.depth).toFixed(1)}px)`));
      sun.style.translate = `0 ${(y * 0.35).toFixed(1)}px`;
      heroInner.style.opacity = Math.max(0, 1 - y / (hero.offsetHeight * 0.6)).toFixed(3);
      heroInner.style.translate = `0 ${(y * 0.18).toFixed(1)}px`;
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  // reveal on scroll
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add(e.target.classList.contains('chapter') ? 'is-seen' : 'in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  $$('.reveal, .chapter').forEach((el) => io.observe(el));

  // active nav link
  const links = new Map($$('.nav-links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.id || 'practices';
        links.forEach((a, k) => a.classList.toggle('is-active', k === id));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  ['practices', 'ritual', 'science', 'progress', 'safety'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });
  const ch = $('.chapters');
  if (ch) spy.observe(ch);
}

/* ---------------- filters ---------------- */
function initFilters() {
  const chips = $$('[data-filter]');
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on);
      });
      $$('#cards .card').forEach((card) => card.classList.toggle('is-hidden', f !== 'All' && card.dataset.cat !== f));
    })
  );
}

/* ---------------- sand particles ---------------- */
class Sand {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.p = [];
    this.level = 0.3;
    this.phase = 'rest';
    this.running = false;
    this.paused = false;
    this._frame = this._frame.bind(this);
    this._resize = this._resize.bind(this);
  }
  setCenter(el) {
    this.anchor = el;
  }
  start() {
    if (this.running || reduceMotion.matches) return;
    this.running = true;
    window.addEventListener('resize', this._resize);
    this._resize();
    this.last = performance.now();
    requestAnimationFrame(this._frame);
  }
  stop() {
    this.running = false;
    window.removeEventListener('resize', this._resize);
    this.g.clearRect(0, 0, this.c.width, this.c.height);
  }
  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.c.clientWidth;
    const h = this.c.clientHeight;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.maxR = Math.hypot(w, h) * 0.55;
    const n = Math.min(170, Math.round((w * h) / 7000));
    this.p = Array.from({ length: n }, () => this._spawn(Math.random()));
  }
  _spawn(u) {
    return {
      a: Math.random() * Math.PI * 2,
      r: 40 + u * this.maxR,
      v: 14 + Math.random() * 28,
      s: Math.random() * 1.3 + 0.35,
      o: Math.random() * 0.5 + 0.2,
      w: (Math.random() - 0.5) * 0.08,
    };
  }
  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let cx = this.w / 2,
      cy = this.h * 0.45,
      inner = 60;
    if (this.anchor && this.anchor.offsetParent) {
      const r = this.anchor.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      inner = r.width * (0.18 + this.level * 0.14);
    }
    const flow = this.paused ? 0 : this.phase === 'in' ? -1 : this.phase === 'out' ? 1.15 : this.phase === 'pump' ? 0.6 : 0.12;
    const g = this.g;
    g.clearRect(0, 0, this.w, this.h);
    for (const q of this.p) {
      q.r += flow * q.v * dt * (0.6 + q.r / this.maxR);
      q.a += (q.w + 0.012) * dt * (this.paused ? 0.2 : 1);
      if (q.r < inner) Object.assign(q, this._spawn(0.75 + Math.random() * 0.25));
      else if (q.r > this.maxR) {
        Object.assign(q, this._spawn(0));
        q.r = inner + Math.random() * 30;
      }
      const x = cx + Math.cos(q.a) * q.r;
      const y = cy + Math.sin(q.a) * q.r * 0.7;
      const fadeIn = Math.min(1, (q.r - inner) / 80);
      const fadeOut = Math.min(1, (this.maxR - q.r) / 160);
      const alpha = q.o * fadeIn * fadeOut;
      if (alpha <= 0.01) continue;
      g.fillStyle = `rgba(240, 214, 168, ${alpha.toFixed(3)})`;
      g.beginPath();
      g.arc(x, y, q.s, 0, Math.PI * 2);
      g.fill();
    }
    requestAnimationFrame(this._frame);
  }
}

/* ---------------- voice + haptics ---------------- */
let voicePick = null;
function pickVoice() {
  if (voicePick !== null || !('speechSynthesis' in window)) return voicePick;
  const vs = speechSynthesis.getVoices();
  if (!vs.length) return null;
  const pref = ['Samantha', 'Serena', 'Karen', 'Moira', 'Google UK English Female', 'Microsoft Aria', 'Microsoft Libby', 'Google US English'];
  voicePick = pref.map((n) => vs.find((v) => v.name.includes(n))).find(Boolean) || vs.find((v) => /^en(-|_)/i.test(v.lang)) || null;
  return voicePick;
}
if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => (voicePick = null));

function speak(text) {
  if (!prefs.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/·/g, ','));
    u.rate = 0.82;
    u.pitch = 0.92;
    u.volume = 0.9;
    const v = pickVoice();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (_) {}
}

const canVibrate = 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches;
function buzz(pattern) {
  if (prefs.haptic && canVibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

/* ---------------- wake lock ---------------- */
let wakeLock = null;
async function holdScreen() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {}
}
function releaseScreen() {
  try {
    wakeLock?.release();
  } catch (_) {}
  wakeLock = null;
}

/* =================================================================
   Practice overlay
   ================================================================= */
const audio = new BreathAudio();
audio.muted = !prefs.sound;
audio.windOn = prefs.wind;

const P = {
  el: null,
  plan: [],
  kind: 'exercise',
  ex: null,
  ritual: null,
  dose: null,
  pace: prefs.pace,
  pushed: false,
  lastFocus: null,
  lastCount: '',
  lastSec: -1,
};

let session;
let sand;
const RING_C = 2 * Math.PI * 49;

function setPose(ex) {
  const fig = $('#fig');
  const pose = (ex && ex.pose) || 'rest';
  if (fig && fig.dataset.pose !== pose) fig.dataset.pose = pose;
}

function currentPlan() {
  if (P.kind === 'ritual') {
    return P.ritual.items.map((it) => ({ exercise: byId(it.id), minutes: it.minutes, rounds: it.rounds }));
  }
  return [{ exercise: P.ex, ...(P.ex.dose.type === 'rounds' ? { rounds: P.dose } : { minutes: P.dose }) }];
}

function planSeconds(plan, pace) {
  let s = 4;
  plan.forEach((it, i) => {
    s += roundsFor(it.exercise, it, pace) * cycleSeconds(it.exercise, pace);
    if (it.exercise.outro) s += it.exercise.outro.s;
    if (i > 0) s += 8;
  });
  return s;
}

function renderSetup() {
  const plan = currentPlan();
  const pace = P.pace;
  const doseRow = $('#su-dose-row');
  if (P.kind === 'ritual') {
    $('#su-pattern').innerHTML = `${P.ritual.blurb}`;
    $('#su-plan').innerHTML = `<ol>${plan
      .map((it) => `<li><span>${it.exercise.name}</span><span>${it.rounds ? `${it.rounds} ${it.exercise.dose.unit || 'rounds'}` : `${it.minutes} min`}</span></li>`)
      .join('')}</ol>`;
    doseRow.hidden = true;
  } else {
    const ex = P.ex;
    $('#su-pattern').innerHTML = `<b>${ex.patternLabel}</b><br>${ex.tagline}`;
    $('#su-plan').innerHTML = '';
    doseRow.hidden = false;
    const d = ex.dose;
    $('#su-dose-label').textContent = d.type === 'rounds' ? (d.unit === 'cycles' ? 'Cycles' : 'Rounds') : 'Duration';
    const opts = [...new Set([...d.options, P.dose])].sort((a, b) => a - b);
    $('#su-dose').innerHTML = opts
      .map((o) => `<button type="button" role="radio" aria-checked="${o === P.dose}" data-dose="${o}">${d.type === 'rounds' ? o : `${o} min`}</button>`)
      .join('');
  }
  const paceEl = $('#su-pace');
  paceEl.value = pace;
  setRangeFill(paceEl);
  const total = planSeconds(plan, pace);
  let calc;
  if (P.kind === 'exercise') {
    const ex = P.ex;
    const cyc = cycleSeconds(ex, pace);
    const hasPumps = ex.pattern.some((p) => p.repeat);
    const rounds = roundsFor(ex, plan[0], pace);
    calc = hasPumps
      ? `${rounds} rounds · about ${Math.round(cyc)} s each · <b>${clock(total)}</b> total`
      : `${(Math.round(cyc * 10) / 10).toString()} s per ${ex.roundLabel.toLowerCase()} · ${(60 / cyc).toFixed(1)} breaths/min · <b>${clock(total)}</b> total`;
  } else calc = `Pace ${Math.round((1 / pace) * 100)}% · <b>${clock(total)}</b> total`;
  $('#su-calc').innerHTML = calc;
  $$('.toggle[data-pref]').forEach((t) => t.setAttribute('aria-pressed', !!prefs[t.dataset.pref]));
  $('#tg-haptic').hidden = !canVibrate;
  $('#su-preview').hidden = !audio.supported;
}

function setRangeFill(el) {
  const p = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--fill', `${p}%`);
}

function setView(v) {
  P.el.dataset.view = v;
}

function openPractice({ exId, ritualId, minutes }) {
  if (session && session.state !== 'idle') session.stop(true);
  if (ritualId) {
    P.kind = 'ritual';
    P.ritual = RITUALS.find((r) => r.id === ritualId);
    P.ex = byId(P.ritual.items[0].id);
    $('#pr-item').textContent = `${P.ritual.name} ritual`;
    $('#pr-title').textContent = P.ritual.title;
  } else {
    P.kind = 'exercise';
    P.ex = byId(exId);
    P.dose = minutes ? +minutes : P.ex.dose.value;
    $('#pr-item').textContent = `${P.ex.category} · ${P.ex.level}`;
    $('#pr-title').textContent = P.ex.name;
  }
  renderSetup();
  setView('setup');
  setPose(P.ex);
  P.el.dataset.phase = 'rest';
  P.el.classList.remove('is-paused');
  $('#orb').style.setProperty('--lvl', 0.32);

  const wasHidden = P.el.hidden;
  if (wasHidden) {
    P.lastFocus = document.activeElement;
    P.el.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => P.el.classList.add('is-open'));
    try {
      history.pushState({ neshimot: 'practice' }, '');
      P.pushed = true;
    } catch (_) {}
  }
  sand.setCenter($('#su-start'));
  sand.level = 0.3;
  sand.phase = 'rest';
  sand.paused = false;
  sand.start();
  setTimeout(() => $('#su-start').focus({ preventScroll: true }), 60);
}

function teardown() {
  if (session && (session.state === 'running' || session.state === 'paused')) logProgress(session.elapsed());
  session?.stop(true);
  releaseScreen();
  try {
    speechSynthesis?.cancel();
  } catch (_) {}
  sand.stop();
  P.el.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => {
    if (!P.el.classList.contains('is-open')) P.el.hidden = true;
  }, 450);
  P.lastFocus?.focus?.({ preventScroll: true });
}

function closePractice() {
  if (P.el.hidden) return;
  teardown();
  if (P.pushed) {
    P.pushed = false;
    try {
      history.back();
    } catch (_) {}
  }
}

function startSession() {
  const unlocking = audio.unlock(); // inside the gesture
  audio.setMuted(!prefs.sound);
  if (audio.ctx) audio.setWind(prefs.wind);
  speak('Get ready');
  const plan = currentPlan();
  P.plan = plan;
  session.load(plan, { pace: P.pace, prep: 4 });
  session._logged = false;
  P.lastCount = '';
  P.lastSec = -1;
  setView('stage');
  sand.setCenter($('#orb'));
  syncSoundBtn();
  unlocking.then(() => {
    if (P.el.dataset.view !== 'stage' || session.state !== 'ready') return;
    session.start();
    holdScreen();
  });
}

function syncSoundBtn() {
  const b = $('#btn-sound');
  b.setAttribute('aria-pressed', String(!prefs.sound));
  b.setAttribute('aria-label', prefs.sound ? 'Mute tones' : 'Unmute tones');
}

function practicedSeconds(e) {
  let s = 0;
  for (const ph of session.tl) {
    if (ph.start >= e) break;
    if (ph.t === 'prep' || ph.t === 'interlude') continue;
    s += Math.min(ph.end, e) - ph.start;
  }
  return s;
}

function onPhase(ph) {
  const el = P.el;
  const item = P.plan[ph.item];
  const ex = item?.exercise;
  el.dataset.phase = ph.counter ? 'pump' : ph.t;
  setPose(ex);
  sand.phase = ph.counter ? 'pump' : ph.t;

  const cue = $('#cue');
  if (cue.textContent !== ph.cue) {
    cue.textContent = ph.cue;
    cue.classList.remove('swap');
    void cue.offsetWidth;
    cue.classList.add('swap');
  }
  const hint = ph.t === 'interlude' ? `${ex.name} · ${ex.patternLabel}` : ph.hint || '';
  if ($('#hint').textContent !== hint) $('#hint').textContent = hint;

  // round + item labels
  let round = '';
  if (ph.outro) round = 'Integration';
  else if (ph.round) round = `${ex.roundLabel} ${ph.round} of ${ph.rounds}`;
  $('#round').textContent = round;
  if (P.kind === 'ritual' && ex && $('#pr-title').textContent !== ex.name) {
    $('#pr-title').textContent = ex.name;
    $('#pr-item').textContent = `${P.ritual.name} ritual · ${ph.item + 1} of ${P.plan.length}`;
  }

  // nostril indicator
  const ns = $('#nostrils');
  const usesSides = ex && ex.pattern.some((p) => p.side);
  ns.hidden = !usesSides || ph.t === 'prep' || ph.t === 'interlude';
  if (usesSides) $$('[data-side]', ns).forEach((s) => s.classList.toggle('is-on', s.dataset.side === ph.side));

  // voice, haptics, screen reader (skip the rapid pumps)
  const firstPump = ph.counter && ph.count === 1 && ph.t === 'out';
  if (!ph.counter || firstPump) {
    if (ph.t !== 'prep') speak(firstPump ? `${ph.countTotal} pumps` : ph.cue);
    buzz(ph.t === 'in' ? 35 : ph.t === 'out' ? [18, 70, 18] : ph.t === 'hold' ? 12 : 0);
    $('#pr-live').textContent = firstPump ? `${ph.countTotal} pumps` : `${ph.cue}${ph.s >= 2 ? `, ${Math.round(ph.s)} seconds` : ''}`;
  }
}

function onFrame(f) {
  const { ph, p, level, e, remaining } = f;
  $('#orb').style.setProperty('--lvl', level.toFixed(4));
  sand.level = level;
  $('#ring').style.strokeDashoffset = (RING_C * (1 - p)).toFixed(2);

  let count = '';
  if (ph.counter) count = `${ph.count} / ${ph.countTotal}`;
  else if (ph.s >= 1.5) count = String(Math.max(1, Math.ceil(remaining - 0.02)));
  if (count !== P.lastCount) {
    $('#count').textContent = count;
    P.lastCount = count;
  }
  $('#prog').style.transform = `scaleX(${(e / session.total).toFixed(4)})`;
  const sec = Math.floor(e);
  if (sec !== P.lastSec) {
    P.lastSec = sec;
    $('#t-el').textContent = clock(e);
    $('#t-rem').textContent = `−${clock(session.total - e)}`;
  }
}

function onState(s) {
  const el = P.el;
  if (s === 'running') {
    session._phaseIdx = -1; // re-announce the current phase (restores the cue after a pause)
    el.classList.remove('is-paused');
    $('#btn-play').setAttribute('aria-label', 'Pause');
    sand.paused = false;
  } else if (s === 'paused') {
    el.classList.add('is-paused');
    $('#btn-play').setAttribute('aria-label', 'Resume');
    sand.paused = true;
    session.renderStill();
    $('#cue').textContent = 'Paused';
    $('#pr-live').textContent = 'Paused';
    releaseScreen();
  } else if (s === 'done') {
    const secs = logProgress(session.total);
    releaseScreen();
    speak('Well breathed');
    const what = P.kind === 'ritual' ? `${P.ritual.name} ritual` : P.ex.name;
    const m = Math.floor(secs / 60);
    const r = Math.round(secs % 60);
    $('#done-sub').textContent = `${m ? `${m} min ` : ''}${r ? `${r} s ` : ''}of ${what}.`;
    $('#pr-title').textContent = P.kind === 'ritual' ? P.ritual.title : P.ex.name;
    $('#pr-item').textContent = 'Complete';
    setView('done');
    P.el.dataset.phase = 'in';
    sand.setCenter($('.done-mark'));
    sand.phase = 'rest';
    setTimeout(() => $('#done-close').focus({ preventScroll: true }), 80);
  }
}

function logProgress(e) {
  if (!session || session._logged) return 0;
  const secs = practicedSeconds(e);
  if (secs >= 60 || (session.state === 'done' && secs >= 20)) {
    session._logged = true;
    const log = store.get('neshimot.log', []);
    log.push({ d: today(), m: Math.round((secs / 60) * 10) / 10, id: P.kind === 'ritual' ? `ritual:${P.ritual.id}` : P.ex.id });
    store.set('neshimot.log', log.slice(-800));
    renderProgress();
  }
  return secs;
}

function initPractice() {
  P.el = $('#practice');
  scatterStars($('#pr-stars'), 70);
  sand = new Sand($('#sand'));
  session = new Session(audio, { onPhase, onFrame, onState });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-begin]');
    if (b) {
      e.preventDefault();
      openPractice({ exId: b.dataset.begin, minutes: b.dataset.minutes });
      return;
    }
    const r = e.target.closest('[data-ritual]');
    if (r) {
      e.preventDefault();
      openPractice({ ritualId: r.dataset.ritual });
    }
  });

  $('#pr-close').addEventListener('click', closePractice);
  $('#done-close').addEventListener('click', closePractice);
  $('#done-again').addEventListener('click', () => {
    renderSetup();
    setView('setup');
    P.el.dataset.phase = 'rest';
    if (P.kind === 'ritual') {
      $('#pr-item').textContent = `${P.ritual.name} ritual`;
      $('#pr-title').textContent = P.ritual.title;
    } else {
      $('#pr-item').textContent = `${P.ex.category} · ${P.ex.level}`;
    }
    sand.setCenter($('#su-start'));
  });
  $('#su-start').addEventListener('click', startSession);
  $('#su-preview').addEventListener('click', () => {
    audio.unlock().then(() => {
      audio.setMuted(false);
      audio.preview();
      setTimeout(() => audio.setMuted(!prefs.sound), 5600);
    });
  });
  $('#su-dose').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dose]');
    if (!b) return;
    P.dose = +b.dataset.dose;
    renderSetup();
  });
  $('#su-pace').addEventListener('input', (e) => {
    P.pace = +e.target.value;
    prefs.pace = P.pace;
    savePrefs();
    renderSetup();
  });
  $$('.toggle[data-pref]').forEach((t) =>
    t.addEventListener('click', () => {
      const k = t.dataset.pref;
      prefs[k] = !prefs[k];
      savePrefs();
      t.setAttribute('aria-pressed', prefs[k]);
      if (k === 'sound') audio.setMuted(!prefs.sound);
      if (k === 'wind') {
        if (prefs.wind) audio.unlock().then(() => audio.setWind(true));
        else audio.setWind(false);
      }
      if (k === 'voice' && prefs.voice) speak('Voice cues on');
      if (k === 'haptic' && prefs.haptic) buzz(30);
    })
  );

  $('#btn-play').addEventListener('click', () => {
    if (session.state === 'running') session.pause();
    else if (session.state === 'paused') {
      const u = audio.unlock();
      u.then(() => {
        session.resume();
        holdScreen();
      });
    }
  });
  $('#btn-restart').addEventListener('click', () => {
    if (session.state === 'running' || session.state === 'paused') logProgress(session.elapsed());
    startSession();
  });
  $('#btn-sound').addEventListener('click', () => {
    prefs.sound = !prefs.sound;
    savePrefs();
    audio.setMuted(!prefs.sound);
    if (!prefs.sound) audio.stopAll(0.2);
    syncSoundBtn();
  });

  window.addEventListener('popstate', () => {
    if (!P.el.hidden && P.pushed) {
      P.pushed = false;
      teardown();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (P.el.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closePractice();
    } else if (e.key === ' ' && P.el.dataset.view === 'stage' && !e.target.closest('button, input')) {
      e.preventDefault();
      $('#btn-play').click();
    } else if (e.key === 'Tab') {
      const f = $$('button:not([hidden]), input, a[href]', P.el).filter((x) => x.offsetParent !== null && !x.closest('[hidden]'));
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session.state === 'running') {
      holdScreen();
      session.renderStill();
    }
  });
}

/* =================================================================
   Science lab — respiratory sinus arrhythmia model
   ================================================================= */
const swing = (bpm) => 2 + 10 / (1 + Math.pow((bpm - 5.5) / 2.2, 2));

function initLab() {
  const svg = $('#rsa');
  const curve = $('#curve');
  const input = $('#bpm');
  if (!svg || !input) return;
  const W = 640, H = 240, L = 10, R = 630, WINDOW = 30;
  const ns = 'http://www.w3.org/2000/svg';
  svg.innerHTML = `
    ${[60, 115, 170].map((y) => `<line class="grid" x1="${L}" x2="${R}" y1="${y}" y2="${y}"/>`).join('')}
    <path class="rsa-breath-fill"/><path class="rsa-breath"/><path class="rsa-hr"/>
    <text class="axis" x="${L}" y="${H - 12}">−30 s</text><text class="axis" x="${R}" y="${H - 12}" text-anchor="end">now</text>
    <text class="axis" x="${(L + R) / 2}" y="${H - 12}" text-anchor="middle">−15 s</text>`;
  const [fillP, breathP, hrP] = ['.rsa-breath-fill', '.rsa-breath', '.rsa-hr'].map((s) => svg.querySelector(s));

  // resonance curve
  const cx = (b) => 18 + ((b - 3) / 17) * 226;
  const cy = (a) => 118 - (a / 13) * 100;
  let d = '';
  for (let b = 3; b <= 20.01; b += 0.25) d += `${d ? 'L' : 'M'}${cx(b).toFixed(1)},${cy(swing(b)).toFixed(1)}`;
  curve.innerHTML = `
    <rect class="zone" x="${cx(4.5)}" y="12" width="${cx(7) - cx(4.5)}" height="106" rx="4"/>
    <text x="${cx(5.75)}" y="10" text-anchor="middle">resonance</text>
    <path class="curve-fill" d="${d}L${cx(20)},118L${cx(3)},118Z"/><path class="curve" d="${d}"/>
    <line x1="18" x2="244" y1="118" y2="118" stroke="rgba(235,192,126,.2)"/>
    ${[3, 6, 12, 20].map((b) => `<text x="${cx(b)}" y="134" text-anchor="middle">${b}</text>`).join('')}
    <text x="244" y="148" text-anchor="end">breaths / min</text>
    <circle class="marker" r="6"/>`;
  const marker = curve.querySelector('.marker');

  const notes = [
    [4.4, 'Very slow. Powerful, but hard to sustain — ideal for short structured practices like box breathing.'],
    [7.25, 'Resonance. Heart and breath rise and fall together — the largest, calmest waves.'],
    [10.25, 'Slow breathing. The heart’s waves grow as you approach resonance.'],
    [14.25, 'A typical resting rate. The heart barely responds to each breath.'],
    [99, 'Fast, shallow breathing — common under stress. Heart-rate variability is low.'],
  ];

  let bpm = +input.value;
  let t = 0;
  let last = 0;
  let visible = false;
  let raf = 0;

  const draw = () => {
    const f = bpm / 60;
    const A = swing(bpm);
    const lag = Math.min(1, Math.max(0, (bpm - 5.5) / 14.5)) * (Math.PI / 2);
    let b = '', h = '';
    const N = 180;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const tt = t - WINDOW + u * WINDOW;
      const x = (L + u * (R - L)).toFixed(1);
      const ph = 2 * Math.PI * f * tt;
      const vol = 0.5 - 0.5 * Math.cos(ph);
      b += `${i ? 'L' : 'M'}${x},${(170 - vol * 110).toFixed(1)}`;
      h += `${i ? 'L' : 'M'}${x},${(115 - (-Math.cos(ph - lag)) * A * 4.2).toFixed(1)}`;
    }
    breathP.setAttribute('d', b);
    fillP.setAttribute('d', `${b}L${R},170L${L},170Z`);
    hrP.setAttribute('d', h);
  };

  const loop = (now) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    draw();
    if (visible && !reduceMotion.matches) raf = requestAnimationFrame(loop);
  };

  const update = () => {
    bpm = +input.value;
    setRangeFill(input);
    $('#bpm-out').textContent = bpm % 1 ? bpm.toFixed(1) : bpm;
    const A = swing(bpm);
    $('#hr-swing').textContent = `±${Math.round(A)}`;
    marker.setAttribute('cx', cx(bpm).toFixed(1));
    marker.setAttribute('cy', cy(A).toFixed(1));
    $('#lab-note').textContent = notes.find(([max]) => bpm <= max)[1];
    if (!visible || reduceMotion.matches) draw();
  };
  input.addEventListener('input', update);
  update();

  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible && !reduceMotion.matches) {
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }
  }).observe(svg);
}

/* =================================================================
   Progress — streak, weekly minutes, breath-hold check
   ================================================================= */
function today(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function renderProgress() {
  const log = store.get('neshimot.log', []);
  const days = new Map();
  log.forEach((s) => days.set(s.d, (days.get(s.d) || 0) + s.m));

  // streak: consecutive days up to today (or yesterday, if today isn't done yet)
  let streak = 0;
  const d = new Date();
  if (!days.has(today(d))) d.setDate(d.getDate() - 1);
  while (days.has(today(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const x = new Date();
    x.setDate(x.getDate() - i);
    week.push({ key: today(x), label: x.toLocaleDateString('en', { weekday: 'short' }), m: days.get(today(x)) || 0, isToday: i === 0 });
  }
  $('#st-streak').textContent = streak;
  $('#st-week').textContent = Math.round(week.reduce((a, w) => a + w.m, 0));
  $('#st-total').textContent = log.length;

  const svg = $('#week');
  const max = Math.max(10, ...week.map((w) => w.m));
  const bw = 38, gap = (420 - 7 * bw) / 8, base = 146, top = 22;
  svg.innerHTML =
    `<defs><linearGradient id="barg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3D29A"/><stop offset="1" stop-color="#C9785A"/></linearGradient></defs>` +
    week
      .map((w, i) => {
        const x = gap + i * (bw + gap);
        const h = w.m ? Math.max(6, ((base - top) * w.m) / max) : 4;
        return `<rect class="${w.m ? 'bar' : 'bar-empty'}${w.isToday ? ' bar-today' : ''}" x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="8"><title>${w.label}: ${Math.round(w.m * 10) / 10} min</title></rect>
          ${w.m ? `<text class="val" x="${x + bw / 2}" y="${base - h - 8}" text-anchor="middle">${Math.round(w.m)}</text>` : ''}
          <text x="${x + bw / 2}" y="170" text-anchor="middle"${w.isToday ? ' style="fill:var(--saffron)"' : ''}>${w.label}</text>`;
      })
      .join('');
  renderCP();
}

function cpRating(s) {
  if (s < 10) return 'Under 10 s — your breathing is working hard. Gentle nasal and diaphragmatic practice will help.';
  if (s < 20) return '10–20 s — plenty of room to grow. Daily slow, light breathing raises this steadily.';
  if (s < 40) return '20–40 s — good. Your breathing is calm and efficient.';
  return '40 s or more — excellent breathing efficiency.';
}

function renderCP() {
  const svg = $('#cp-chart');
  const data = store.get('neshimot.cp', []).slice(-12);
  const W = 420, H = 150, L = 30, R = 410, T = 10, B = 124;
  const y = (s) => B - (Math.min(s, 60) / 60) * (B - T);
  const bands = [
    [0, 10, '#E0937F'],
    [10, 20, '#E3905A'],
    [20, 40, '#EBC07E'],
    [40, 60, '#7FB5A8'],
  ];
  let h = bands.map(([a, b, c]) => `<rect class="band" x="${L}" width="${R - L}" y="${y(b)}" height="${y(a) - y(b)}" fill="${c}"/>`).join('');
  h += [0, 10, 20, 40, 60].map((s) => `<text x="${L - 6}" y="${y(s) + 3}" text-anchor="end">${s}</text>`).join('');
  if (!data.length) {
    h += `<text x="${(L + R) / 2}" y="${(T + B) / 2 + 4}" text-anchor="middle" style="font-size:12px">Your results will appear here</text>`;
  } else {
    const x = (i) => (data.length === 1 ? (L + R) / 2 : L + 14 + (i / (data.length - 1)) * (R - L - 28));
    const pts = data.map((p, i) => `${x(i).toFixed(1)},${y(p.s).toFixed(1)}`);
    if (data.length > 1) h += `<polyline class="cp-line" points="${pts.join(' ')}"/>`;
    h += data.map((p, i) => `<circle class="cp-dot" cx="${x(i).toFixed(1)}" cy="${y(p.s).toFixed(1)}" r="4"><title>${p.d}: ${p.s.toFixed(1)} s</title></circle>`).join('');
    h += `<text x="${L}" y="${H - 6}">${data[0].d.slice(5).replace('-', '/')}</text><text x="${R}" y="${H - 6}" text-anchor="end">${data[data.length - 1].d.slice(5).replace('-', '/')}</text>`;
  }
  svg.innerHTML = h;
}

function initProgress() {
  renderProgress();
  const btn = $('#cp-btn');
  const box = $('#cp');
  const out = $('#cp-time');
  let t0 = 0, raf = 0;
  const tick = () => {
    out.textContent = ((performance.now() - t0) / 1000).toFixed(1);
    raf = requestAnimationFrame(tick);
  };
  btn.addEventListener('click', () => {
    if (!box.classList.contains('is-timing')) {
      t0 = performance.now();
      box.classList.add('is-timing');
      btn.textContent = 'Stop';
      $('#cp-result').textContent = 'Hold gently… stop at the first clear urge to breathe.';
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      const s = (performance.now() - t0) / 1000;
      box.classList.remove('is-timing');
      btn.textContent = 'Start';
      out.textContent = s.toFixed(1);
      if (s < 1.5) {
        $('#cp-result').textContent = 'That was very short — breathe normally for a minute, then try again.';
        return;
      }
      const cp = store.get('neshimot.cp', []);
      cp.push({ d: today(), s: Math.round(s * 10) / 10 });
      store.set('neshimot.cp', cp.slice(-100));
      $('#cp-result').textContent = cpRating(s);
      renderCP();
    }
  });
  $('#reset-data').addEventListener('click', () => {
    if (!confirm('Clear your practice history and breath-hold results on this device?')) return;
    ['neshimot.log', 'neshimot.cp', 'ruach.log', 'ruach.cp'].forEach((k) => store.del(k));
    renderProgress();
    $('#cp-result').textContent = '';
    out.textContent = '0.0';
  });
}

/* =================================================================
   Practice-guide figures — each one breathes in its own practice's rhythm,
   with a playhead tracing the same moment on the pattern graph beside it.
   ================================================================= */
function initFigures() {
  const items = $$('.chapter')
    .map((ch) => {
      const vis = ch.querySelector('.ch-visual');
      const fig = ch.querySelector('.ch-figure');
      const em = ch.querySelector('.ch-emblem[data-ex]');
      if (!vis || !fig || !em) return null;
      const ex = byId(em.dataset.ex);
      const segs = segmentsFor(ex.pattern, 1);
      const cycle = segs.reduce((a, s) => a + s.s, 0);
      const svg = ch.querySelector('.pattern-graph:not(.is-mini)');
      const g = ((svg && svg.dataset.geo) || '').split(',').map(Number);
      return {
        ch,
        vis,
        fig,
        segs,
        cycle,
        head: svg && svg.querySelector('.pg-head'),
        geo: g.length === 8 ? { pl: g[0], pr: g[1], pt: g[2], pb: g[3], W: g[4], H: g[5], total: g[6] } : null,
        label: ch.querySelector('.ch-phase-t'),
        on: false,
        t0: 0,
        idx: -1,
      };
    })
    .filter(Boolean);
  if (!items.length) return;

  if (reduceMotion.matches) {
    items.forEach((it) => it.fig.style.setProperty('--lvl', 0.65));
    return;
  }

  let raf = 0;
  const frame = (now) => {
    let any = false;
    for (const it of items) {
      if (!it.on) continue;
      any = true;
      const el = (now - it.t0) / 1000;
      const tc = el % it.cycle;
      let i = 0;
      while (i < it.segs.length - 1 && tc >= it.segs[i].start + it.segs[i].s) i++;
      const s = it.segs[i];
      const lvl = levelAt(s, Math.min(1, (tc - s.start) / s.s));
      it.fig.style.setProperty('--lvl', lvl.toFixed(4));
      if (i !== it.idx) {
        it.idx = i;
        it.vis.dataset.phase = s.counter ? 'pump' : s.t;
        if (it.label && it.label.textContent !== s.cue) it.label.textContent = s.cue;
      }
      if (it.head && it.geo) {
        const g = it.geo;
        const tt = el % g.total;
        it.head.setAttribute('cx', (g.pl + (tt / g.total) * (g.W - g.pl - g.pr)).toFixed(1));
        it.head.setAttribute('cy', (g.pt + (1 - lvl) * (g.H - g.pt - g.pb)).toFixed(1));
      }
    }
    raf = any ? requestAnimationFrame(frame) : 0;
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const it = items.find((x) => x.ch === e.target);
        if (!it) continue;
        if (e.isIntersecting && !it.on) {
          it.on = true;
          it.t0 = performance.now();
          it.idx = -1;
        } else if (!e.isIntersecting) it.on = false;
      }
      if (!raf && items.some((x) => x.on)) raf = requestAnimationFrame(frame);
    },
    { rootMargin: '80px 0px' }
  );
  items.forEach((it) => io.observe(it.ch));
}

/* =================================================================
   Boot
   ================================================================= */
scatterStars($('#stars'), 110);
initChrome();
initFilters();
initPractice();
initLab();
initProgress();
initFigures();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
