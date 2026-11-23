// Prerenders every page from the exercise data:
//   index.html, he.html                          — the home page in English (/) and Hebrew (/he)
//   practices/<slug>.html, he/practices/<slug>.html — one page per practice in each language
//   sitemap.xml, robots.txt
// The shell (head, header, footer, practice player) is template.html; page bodies are in partials/.
// Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cardsHTML, chapterHTML, chaptersHTML, ritualsHTML, principlesHTML, safetyHTML, filterHTML, reminderHTML, doseLabel, COUNT } from './js/render.js';
import { starMark, ICONS, figureSVG } from './js/graphs.js';
import { setLang, t, BTI } from './js/i18n.js';
import { EXERCISES, CATEGORIES, catLabel, levelLabel, practicePath, doseMinutes } from './js/data.js';

const dir = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');
const write = (p, s) => {
  const url = new URL(p, dir);
  mkdirSync(new URL('.', url), { recursive: true });
  writeFileSync(url, s);
};
const SITE = 'https://www.neshimot.live';
const today = new Date().toISOString().slice(0, 10);

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

// Runs before the first paint: picks the theme (saved choice, else the system setting) so the page never flashes.
// On English pages, a visitor who chose Hebrew goes to the same page in Hebrew; on the home page, a first-time
// visitor whose browser is set to Hebrew does too.
const boot = (lang) => {
  const theme = `var r=document.documentElement;r.classList.add('js');var th=null;try{th=JSON.parse(localStorage.getItem('neshimot.theme'))}catch(e){}if(th!=='light'&&th!=='dark'){th=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';r.dataset.themeAuto='1'}r.dataset.theme=th;var m=document.querySelector('meta[name=theme-color]');if(m)m.content=th==='light'?'#F7EFE3':'#110E1A';`;
  const redirect = `try{var p=location.pathname,home=p==='/'||p==='/index.html',l=null;try{l=JSON.parse(localStorage.getItem('neshimot.lang'))}catch(e){}if(!l&&home){var n=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(/^(he|iw)\\b/i.test(n))l='he'}if(l==='he')location.replace('/he'+(home?'':p.replace(/\\.html$/,''))+location.search+location.hash)}catch(e){}`;
  return `(function(){${theme}${lang === 'en' ? redirect : ''}})();`;
};

const homePath = (lang) => (lang === 'he' ? '/he' : '/');
const abs = (path) => `${SITE}${path}`;
const ogImage = (file) => (existsSync(new URL(file.slice(1), dir)) ? abs(file) : abs('/og.png'));
const jsonld = (obj) => `  <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const plain = (html) => String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function shellParts(lang, page) {
  const other = lang === 'he' ? 'en' : 'he';
  return {
    version,
    lang,
    dir: lang === 'he' ? 'rtl' : 'ltr',
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
    safety: safetyHTML(),
    home_url: homePath(lang),
    ...page,
  };
}

function fill(html, parts) {
  return html.replace(/<!--@([\w:.]+)-->/g, (m, k) => {
    if (k.startsWith('t:')) return t(k.slice(2));
    if (!(k in parts)) throw new Error(`Unknown marker ${m}`);
    return parts[k];
  });
}

function renderHome(lang) {
  setLang(lang);
  const url = abs(lang === 'he' ? '/he' : '/');
  const parts = shellParts(lang, {
    main: read('partials/home.html'),
    title: t('meta.title'),
    desc: t('meta.desc'),
    ogdesc: t('meta.ogDesc'),
    ogimage: ogImage(lang === 'he' ? '/og-he.png' : '/og.png'),
    url,
    url_en: abs('/'),
    url_he: abs('/he'),
    otherurl: lang === 'he' ? '/' : '/he',
    home: '',
    skip: '#practices',
    jsonld: jsonld({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: t('brand'), url, inLanguage: lang, description: t('meta.desc') },
        {
          '@type': 'ItemList',
          name: t('practices.title'),
          itemListElement: EXERCISES.map((ex, i) => ({ '@type': 'ListItem', position: i + 1, name: ex.name, url: abs(practicePath(ex, lang)) })),
        },
      ],
    }),
    filters: filterHTML(),
    cards: cardsHTML(),
    chapters: chaptersHTML(lang),
    rituals: ritualsHTML(),
    principles: principlesHTML(),
    reminder: reminderHTML(),
  });
  return fill(read('template.html').replace('<!--@main-->', parts.main), parts);
}

function renderPractice(ex, i, lang) {
  setLang(lang);
  const path = practicePath(ex, lang);
  const url = abs(path);
  const img = ogImage(`/og/${lang}/${ex.slug}.jpg`);
  const title = t('pp.title', { name: ex.name, alt: ex.alt });
  const desc = t('pp.desc', { alt: ex.alt, tagline: ex.tagline, pattern: ex.patternLabel });
  const parts = shellParts(lang, {
    main: read('partials/practice.html'),
    title,
    desc,
    ogdesc: desc,
    ogimage: img,
    url,
    url_en: abs(practicePath(ex, 'en')),
    url_he: abs(practicePath(ex, 'he')),
    otherurl: practicePath(ex, lang === 'he' ? 'en' : 'he'),
    home: homePath(lang),
    skip: '#chapters',
    jsonld: jsonld({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'HowTo',
          name: ex.name,
          alternateName: ex.alt,
          description: plain(ex.summary),
          inLanguage: lang,
          url,
          image: img,
          totalTime: `PT${doseMinutes(ex)}M`,
          step: ex.steps.map((s, n) => ({ '@type': 'HowToStep', position: n + 1, text: plain(s) })),
          isPartOf: { '@type': 'WebSite', name: t('brand'), url: abs(homePath(lang)) },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t('brand'), item: abs(homePath(lang)) },
            { '@type': 'ListItem', position: 2, name: t('nav.practices'), item: `${abs(homePath(lang))}#practices` },
            { '@type': 'ListItem', position: 3, name: ex.name, item: url },
          ],
        },
      ],
    }),
    pp_catvar: `--cat:${CATEGORIES[ex.category].color}`,
    pp_icon: ICONS[ex.icon],
    pp_meta: `${catLabel(ex.category)} · ${levelLabel(ex.level)}`,
    pp_name: ex.name,
    pp_alt: ex.alt,
    pp_tagline: ex.tagline,
    pp_id: ex.id,
    pp_pattern: ex.patternLabel,
    pp_dose: doseLabel(ex),
    pp_chapter: chapterHTML(ex, i, { lang, page: true }),
    pp_cards: cardsHTML({ href: (o) => practicePath(o, lang), exclude: ex.id }),
    reminder: reminderHTML({ selected: ex.id }),
  });
  return fill(read('template.html').replace('<!--@main-->', parts.main), parts);
}

// ---- pages ----
const pages = [];
for (const [lang, file] of [['en', 'index.html'], ['he', 'he.html']]) {
  const html = renderHome(lang);
  write(file, html);
  pages.push(file);
  console.log(`${file} written (${(html.length / 1024).toFixed(1)} KB, ${COUNT} practices, ${lang}, v${version})`);
}
for (const lang of ['en', 'he']) {
  EXERCISES.forEach((ex, i) => {
    const file = `${practicePath(ex, lang).slice(1)}.html`;
    write(file, renderPractice(ex, i, lang));
    pages.push(file);
  });
}
console.log(`${EXERCISES.length * 2} practice pages written (practices/, he/practices/)`);

// ---- sitemap + robots ----
const pair = (en, he) => [en, he].map((loc) => ({ loc, en, he }));
const entries = [
  ...pair('/', '/he'),
  ...EXERCISES.flatMap((ex) => pair(practicePath(ex, 'en'), practicePath(ex, 'he'))),
  ...pair('/privacy', '/he/privacy'),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(
    (e) => `  <url>
    <loc>${abs(e.loc)}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(e.en)}"/>
    <xhtml:link rel="alternate" hreflang="he" href="${abs(e.he)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(e.en)}"/>
  </url>`
  )
  .join('\n')}
</urlset>
`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${abs('/sitemap.xml')}\n`);

// ---- text for the daily-reminder calendar file (api/reminder.js) ----
const reminder = {};
for (const lang of ['en', 'he']) {
  setLang(lang);
  const home = abs(homePath(lang));
  reminder[lang] = {
    alarm: t('rm.alarm'),
    any: { title: t('rm.eventAny'), min: 5, url: home, desc: t('rm.eventDesc', { min: 5, url: home }) },
    ...Object.fromEntries(
      EXERCISES.map((ex) => {
        const url = abs(practicePath(ex, lang));
        const min = doseMinutes(ex);
        return [ex.id, { title: t('rm.eventTitle', { name: ex.name }), min, url, desc: t('rm.eventDesc', { min, url }) }];
      })
    ),
  };
}
write('api/_reminder-data.json', `${JSON.stringify(reminder, null, 1)}\n`);
console.log(`sitemap.xml written (${entries.length} URLs), robots.txt written`);
setLang('en');
