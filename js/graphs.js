// Neshimot — symbolic illustrations, the breathing figure and breath-pattern graphs (inline SVG).
import { expandPattern, targetLevel } from './data.js';

const ic = (body) =>
  `<svg class="icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body.replaceAll('class="draw"', 'class="draw" pathLength="1"')}</svg>`;

export const ICONS = {
  belly: ic(
    `<path class="draw" d="M10 26 Q32 10 54 26"/><ellipse class="draw" cx="32" cy="40" rx="17" ry="12"/><ellipse class="draw" cx="32" cy="40" rx="9" ry="6"/><circle cx="32" cy="40" r="1.6" fill="currentColor" stroke="none"/>`
  ),
  threepart: ic(
    `<path class="draw" d="M22 50 Q32 56 42 50"/><path class="draw" d="M16 39 Q32 48 48 39"/><path class="draw" d="M10 28 Q32 40 54 28"/><path class="draw" d="M32 22 V8 M26 13 L32 7 L38 13"/>`
  ),
  coherent: ic(
    `<path class="draw" d="M4 34 C12 16 20 16 28 34 S44 52 52 34 S60 22 62 26"/><path class="draw" d="M4 34 C12 22 20 22 28 34 S44 46 52 34" opacity=".45"/><path d="M32 12 c-2.6-3.4-8-2-8 2.2 0 3.4 4.4 6 8 8.6 3.6-2.6 8-5.2 8-8.6 0-4.2-5.4-5.6-8-2.2z" stroke-width="1.3"/>`
  ),
  box: ic(
    `<rect class="draw" x="14" y="14" width="36" height="36" rx="2.5"/><circle cx="14" cy="14" r="3.2" fill="currentColor" stroke="none"/><path d="M26 10 h12 M54 26 v12 M38 54 h-12 M10 38 v-12" opacity=".55"/>`
  ),
  alternate: ic(
    `<path class="draw" d="M22 10 C12 24 12 40 22 54"/><path class="draw" d="M42 10 C52 24 52 40 42 54"/><path class="draw" d="M32 8 C20 20 44 44 32 56" stroke-dasharray="2 4"/><circle cx="22" cy="32" r="2" fill="currentColor" stroke="none"/><circle cx="42" cy="32" r="2" fill="currentColor" stroke="none" opacity=".5"/>`
  ),
  sigh: ic(
    `<path class="draw" d="M8 46 L16 30"/><path class="draw" d="M19 30 L23 23"/><path class="draw" d="M26 22 C36 22 44 38 58 46"/><path d="M52 46 h6 v-6" opacity=".7"/>`
  ),
  moon: ic(
    `<path class="draw" d="M38 10 A20 20 0 1 0 54 42 A16 16 0 1 1 38 10 Z"/><path d="M50 14 v6 M47 17 h6" opacity=".8"/><path d="M14 46 v4 M12 48 h4" opacity=".6"/><circle cx="56" cy="28" r="1.2" fill="currentColor" stroke="none"/>`
  ),
  hum: ic(
    `<circle class="draw" cx="18" cy="32" r="6"/><path class="draw" d="M30 22 Q37 32 30 42"/><path class="draw" d="M37 15 Q49 32 37 49"/><path class="draw" d="M44 9 Q60 32 44 55"/>`
  ),
  flame: ic(
    `<path class="draw" d="M32 6 C40 18 47 25 47 38 A15 15 0 0 1 17 38 C17 29 23 25 25 16 C28 23 30 25 32 28 C35 21 35 13 32 6 Z"/><path class="draw" d="M32 52 a6 6 0 0 1 -6 -6 c0-4 3-6 4-10 2 3 8 6 8 10 a6 6 0 0 1 -6 6z" opacity=".6"/>`
  ),
  circle: ic(
    `<path class="draw" d="M50 32 A18 18 0 1 1 32 14"/><path d="M27 9 L33 14 L27 19"/><circle class="draw" cx="32" cy="32" r="6" opacity=".6"/>`
  ),
  hourglass: ic(
    `<path class="draw" d="M18 8 h28 M18 56 h28 M21 8 C21 24 43 26 43 32 C43 38 21 40 21 56 M43 8 C43 24 21 26 21 32 C21 38 43 40 43 56"/><path d="M26 50 Q32 44 38 50 Z" fill="currentColor" stroke="none" opacity=".7"/>`
  ),
};

/** Eight-pointed star — the brand mark and a recurring motif. */
export function starMark(size = 28, cls = '') {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="-50 -50 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4"><rect x="-30" y="-30" width="60" height="60"/><rect x="-30" y="-30" width="60" height="60" transform="rotate(45)"/><circle r="11" fill="currentColor" stroke="none"/></svg>`;
}

const fmt = (n) => (Math.round(n * 10) / 10).toString();

export function segmentsFor(pattern, cycles = 1) {
  const one = expandPattern(pattern);
  const seq = [];
  for (let c = 0; c < cycles; c++) one.forEach((p) => seq.push({ ...p, cycle: c }));
  // start where the cycle loops back to, so repeated cycles join seamlessly
  let level = 0;
  for (const p of one) level = targetLevel(p, level);
  let t = 0;
  return seq.map((p) => {
    const from = level;
    const to = targetLevel(p, level);
    const seg = { ...p, start: t, from, to };
    t += p.s;
    level = to;
    return seg;
  });
}

const easeCos = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);

export function levelAt(seg, u) {
  if (seg.t === 'rest') return seg.from + (seg.to - seg.from) * easeCos(Math.min(1, u * 3)) + 0.06 * Math.sin(u * Math.PI * 2 * Math.max(1, seg.s / 4));
  return seg.from + (seg.to - seg.from) * easeCos(u);
}

function groupKey(seg) {
  return seg.counter ? 'pump' : seg.t;
}

/** Breath-pattern graph: lung volume over time, coloured by phase. */
export function patternSVG(ex, { mini = false, cycles } = {}) {
  const cyc = expandPattern(ex.pattern).reduce((a, p) => a + p.s, 0);
  const n = cycles ?? (mini ? 1 : cyc < 22 ? 2 : 1);
  const segs = segmentsFor(ex.pattern, n);
  const total = segs.reduce((a, s) => a + s.s, 0);
  const W = mini ? 240 : 600;
  const H = mini ? 56 : 190;
  const pl = mini ? 4 : 18, pr = mini ? 4 : 18, pt = mini ? 6 : 46, pb = mini ? 6 : 36;
  const x = (t) => pl + (t / total) * (W - pl - pr);
  const y = (l) => pt + (1 - l) * (H - pt - pb);

  // group consecutive segments of the same kind into one coloured path
  const groups = [];
  for (const s of segs) {
    const k = groupKey(s);
    const g = groups[groups.length - 1];
    if (g && g.key === k && g.cycle === s.cycle && k !== 'hold') g.segs.push(s);
    else groups.push({ key: k, cycle: s.cycle, segs: [s] });
  }

  let paths = '';
  let fill = `M${x(0).toFixed(1)},${y(0).toFixed(1)}`;
  for (const g of groups) {
    let d = '';
    for (const s of g.segs) {
      const steps = Math.max(2, Math.ceil((s.s / total) * (mini ? 40 : 110)));
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const px = x(s.start + u * s.s).toFixed(1);
        const py = y(levelAt(s, u)).toFixed(1);
        d += `${d ? 'L' : 'M'}${px},${py}`;
        fill += `L${px},${py}`;
      }
    }
    paths += `<path class="pg-line pg-${g.key}" d="${d}"/>`;
  }
  fill += `L${x(total).toFixed(1)},${y(0).toFixed(1)}Z`;

  let labels = '';
  let ticks = '';
  if (!mini) {
    // labels for the first cycle only, separators between groups
    const first = groups.filter((g) => g.cycle === 0);
    for (const g of first) {
      const s0 = g.segs[0];
      const sum = g.segs.reduce((a, s) => a + s.s, 0);
      const mid = s0.start + sum / 2;
      let text;
      if (g.key === 'pump') text = `${s0.countTotal} pumps`;
      else {
        const verb = { in: 'In', out: s0.cue === 'Hum' ? 'Hum' : 'Out', hold: 'Hold', rest: 'Rest' }[g.key];
        const side = s0.side ? ` ${s0.side[0].toUpperCase()}` : '';
        const parts = g.segs.length > 1 ? g.segs.map((s) => fmt(s.s)).join(g.segs.length > 2 ? '·' : '+') : fmt(sum);
        text = `${verb}${side} ${parts}`;
      }
      labels += `<text class="pg-label pg-t-${g.key}" x="${x(mid).toFixed(1)}" y="24" text-anchor="middle">${text}</text>`;
      ticks += `<line class="pg-sep" x1="${x(s0.start).toFixed(1)}" x2="${x(s0.start).toFixed(1)}" y1="32" y2="${H - pb}"/>`;
    }
    ticks += `<line class="pg-base" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"/>`;
    ticks += `<text class="pg-axis" x="${pl}" y="${H - 10}">0s</text><text class="pg-axis" x="${W - pr}" y="${H - 10}" text-anchor="end">${fmt(total)}s</text>`;
    if (n > 1) ticks += `<text class="pg-axis" x="${x(total / 2)}" y="${H - 10}" text-anchor="middle">${fmt(total / 2)}s</text>`;
  }

  const id = `pgf-${ex.id}-${mini ? 'm' : 'l'}`;
  // live playhead (big graphs only) — moved by the chapter figure animation, synced to its breath
  const head = mini ? '' : `<circle class="pg-head" r="6" cx="${x(0).toFixed(1)}" cy="${y(segs[0].from).toFixed(1)}"/>`;
  const geo = mini ? '' : ` data-geo="${pl},${pr},${pt},${pb},${W},${H},${total},${n}"`;
  return `<svg class="pattern-graph ${mini ? 'is-mini' : ''}" viewBox="0 0 ${W} ${H}"${mini ? ' preserveAspectRatio="none"' : ''}${geo} role="img" aria-label="Breath pattern: ${ex.patternLabel}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBC07E" stop-opacity=".22"/><stop offset="1" stop-color="#EBC07E" stop-opacity="0"/></linearGradient></defs>
    ${ticks}<path d="${fill}" fill="url(#${id})" stroke="none"/>${paths}${labels}${head}</svg>`;
}

/** Sun on its arc across the sky — position 0 (sunrise) to 1 (sunset). */
export function sunArcSVG(pos, id) {
  const cx = 120, cy = 100, r = 72;
  const a = Math.PI * (1 - pos);
  const sx = cx + r * Math.cos(a);
  const sy = cy - r * Math.sin(a);
  const tone = pos < 0.3 ? '#EBC07E' : pos > 0.7 ? '#E3905A' : '#FFE7B8';
  return `<svg class="sun-arc" viewBox="0 0 240 120" aria-hidden="true">
    <defs><radialGradient id="sg-${id}"><stop offset="0" stop-color="${tone}" stop-opacity=".9"/><stop offset=".35" stop-color="${tone}" stop-opacity=".35"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></radialGradient></defs>
    <path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="rgba(235,192,126,.3)" stroke-dasharray="2 5"/>
    <path d="M0,${cy} C40,${cy - 8} 70,${cy - 4} 100,${cy - 6} C140,${cy - 9} 180,${cy - 2} 240,${cy - 7} L240,120 L0,120Z" fill="#3A2337"/>
    <path d="M0,${cy + 8} C60,${cy + 2} 120,${cy + 10} 240,${cy + 4} L240,120 L0,120Z" fill="#231A2C"/>
    <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="30" fill="url(#sg-${id})"/>
    <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="8" fill="${tone}"/>
  </svg>`;
}

/* ------------------------------------------------------------------
   The breathing figure — a person seated cross-legged before the sun.
   Driven entirely by the CSS custom property --lvl (0 = empty, 1 = full lungs):
   the torso widens, shoulders and head rise, and light fills the body from the
   belly upward. Poses: rest (hands on knees), belly (hands on chest & belly),
   nose (hand at the nose — alternate nostril), hum (hands at the ears).
   ------------------------------------------------------------------ */
const FIG = {
  torso:
    'M-5.5,-47.5 C-5.8,-42.5 -9,-40 -16,-38 C-23.5,-36 -29,-32.5 -30,-25.5 C-31,-15 -27.5,-4 -26.5,6 C-26,15 -27.5,23 -30,33 L30,33 C27.5,23 26,15 26.5,6 C27.5,-4 31,-15 30,-25.5 C29,-32.5 23.5,-36 16,-38 C9,-40 5.8,-42.5 5.5,-47.5 Z',
  legs: 'M-29,28 C-47,28 -65,36 -71,48 C-73.5,54 -66,59.5 -54,59.5 C-36,59.5 -18,55.5 0,55.5 C18,55.5 36,59.5 54,59.5 C66,59.5 73.5,54 71,48 C65,36 47,28 29,28 Z',
  shins: 'M-46,49.5 C-30,44.5 -12,47 3,52 M46,48.5 C30,44 13,46.5 -3,51',
  restL: 'M-27,-31 C-34,-21 -37.5,-9 -37,1 C-36.5,11 -42,21 -51,31',
  restR: 'M27,-31 C34,-21 37.5,-9 37,1 C36.5,11 42,21 51,31',
  bellyL: 'M-27,-31 C-35,-22 -39,-12 -37,-5 C-35,1 -21,-12 -10,-20',
  bellyR: 'M27,-31 C34,-20 38.5,-8 37,0 C35.5,7 20,9 8,9',
  noseL: 'M-27,-31 C-34,-22 -38,-13 -35.5,-8 C-32,-2 -14,-38 -4.5,-56.5',
  earL: 'M-27,-31 C-37,-33 -46,-38 -45.5,-46 C-45,-55 -27,-62 -15,-62',
  earR: 'M27,-31 C37,-33 46,-38 45.5,-46 C45,-55 27,-62 15,-62',
};

export function figureSVG({ uid = 'fig', pose = 'rest', cls = '', id = '', label = '' } = {}) {
  const limb = (d, c) => `<path class="fig-limb-o ${c}" d="${d}"/><path class="fig-limb ${c}" d="${d}"/>`;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="fig ${cls}"${id ? ` id="${id}"` : ''} viewBox="-100 -100 200 200" data-pose="${pose}" ${a11y}>
    <defs>
      <radialGradient id="${uid}-sun"><stop class="sun-a" offset="0"/><stop class="sun-b" offset=".42"/><stop class="sun-c" offset=".72"/><stop class="sun-d" offset="1"/></radialGradient>
      <linearGradient id="${uid}-air" x1="0" y1="1" x2="0" y2="0"><stop class="air-a" offset="0"/><stop class="air-b" offset=".55"/><stop class="air-c" offset="1"/></linearGradient>
      <radialGradient id="${uid}-heart"><stop class="heart-a" offset="0"/><stop class="heart-b" offset=".5"/><stop class="heart-c" offset="1"/></radialGradient>
      <clipPath id="${uid}-clip"><path d="${FIG.torso}"/></clipPath>
    </defs>
    <circle class="fig-sun" cx="0" cy="-22" r="66" fill="url(#${uid}-sun)"/>
    <path class="fig-ground" d="M-98,60 C-60,54 -30,57 0,57 C30,57 60,54 98,60"/>
    <g class="fig-body">
      <g class="fig-torso">
        <path class="fig-sil" d="${FIG.torso}"/>
        <g clip-path="url(#${uid}-clip)">
          <rect class="fig-air" x="-32" y="-48" width="64" height="76" fill="url(#${uid}-air)"/>
          <circle class="fig-heart" cx="0" cy="-20" r="15" fill="url(#${uid}-heart)"/>
        </g>
      </g>
      <path class="fig-sil" d="${FIG.legs}"/>
      <path class="fig-shin" d="${FIG.shins}"/>
      <g class="fig-arms">${limb(FIG.restL, 'arm-rest-l')}${limb(FIG.restR, 'arm-rest-r')}</g>
      <g class="fig-head"><ellipse class="fig-sil" cx="0" cy="-62" rx="12" ry="14.5"/></g>
      <g class="fig-arms-front">${limb(FIG.bellyL, 'arm-belly')}${limb(FIG.bellyR, 'arm-belly')}${limb(FIG.noseL, 'arm-nose')}${limb(FIG.earL, 'arm-ear')}${limb(FIG.earR, 'arm-ear')}</g>
      <g class="fig-hum"><path d="M-11,-84 Q0,-89 11,-84"/><path d="M-17,-90 Q0,-97 17,-90"/><path d="M-23,-96 Q0,-105 23,-96"/></g>
    </g>
  </svg>`;
}
