// Neshimot — application controller.
import { EXERCISES, RITUALS, byId, cycleSeconds, roundsFor, catLabel, levelLabel, unitLabel } from './data.js';
import { setLang, t, isHe, locale } from './i18n.js';
import { BreathAudio } from './audio.js';
import { Session } from './session.js';
import { segmentsFor, levelAt } from './graphs.js';
import { Scenery } from './scenery.js';

// the page is prerendered in one language (index.html = English, he.html = Hebrew); match its text
setLang(document.documentElement.lang);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pad2 = (n) => String(n).padStart(2, '0');
const mmss = (s) => `${Math.floor(s / 60)}:${pad2(s % 60)}`;
const clock = (s) => mmss(Math.max(0, Math.round(s)));
// elapsed counts down from the same timestamp as remaining, so neither ever skips a second
const clockUp = (s) => mmss(Math.max(0, Math.floor(s + 1e-6)));
const clockDown = (s) => mmss(Math.max(0, Math.ceil(s - 1e-6)));
const fmt1 = (n) => String(Math.round(n * 10) / 10);
const fmtDur = (secs) => {
  const m = Math.floor(secs / 60);
  const r = Math.round(secs % 60);
  return m ? (r ? t('u.minSec', { m, s: r }) : t('u.min', { n: m })) : t('u.sec', { n: r });
};
/** '1 breath' / '5 breaths' — the practice's own counting word. */
const roundWord = (ex, n) => (n === 1 ? (isHe() ? ex.roundLabel : ex.roundLabel.toLowerCase()) : ex.roundPlural);
const amount = (it) => (it.rounds ? `${it.rounds} ${unitLabel(it.exercise.dose.unit || 'rounds')}` : t('u.min', { n: it.minutes }));

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

/* ---------------- theme: night (dark) or dawn (light) ---------------- */
const root = document.documentElement;
const THEME = {
  get light() {
    return root.dataset.theme === 'light';
  },
};

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
      g.fillStyle = THEME.light ? `rgba(146, 100, 58, ${(alpha * 0.85).toFixed(3)})` : `rgba(240, 214, 168, ${alpha.toFixed(3)})`;
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
  if (isHe()) {
    const he = vs.filter((v) => /^(he|iw)([-_]|$)/i.test(v.lang));
    voicePick = he.find((v) => /Carmit|Google/i.test(v.name)) || he[0] || null;
    return voicePick;
  }
  const pref = ['Samantha', 'Serena', 'Karen', 'Moira', 'Google UK English Female', 'Microsoft Aria', 'Microsoft Libby', 'Google US English'];
  voicePick = pref.map((n) => vs.find((v) => v.name.includes(n))).find(Boolean) || vs.find((v) => /^en(-|_)/i.test(v.lang)) || null;
  return voicePick;
}
/** False only when the voices are known and none speaks the page's language. */
function voiceAvailable() {
  if (!('speechSynthesis' in window)) return false;
  if (!isHe()) return true;
  const vs = speechSynthesis.getVoices();
  return !vs.length || !!pickVoice();
}
if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => (voicePick = null));

function speak(text) {
  if (!prefs.voice || P.muted || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const v = pickVoice();
    if (isHe() && !v && speechSynthesis.getVoices().length) return; // no Hebrew voice on this device
    const u = new SpeechSynthesisUtterance(text.replace(/·/g, ','));
    u.lang = isHe() ? 'he-IL' : 'en-GB';
    u.rate = isHe() ? 0.9 : 0.82;
    u.pitch = 0.92;
    u.volume = 0.9;
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
   Sign-up gate — the first session is free, then name + email.
   A soft gate: the unlock is remembered on this device. It only appears
   once the server reports it is connected to HubSpot.
   ================================================================= */
const GATE = { ready: null, checking: null };
const unlockedUser = () => store.get('neshimot.user', null);
const freeUsed = () => store.get('neshimot.free', false) || store.get('neshimot.log', []).length > 0;
const needsGate = () => GATE.ready === true && !unlockedUser() && freeUsed();
const EMAIL_OK = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

function checkGate() {
  if (!GATE.checking) {
    GATE.checking = fetch('/api/lead', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ready: false }))
      .then((d) => (GATE.ready = !!(d && d.ready)))
      .catch(() => (GATE.ready = false));
  }
  return GATE.checking;
}

/** 'ok' | 'bad-name' | 'bad-email' | 'retry' */
async function postLead(lead) {
  const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lead) });
  if (r.ok) return 'ok';
  if (r.status === 400) {
    const d = await r.json().catch(() => ({}));
    return d.error === 'name' ? 'bad-name' : 'bad-email';
  }
  return 'retry';
}

/** A sign-up that couldn't reach HubSpot is retried quietly on the next visit. */
function flushPendingLead() {
  const pending = store.get('neshimot.pendingLead', null);
  if (!pending) return;
  postLead(pending)
    .then((res) => res !== 'retry' && store.del('neshimot.pendingLead'))
    .catch(() => {});
}

/* =================================================================
   Practice overlay
   ================================================================= */
const audio = new BreathAudio();
audio.tonesOn = prefs.sound;
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
  muted: false, // the player's master mute: tones, wind and voice
  lastLogIndex: null,
  pendingEnd: null,
  pendingScroll: null,
  next: null, // the practice to open once the visitor has unlocked
  afterUnlock: null, // or something else to do after unlocking (e.g. return to the diary)
};

let session;
let sand;
const RING_C = 2 * Math.PI * 49;

function setPose(ex, side = '') {
  const fig = $('#fig');
  if (!fig) return;
  const pose = (ex && ex.pose) || 'rest';
  if (fig.dataset.pose !== pose) fig.dataset.pose = pose;
  if ((fig.dataset.side || '') !== side) fig.dataset.side = side;
}

const acks = () => store.get('neshimot.ack', {});

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
  const user = unlockedUser();
  $('#su-welcome').hidden = !user;
  if (user) $('#su-welcome').textContent = t('setup.welcome', { name: String(user.name).split(' ')[0] });
  const plan = currentPlan();
  const pace = P.pace;
  const doseRow = $('#su-dose-row');
  if (P.kind === 'ritual') {
    $('#su-pattern').innerHTML = `${P.ritual.blurb}`;
    $('#su-plan').innerHTML = `<ol>${plan
      .map((it) => `<li><span>${it.exercise.name}</span><span>${amount(it)}</span></li>`)
      .join('')}</ol>`;
    doseRow.hidden = true;
  } else {
    const ex = P.ex;
    $('#su-pattern').innerHTML = `<b>${ex.patternLabel}</b><br>${ex.tagline}`;
    $('#su-plan').innerHTML = '';
    doseRow.hidden = false;
    const d = ex.dose;
    $('#su-dose-label').textContent = t(d.type === 'rounds' ? (d.unit === 'cycles' ? 'setup.cycles' : 'setup.rounds') : 'setup.duration');
    const opts = [...new Set([...d.options, P.dose])].sort((a, b) => a - b);
    $('#su-dose').innerHTML = opts
      .map((o) => `<button type="button" role="radio" aria-checked="${o === P.dose}" data-dose="${o}">${d.type === 'rounds' ? o : t('u.min', { n: o })}</button>`)
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
    const breakdown = t('calc.breakdown', { n: rounds, unit: roundWord(ex, rounds), time: clock(rounds * cyc), rest: ex.outro ? ex.outro.s : 0 });
    const rhythm = hasPumps
      ? t('calc.perRound', { n: Math.round(cyc) })
      : t('calc.rhythm', { s: fmt1(cyc), unit: roundWord(ex, 1), bpm: (60 / cyc).toFixed(1) });
    calc = `${breakdown} · ${t('calc.total', { time: clock(total) })}<br><span>${rhythm}</span>`;
  } else calc = `${t('calc.ritual', { n: plan.length })} · ${t('calc.total', { time: clock(total) })}`;
  $('#su-calc').innerHTML = calc;

  // dosing guidance under the picker
  const note = P.kind === 'exercise' ? P.ex.doseNote : '';
  $('#su-note').textContent = note || '';
  $('#su-note').hidden = !note;

  // safety: a one-line caution before every practice that has one, and a one-time
  // acknowledgement before the intermediate/advanced activating practices
  let caution = '';
  let link = '#safety';
  let needsAck = false;
  if (P.kind === 'exercise') {
    caution = P.ex.cautionShort || '';
    link = `#ex-${P.ex.id}`;
    needsAck = !!P.ex.ack && !acks()[P.ex.id];
  } else if (plan.some((it) => it.exercise.pattern.some((ph) => ph.t === 'hold'))) {
    caution = t('setup.ritualCaution');
  }
  $('#su-caution').hidden = !caution;
  $('#su-caution-text').textContent = caution;
  $('#su-caution-link').setAttribute('href', link);
  $('#su-ack-row').hidden = !needsAck;
  if (!needsAck) $('#su-ack').checked = false;
  $('#su-start').disabled = needsAck && !$('#su-ack').checked;
  $$('.toggle[data-pref]').forEach((tog) => tog.setAttribute('aria-pressed', !!prefs[tog.dataset.pref]));
  $('#tg-haptic').hidden = !canVibrate;
  $('#tg-voice').hidden = !voiceAvailable();
  $('#su-preview').hidden = !audio.supported;
}

function setRangeFill(el) {
  const p = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--fill', `${p}%`);
}

function setView(v) {
  P.el.dataset.view = v;
}

function openPractice(target) {
  const { exId, ritualId, minutes } = target;
  if (needsGate()) {
    P.next = target;
    return openGate();
  }
  if (session && session.state !== 'idle') session.stop(true);
  if (ritualId) {
    P.kind = 'ritual';
    P.ritual = RITUALS.find((r) => r.id === ritualId);
    P.ex = byId(P.ritual.items[0].id);
    $('#pr-item').textContent = P.ritual.label;
    $('#pr-title').textContent = P.ritual.title;
  } else {
    P.kind = 'exercise';
    P.ex = byId(exId);
    P.dose = minutes ? +minutes : P.ex.dose.value;
    $('#pr-item').textContent = `${catLabel(P.ex.category)} · ${levelLabel(P.ex.level)}`;
    $('#pr-title').textContent = P.ex.name;
  }
  P.muted = false;
  $('#su-ack').checked = false;
  renderSetup();
  setView('setup');
  setPose(P.ex);
  P.el.dataset.phase = 'rest';
  P.el.classList.remove('is-paused');
  $('#orb').style.setProperty('--lvl', 0.32);

  showOverlay($('#su-start'), $('#su-start'));
}

function showOverlay(center, focusEl) {
  if (P.el.hidden) {
    P.lastFocus = document.activeElement;
    P.el.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => P.el.classList.add('is-open'));
    try {
      history.pushState({ neshimot: 'practice' }, '');
      P.pushed = true;
    } catch (_) {}
  }
  sand.setCenter(center);
  sand.level = 0.3;
  sand.phase = 'rest';
  sand.paused = false;
  sand.start();
  setTimeout(() => focusEl && focusEl.focus({ preventScroll: true }), 60);
}

function openGate(after = null) {
  P.afterUnlock = after;
  if (session && session.state !== 'idle') session.stop(true);
  $('#pr-item').textContent = t('brand');
  $('#pr-title').textContent = t('gate.heading');
  $('#g-error').textContent = '';
  setView('gate');
  P.el.dataset.phase = 'rest';
  P.el.classList.remove('is-paused');
  showOverlay($('.gate-card'), $('#g-name'));
}

function completeUnlock(name) {
  const first = name.split(' ')[0];
  $('#pr-live').textContent = t('gate.welcomeLive', { name: first });
  renderDiary();
  const next = P.next;
  P.next = null;
  if (next) return openPractice(next);
  const after = P.afterUnlock;
  P.afterUnlock = null;
  if (after) return after();
  // unlocked from the completion screen: stay there, say thanks, open the diary note
  const box = $('#done-unlock');
  box.replaceChildren(Object.assign(document.createElement('p'), { textContent: t('gate.thanks', { name: first }) }));
  box.hidden = false;
  $('#done-note').hidden = false;
  $('#pr-item').textContent = t('done.complete');
  $('#pr-title').textContent = P.kind === 'ritual' ? P.ritual.title : P.ex.name;
  setView('done');
  P.el.dataset.phase = 'in';
}

function teardown() {
  stopPreview();
  hideConfirm();
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
  stopPreview();
  audio.unlock(); // must run inside the gesture; the timer doesn't wait for the audio device
  audio.setTonesOn(prefs.sound);
  audio.setMuted(P.muted);
  if (audio.ctx) audio.setWind(prefs.wind);
  const plan = currentPlan();
  P.plan = plan;
  if (P.kind === 'exercise' && P.ex.ack) {
    const a = acks();
    a[P.ex.id] = true;
    store.set('neshimot.ack', a);
  }
  speak(plan[0].exercise.prep ? plan[0].exercise.prep.cue : t('cue.ready'));
  session.load(plan, { pace: P.pace, prep: 4 });
  session._logged = false;
  P.lastCount = '';
  P.lastSec = -1;
  P.lastLogIndex = null;
  renderTicks();
  setView('stage');
  sand.setCenter($('#orb'));
  syncSoundBtn();
  session.start();
  holdScreen();
}

/** Ritual progress bar: a small gap where each new practice begins. */
function renderTicks() {
  const box = $('#pr-ticks');
  box.innerHTML = session.tl
    .filter((ph) => ph.t === 'interlude')
    .map((ph) => `<i style="inset-inline-start:${((ph.start / session.total) * 100).toFixed(2)}%"></i>`)
    .join('');
}

function syncSoundBtn() {
  const b = $('#btn-sound');
  b.setAttribute('aria-pressed', String(P.muted));
  b.setAttribute('aria-label', t(P.muted ? 'bar.unmute' : 'bar.mute'));
}

/* ---------- ending a session: confirm once there is something to lose ---------- */
function requestEnd(kind) {
  const active = session && (session.state === 'running' || session.state === 'paused');
  if (!active || practicedSeconds(session.elapsed()) < 30) return doEnd(kind);
  const wasRunning = session.state === 'running';
  if (wasRunning) session.pause();
  const secs = practicedSeconds(session.elapsed());
  $('#cf-title').textContent = t(kind === 'restart' ? 'cf.restart' : 'cf.end');
  $('#cf-text').textContent = `${t('cf.text', { dur: fmtDur(secs) })} ${t(secs >= 60 ? 'cf.saved' : 'cf.notSaved')}`;
  $('#cf-ok').textContent = t(kind === 'restart' ? 'cf.restartBtn' : 'cf.endBtn');
  P.pendingEnd = { kind, wasRunning };
  $('#pr-confirm').hidden = false;
  setTimeout(() => $('#cf-cancel').focus({ preventScroll: true }), 30);
}

function hideConfirm() {
  $('#pr-confirm').hidden = true;
}

function doEnd(kind) {
  if (kind === 'restart') {
    if (session.state === 'running' || session.state === 'paused') logProgress(session.elapsed());
    startSession();
  } else closePractice();
}

function cancelEnd() {
  const pend = P.pendingEnd;
  P.pendingEnd = null;
  hideConfirm();
  if (pend && pend.wasRunning && session.state === 'paused') {
    audio.unlock();
    session.resume();
    holdScreen();
  }
  $('#btn-play').focus({ preventScroll: true });
}

/* ---------- tone preview with visible state (B11) ---------- */
let previewTimer = 0;
function stopPreview() {
  clearTimeout(previewTimer);
  const b = $('#su-preview');
  if (!b || !b.dataset.playing) return;
  delete b.dataset.playing;
  audio.stopAll(0.3);
  audio.setMuted(P.muted);
  audio.setTonesOn(prefs.sound);
  b.textContent = t('setup.preview');
  b.setAttribute('aria-pressed', 'false');
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
  setPose(ex, ph.side || '');
  sand.phase = ph.counter ? 'pump' : ph.t;

  const cue = $('#cue');
  if (cue.textContent !== ph.cue) {
    cue.textContent = ph.cue;
    cue.style.animationDuration = ph.s < 3 ? '0.28s' : ''; // short phases get a quicker fade
    cue.classList.remove('swap');
    void cue.offsetWidth;
    cue.classList.add('swap');
  }
  if (!ph.counter) {
    // a soft flash of the sun on every phase change — visible even when sound can't be heard
    const orb = $('#orb');
    orb.classList.remove('pulse');
    void orb.offsetWidth;
    orb.classList.add('pulse');
  }
  const hint = ph.t === 'interlude' ? `${ex.name} · ${ex.patternLabel}` : ph.hint || '';
  if ($('#hint').textContent !== hint) $('#hint').textContent = hint;

  // round + item labels
  let round = '';
  if (ph.outro) round = t('cue.integration');
  else if (ph.round) round = t('cue.round', { label: ex.roundLabel, n: ph.round, total: ph.rounds });
  $('#round').textContent = round;
  if (P.kind === 'ritual' && ex && $('#pr-title').textContent !== ex.name) {
    $('#pr-title').textContent = ex.name;
    $('#pr-item').textContent = t('cue.ritualItem', { label: P.ritual.label, n: ph.item + 1, total: P.plan.length });
  }

  // nostril indicator
  const ns = $('#nostrils');
  const usesSides = ex && ex.pattern.some((p) => p.side);
  ns.hidden = !usesSides || ph.t === 'prep' || ph.t === 'interlude';
  if (usesSides) $$('[data-side]', ns).forEach((s) => s.classList.toggle('is-on', s.dataset.side === ph.side));

  // voice, haptics, screen reader (skip the rapid pumps; very short phases get the chime, not speech)
  const firstPump = ph.counter && ph.count === 1 && ph.t === 'out';
  if (!ph.counter || firstPump) {
    const words = ph.say || ph.cue;
    if (firstPump) speak(t('cue.pumps', { n: ph.countTotal }));
    else if (ph.t !== 'prep' && ph.s >= 1.5) speak(words);
    buzz(ph.t === 'in' ? 35 : ph.t === 'out' ? [18, 70, 18] : ph.t === 'hold' ? 12 : 0);
    $('#pr-live').textContent = firstPump ? t('cue.pumps', { n: ph.countTotal }) : ph.s >= 2 ? t('cue.live', { words, s: fmt1(ph.s) }) : words;
  }
}

function onFrame(f) {
  const { ph, p, level, e, remaining } = f;
  $('#orb').style.setProperty('--lvl', level.toFixed(4));
  sand.level = level;
  $('#ring').style.strokeDashoffset = (RING_C * (1 - p)).toFixed(2);

  let count = '';
  if (ph.counter) count = `${ph.count} / ${ph.countTotal}`;
  else if (ph.s >= 1.5) {
    // count down from the whole seconds; a fractional part (5.5 s) is absorbed into the first number
    count = String(Math.max(1, Math.min(Math.floor(ph.s + 1e-6), Math.ceil(remaining - 0.02))));
  }
  if (count !== P.lastCount) {
    $('#count').textContent = count;
    P.lastCount = count;
  }
  $('#prog').style.transform = `scaleX(${(e / session.total).toFixed(4)})`;
  const sec = Math.floor(e);
  if (sec !== P.lastSec) {
    P.lastSec = sec;
    $('#t-el').textContent = clockUp(e);
    $('#t-rem').textContent = `−${clockDown(session.total - e)}`;
  }
}

function onState(s) {
  const el = P.el;
  if (s === 'running') {
    session._phaseIdx = -1; // re-announce the current phase (restores the cue after a pause)
    el.classList.remove('is-paused');
    $('#btn-play').setAttribute('aria-label', t('bar.pause'));
    sand.paused = false;
  } else if (s === 'paused') {
    el.classList.add('is-paused');
    $('#btn-play').setAttribute('aria-label', t('bar.resume'));
    sand.paused = true;
    session.renderStill();
    $('#cue').textContent = t('cue.paused');
    $('#pr-live').textContent = t('cue.paused');
    releaseScreen();
  } else if (s === 'done') {
    const secs = logProgress(session.total);
    releaseScreen();
    speak(t('done.say'));
    const what = P.kind === 'ritual' ? P.ritual.label : P.ex.name;
    $('#done-sub').textContent = t('done.sub', { dur: fmtDur(secs), what });
    $('#pr-title').textContent = P.kind === 'ritual' ? P.ritual.title : P.ex.name;
    $('#pr-item').textContent = t('done.complete');
    const streak = streakDays();
    $('#done-streak').textContent = streak > 1 ? t('done.streak', { n: streak }) : streak === 1 ? t('done.streak1') : '';
    $('#done-unlock').hidden = !(GATE.ready === true && !unlockedUser());
    $('#done-note').hidden = !diaryEnabled();
    $('#dn-text').value = '';
    $('#dn-saved').hidden = true;
    $('#dn-save').textContent = t('dn.save');
    $$('#mood [data-mood]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('#mood-thanks').hidden = true;
    $('#pr-live').textContent = t('done.live');
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
    log.push({ d: today(), at: Date.now(), m: Math.round((secs / 60) * 10) / 10, id: P.kind === 'ritual' ? `ritual:${P.ritual.id}` : P.ex.id });
    const kept = log.slice(-800);
    store.set('neshimot.log', kept);
    P.lastLogIndex = kept.length - 1;
    store.set('neshimot.free', true);
    renderProgress();
  }
  return secs;
}

function scrollToPending() {
  const target = P.pendingScroll && document.querySelector(P.pendingScroll);
  P.pendingScroll = null;
  if (target) target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
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

  $('#pr-close').addEventListener('click', () => requestEnd('close'));
  $('#done-close').addEventListener('click', closePractice);
  $('#cf-ok').addEventListener('click', () => {
    const pend = P.pendingEnd;
    P.pendingEnd = null;
    hideConfirm();
    if (pend) doEnd(pend.kind);
  });
  $('#cf-cancel').addEventListener('click', cancelEnd);
  $('#done-unlock-btn').addEventListener('click', () => {
    P.next = null;
    openGate();
  });
  $('#done-note').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#dn-text').value.trim();
    if (!text) return $('#dn-text').focus();
    const id = P.kind === 'ritual' ? `ritual:${P.ritual.id}` : P.ex.id;
    const log = store.get('neshimot.log', []);
    if (P.lastLogIndex != null && log[P.lastLogIndex]) {
      log[P.lastLogIndex].note = text;
      store.set('neshimot.log', log);
    } else {
      const notes = store.get('neshimot.notes', []);
      notes.push({ at: Date.now(), d: today(), id, text });
      store.set('neshimot.notes', notes);
    }
    $('#dn-saved').hidden = false;
    $('#dn-save').textContent = t('dn.update');
    renderDiary();
  });
  $('#gate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#g-name').value.trim().replace(/\s+/g, ' ');
    const email = $('#g-email').value.trim();
    const err = $('#g-error');
    if (!name) {
      err.textContent = t('gate.errName');
      return $('#g-name').focus();
    }
    if (!EMAIL_OK.test(email)) {
      err.textContent = t('gate.errEmail');
      return $('#g-email').focus();
    }
    err.textContent = '';
    const btn = $('#g-submit');
    btn.disabled = true;
    btn.textContent = t('gate.submitting');
    const target = P.next || {};
    const lead = { name, email, consent: $('#g-consent').checked, website: $('#g-website').value, practice: target.exId || target.ritualId || '', lang: isHe() ? 'he' : 'en' };
    let res = 'retry';
    try {
      res = await postLead(lead);
    } catch (_) {}
    btn.disabled = false;
    btn.textContent = t('gate.submitPlain');
    if (res === 'bad-email') {
      err.textContent = t('gate.errEmailServer');
      return $('#g-email').focus();
    }
    if (res === 'bad-name') {
      err.textContent = t('gate.errName');
      return $('#g-name').focus();
    }
    // never block someone because of our own hiccup — retried on their next visit
    if (res === 'retry') store.set('neshimot.pendingLead', lead);
    store.set('neshimot.user', { name, email, at: Date.now() });
    completeUnlock(name);
  });
  $('#su-ack').addEventListener('change', () => {
    $('#su-start').disabled = !$('#su-ack').checked;
  });
  $('#su-caution-link').addEventListener('click', (e) => {
    e.preventDefault();
    P.pendingScroll = $('#su-caution-link').getAttribute('href');
    const wasPushed = P.pushed;
    closePractice();
    if (!wasPushed) scrollToPending();
  });
  $('#mood').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mood]');
    if (!b) return;
    $$('#mood [data-mood]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (P.lastLogIndex != null) {
      const log = store.get('neshimot.log', []);
      if (log[P.lastLogIndex]) {
        log[P.lastLogIndex].feel = b.dataset.mood;
        store.set('neshimot.log', log);
      }
    }
    $('#mood-thanks').hidden = false;
  });
  $('#done-again').addEventListener('click', () => {
    renderSetup();
    setView('setup');
    P.el.dataset.phase = 'rest';
    if (P.kind === 'ritual') {
      $('#pr-item').textContent = P.ritual.label;
      $('#pr-title').textContent = P.ritual.title;
    } else {
      $('#pr-item').textContent = `${catLabel(P.ex.category)} · ${levelLabel(P.ex.level)}`;
    }
    sand.setCenter($('#su-start'));
  });
  $('#su-start').addEventListener('click', startSession);
  $('#su-preview').addEventListener('click', () => {
    const b = $('#su-preview');
    if (b.dataset.playing) return stopPreview();
    b.dataset.playing = '1';
    b.textContent = t('setup.previewing');
    b.setAttribute('aria-pressed', 'true');
    audio.unlock().then(() => {
      if (!b.dataset.playing) return;
      audio.setMuted(false);
      audio.setTonesOn(true);
      audio.preview();
      previewTimer = setTimeout(stopPreview, 5600);
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
  $$('.toggle[data-pref]').forEach((tog) =>
    tog.addEventListener('click', () => {
      const k = tog.dataset.pref;
      prefs[k] = !prefs[k];
      savePrefs();
      tog.setAttribute('aria-pressed', prefs[k]);
      if (k === 'sound') audio.setTonesOn(prefs.sound);
      if (k === 'wind') {
        if (prefs.wind) audio.unlock().then(() => audio.setWind(true));
        else audio.setWind(false);
      }
      if (k === 'voice' && prefs.voice) speak(t('tg.voiceOn'));
      if (k === 'haptic' && prefs.haptic) buzz(30);
    })
  );

  $('#btn-play').addEventListener('click', () => {
    if (session.state === 'running') session.pause();
    else if (session.state === 'paused') {
      audio.unlock(); // resume immediately, exactly where it paused
      session.resume();
      holdScreen();
    }
  });
  $('#btn-restart').addEventListener('click', () => requestEnd('restart'));
  // master mute: tones, wind and voice together; preferences stay as they are
  $('#btn-sound').addEventListener('click', () => {
    P.muted = !P.muted;
    audio.setMuted(P.muted);
    if (P.muted) {
      audio.stopAll(0.2);
      try {
        speechSynthesis.cancel();
      } catch (_) {}
    }
    syncSoundBtn();
  });

  window.addEventListener('popstate', () => {
    if (!P.el.hidden && P.pushed) {
      P.pushed = false;
      teardown();
    }
    // after the browser restores scroll for this history step, go where the user asked
    if (P.pendingScroll) setTimeout(scrollToPending, 60);
  });

  document.addEventListener('keydown', (e) => {
    if (P.el.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!$('#pr-confirm').hidden) cancelEnd();
      else if (P.el.dataset.view === 'stage') requestEnd('close');
      else closePractice();
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
    <text class="axis" x="${L}" y="${H - 12}">${t('lab.ago30')}</text><text class="axis" x="${R}" y="${H - 12}" text-anchor="end">${t('lab.now')}</text>
    <text class="axis" x="${(L + R) / 2}" y="${H - 12}" text-anchor="middle">${t('lab.ago15')}</text>`;
  const [fillP, breathP, hrP] = ['.rsa-breath-fill', '.rsa-breath', '.rsa-hr'].map((s) => svg.querySelector(s));

  // resonance curve
  const cx = (b) => 18 + ((b - 3) / 17) * 226;
  const cy = (a) => 118 - (a / 13) * 100;
  let d = '';
  for (let b = 3; b <= 20.01; b += 0.25) d += `${d ? 'L' : 'M'}${cx(b).toFixed(1)},${cy(swing(b)).toFixed(1)}`;
  curve.innerHTML = `
    <rect class="zone" x="${cx(4.5)}" y="12" width="${cx(7) - cx(4.5)}" height="106" rx="4"/>
    <text x="${cx(5.75)}" y="10" text-anchor="middle">${t('lab.resonance')}</text>
    <path class="curve-fill" d="${d}L${cx(20)},118L${cx(3)},118Z"/><path class="curve" d="${d}"/>
    <line x1="18" x2="244" y1="118" y2="118" stroke="rgba(235,192,126,.2)"/>
    ${[3, 6, 12, 20].map((b) => `<text x="${cx(b)}" y="134" text-anchor="middle">${b}</text>`).join('')}
    <text x="244" y="148" text-anchor="end">${t('lab.perMin')}</text>
    <circle class="marker" r="6"/>`;
  const marker = curve.querySelector('.marker');

  const notes = [
    [4.4, t('lab.n1')],
    [7.25, t('lab.n2')],
    [10.25, t('lab.n3')],
    [14.25, t('lab.n4')],
    [99, t('lab.n5')],
  ];

  let bpm = +input.value;
  let clockT = 0;
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
      const tt = clockT - WINDOW + u * WINDOW;
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
    clockT += dt;
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

/** Consecutive practice days up to today (or yesterday, if today isn't done yet). */
function streakDays() {
  const days = new Set(store.get('neshimot.log', []).map((s) => s.d));
  let streak = 0;
  const d = new Date();
  if (!days.has(today(d))) d.setDate(d.getDate() - 1);
  while (days.has(today(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderProgress() {
  const log = store.get('neshimot.log', []);
  const days = new Map();
  log.forEach((s) => days.set(s.d, (days.get(s.d) || 0) + s.m));
  const streak = streakDays();

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const x = new Date();
    x.setDate(x.getDate() - i);
    week.push({ key: today(x), label: x.toLocaleDateString(locale(), { weekday: isHe() ? 'narrow' : 'short' }), m: days.get(today(x)) || 0, isToday: i === 0 });
  }
  $('#st-streak').textContent = streak;
  renderDiary();
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
        return `<rect class="${w.m ? 'bar' : 'bar-empty'}${w.isToday ? ' bar-today' : ''}" x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="8"><title>${t('week.bar', { day: w.label, m: Math.round(w.m * 10) / 10 })}</title></rect>
          ${w.m ? `<text class="val" x="${x + bw / 2}" y="${base - h - 8}" text-anchor="middle">${Math.round(w.m)}</text>` : ''}
          <text x="${x + bw / 2}" y="170" text-anchor="middle"${w.isToday ? ' style="fill:var(--saffron)"' : ''}>${w.label}</text>`;
      })
      .join('');
  renderCP();
}

function cpRating(s) {
  if (s < 10) return t('cp.r1');
  if (s < 20) return t('cp.r2');
  if (s < 40) return t('cp.r3');
  return t('cp.r4');
}

const fmtDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

function renderCP() {
  const svg = $('#cp-chart');
  const all = store.get('neshimot.cp', []);
  const data = all.slice(-12);
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
    h += `<text x="${(L + R) / 2}" y="${(T + B) / 2 + 4}" text-anchor="middle" style="font-size:12px">${t('cp.empty')}</text>`;
  } else {
    const x = (i) => (data.length === 1 ? (L + R) / 2 : L + 14 + (i / (data.length - 1)) * (R - L - 28));
    const pts = data.map((p, i) => `${x(i).toFixed(1)},${y(p.s).toFixed(1)}`);
    if (data.length > 1) h += `<polyline class="cp-line" points="${pts.join(' ')}"/>`;
    h += data.map((p, i) => `<circle class="cp-dot" cx="${x(i).toFixed(1)}" cy="${y(p.s).toFixed(1)}" r="4"><title>${t('cp.point', { d: fmtDay(p.d), s: p.s.toFixed(1) })}</title></circle>`).join('');
    const first = data[0].d;
    const last = data[data.length - 1].d;
    h +=
      first === last
        ? `<text x="${(L + R) / 2}" y="${H - 6}" text-anchor="middle">${fmtDay(first)}</text>`
        : `<text x="${L}" y="${H - 6}">${fmtDay(first)}</text><text x="${R}" y="${H - 6}" text-anchor="end">${fmtDay(last)}</text>`;
  }
  svg.innerHTML = h;

  // recent readings, each removable on its own
  const list = $('#cp-list');
  const recent = all.map((r, i) => ({ ...r, i })).slice(-5).reverse();
  list.innerHTML = recent
    .map(
      (r) =>
        `<li><span>${fmtDay(r.d)}</span><b>${t('cp.value', { s: r.s.toFixed(1) })}</b><button type="button" class="cp-del" data-i="${r.i}" aria-label="${t('cp.del', { s: r.s.toFixed(1), d: fmtDay(r.d) })}">×</button></li>`
    )
    .join('');
  list.hidden = !recent.length;
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
      btn.textContent = t('cp.stop');
      $('#cp-result').textContent = t('cp.holding');
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      const s = (performance.now() - t0) / 1000;
      box.classList.remove('is-timing');
      btn.textContent = t('cp.start');
      out.textContent = s.toFixed(1);
      if (s < 1.5) {
        $('#cp-result').textContent = t('cp.short');
        return;
      }
      const cp = store.get('neshimot.cp', []);
      cp.push({ d: today(), s: Math.round(s * 10) / 10 });
      store.set('neshimot.cp', cp.slice(-100));
      $('#cp-result').textContent = cpRating(s);
      renderCP();
    }
  });
  $('#cp-list').addEventListener('click', (e) => {
    const b = e.target.closest('.cp-del');
    if (!b) return;
    const cp = store.get('neshimot.cp', []);
    cp.splice(+b.dataset.i, 1);
    store.set('neshimot.cp', cp);
    renderCP();
    $('#cp-result').textContent = t('cp.removed');
  });
  $('#reset-data').addEventListener('click', () => {
    if (!confirm(t('reset.confirm'))) return;
    ['neshimot.log', 'neshimot.cp', 'neshimot.notes', 'ruach.log', 'ruach.cp'].forEach((k) => store.del(k));
    renderProgress();
    $('#cp-result').textContent = '';
    out.textContent = '0.0';
  });
}

/* =================================================================
   Breathing diary — a timeline of sessions, moods and notes.
   Stored on this device only (sessions in neshimot.log, free notes in neshimot.notes).
   ================================================================= */
const FEEL = { calmer: t('mood.calmer'), same: t('mood.same'), energised: t('mood.energised') };
const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const diaryEnabled = () => !(GATE.ready === true && !unlockedUser());
let diaryShown = 8;

function practiceName(id) {
  if (!id) return t('diary.general');
  if (id.startsWith('ritual:')) {
    const r = RITUALS.find((x) => `ritual:${x.id}` === id);
    return r ? r.label : t('diary.ritual');
  }
  const ex = byId(id);
  return ex ? ex.name : t('diary.practiceFallback');
}

function diaryItems() {
  const items = store.get('neshimot.log', []).map((x, i) => ({
    key: `s${i}`, kind: 'session', at: x.at || Date.parse(`${x.d}T12:00:00`), timed: !!x.at, id: x.id, m: x.m, feel: x.feel, note: x.note || '',
  }));
  store.get('neshimot.notes', []).forEach((n, i) => items.push({ key: `n${i}`, kind: 'note', at: n.at, timed: true, id: n.id, note: n.text || '' }));
  return items.sort((a, b) => b.at - a.at);
}

function itemHTML(it) {
  const when = new Date(it.at);
  const date = when.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  const time = it.timed ? ` · ${when.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}` : '';
  const what = it.kind === 'session' ? `${esc(practiceName(it.id))} · ${esc(t('u.min', { n: it.m < 1 ? '<1' : Math.round(it.m) }))}` : esc(practiceName(it.id));
  const feel = it.feel ? `<span class="feel feel-${it.feel}">${FEEL[it.feel]}</span>` : '';
  const text = it.note ? `<p class="diary-text">${esc(it.note)}</p>` : '';
  const actions = it.note
    ? `<button type="button" class="link-btn" data-edit="${it.key}">${t('diary.edit')}</button><button type="button" class="link-btn" data-del="${it.key}">${t('diary.delete')}</button>`
    : `<button type="button" class="link-btn" data-edit="${it.key}">${t('diary.add')}</button>`;
  return `<li class="diary-item is-${it.kind}${it.note ? ' has-note' : ''}" data-key="${it.key}">
    <div class="diary-meta"><time datetime="${when.toISOString()}">${date}${time}</time><span class="diary-what">${what}</span>${feel}</div>
    ${text}<div class="diary-item-actions">${actions}</div></li>`;
}

function renderDiary() {
  const box = $('#diary');
  if (!box) return;
  const on = diaryEnabled();
  $('#diary-locked').hidden = on;
  $('#diary-new').hidden = !on;
  $('#diary-export').hidden = !on;
  if (!on) {
    $('#diary-compose').hidden = true;
    $('#diary-list').innerHTML = '';
    $('#diary-moods').hidden = true;
    $('#diary-empty').hidden = true;
    $('#diary-more').hidden = true;
    return;
  }
  const items = diaryItems();
  // how sessions leave you — from the one-tap mood on the completion screen
  const counts = { calmer: 0, same: 0, energised: 0 };
  items.forEach((it) => it.feel && counts[it.feel]++);
  const rated = counts.calmer + counts.same + counts.energised;
  const moods = $('#diary-moods');
  moods.hidden = rated < 1;
  if (rated) {
    moods.innerHTML =
      `<p class="diary-moods-title">${t('diary.moods')}</p><div class="mood-bar" role="img" aria-label="${Object.entries(counts).map(([k, v]) => `${FEEL[k]} ${v}`).join(', ')}">` +
      Object.entries(counts).filter(([, v]) => v).map(([k, v]) => `<i class="feel-${k}" style="flex:${v}"></i>`).join('') +
      `</div><p class="mood-legend">${Object.entries(counts).filter(([, v]) => v).map(([k, v]) => `<span class="feel feel-${k}">${FEEL[k]} · ${Math.round((v / rated) * 100)}%</span>`).join('')}</p>`;
  }
  $('#diary-list').innerHTML = items.slice(0, diaryShown).map(itemHTML).join('');
  $('#diary-empty').hidden = items.length > 0;
  $('#diary-more').hidden = items.length <= diaryShown;
}

function saveDiaryText(key, text) {
  const i = +key.slice(1);
  if (key[0] === 's') {
    const log = store.get('neshimot.log', []);
    if (!log[i]) return;
    if (text) log[i].note = text;
    else delete log[i].note;
    store.set('neshimot.log', log);
  } else {
    const notes = store.get('neshimot.notes', []);
    if (!notes[i]) return;
    if (text) notes[i].text = text;
    else notes.splice(i, 1);
    store.set('neshimot.notes', notes);
  }
}

function exportDiary() {
  const items = diaryItems().reverse();
  const lines = [t('diary.fileTitle'), t('diary.downloaded', { date: new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) }), ''];
  for (const it of items) {
    const when = new Date(it.at);
    const head = [
      when.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) + (it.timed ? `, ${when.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}` : ''),
      practiceName(it.id),
      it.kind === 'session' ? t('u.min', { n: it.m < 1 ? '<1' : Math.round(it.m) }) : '',
      it.feel ? FEEL[it.feel] : '',
    ].filter(Boolean);
    lines.push(head.join(' · '));
    if (it.note) lines.push(it.note);
    lines.push('');
  }
  // a byte-order mark so Hebrew opens correctly in every text editor
  const blob = new Blob([isHe() ? '\ufeff' : '', lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${t('diary.file')}-${today()}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

function initDiary() {
  const sel = $('#dc-practice');
  sel.innerHTML = `<option value="">${esc(t('diary.general'))}</option>` + EXERCISES.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
  $('#diary-new').addEventListener('click', () => {
    const f = $('#diary-compose');
    f.hidden = false;
    $('#dc-text').focus();
  });
  $('#dc-cancel').addEventListener('click', () => {
    $('#diary-compose').hidden = true;
    $('#dc-text').value = '';
  });
  $('#diary-compose').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#dc-text').value.trim();
    if (!text) return $('#dc-text').focus();
    const notes = store.get('neshimot.notes', []);
    notes.push({ at: Date.now(), d: today(), id: sel.value || null, text });
    store.set('neshimot.notes', notes);
    $('#dc-text').value = '';
    $('#diary-compose').hidden = true;
    renderDiary();
  });
  $('#diary-more').addEventListener('click', () => {
    diaryShown += 12;
    renderDiary();
  });
  $('#diary-export').addEventListener('click', exportDiary);
  $('#diary-unlock').addEventListener('click', () => {
    P.next = null;
    openGate(() => {
      closePractice();
      P.pendingScroll = '#diary';
    });
  });
  // inline edit / delete
  $('#diary-list').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm(t('diary.confirmDelete'))) return;
      saveDiaryText(del.dataset.del, '');
      return renderDiary();
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const key = edit.dataset.edit;
      const li = edit.closest('.diary-item');
      const current = diaryItems().find((x) => x.key === key);
      const form = document.createElement('form');
      form.className = 'diary-edit';
      form.innerHTML = `<label class="sr-only" for="de-${key}">${t('diary.note')}</label><textarea id="de-${key}" rows="3" maxlength="2000" placeholder="${esc(t('diary.editPlaceholder'))}"></textarea>
        <div class="diary-row-actions"><button class="btn btn-primary" type="submit">${t('diary.saveShort')}</button><button class="link-btn" type="button" data-cancel>${t('diary.cancel')}</button></div>`;
      li.querySelector('.diary-text')?.remove();
      li.querySelector('.diary-item-actions').replaceWith(form);
      const ta = form.querySelector('textarea');
      ta.value = (current && current.note) || '';
      ta.focus();
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        saveDiaryText(key, ta.value.trim());
        renderDiary();
      });
      form.querySelector('[data-cancel]').addEventListener('click', renderDiary);
    }
  });
  renderDiary();
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
   Theme — the boot script in <head> already applied the saved choice (or the system's);
   the toggle sweeps the new theme across the page in a circle from the button.
   ================================================================= */
let scenery = null;

function applyThemeChrome() {
  const light = THEME.light;
  const btn = $('#theme-toggle');
  if (btn) btn.setAttribute('aria-label', light ? btn.dataset.labelDark : btn.dataset.labelLight);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = light ? '#F7EFE3' : '#110E1A';
  if (light) {
    scenery = scenery || new Scenery($('#scenery'));
    scenery.start();
  } else if (scenery) scenery.stop();
}

function setTheme(next, { from = null, save = true } = {}) {
  if (save) {
    store.set('neshimot.theme', next);
    root.removeAttribute('data-theme-auto');
  }
  const apply = () => {
    root.dataset.theme = next;
    applyThemeChrome();
  };
  if (!from || !document.startViewTransition || reduceMotion.matches) {
    root.classList.add('theme-fade');
    apply();
    setTimeout(() => root.classList.remove('theme-fade'), 900);
    return;
  }
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('vt-theme');
  let vt;
  try {
    vt = document.startViewTransition(apply);
  } catch (_) {
    root.classList.remove('vt-theme');
    return apply();
  }
  vt.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 1100, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    )
    .catch(() => {});
  vt.finished.finally(() => root.classList.remove('vt-theme'));
}

function initTheme() {
  applyThemeChrome();
  const btn = $('#theme-toggle');
  if (btn) btn.addEventListener('click', (e) => setTheme(THEME.light ? 'dark' : 'light', { from: e.currentTarget }));
  // follow the system's light/dark setting until the visitor picks one
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const follow = (e) => root.dataset.themeAuto && setTheme(e.matches ? 'light' : 'dark', { save: false });
  if (mq.addEventListener) mq.addEventListener('change', follow);
}

/* =================================================================
   Language — English at /, Hebrew at /he. The switch remembers the choice and
   carries you to the same section in the other language.
   ================================================================= */
function currentAnchor() {
  if (window.scrollY < window.innerHeight * 0.5) return '';
  let best = '';
  for (const el of $$('main section[id], .chapter[id], #diary')) {
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) best = el.id;
  }
  return best;
}

function initLang() {
  $$('[data-lang-to]').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      store.set('neshimot.lang', a.dataset.langTo);
      const hash = currentAnchor();
      const url = a.getAttribute('href') + (hash ? `#${hash}` : '');
      const sw = $('.lang-switch');
      if (sw) sw.classList.add('is-going');
      root.classList.add('is-leaving');
      setTimeout(() => location.assign(url), reduceMotion.matches ? 0 : 340);
    })
  );
  // coming back with the browser's back button: undo the leaving state
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    root.classList.remove('is-leaving');
    const sw = $('.lang-switch');
    if (sw) sw.classList.remove('is-going');
  });
}

/* =================================================================
   Boot
   ================================================================= */
scatterStars($('#stars'), 110);
initTheme();
initLang();
initChrome();
initFilters();
initPractice();
initLab();
initProgress();
initFigures();
initDiary();
checkGate().then(() => {
  flushPendingLead();
  renderDiary();
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
