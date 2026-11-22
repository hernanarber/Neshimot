# Neshimot — Daily Breathing Practice

**Live at https://www.neshimot.live**

A website of guided daily breathing exercises ("Neshimot" — Hebrew for "breaths") with a live breath timer,
a breathing human figure, illustrated breath-pattern graphs, generative audio (higher pad on the inhale,
low bass on the exhale) and a Middle Eastern desert theme. Installable as a PWA and usable offline after
the first visit.

The first session is free; after that visitors leave their name and email (sent to HubSpot), which unlocks
every practice and the breathing diary. Practice history, progress and diary notes stay on the visitor's device.

## Structure

| Path | Purpose |
| --- | --- |
| `js/data.js` | **All exercise content** — names, steps, science, cautions and the breath patterns the timer runs. Edit here. |
| `js/session.js` | Timing engine: builds a phase timeline, runs on the system clock and schedules sound on the audio clock. |
| `js/audio.js` | Web Audio synthesis: inhale pad, exhale bass, singing-bowl holds, frame-drum pumps, optional desert wind. |
| `js/graphs.js` | The breathing figure, inline-SVG icons, breath-pattern graphs and sun-arc illustrations. |
| `js/render.js` | HTML renderers used at build time. |
| `js/app.js` | UI controller: practice overlay, sign-up, breathing diary, science chart, progress, breath-hold check. |
| `api/lead.js` | Vercel function: saves sign-ups to HubSpot segments. |
| `template.html` | Page template with `<!--@marker-->` slots. |
| `build.mjs` | Prerenders `template.html` → `index.html` from the data (no npm install needed). |
| `privacy.html` | Privacy page (`/privacy`). |

## Editing exercises

1. Change `js/data.js` (each phase is `{ t: 'in' | 'out' | 'hold' | 'rest', s: seconds }`).
2. Run `node build.mjs` to regenerate `index.html`.
3. Commit and push — Vercel deploys `main` to production.

## Configuration

| Vercel environment variable | Purpose |
| --- | --- |
| `HUBSPOT_TOKEN` | HubSpot private-app token (scopes: `crm.objects.contacts.read/write`, `crm.lists.read/write`). Without it the sign-up step stays off and the site works as a fully open practice site. |

## Run locally

```bash
node build.mjs && python3 -m http.server 8080
```

(The sign-up function only runs on Vercel; locally the site behaves as if the sign-up is switched off.)

Deployed on Vercel from this repository's root: a static site plus one serverless function in `api/`, no build step.
