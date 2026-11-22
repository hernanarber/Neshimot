# Ruach — Daily Breathing Practice

A static, dependency-free website of guided daily breathing exercises with a live breath timer,
illustrated breath-pattern graphs, generative audio (higher pad on the inhale, low bass on the exhale)
and a Middle Eastern desert theme. Installable as a PWA and usable offline after the first visit.

## Structure

| Path | Purpose |
| --- | --- |
| `js/data.js` | **All exercise content** — names, steps, science, cautions and the breath patterns the timer runs. Edit here. |
| `js/session.js` | Timing engine: builds a phase timeline and drives it from the audio clock (sample-accurate, survives background tabs). |
| `js/audio.js` | Web Audio synthesis: inhale pad, exhale bass, singing-bowl holds, frame-drum pumps, optional desert wind. |
| `js/graphs.js` | Inline-SVG icons, breath-pattern graphs and sun-arc illustrations. |
| `js/render.js` | HTML renderers used at build time. |
| `js/app.js` | UI controller: practice overlay, sand particles, science chart, progress tracking, breath-hold check. |
| `template.html` | Page template with `<!--@marker-->` slots. |
| `build.mjs` | Prerenders `template.html` → `index.html` from the data (no npm install needed). |

## Editing exercises

1. Change `js/data.js` (each phase is `{ t: 'in' | 'out' | 'hold' | 'rest', s: seconds }`).
2. Run `node build.mjs` to regenerate `index.html`.
3. Commit and redeploy.

## Run locally

```bash
node build.mjs && python3 -m http.server 8080
```

Deployed on Vercel as a static site (project root: `breathing-exercises/`, no build step).
