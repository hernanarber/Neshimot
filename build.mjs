// Prerenders template.html → index.html from the exercise data.
// Usage: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cardsHTML, chaptersHTML, ritualsHTML, principlesHTML, safetyHTML, filterHTML, COUNT } from './js/render.js';
import { starMark, ICONS, figureSVG } from './js/graphs.js';

const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen'];
const dir = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');

const version = createHash('sha1')
  .update(['css/styles.css', 'js/app.js', 'js/data.js', 'js/audio.js', 'js/session.js', 'js/graphs.js'].map(read).join(''))
  .digest('hex')
  .slice(0, 8);

const parts = {
  version,
  count: String(COUNT),
  countword: words[COUNT] || String(COUNT),
  star: starMark(22, 'mark'),
  hourglass: ICONS.hourglass,
  figure: figureSVG({ uid: 'pr', id: 'fig', cls: 'orb-fig' }),
  figuredone: figureSVG({ uid: 'dn', cls: 'done-fig' }),
  filters: filterHTML(),
  cards: cardsHTML(),
  chapters: chaptersHTML(),
  rituals: ritualsHTML(),
  principles: principlesHTML(),
  safety: safetyHTML(),
};

let html = read('template.html').replace(/<!--@(\w+)-->/g, (m, k) => {
  if (!(k in parts)) throw new Error(`Unknown marker ${m}`);
  return parts[k];
});

writeFileSync(new URL('index.html', dir), html);
console.log(`index.html written (${(html.length / 1024).toFixed(1)} KB, ${COUNT} practices, v${version})`);
