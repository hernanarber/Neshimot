// Neshimot — HTML renderers. Used at build time (build.mjs) to prerender the page from data.js.
import { EXERCISES, RITUALS, PRINCIPLES, SAFETY, CATEGORIES, byId, cycleSeconds, catLabel, levelLabel, unitLabel, practicePath } from './data.js';
import { t } from './i18n.js';
import { ICONS, patternSVG, sunArcSVG, figureSVG } from './graphs.js';

const pad = (n) => String(n).padStart(2, '0');
const catVar = (c) => `--cat:${CATEGORIES[c].color}`;

export function doseLabel(ex) {
  const d = ex.dose;
  if (d.type === 'rounds') {
    const mins = (d.value * cycleSeconds(ex)) / 60;
    return `${d.value} ${unitLabel(d.unit)} · ~${mins < 1.5 ? t('u.sec', { n: Math.round(mins * 60) }) : t('u.min', { n: Math.round(mins) })}`;
  }
  return t('u.min', { n: d.value });
}

/** Practice cards. On the home page the title scrolls to the guide below; on a practice page it opens that practice's page. */
export function cardsHTML({ href = (ex) => `#ex-${ex.id}`, exclude = null } = {}) {
  return EXERCISES.map((ex, i) => ({ ex, i }))
    .filter(({ ex }) => ex.id !== exclude)
    .map(
      ({ ex, i }) => `
  <article class="card reveal" data-cat="${ex.category}" style="${catVar(ex.category)};--i:${i}">
    <div class="card-top">
      <span class="card-num">${pad(i + 1)}</span>
      <span class="card-icon">${ICONS[ex.icon]}</span>
    </div>
    <p class="meta"><span class="dot"></span>${catLabel(ex.category)} · ${levelLabel(ex.level)}</p>
    <h3 class="card-title"><a class="card-link" href="${href(ex)}">${ex.name}</a></h3>
    <p class="card-alt">${ex.alt}</p>
    <p class="card-tag">${ex.tagline}</p>
    <div class="card-graph">${patternSVG(ex, { mini: true })}</div>
    <div class="card-foot">
      <span class="card-pattern">${ex.patternLabel}</span>
      <button class="card-begin" type="button" data-begin="${ex.id}" aria-label="${t('card.beginAria', { name: ex.name })}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>${t('card.begin')}
      </button>
    </div>
  </article>`
    )
    .join('');
}

const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';

/**
 * One practice guide: the breathing figure and pattern graph beside the steps, benefits and science.
 * On the home page the title links to the practice's own page; on that page (`page: true`) the
 * heading lives in the page hero instead.
 */
export function chapterHTML(ex, i, { lang = 'en', page = false } = {}) {
  const head = page
    ? ''
    : `<p class="ch-num">${pad(i + 1)}<span> / ${pad(EXERCISES.length)}</span></p>
      <p class="meta"><span class="dot"></span>${catLabel(ex.category)} · ${levelLabel(ex.level)} · ${doseLabel(ex)}</p>
      <h3 class="ch-title"><a class="ch-title-link" href="${practicePath(ex, lang)}">${ex.name}</a></h3>
      <p class="ch-alt">${ex.alt}</p>`;
  return `
  <article class="chapter${page ? ' is-page' : ''}" id="ex-${ex.id}" style="${catVar(ex.category)}">
    <div class="ch-visual reveal" data-phase="in">
      <div class="ch-figure">
        <div class="ch-emblem" data-ex="${ex.id}">
          ${figureSVG({ uid: `fig-${ex.id}`, pose: ex.pose || 'rest', label: t('ch.figure', { name: ex.name }) })}
        </div>
        <p class="ch-phase" aria-hidden="true"><i></i><span class="ch-phase-t">${ex.pattern[0].cue}</span></p>
      </div>
      <figure class="ch-graph">
        ${patternSVG(ex)}
        <figcaption>
          <span><i class="sw sw-in"></i>${t('ch.inhale')}</span>
          ${ex.pattern.some((p) => p.t === 'hold') ? `<span><i class="sw sw-hold"></i>${t('ch.hold')}</span>` : ''}
          <span><i class="sw sw-out"></i>${t('ch.exhale')}</span>
          ${ex.pattern.some((p) => p.repeat) ? `<span><i class="sw sw-pump"></i>${t('ch.pumps')}</span>` : ''}
          ${ex.pattern.some((p) => p.t === 'rest') ? `<span><i class="sw sw-rest"></i>${t('ch.rest')}</span>` : ''}
          <span class="fc-note">${t('ch.lung')}</span>
        </figcaption>
      </figure>
    </div>
    <div class="ch-body reveal">
      ${head}
      <p class="ch-summary">${ex.summary}</p>
      <${page ? 'h2' : 'h4'} class="ch-h">${t('ch.how')}</${page ? 'h2' : 'h4'}>
      <ol class="steps">${ex.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <ul class="benefits">${ex.benefits.map((b) => `<li>${b}</li>`).join('')}</ul>
      <details class="fold"${page ? ' open' : ''}><summary>${t('ch.why')}</summary><p>${ex.science}</p></details>
      ${ex.tips?.length ? `<details class="fold"><summary>${t('ch.notes')}</summary><ul>${ex.tips.map((tip) => `<li>${tip}</li>`).join('')}</ul></details>` : ''}
      ${ex.caution ? `<aside class="caution"><strong>${t('ch.caution')}</strong>${ex.caution}</aside>` : ''}
      <div class="ch-actions">
        <button class="btn btn-primary" type="button" data-begin="${ex.id}">
          ${PLAY}
          ${t('ch.begin')}
        </button>
        <span class="ch-pattern">${ex.patternLabel}</span>
      </div>
    </div>
  </article>`;
}

export function chaptersHTML(lang = 'en') {
  return EXERCISES.map((ex, i) => chapterHTML(ex, i, { lang })).join('');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The daily-reminder panel. `selected` preselects (and fixes) a practice, as on a practice page. */
export function reminderHTML({ selected = '' } = {}) {
  const opts = [`<option value="">${esc(t('rm.any'))}</option>`]
    .concat(EXERCISES.map((ex) => `<option value="${ex.id}"${ex.id === selected ? ' selected' : ''}>${esc(ex.name)}</option>`))
    .join('');
  return `
  <div class="panel reminder reveal" id="reminder">
    <div class="rm-head">
      <span class="rm-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 34h28M14 34a10 10 0 0 1 20 0"/><path d="M24 14v5M12.7 18.7l3.5 3.5M35.3 18.7l-3.5 3.5M7 27h4M37 27h4"/><path d="M18 40h12" opacity=".55"/></svg></span>
      <div><h3 class="panel-title">${t('rm.title')}</h3><p class="panel-sub">${t('rm.sub')}</p></div>
    </div>
    <form class="rm-form" id="rm-form"${selected ? ` data-fixed="${selected}"` : ''}>
      <label class="field rm-time"><span>${t('rm.time')}</span><input type="time" id="rm-time" value="07:30" required /></label>
      <label class="field rm-practice"><span>${t('rm.practice')}</span><select id="rm-practice">${opts}</select></label>
      <div class="rm-actions">
        <a class="btn btn-primary" id="rm-ics" href="/api/reminder" rel="nofollow"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>${t('rm.ics')}</a>
        <a class="btn btn-ghost" id="rm-google" href="https://calendar.google.com/calendar/render" target="_blank" rel="noopener nofollow">${t('rm.google')}</a>
      </div>
      <p class="rm-done" id="rm-done" role="status" hidden>${t('rm.done')}</p>
    </form>
  </div>`;
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
          return `<li><a href="#ex-${ex.id}">${ex.name}</a><span>${it.rounds ? `${it.rounds} ${unitLabel(ex.dose.unit || 'rounds')}` : t('u.min', { n: it.minutes })}</span></li>`;
        })
        .join('')}
    </ol>
    <div class="ritual-foot">
      <span class="ritual-total">≈ ${t('u.min', { n: ritualMinutes(r) })}</span>
      <button class="btn btn-ghost" type="button" data-ritual="${r.id}">${t('ritual.begin', { label: r.label })}</button>
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
        `<button class="chip${i === 0 ? ' is-on' : ''}" type="button" data-filter="${c}" aria-pressed="${i === 0}"${c !== 'All' ? ` style="${catVar(c)}"` : ''}>${c !== 'All' ? '<span class="dot"></span>' : ''}${c === 'All' ? t('filter.all') : catLabel(c)}</button>`
    )
    .join('');
}

export const COUNT = EXERCISES.length;
