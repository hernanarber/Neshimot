// Neshimot — exercise library.
// Every practice is pure data: the breath timer, pattern graphs and page sections are generated from it.
// Phase types: 'in' | 'out' | 'hold' | 'rest'. Optional: to (lung level 0–1), side ('left'|'right'), perc (percussive cue).
// pose: how the breathing figure holds its hands — 'rest' (default), 'belly', 'nose' or 'hum'.
// say: spoken wording for voice cues when it differs from the on-screen cue.
// prep: custom 'get ready' cue; doseNote: guidance under the duration picker;
// cautionShort: one-line safety note shown before starting; ack: needs a one-time safety acknowledgement.
// The Hebrew text lives in data.he.js; setDataLang('he' | 'en') swaps every text field in place.

import { HE } from './data.he.js';

export const CATEGORIES = {
  Foundation: { color: 'var(--cat-foundation)', blurb: 'Rebuild a natural, efficient breath.' },
  Balance: { color: 'var(--cat-balance)', blurb: 'Steady the nervous system and the mind.' },
  Calm: { color: 'var(--cat-calm)', blurb: 'Downshift, soften and release.' },
  Energy: { color: 'var(--cat-energy)', blurb: 'Wake up body and mind.' },
};

export const EXERCISES = [
  {
    id: 'diaphragmatic',
    name: 'Diaphragmatic Breathing',
    alt: 'Belly breath',
    category: 'Foundation',
    level: 'Beginner',
    icon: 'belly',
    pose: 'belly',
    tagline: 'Return the work of breathing to the diaphragm.',
    patternLabel: 'In 4 · Out 6',
    dose: { type: 'minutes', value: 5, options: [3, 5, 10] },
    roundLabel: 'Breath',
    pattern: [
      { t: 'in', s: 4, cue: 'Breathe in', hint: 'Through the nose · let the belly rise' },
      { t: 'out', s: 6, cue: 'Breathe out', hint: 'Slowly · the belly softens back' },
    ],
    summary:
      'Most of us breathe high in the chest, recruiting the neck and shoulders for work that belongs to the diaphragm. This practice re-teaches the body its natural pattern: the diaphragm descends, the belly softens outward, and each breath becomes slower, deeper and quieter. It is the root of every other practice here.',
    steps: [
      'Sit upright or lie on your back with knees bent. Rest one hand on your chest and the other just above your navel.',
      'Breathe in slowly through your nose for 4 counts. Let the lower hand rise as the belly, sides and lower back expand — the upper hand stays almost still.',
      'Breathe out through the nose, or softly through pursed lips, for 6 counts. Let the belly fall back toward the spine without pushing.',
      'Keep the breath quiet and unforced, as if you could barely hear it. Continue for five minutes.',
    ],
    benefits: ['Slows the resting breathing rate', 'Releases neck and shoulder tension', 'Calms the stress response', 'The base for every other technique'],
    science:
      'The diaphragm is the body’s primary breathing muscle. When it does its job, the accessory muscles of the neck and upper chest can rest, and the longer exhale engages the parasympathetic (rest-and-digest) branch of the nervous system. Studies of regular slow diaphragmatic breathing report lower cortisol and better sustained attention.',
    tips: [
      'Think 360°: expand into the sides and the back, not only the front.',
      'If the chest keeps leading, practise lying down with a light book resting on the belly.',
      'Comfort comes first — a slower breath is not better if it creates strain.',
    ],
  },
  {
    id: 'three-part',
    name: 'Three-Part Breath',
    alt: 'Dirgha pranayama',
    category: 'Foundation',
    level: 'Beginner',
    icon: 'threepart',
    tagline: 'Fill from the ground up — belly, ribs, chest.',
    patternLabel: 'In 2·2·2 · Out 6',
    dose: { type: 'minutes', value: 4, options: [3, 4, 6] },
    roundLabel: 'Breath',
    pattern: [
      { t: 'in', s: 2, to: 0.36, cue: 'Belly', hint: 'Breathe into the low belly' },
      { t: 'in', s: 2, to: 0.7, cue: 'Ribs', hint: 'Widen the ribs to the sides' },
      { t: 'in', s: 2, to: 1, cue: 'Chest', hint: 'Gently lift beneath the collarbones' },
      { t: 'out', s: 6, cue: 'Release', hint: 'Chest · ribs · belly, in reverse' },
    ],
    summary:
      'A complete breath that maps the whole torso. You fill the lungs in three waves — belly, ribcage, upper chest — then empty them in reverse. It builds body awareness, expands breathing capacity and is a beautiful way to arrive at the start of any session.',
    steps: [
      'Sit tall with a long spine, or lie down. Exhale fully to begin.',
      'Inhale through the nose into the belly for 2 counts… widen the lower ribs to the sides for 2 counts… then gently lift the upper chest for 2 counts.',
      'Exhale slowly in reverse for 6 counts: the chest softens, the ribs draw in, the belly gently returns.',
      'Let the three parts flow as one continuous wave, without pausing at the top.',
    ],
    benefits: ['Expands breathing awareness and capacity', 'Mobilises the ribcage', 'Settles a scattered mind', 'An ideal opening for any session'],
    science:
      'Each region recruits different muscles: the diaphragm (belly), the intercostals (ribs) and the upper accessory muscles (chest). Practising them in sequence improves the coordination of the whole respiratory system, while the slow six-count exhale keeps the nervous system calm.',
    tips: [
      'The chest phase is subtle — a lift, not a heave. Keep the shoulders soft.',
      'Rest your hands on the belly, then the ribs, then the chest to feel each wave arrive.',
    ],
    caution: 'If you feel light-headed, make the inhale smaller and return to simple belly breathing.',
    cautionShort: 'Feeling light-headed? Make the inhale smaller and return to belly breathing.',
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    alt: 'Resonance breathing',
    category: 'Balance',
    level: 'Beginner',
    icon: 'coherent',
    tagline: 'The rhythm where heart and breath fall into step.',
    patternLabel: 'In 5.5 · Out 5.5',
    dose: { type: 'minutes', value: 5, options: [5, 10, 20] },
    roundLabel: 'Breath',
    pattern: [
      { t: 'in', s: 5.5, cue: 'Breathe in', hint: 'Soft and smooth through the nose' },
      { t: 'out', s: 5.5, cue: 'Breathe out', hint: 'No pause — let the breath turn like a wave' },
    ],
    summary:
      'Inhaling and exhaling evenly for about five and a half seconds each brings most adults to their resonance frequency — close to six breaths a minute. At this pace heart rhythm, blood pressure and breath begin to rise and fall together, creating a state that is calm and alert at once. Many breath therapists consider it the single most valuable daily practice.',
    steps: [
      'Sit comfortably with the spine upright and the shoulders relaxed. Breathe through the nose.',
      'Inhale softly for 5.5 seconds, letting the belly and ribs expand.',
      'Exhale softly for 5.5 seconds. Don’t pause at the top or bottom — the breath turns like a smooth wave.',
      'Keep each breath light, about 70% of a full breath. Continue for five to twenty minutes.',
    ],
    benefits: ['Maximises heart-rate variability (HRV)', 'Balances the autonomic nervous system', 'Steadies mood and reactivity', 'Supports healthy blood pressure'],
    science:
      'Breathing near 0.1 Hz — six breaths per minute — synchronises respiratory sinus arrhythmia with the baroreflex, the body’s blood-pressure feedback loop. The result is the largest heart-rate oscillation a person can produce, a strong marker of vagal tone. Research by Lehrer, Gevirtz and colleagues links regular resonance breathing with reduced anxiety, low mood and blood pressure.',
    tips: [
      'Don’t over-breathe: each breath should feel smaller than you expect.',
      'Your personal resonance pace lies somewhere between about 4.5 and 6.5 breaths a minute. Use the Pace control to find the rhythm that feels effortless.',
    ],
  },
  {
    id: 'box',
    name: 'Box Breathing',
    alt: 'Square breathing',
    category: 'Balance',
    level: 'Beginner',
    icon: 'box',
    tagline: 'Four equal sides for a steady, focused mind.',
    patternLabel: 'In 4 · Hold 4 · Out 4 · Hold 4',
    dose: { type: 'minutes', value: 4, options: [2, 4, 8] },
    roundLabel: 'Box',
    pattern: [
      { t: 'in', s: 4, cue: 'Breathe in', hint: 'Through the nose' },
      { t: 'hold', s: 4, cue: 'Hold', hint: 'Full · throat soft' },
      { t: 'out', s: 4, cue: 'Breathe out', hint: 'Slow and even' },
      { t: 'hold', s: 4, cue: 'Hold', hint: 'Empty · stay relaxed' },
    ],
    summary:
      'Inhale, hold, exhale, hold — four counts each. The equal rhythm gives the mind a simple structure to follow, which is why pilots, first responders and special forces use it to stay composed and clear-headed under pressure.',
    steps: [
      'Sit upright and exhale completely through the nose.',
      'Inhale through the nose for 4 counts.',
      'Hold the breath gently for 4 counts — no clenching in the throat.',
      'Exhale through the nose for 4 counts.',
      'Hold empty for 4 counts, then begin the next side of the box.',
    ],
    benefits: ['Sharpens focus and composure', 'Regulates breathing under stress', 'Builds tolerance to carbon dioxide', 'Usable anywhere, eyes open'],
    science:
      'The holds let carbon dioxide rise slightly, which helps haemoglobin release oxygen to the tissues (the Bohr effect) and gradually trains a calmer chemical response to stress. The slow, symmetrical rhythm — under four breaths a minute — lowers arousal while keeping attention engaged.',
    tips: [
      'Picture yourself tracing the four sides of a square.',
      'If the holds feel hard, slow the Pace down or shorten the count to 3.',
      'Use it before a performance, a difficult conversation or sleep.',
    ],
    caution: 'Skip the holds if you are pregnant or have uncontrolled high blood pressure — simply breathe 4 in and 4 out.',
    cautionShort: 'Pregnant or high blood pressure? Skip the holds and simply breathe 4 in, 4 out.',
  },
  {
    id: 'alternate-nostril',
    name: 'Alternate Nostril Breathing',
    alt: 'Nadi shodhana',
    category: 'Balance',
    level: 'Beginner',
    icon: 'alternate',
    pose: 'nose',
    tagline: 'Balance left and right, effort and ease.',
    patternLabel: 'In L 4 · Out R 6 · In R 4 · Out L 6',
    dose: { type: 'minutes', value: 5, options: [3, 5, 10] },
    roundLabel: 'Round',
    pattern: [
      { t: 'in', s: 4, side: 'left', cue: 'In · left', say: 'Inhale left', hint: 'Thumb closes the right nostril' },
      { t: 'out', s: 6, side: 'right', cue: 'Out · right', say: 'Exhale right', hint: 'Ring finger closes the left' },
      { t: 'in', s: 4, side: 'right', cue: 'In · right', say: 'Inhale right', hint: 'Stay on the right side' },
      { t: 'out', s: 6, side: 'left', cue: 'Out · left', say: 'Exhale left', hint: 'Switch — thumb closes the right' },
    ],
    summary:
      'By guiding the breath through one nostril at a time, this classical practice slows the breath, sharpens attention and leaves a distinct feeling of balance. It is a favourite before meditation, study or sleep.',
    steps: [
      'Sit tall and rest the left hand on your knee. Raise the right hand: the thumb will close the right nostril, the ring finger the left.',
      'Close the right nostril and inhale through the left for 4 counts.',
      'Close the left nostril, release the right, and exhale through the right for 6 counts.',
      'Inhale through the right for 4 counts.',
      'Close the right, release the left, and exhale through the left for 6 counts. That is one round — always switch after the inhale.',
    ],
    benefits: ['Calms and balances the nervous system', 'Improves concentration', 'Lowers heart rate and blood pressure', 'Prepares the mind for meditation'],
    science:
      'Single-nostril breathing slows airflow and lengthens every breath. Studies of alternate nostril breathing report lower heart rate and blood pressure and improved attention after only a few minutes. Following the fine sensation of air in each nostril also anchors a wandering mind.',
    tips: [
      'Keep the touch on the nostrils feather-light.',
      'If your arm tires, support the elbow with the other hand.',
      'With a blocked nostril, practise in the imagination — the benefit for attention remains.',
    ],
  },
  {
    id: 'physiological-sigh',
    name: 'Physiological Sigh',
    alt: 'Cyclic sighing',
    category: 'Calm',
    level: 'Beginner',
    icon: 'sigh',
    tagline: 'The fastest way to downshift, built into your biology.',
    patternLabel: 'In 2 + 1 · Out 6',
    dose: { type: 'minutes', value: 3, options: [1, 3, 5] },
    roundLabel: 'Sigh',
    pattern: [
      { t: 'in', s: 2, to: 0.78, cue: 'Breathe in', hint: 'Deep, through the nose' },
      { t: 'in', s: 1, to: 1, cue: 'Sip more', hint: 'A short top-up inhale' },
      { t: 'out', s: 6, cue: 'Sigh out', hint: 'Long and slow through the mouth' },
    ],
    summary:
      'Two inhales through the nose — a deep one, then a short top-up — followed by a long, slow exhale through the mouth. It is the body’s own reset: we sigh like this spontaneously after crying or before falling asleep. Just a few cycles can noticeably lower stress in real time.',
    steps: [
      'Inhale deeply through the nose for 2 counts.',
      'Without exhaling, take a second short sip of air through the nose to fill the lungs completely (1 count).',
      'Exhale slowly and completely through the mouth for 6 counts, like a long sigh.',
      'Repeat. One to three sighs work as an instant reset; five minutes makes a daily practice.',
    ],
    benefits: ['Rapidly reduces stress and arousal', 'Re-opens collapsed air sacs (alveoli)', 'Releases carbon dioxide efficiently', 'Lifts mood with daily use'],
    science:
      'The second inhale re-inflates alveoli that collapse during shallow breathing, increasing the surface for gas exchange so the long exhale can release more carbon dioxide. A 2023 Stanford study (Balban et al., Cell Reports Medicine) found that five minutes of daily cyclic sighing improved mood and lowered breathing rate more than the same time spent in mindfulness meditation.',
    tips: [
      'Make the exhale at least twice as long as the two inhales together.',
      'Use it in the moment: in traffic, before you speak, after difficult news.',
    ],
  },
  {
    id: '4-7-8',
    name: '4-7-8 Breathing',
    alt: 'The relaxing breath',
    category: 'Calm',
    level: 'Beginner',
    icon: 'moon',
    tagline: 'A natural tranquilliser for the nervous system.',
    patternLabel: 'In 4 · Hold 7 · Out 8',
    dose: { type: 'rounds', value: 4, options: [4, 6, 8], unit: 'cycles' },
    doseNote: 'New to 4-7-8? Stay with 4 cycles for the first month.',
    prep: { cue: 'Exhale fully', hint: 'Whoosh all the air out through the mouth' },
    roundLabel: 'Cycle',
    pattern: [
      { t: 'in', s: 4, cue: 'Breathe in', hint: 'Quietly through the nose' },
      { t: 'hold', s: 7, cue: 'Hold', hint: 'Tongue resting behind the upper teeth' },
      { t: 'out', s: 8, cue: 'Whoosh out', hint: 'Through the mouth, audibly' },
    ],
    summary:
      'Popularised by Dr. Andrew Weil from yogic pranayama, the 4-7-8 breath pairs a short inhale with a long hold and an even longer, audible exhale. It is a trusted tool for falling asleep, easing anxiety and interrupting cravings or anger.',
    steps: [
      'Rest the tip of your tongue on the ridge just behind your upper front teeth, and keep it there throughout.',
      'Exhale completely through the mouth with a soft whoosh.',
      'Close the mouth and inhale quietly through the nose for 4 counts.',
      'Hold the breath for 7 counts.',
      'Exhale through the mouth with a whoosh for 8 counts. That is one cycle — begin with four.',
    ],
    benefits: ['Helps you fall asleep faster', 'Eases acute anxiety', 'Slows the heart rate', 'Interrupts impulsive reactions'],
    science:
      'The ratio matters more than the speed. A long hold followed by an exhale twice the length of the inhale strongly favours parasympathetic activity and slows the heart. Practised twice a day, it tends to grow more effective over the weeks.',
    tips: [
      'Start with four cycles; after a month of regular practice you can build up to eight.',
      'If the hold is too long, raise the Pace to count faster — but keep the 4 : 7 : 8 ratio.',
      'Mild light-headedness at first is common and passes with practice.',
    ],
    caution: 'Never practise while driving. Skip the hold if you are pregnant or have uncontrolled high blood pressure.',
    cautionShort: 'Never practise while driving. Skip the hold if pregnant or with high blood pressure.',
  },
  {
    id: 'humming',
    name: 'Humming Bee Breath',
    alt: 'Bhramari',
    category: 'Calm',
    level: 'Beginner',
    icon: 'hum',
    pose: 'hum',
    tagline: 'Let a low, gentle hum vibrate the tension away.',
    patternLabel: 'In 4 · Hum 8',
    dose: { type: 'minutes', value: 4, options: [3, 4, 7] },
    roundLabel: 'Breath',
    pattern: [
      { t: 'in', s: 4, cue: 'Breathe in', hint: 'Through the nose' },
      { t: 'out', s: 8, hum: true, cue: 'Hum', hint: 'A low, steady “mmm” — feel the vibration' },
    ],
    summary:
      'On every long exhale you hum a low, steady “mmm”, like a bee. The sound lengthens the exhale naturally, the vibration resonates through the face, throat and chest, and the mind is given something soothing to rest on. Sound and breath have been paired for healing in many traditions.',
    steps: [
      'Sit comfortably, close your eyes and relax the jaw — lips gently closed, teeth slightly apart.',
      'Inhale through the nose for 4 counts.',
      'Exhale for 8 counts while humming a low, steady “mmm”. Feel the vibration in the lips, face and chest.',
      'Optionally press the ear flaps gently closed with your thumbs to turn the sound inward.',
      'Continue for three to five minutes, then sit in silence for a few breaths.',
    ],
    benefits: ['Quiets an anxious, racing mind', 'Boosts nasal nitric oxide', 'Naturally lengthens the exhale', 'Relieves tension in the face and throat'],
    science:
      'Humming raises nasal nitric oxide as much as fifteen-fold compared with a quiet exhale (Weitzberg & Lundberg, 2002). Nitric oxide supports healthy airways and blood-vessel dilation, while the steady vibration and the long exhale stimulate the vagus nerve, which runs right beside the larynx.',
    tips: [
      'Choose a low pitch that feels effortless; let it resonate rather than pushing it out.',
      'Play with the pitch and notice where in the body you feel it most.',
    ],
  },
  {
    id: 'kapalabhati',
    name: 'Skull-Shining Breath',
    alt: 'Kapalabhati',
    category: 'Energy',
    level: 'Intermediate',
    icon: 'flame',
    tagline: 'Rhythmic, active exhales that wake up body and mind.',
    patternLabel: '30 pumps · Hold 12 · Rest',
    dose: { type: 'rounds', value: 3, options: [2, 3, 4], unit: 'rounds' },
    roundLabel: 'Round',
    pattern: [
      { t: 'in', s: 3, to: 0.6, cue: 'Breathe in', hint: 'Comfortable — not full' },
      {
        repeat: 30,
        counter: 'Pump',
        phases: [
          { t: 'out', s: 0.6, to: 0.36, perc: true, cue: 'Pump', hint: 'Snap the belly in — the inhale happens by itself' },
          { t: 'in', s: 0.4, to: 0.6, cue: 'Pump', hint: 'Snap the belly in — the inhale happens by itself' },
        ],
      },
      { t: 'in', s: 4, to: 1, cue: 'Breathe in fully', hint: 'Fill up slowly' },
      { t: 'hold', s: 12, cue: 'Hold', hint: 'Stay soft · release early if you feel dizzy' },
      { t: 'out', s: 6, cue: 'Breathe out', hint: 'Slowly, all the way' },
      { t: 'rest', s: 8, cue: 'Breathe naturally', hint: 'Recover before the next round' },
    ],
    summary:
      'A cleansing, energising technique: short, sharp exhales through the nose driven by the lower belly, each followed by a passive inhale. Rounds of rhythmic pumping end with a calm breath-hold. Practise it in the morning for clarity and warmth — never before sleep.',
    steps: [
      'Sit tall with your hands on your knees and take a comfortable breath in.',
      'Snap the lower belly inward to push a short, sharp exhale out through the nose. Let the belly release and the inhale happen by itself.',
      'Continue at about one pump per second for 30 pumps — the exhale is active, the inhale passive.',
      'Then breathe in fully, hold comfortably for about 12 counts, and exhale slowly.',
      'Breathe naturally to recover, then begin the next round. Three rounds make a complete practice.',
    ],
    benefits: ['Raises energy and alertness', 'Strengthens the abdominal muscles', 'Clears the nasal passages', 'Warms the body'],
    science:
      'Rapid, forceful breathing briefly activates the sympathetic nervous system — the opposite effect of slow breathing — raising alertness and arousal. The closing hold lets carbon dioxide rebalance after the pumping. Keep sessions short and build up gradually.',
    tips: [
      'Keep the face and shoulders completely relaxed — only the belly works.',
      'After two to three weeks of comfortable practice, build up gradually: a few more pumps per round, or a slightly faster pace.',
      'Quality over speed: slow the Pace if the rhythm becomes ragged.',
    ],
    caution:
      'Avoid if pregnant, during menstruation, or with high blood pressure, heart disease, epilepsy, hernia, glaucoma or recent abdominal surgery. Stop if you feel dizzy. Never practise in water or while driving.',
    cautionShort: 'Not for pregnancy, high blood pressure, heart disease, epilepsy, hernia or recent abdominal surgery. Stop if dizzy.',
    ack: true,
  },
  {
    id: 'connected',
    name: 'Connected Breathing',
    alt: 'Circular breath',
    category: 'Energy',
    level: 'Advanced',
    icon: 'circle',
    tagline: 'A seamless circle of breath — no pause, nothing held.',
    patternLabel: 'In 3 · Out 2 · no pauses',
    dose: { type: 'minutes', value: 3, options: [3, 5, 8] },
    roundLabel: 'Breath',
    pattern: [
      { t: 'in', s: 3, cue: 'Draw in', hint: 'Full and active' },
      { t: 'out', s: 2, cue: 'Let go', hint: 'Release — don’t push' },
    ],
    outro: { t: 'rest', s: 45, cue: 'Rest', hint: 'Breathe naturally and notice the body' },
    summary:
      'In conscious connected breathing the inhale flows straight into the exhale and the exhale straight into the next inhale, forming an unbroken circle. The inhale is full and active; the exhale is simply released, never pushed. Central to many breath-therapy traditions, it can bring up strong sensations and emotions — this gentle daily version keeps the rhythm slow and the session short.',
    steps: [
      'Sit supported against a wall or cushions, or lie down, somewhere safe and comfortable. Breathe through the nose.',
      'Draw the inhale in actively and fully for 3 counts, filling the belly, then the chest.',
      'Without pausing, release the exhale for 2 counts — let it fall out like a sigh, with no effort or control.',
      'Keep the circle turning with no pause at the top or bottom for the length of the session.',
      'To finish, return to soft natural breathing and rest, noticing what you feel in the body.',
    ],
    benefits: ['Releases held tension and emotion', 'Energises and opens the body', 'Deepens body awareness', 'Trains a free, unrestricted breath'],
    science:
      'Connected breathing at a faster-than-usual rate lowers carbon dioxide in the blood, which can cause tingling, warmth or light-headedness. These sensations are normal and pass as soon as the breath slows. In a therapeutic setting, breath therapists work with this state to help release stored stress and emotion.',
    tips: [
      'Relax the exhale completely — the letting go is the practice.',
      'If tingling or cramping becomes strong, slow down and breathe naturally.',
    ],
    caution:
      'Practise lying down or seated — never in water, standing or while driving. Avoid if pregnant, or with epilepsy, cardiovascular disease, glaucoma, recent surgery or a serious psychiatric condition. Deeper sessions are best done with a trained breath therapist.',
    cautionShort: 'Seated or lying down only — never in water or while driving. Not for pregnancy, epilepsy or heart conditions.',
    ack: true,
  },
];

export const RITUALS = [
  {
    id: 'sunrise',
    name: 'Sunrise',
    title: 'Awaken',
    sun: 0.12,
    blurb: 'Open the body and clear the mind before the day begins.',
    items: [
      { id: 'three-part', minutes: 3 },
      { id: 'box', minutes: 4 },
    ],
  },
  {
    id: 'zenith',
    name: 'Midday',
    title: 'Reset',
    sun: 0.5,
    blurb: 'Release the morning’s tension and come back into balance.',
    items: [
      { id: 'physiological-sigh', minutes: 1 },
      { id: 'coherent', minutes: 5 },
    ],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    title: 'Unwind',
    sun: 0.88,
    blurb: 'Let the day go and prepare the body for deep sleep.',
    items: [
      { id: 'humming', minutes: 3 },
      { id: 'alternate-nostril', minutes: 3 },
      { id: '4-7-8', rounds: 4 },
    ],
  },
];

export const PRINCIPLES = [
  {
    title: 'The exhale is the brake',
    text: 'Your heart speeds up a little on every inhale and slows on every exhale. Lengthening the exhale leans on this “vagal brake” and tells the body it is safe.',
  },
  {
    title: 'Slow is powerful',
    text: 'At around six breaths a minute, breath, heart rhythm and blood pressure begin to resonate — the state of highest heart-rate variability.',
  },
  {
    title: 'Nose first',
    text: 'The nose filters, warms and humidifies the air and adds nitric oxide. Nasal breathing naturally slows and deepens the breath.',
  },
  {
    title: 'CO₂ is not waste',
    text: 'Carbon dioxide sets the urge to breathe and helps haemoglobin release oxygen. Over-breathing lowers it — calm, light breathing restores balance.',
  },
];

export const SAFETY = [
  'Practise seated or lying down, ideally on a fairly empty stomach.',
  'Breathe through the nose unless a practice says otherwise.',
  'Never practise breath-holds or fast breathing in water, while driving, or anywhere fainting could be dangerous.',
  'Mild tingling or light-headedness can happen. If it does, return to natural breathing — and stop if you feel unwell.',
  'If you are pregnant, or live with a heart, lung, blood-pressure, seizure or psychiatric condition, consult a qualified professional before holds or fast-breathing techniques.',
  'These practices support wellbeing; they are not a substitute for medical care.',
];

// ---------- Pattern helpers (shared by timer and graphs) ----------

export function expandPattern(pattern) {
  const out = [];
  for (const p of pattern) {
    if (p.repeat) {
      for (let i = 0; i < p.repeat; i++) {
        for (const q of p.phases) out.push({ ...q, count: i + 1, countTotal: p.repeat, counter: p.counter });
      }
    } else out.push({ ...p });
  }
  return out;
}

export function targetLevel(ph, cur) {
  if (ph.to != null) return ph.to;
  if (ph.t === 'in') return 1;
  if (ph.t === 'out') return 0;
  if (ph.t === 'rest' || ph.t === 'prep' || ph.t === 'interlude') return 0.32;
  return cur;
}

export function cycleSeconds(ex, pace = 1) {
  return expandPattern(ex.pattern).reduce((a, p) => a + p.s * pace, 0);
}

export function roundsFor(ex, dose, pace = 1) {
  if (dose.rounds) return dose.rounds;
  const target = dose.minutes * 60;
  const c = cycleSeconds(ex, pace);
  let r = Math.max(1, Math.round(target / c));
  // never run noticeably longer than the duration someone picked
  if (r > 1 && r * c > target * 1.1) r = Math.max(1, Math.floor(target / c));
  return r;
}

export const byId = (id) => EXERCISES.find((e) => e.id === id);

// ---------- Language ----------

const TEXT = ['name', 'alt', 'tagline', 'patternLabel', 'roundLabel', 'roundPlural', 'summary', 'steps', 'benefits', 'science', 'tips', 'caution', 'cautionShort', 'doseNote'];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] != null).map((k) => [k, o[k]]));
const phaseText = (pattern) =>
  pattern.map((p) => (p.repeat ? { counter: p.counter, phases: phaseText(p.phases) } : pick(p, ['cue', 'hint', 'say'])));

EXERCISES.forEach((ex) => {
  if (!ex.roundPlural) ex.roundPlural = ex.roundLabel === 'Box' ? 'boxes' : `${ex.roundLabel.toLowerCase()}s`;
});
RITUALS.forEach((r) => (r.label = `${r.name} ritual`));
Object.entries(CATEGORIES).forEach(([k, c]) => (c.label = k));

const EN = {
  exercises: Object.fromEntries(
    EXERCISES.map((ex) => [ex.id, { ...pick(ex, TEXT), prep: ex.prep && { ...ex.prep }, outro: ex.outro && pick(ex.outro, ['cue', 'hint']), pattern: phaseText(ex.pattern) }])
  ),
  rituals: Object.fromEntries(RITUALS.map((r) => [r.id, pick(r, ['name', 'label', 'title', 'blurb'])])),
  categories: Object.fromEntries(Object.entries(CATEGORIES).map(([k, c]) => [k, pick(c, ['label', 'blurb'])])),
  principles: PRINCIPLES.map((p) => ({ ...p })),
  safety: [...SAFETY],
  levels: { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced' },
  units: { cycles: 'cycles', rounds: 'rounds' },
};

function applyPattern(pattern, texts = []) {
  pattern.forEach((p, i) => {
    const tx = texts[i];
    if (!tx) return;
    if (p.repeat) {
      if (tx.counter) p.counter = tx.counter;
      applyPattern(p.phases, tx.phases);
    } else {
      p.cue = tx.cue ?? p.cue;
      p.hint = tx.hint ?? p.hint;
      if (tx.say) p.say = tx.say;
      else delete p.say;
    }
  });
}

let DATA_LANG = 'en';
let LEX = EN;

/** Switch every exercise, ritual, principle and safety text to 'en' or 'he'. */
export function setDataLang(lang) {
  DATA_LANG = lang === 'he' ? 'he' : 'en';
  const src = DATA_LANG === 'he' ? HE : EN;
  LEX = src;
  EXERCISES.forEach((ex) => {
    const tx = { ...EN.exercises[ex.id], ...(src.exercises[ex.id] || {}) };
    TEXT.forEach((k) => {
      if (tx[k] != null) ex[k] = tx[k];
      else delete ex[k];
    });
    if (ex.prep) ex.prep = { ...ex.prep, ...(tx.prep || EN.exercises[ex.id].prep) };
    if (ex.outro) Object.assign(ex.outro, tx.outro || EN.exercises[ex.id].outro);
    applyPattern(ex.pattern, EN.exercises[ex.id].pattern);
    if (src !== EN) applyPattern(ex.pattern, tx.pattern);
  });
  RITUALS.forEach((r) => Object.assign(r, EN.rituals[r.id], src.rituals[r.id] || {}));
  Object.entries(CATEGORIES).forEach(([k, c]) => Object.assign(c, EN.categories[k], src.categories[k] || {}));
  PRINCIPLES.forEach((p, i) => Object.assign(p, EN.principles[i], (src.principles || [])[i] || {}));
  SAFETY.splice(0, SAFETY.length, ...(src.safety && src.safety.length === EN.safety.length ? src.safety : EN.safety));
}

export const dataLang = () => DATA_LANG;
export const catLabel = (c) => (CATEGORIES[c] && CATEGORIES[c].label) || c;
export const levelLabel = (l) => (LEX.levels && LEX.levels[l]) || l;
export const unitLabel = (u) => (LEX.units && LEX.units[u]) || u;
