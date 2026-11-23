// Neshimot — light-mode landscapes.
// Six calm scenes of the land (dunes, an oasis, the crater mountains, the sea at dawn, olive hills and an
// acacia plain) drawn as inline SVG, shown at low opacity behind the page. The scene follows the section
// you are reading and cross-fades with a gentle rise; each one moves slowly — the sun breathes in a
// 5.5-second rhythm, palms sway, mist drifts, water glints, a caravan crosses the horizon.
// Built only when light mode is first switched on, so dark-mode visitors never pay for it.

const W = 1440;
const H = 600;

const sun = (cx, cy, r = 54, glow = 200) => `
  <circle class="sc-glow sc-breathe" cx="${cx}" cy="${cy}" r="${glow}" fill="url(#sc-sun-glow)"/>
  <circle class="sc-sun sc-breathe" cx="${cx}" cy="${cy}" r="${r}"/>`;

const birds = (y, cls = '') => `
  <g class="sc-birds ${cls}"><g transform="translate(0 ${y})">
    <path class="sc-bird" d="M0 0 q7 -6 14 0 q7 -6 14 0"/>
    <path class="sc-bird" d="M34 -14 q6 -5 12 0 q6 -5 12 0" style="animation-delay:-.6s"/>
    <path class="sc-bird" d="M62 6 q5 -4 10 0 q5 -4 10 0" style="animation-delay:-1.1s"/>
  </g></g>`;

const cloud = (x, y, s, d) =>
  `<g class="sc-cloud" style="--d:${d}s"><g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="120" ry="16"/><ellipse cx="-40" cy="-10" rx="60" ry="16"/><ellipse cx="34" cy="-14" rx="54" ry="18"/></g></g>`;

function palm(x, y, h, lean, sway) {
  // trunk: a gently curving, tapering band; fronds: long arching leaves around the crown
  const tx = x + lean;
  const ty = y - h;
  const trunk = `<path class="sc-trunk" d="M${x - 7} ${y} C${x - 4} ${y - h * 0.45} ${tx - 9} ${ty + h * 0.25} ${tx - 3} ${ty} L${tx + 3} ${ty} C${tx - 1} ${ty + h * 0.25} ${x + 6} ${y - h * 0.45} ${x + 7} ${y} Z"/>`;
  const rings = Array.from({ length: 6 }, (_, i) => {
    const u = (i + 1) / 7;
    const cx = x + (tx - x) * u * u;
    const cy = y - h * u;
    return `<path class="sc-ring" d="M${(cx - 6).toFixed(1)} ${cy.toFixed(1)} q6 3 12 0"/>`;
  }).join('');
  const leaf = (ang, len, droop) => {
    const a = (ang * Math.PI) / 180;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.55 + droop;
    const mx = tx + Math.cos(a) * len * 0.5;
    const my = ty + Math.sin(a) * len * 0.3 - 16;
    return `<path class="sc-leaf" d="M${tx} ${ty} Q${mx.toFixed(1)} ${(my - 8).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)} Q${(mx + 2).toFixed(1)} ${(my + 10).toFixed(1)} ${tx} ${ty + 4} Z"/>`;
  };
  const fronds = [
    [-170, 92, 34],
    [-140, 104, 22],
    [-110, 70, -4],
    [-70, 70, -4],
    [-40, 104, 22],
    [-10, 92, 36],
    [-190, 70, 56],
    [10, 70, 58],
  ]
    .map(([a, l, d]) => leaf(a, l * (h / 230), d * (h / 230)))
    .join('');
  return `<g class="sc-palm">${trunk}${rings}<g class="sc-fronds" style="transform-origin:${tx}px ${ty}px;--sw:${sway}s">${fronds}<circle class="sc-dates" cx="${tx}" cy="${ty + 6}" r="6"/></g></g>`;
}

function olive(x, y, s) {
  return `<g class="sc-olive" transform="translate(${x} ${y}) scale(${s})"><path class="sc-trunk" d="M-3 0 C-2 -10 -6 -16 -2 -24 L2 -24 C0 -16 4 -10 3 0 Z"/><g class="sc-canopy"><circle cx="-14" cy="-30" r="14"/><circle cx="2" cy="-38" r="17"/><circle cx="17" cy="-29" r="13"/><circle cx="0" cy="-26" r="12"/></g></g>`;
}

const cypress = (x, y, s) => `<path class="sc-cypress" transform="translate(${x} ${y}) scale(${s})" d="M0 0 C-9 -20 -8 -58 0 -92 C8 -58 9 -20 0 0 Z"/>`;

const camel = `<path d="M2 18 C4 12 10 10 14 11 C16 5 22 4 25 9 C27 11 29 11 31 9 L35 4 C36 3 38 3 39 4 L40 6 L37 7 L34 13 C33 16 31 18 29 18 L29 28 L27.4 28 L27 19 L23 19 L22.4 28 L20.8 28 L20 19 L12 19 L11.4 28 L9.8 28 L9 19 L7 19 L6.4 28 L4.8 28 L4 20 C3 20 2 19 2 18 Z"/>`;

const SCENES = {
  dunes: () => `
    ${cloud(260, 150, 1, 140)}${cloud(980, 96, 0.7, 180)}
    ${sun(1060, 268)}
    <g class="sc-layer sc-l1"><path class="sc-far" d="M0 372 C160 330 300 318 470 344 C640 370 760 326 930 312 C1100 298 1260 338 1440 322 L1440 600 L0 600Z"/></g>
    ${birds(210, 'sc-fly')}
    <g class="sc-layer sc-l2"><path class="sc-mid" d="M0 446 C200 398 380 430 560 418 C760 404 860 360 1060 380 C1240 398 1340 432 1440 420 L1440 600 L0 600Z"/><path class="sc-ridge" d="M640 412 C780 392 880 362 1060 380 C1170 391 1250 406 1320 418"/></g>
    <g class="sc-layer sc-l3"><path class="sc-near" d="M0 528 C260 486 520 512 760 500 C1000 488 1220 462 1440 486 L1440 600 L0 600Z"/><path class="sc-ridge" d="M90 512 C230 488 390 494 560 504"/></g>`,

  oasis: () => `
    ${cloud(1120, 120, 0.8, 160)}
    ${sun(380, 250, 48, 180)}
    <g class="sc-layer sc-l1"><path class="sc-far" d="M0 360 C180 336 340 330 520 348 C720 368 860 334 1040 326 C1200 320 1320 340 1440 336 L1440 600 L0 600Z"/></g>
    <g class="sc-layer sc-l2">
      <path class="sc-mid" d="M0 430 C220 404 420 420 640 414 C860 408 1060 396 1440 418 L1440 600 L0 600Z"/>
      <ellipse class="sc-water" cx="820" cy="488" rx="430" ry="42"/>
      <g class="sc-glints">${[0, 1, 2, 3, 4, 5, 6]
        .map((i) => `<path class="sc-glint" style="animation-delay:${(-i * 0.7).toFixed(1)}s" d="M${560 + i * 74} ${474 + (i % 3) * 9} h${26 + (i % 2) * 18}"/>`)
        .join('')}</g>
    </g>
    <g class="sc-layer sc-l3">
      ${palm(190, 470, 250, 26, 7)}${palm(300, 482, 200, -18, 8.5)}${palm(1250, 470, 230, -30, 7.6)}${palm(1340, 488, 170, 14, 9)}
      <path class="sc-near" d="M0 520 C180 496 340 512 520 516 C700 520 980 530 1180 512 C1300 502 1380 498 1440 504 L1440 600 L0 600Z"/>
      <g class="sc-reeds">${[430, 446, 462, 1130, 1146, 1162, 1178].map((x, i) => `<path style="animation-delay:${-i * 0.5}s" d="M${x} 522 q${i % 2 ? 6 : -6} -22 ${i % 2 ? 2 : -2} -40"/>`).join('')}</g>
    </g>`,

  mountains: () => `
    ${sun(980, 210, 46, 170)}
    ${birds(170, 'sc-fly sc-fly-slow')}
    <g class="sc-layer sc-l1"><path class="sc-far" d="M0 330 L120 300 L210 318 L330 262 L430 300 L560 280 L640 296 L760 238 L880 288 L1000 270 L1110 300 L1240 256 L1340 292 L1440 280 L1440 600 L0 600Z"/></g>
    <g class="sc-mist sc-mist-a"><ellipse cx="420" cy="350" rx="520" ry="26"/></g>
    <g class="sc-layer sc-l2"><path class="sc-mid" d="M0 404 L90 392 L150 360 L420 356 L470 384 L640 392 L700 344 L980 340 L1030 372 L1200 382 L1270 352 L1440 356 L1440 600 L0 600Z"/><path class="sc-strata" d="M160 372 L410 368 M712 356 L968 352 M1280 366 L1440 368"/></g>
    <g class="sc-mist sc-mist-b"><ellipse cx="1000" cy="430" rx="600" ry="30"/></g>
    <g class="sc-layer sc-l3"><path class="sc-near" d="M0 500 C140 470 260 462 400 476 C560 492 700 470 860 458 C1040 446 1220 480 1440 468 L1440 600 L0 600Z"/></g>`,

  sea: () => `
    ${cloud(300, 140, 0.9, 170)}${cloud(1180, 180, 0.6, 210)}
    ${sun(720, 318, 50, 210)}
    <g class="sc-layer sc-l1"><path class="sc-far" d="M0 352 C90 318 180 304 280 322 C360 336 420 344 470 352 Z M1090 352 C1180 330 1300 316 1440 326 L1440 352 Z"/></g>
    <g class="sc-layer sc-l2">
      <rect class="sc-sea" x="0" y="352" width="${W}" height="${H - 352}"/>
      <path class="sc-horizon" d="M0 352 H${W}"/>
      <g class="sc-glints">${Array.from({ length: 9 }, (_, i) => {
        const w = 70 - i * 6;
        return `<path class="sc-glint" style="animation-delay:${(-i * 0.45).toFixed(2)}s" d="M${720 - w / 2 + (i % 2 ? 8 : -8)} ${366 + i * 16} h${w}"/>`;
      }).join('')}</g>
      <g class="sc-sail"><path d="M0 0 L0 -26 L14 -2 Z"/><path d="M-6 2 H16 L12 6 H-3 Z"/></g>
    </g>
    <g class="sc-layer sc-l3">
      <g class="sc-waves"><path d="M-80 452 q60 -10 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0"/><path d="M-20 500 q70 -12 140 0 t140 0 t140 0 t140 0 t140 0 t140 0 t140 0 t140 0 t140 0 t140 0 t140 0 t140 0"/></g>
      <path class="sc-near" d="M0 560 C240 540 420 552 640 556 C900 560 1160 538 1440 548 L1440 600 L0 600Z"/>
    </g>`,

  olives: () => `
    ${cloud(420, 110, 1, 150)}${cloud(1160, 160, 0.75, 190)}
    ${sun(1180, 230, 44, 170)}
    <g class="sc-layer sc-l1"><path class="sc-far" d="M0 350 C200 300 380 296 560 326 C720 352 860 318 1040 300 C1220 284 1340 316 1440 312 L1440 600 L0 600Z"/>${[1180, 1230, 1290].map((x, i) => cypress(x, 308 - i * 2, 0.55)).join('')}</g>
    <g class="sc-layer sc-l2"><path class="sc-mid" d="M0 430 C180 384 360 380 560 404 C760 428 900 392 1080 384 C1260 376 1360 400 1440 404 L1440 600 L0 600Z"/>
      <path class="sc-terrace" d="M60 428 C220 398 380 396 540 414 M120 452 C300 420 460 422 620 436 M820 410 C960 394 1100 388 1260 394 M900 432 C1040 414 1200 410 1380 418"/>
      ${[210, 300, 400, 980, 1080, 1180].map((x, i) => olive(x, 424 - (i % 2) * 8, 0.62)).join('')}</g>
    <g class="sc-layer sc-l3"><path class="sc-near" d="M0 520 C220 482 440 488 660 506 C880 524 1100 488 1440 498 L1440 600 L0 600Z"/>
      ${olive(150, 512, 1.15)}${olive(330, 502, 0.95)}${cypress(1210, 500, 1.1)}${cypress(1250, 504, 0.9)}${olive(1340, 506, 1.05)}</g>`,

  acacia: () => `
    ${sun(380, 300, 60, 230)}
    <g class="sc-layer sc-l1"><path class="sc-far" d="M0 372 C200 356 360 350 560 360 C800 372 1000 344 1220 346 C1320 347 1390 354 1440 356 L1440 600 L0 600Z"/></g>
    <g class="sc-caravan"><g transform="translate(0 340) scale(.62)">${[0, 52, 104].map((x) => `<g transform="translate(${x} 0)">${camel}</g>`).join('')}<path d="M-18 28 L-16 10 C-16 6 -12 6 -12 10 L-10 28 Z M-14 4 a3 3 0 1 0 0.1 0Z"/></g></g>
    <g class="sc-layer sc-l2"><path class="sc-mid" d="M0 440 C240 420 520 432 760 428 C1000 424 1240 410 1440 420 L1440 600 L0 600Z"/></g>
    <g class="sc-layer sc-l3">
      <g class="sc-acacia" transform="translate(1080 500)">
        <path class="sc-trunk" d="M-6 0 C-5 -30 -10 -52 -30 -74 L-25 -77 C-8 -60 0 -46 2 -40 C6 -52 18 -66 34 -78 L38 -74 C22 -60 10 -44 7 -24 L6 0 Z"/>
        <g class="sc-canopy-a"><ellipse cx="0" cy="-86" rx="132" ry="16"/><ellipse cx="-50" cy="-96" rx="66" ry="12"/><ellipse cx="46" cy="-98" rx="72" ry="12"/><ellipse cx="0" cy="-104" rx="50" ry="10"/></g>
      </g>
      <path class="sc-near" d="M0 512 C260 494 520 506 800 504 C1060 502 1260 490 1440 498 L1440 600 L0 600Z"/>
      <g class="sc-grass">${[140, 160, 520, 540, 1290, 1310].map((x, i) => `<path style="animation-delay:${-i * 0.6}s" d="M${x} 508 q${i % 2 ? 4 : -4} -14 ${i % 2 ? 1 : -1} -26"/>`).join('')}</g>
    </g>`,
};

// which scene belongs to which part of the page
const MAP = [
  ['.hero', 'dunes'],
  ['.pp-hero', 'dunes'],
  ['#how', 'dunes'],
  ['#practices', 'dunes'],
  ['#chapters', 'oasis'],
  ['#ritual', 'mountains'],
  ['#science', 'sea'],
  ['#progress', 'olives'],
  ['#remind', 'olives'],
  ['#more', 'mountains'],
  ['#safety', 'acacia'],
  ['.footer', 'acacia'],
];

export class Scenery {
  constructor(el) {
    this.el = el;
    this.built = false;
    this.on = false;
    this.current = '';
    this._onScroll = this._onScroll.bind(this);
    this._ticking = false;
  }

  _build() {
    const defs = `<defs><radialGradient id="sc-sun-glow"><stop offset="0" class="sc-g0"/><stop offset=".45" class="sc-g1"/><stop offset="1" class="sc-g2"/></radialGradient><linearGradient id="sc-sea-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc-s0"/><stop offset=".55" class="sc-s1"/><stop offset="1" class="sc-s2"/></linearGradient></defs>`;
    this.el.innerHTML = Object.entries(SCENES)
      .map(
        ([name, draw]) =>
          `<svg class="scene" data-scene="${name}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" focusable="false">${name === 'dunes' ? defs : ''}${draw()}</svg>`
      )
      .join('');
    this.scenes = Object.fromEntries([...this.el.querySelectorAll('.scene')].map((s) => [s.dataset.scene, s]));
    this.sections = MAP.map(([sel, scene]) => ({ el: document.querySelector(sel), scene })).filter((x) => x.el);
    this.built = true;
  }

  start() {
    if (!this.built) this._build();
    if (this.on) return;
    this.on = true;
    this.el.classList.add('is-ready');
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._update();
  }

  stop() {
    if (!this.on) return;
    this.on = false;
    this.el.classList.remove('is-ready');
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
  }

  _onScroll() {
    if (this._ticking) return;
    this._ticking = true;
    requestAnimationFrame(() => {
      this._ticking = false;
      this._update();
    });
  }

  _update() {
    if (!this.on) return;
    // the section crossing the middle of the screen picks the scene; how far you are through it moves the layers
    const mid = window.innerHeight * 0.55;
    let pick = this.sections[0];
    for (const s of this.sections) if (s.el.getBoundingClientRect().top <= mid) pick = s;
    const r = pick.el.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
    this.el.style.setProperty('--sp', progress.toFixed(3));
    if (pick.scene !== this.current) {
      if (this.current) this.scenes[this.current].classList.remove('is-on');
      this.scenes[pick.scene].classList.add('is-on');
      this.current = pick.scene;
      this.el.dataset.scene = pick.scene;
    }
  }
}
