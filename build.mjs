// Prerenders template.html → index.html (English, /) and he.html (Hebrew, /he) from the exercise data.
// Usage: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cardsHTML, chaptersHTML, ritualsHTML, principlesHTML, safetyHTML, filterHTML, COUNT } from './js/render.js';
import { starMark, ICONS, figureSVG } from './js/graphs.js';
import { setLang, t, BTI } from './js/i18n.js';

const dir = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');
const SITE = 'https://www.neshimot.live';

const version = createHash('sha1')
  .update(
    ['css/styles.css', 'js/app.js', 'js/data.js', 'js/data.he.js', 'js/i18n.js', 'js/audio.js', 'js/session.js', 'js/graphs.js', 'js/scenery.js']
      .map(read)
      .join('')
  )
  .digest('hex')
  .slice(0, 8);

const FONTS = {
  en: [
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap',
    // the Hebrew and Arabic words in the hero (נשימות · نسيم) and the language switch (עב), subset to those letters
    `https://fonts.googleapis.com/css2?family=Amiri&family=Frank+Ruhl+Libre:wght@400&text=${encodeURIComponent('نسيمנשימותעב')}&display=swap`,
  ],
  he: [
    'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500&family=Heebo:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap',
    `https://fonts.googleapis.com/css2?family=Amiri&text=${encodeURIComponent('نسيم')}&display=swap`,
  ],
};

// Runs before the first paint: picks the theme (saved choice, else the system setting) so the page never flashes,
// and on the English home page sends visitors who chose Hebrew (or whose browser is in Hebrew) to /he.
const boot = (lang) => {
  const theme = `var r=document.documentElement;r.classList.add('js');var th=null;try{th=JSON.parse(localStorage.getItem('neshimot.theme'))}catch(e){}if(th!=='light'&&th!=='dark'){th=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';r.dataset.themeAuto='1'}r.dataset.theme=th;var m=document.querySelector('meta[name=theme-color]');if(m)m.content=th==='light'?'#F7EFE3':'#110E1A';`;
  const redirect = `try{if(location.pathname==='/'||location.pathname==='/index.html'){var l=null;try{l=JSON.parse(localStorage.getItem('neshimot.lang'))}catch(e){}if(!l){var n=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(/^(he|iw)\\b/i.test(n))l='he'}if(l==='he')location.replace('/he'+location.search+location.hash)}}catch(e){}`;
  return `(function(){${theme}${lang === 'en' ? redirect : ''}})();`;
};

function render(lang) {
  setLang(lang);
  const other = lang === 'he' ? 'en' : 'he';
  const parts = {
    version,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
    url: lang === 'he' ? `${SITE}/he` : `${SITE}/`,
    otherurl: other === 'he' ? '/he' : '/',
    otherlang: other,
    othername: other === 'he' ? 'עברית' : 'English',
    bti: BTI[lang],
    credit: t('footer.credit', { url: BTI[lang] }),
    fonts: FONTS[lang].map((href) => `  <link rel="stylesheet" href="${href}" />`).join('\n'),
    boot: boot(lang),
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
  return read('template.html').replace(/<!--@([\w:.]+)-->/g, (m, k) => {
    if (k.startsWith('t:')) return t(k.slice(2));
    if (!(k in parts)) throw new Error(`Unknown marker ${m}`);
    return parts[k];
  });
}

for (const [lang, file] of [['en', 'index.html'], ['he', 'he.html']]) {
  const html = render(lang);
  writeFileSync(new URL(file, dir), html);
  console.log(`${file} written (${(html.length / 1024).toFixed(1)} KB, ${COUNT} practices, ${lang}, v${version})`);
}
setLang('en');
