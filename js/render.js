// Ruach — HTML renderers. Used at build time (build.mjs) to prerender the page from data.js.
import { EXERCISES, RITUALS, PRINCIPLES, SAFETY, CATEGORIES, byId, cycleSeconds } from './data.js';
import { ICONS, patternSVG, sunArcSVG, starMark } from './graphs.js';

const pad = (n) => String(n).padStart(2, '0');
const catVar = (c) => `--cat:${CATEGORIES[c].color}`;

export function doseLabel(ex) {
  const d = ex.dose;
  if (d.type === 'rounds') {
    const mins = (d.value * cycleSeconds(ex)) / 60;
    return `${d.value} ${d.unit} · ~${mins < 1.5 ? Math.round(mins * 60) + 's' : Math.round(mins) + ' min'}`;
  }
  return `${d.value} min`;
}

export function cardsHTML() {
  return EXERCISES.map(
    (ex, i) => `
  <article class="card reveal" data-cat="${ex.category}" style="${catVar(ex.category)};--i:${i}">
    <div class="card-top">
      <span class="card-num">${pad(i + 1)}</span>
      <span class="card-icon">${ICONS[ex.icon]}</span>
    </div>
    <p class="meta"><span class="dot"></span>${ex.category} · ${ex.level}</p>
    <h3 class="card-title"><a class="card-link" href="#ex-${ex.id}">${ex.name}</a></h3>
    <p class="card-alt">${ex.alt}</p>
    <p class="card-tag">${ex.tagline}</p>
    <div class="card-graph">${patternSVG(ex, { mini: true })}</div>
    <div class="card-foot">
      <span class="card-pattern">${ex.patternLabel}</span>
      <button class="card-begin" type="button" data-begin="${ex.id}" aria-label="Begin ${ex.name}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>Begin
      </button>
    </div>
  </article>`
  ).join('');
}

export function chaptersHTML() {
  return EXERCISES.map(
    (ex, i) => `
  <article class="chapter" id="ex-${ex.id}" style="${catVar(ex.category)}">
    <div class="ch-visual reveal">
      <div class="ch-emblem">
        ${starMark(260, 'ch-star')}
        <span class="ch-icon">${ICONS[ex.icon]}</span>
      </div>
      <figure class="ch-graph">
        ${patternSVG(ex)}
        <figcaption>
          <span><i class="sw sw-in"></i>Inhale</span>
          ${ex.pattern.some((p) => p.t === 'hold') ? '<span><i class="sw sw-hold"></i>Hold</span>' : ''}
          <span><i class="sw sw-out"></i>Exhale</span>
          ${ex.pattern.some((p) => p.repeat) ? '<span><i class="sw sw-pump"></i>Pumps</span>' : ''}
          ${ex.pattern.some((p) => p.t === 'rest') ? '<span><i class="sw sw-rest"></i>Rest</span>' : ''}
          <span class="fc-note">Lung volume over time</span>
        </figcaption>
      </figure>
    </div>
    <div class="ch-body reveal">
      <p class="ch-num">${pad(i + 1)}<span> / ${pad(EXERCISES.length)}</span></p>
      <p class="meta"><span class="dot"></span>${ex.category} · ${ex.level} · ${doseLabel(ex)}</p>
      <h3 class="ch-title">${ex.name}</h3>
      <p class="ch-alt">${ex.alt}</p>
      <p class="ch-summary">${ex.summary}</p>
      <h4 class="ch-h">How to practise</h4>
      <ol class="steps">${ex.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <ul class="benefits">${ex.benefits.map((b) => `<li>${b}</li>`).join('')}</ul>
      <details class="fold"><summary>Why it works</summary><p>${ex.science}</p></details>
      ${ex.tips?.length ? `<details class="fold"><summary>Practice notes</summary><ul>${ex.tips.map((t) => `<li>${t}</li>`).join('')}</ul></details>` : ''}
      ${ex.caution ? `<aside class="caution"><strong>Caution</strong>${ex.caution}</aside>` : ''}
      <div class="ch-actions">
        <button class="btn btn-primary" type="button" data-begin="${ex.id}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>
          Begin practice
        </button>
        <span class="ch-pattern">${ex.patternLabel}</span>
      </div>
    </div>
  </article>`
  ).join('');
}

export function ritualMinutes(r) {
  let s = 0;
  r.items.forEach((it, i) => {
    const ex = byId(it.id);
    s += it.rounds ? it.rounds * cycleSeconds(ex) : it.minutes * 60;
    s += i === 0 ? 4 : 8;
  });
  return Math.round(s / 60);
}

export function ritualsHTML() {
  return RITUALS.map(
    (r) => `
  <article class="ritual reveal" data-ritual-card="${r.id}">
    ${sunArcSVG(r.sun, r.id)}
    <p class="eyebrow">${r.name}</p>
    <h3 class="ritual-title">${r.title}</h3>
    <p class="ritual-blurb">${r.blurb}</p>
    <ol class="ritual-list">
      ${r.items
        .map((it) => {
          const ex = byId(it.id);
          return `<li><a href="#ex-${ex.id}">${ex.name}</a><span>${it.rounds ? `${it.rounds} ${ex.dose.unit || 'rounds'}` : `${it.minutes} min`}</span></li>`;
        })
        .join('')}
    </ol>
    <div class="ritual-foot">
      <span class="ritual-total">≈ ${ritualMinutes(r)} min</span>
      <button class="btn btn-ghost" type="button" data-ritual="${r.id}">Begin ${r.name.toLowerCase()} ritual</button>
    </div>
  </article>`
  ).join('');
}

export function principlesHTML() {
  return PRINCIPLES.map(
    (p, i) => `
  <article class="principle reveal" style="--i:${i}">
    <span class="principle-num">${pad(i + 1)}</span>
    <h3>${p.title}</h3>
    <p>${p.text}</p>
  </article>`
  ).join('');
}

export function safetyHTML() {
  return SAFETY.map((s) => `<li class="reveal">${s}</li>`).join('');
}

export function filterHTML() {
  return ['All', ...Object.keys(CATEGORIES)]
    .map(
      (c, i) =>
        `<button class="chip${i === 0 ? ' is-on' : ''}" type="button" data-filter="${c}" aria-pressed="${i === 0}"${c !== 'All' ? ` style="${catVar(c)}"` : ''}>${c !== 'All' ? '<span class="dot"></span>' : ''}${c}</button>`
    )
    .join('');
}

export const COUNT = EXERCISES.length;
