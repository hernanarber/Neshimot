# Neshimot — Daily Breathing Practice

**Live at https://www.neshimot.live** (English) and **https://www.neshimot.live/he** (Hebrew)

A website of guided daily breathing exercises ("Neshimot" — Hebrew for "breaths") with a live breath timer,
a breathing human figure, illustrated breath-pattern graphs, generative audio (higher pad on the inhale,
low bass on the exhale) and a Middle Eastern desert theme. Installable as a PWA and usable offline after
the first visit.

The practices are based on the daily breathing work of Nimrod Kaufman and the
[Breath Therapy Institute](https://www.breath-therapy.com/en-us/about-us) (המרכז לתרפיה בנשימה), credited with
their logo in the header and the footer.

- **Two languages** — English at `/`, Hebrew (right-to-left) at `/he`. The EN | עב switch remembers the choice and
  opens the same section in the other language; visitors whose browser is set to Hebrew land on `/he`.
- **Two themes** — night (dark) and dawn (light). The site follows the device setting until the visitor picks one.
  Light mode shows calm, softly animated landscapes behind the page (dunes, an oasis, the crater mountains,
  the sea, olive hills and an acacia plain) that change as you scroll.
- **A page per practice** — `/practices/<slug>` and `/he/practices/<slug>`: the full guide, a Begin button, links to the
  other practices, its own share image and structured data (HowTo + breadcrumbs) for search engines. `sitemap.xml`
  lists every page with its language pair.
- **Daily reminder** — visitors pick a time and a practice and add a repeating event to their own calendar:
  a `.ics` file from `/api/reminder` (Apple, Outlook; iPhones show "Add to Calendar") or a pre-filled Google Calendar event.
- **Sign-up** — the first session is free; after that visitors leave their name and email (sent to HubSpot), which
  unlocks every practice and the breathing diary. Practice history, progress and diary notes stay on the visitor's device.

## Structure

| Path | Purpose |
| --- | --- |
| `js/data.js` | Exercise library — breath patterns the timer runs, plus the English text. |
| `js/data.he.js` | Hebrew text for every exercise, ritual, principle and safety note (mirrors `data.js`). |
| `js/i18n.js` | Every other piece of interface text, in English and Hebrew. |
| `js/session.js` | Timing engine: builds a phase timeline, runs on the system clock and schedules sound on the audio clock. |
| `js/audio.js` | Web Audio synthesis: inhale pad, exhale bass, singing-bowl holds, frame-drum pumps, optional desert wind. |
| `js/graphs.js` | The breathing figure, inline-SVG icons, breath-pattern graphs and sun-arc illustrations. |
| `js/scenery.js` | The light-mode landscapes. |
| `js/render.js` | HTML renderers used at build time. |
| `js/app.js` | UI controller: practice overlay, sign-up, diary, science chart, progress, theme and language switches. |
| `api/lead.js` | Vercel function: saves sign-ups to HubSpot segments. |
| `template.html` | The page shell (head, header, footer, practice player) with `<!--@marker-->` slots and `<!--@t:key-->` text keys. |
| `partials/home.html`, `partials/practice.html` | The body of the home page and of a practice page. |
| `build.mjs` | Prerenders every page: `index.html`, `he.html`, `practices/*.html`, `he/practices/*.html`, plus `sitemap.xml`, `robots.txt` and the reminder text (`api/_reminder-data.json`). No npm install needed. |
| `api/reminder.js` | Vercel function: the daily-reminder calendar file. |
| `og/` | Share images for each practice page, per language. |
| `privacy.html`, `he/privacy.html` | Privacy page in each language (`/privacy`, `/he/privacy`). |
| `img/` | The Breath Therapy Institute logo (transparent, recoloured per theme). |

## Editing text

1. Exercise content: English in `js/data.js`, Hebrew in `js/data.he.js`. Interface text: `js/i18n.js` (both languages side by side).
2. Run `node build.mjs` to regenerate all pages.
3. Commit and push — Vercel deploys `main` to production.

Each breath phase in `data.js` is `{ t: 'in' | 'out' | 'hold' | 'rest', s: seconds }`; the Hebrew file lists the
same phases in the same order, with their Hebrew cue and hint.

## Configuration

| Vercel setting | Purpose |
| --- | --- |
| `HUBSPOT_TOKEN` (environment variable) | HubSpot private-app token (scopes: `crm.objects.contacts.read/write`, `crm.lists.read/write`). Without it the sign-up step stays off and the site works as a fully open practice site. Sign-ups go to the segments "Neshimot — Website sign-ups", "Neshimot — Email opt-in" (ticked box) and "Neshimot — Hebrew site" (signed up on `/he`). |
| Web Analytics (project → Analytics → Enable) | Anonymous, cookie-free page-view counts. The script is already on both pages. |

## Run locally

```bash
node build.mjs && python3 -m http.server 8080
```

(Locally, `/he` is served as `/he.html`, and the sign-up function only runs on Vercel — the site behaves as if the sign-up is switched off.)

Deployed on Vercel from this repository's root: a static site plus one serverless function in `api/`, no build step.
