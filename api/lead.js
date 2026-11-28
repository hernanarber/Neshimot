// Neshimot — sign-up endpoint (Vercel serverless function).
// Saves a visitor's name and email as a HubSpot contact and files them in the
// "Neshimot — Website sign-ups" segment (plus "Neshimot — Email opt-in" when they
// ticked the newsletter box, and "Neshimot — Hebrew site" when they signed up on /he).
// No database: HubSpot is the system of record.
//
// Env: HUBSPOT_TOKEN — a HubSpot private-app token with crm.objects.contacts.read/write
//      and crm.lists.read/write scopes. Without it, GET reports ready:false and the
//      website simply doesn't show the sign-up step.
//      NESHIMOT_SIGNUP=off — pauses the sign-up while keeping the token (delete it to resume).

const API = process.env.HUBSPOT_API_BASE || 'https://api.hubapi.com';
const LISTS = {
  signups: 'Neshimot — Website sign-ups',
  optin: 'Neshimot — Email opt-in',
  hebrew: 'Neshimot — Hebrew site',
};
const ALLOWED_ORIGIN = /^(https:\/\/(www\.)?neshimot\.live|https:\/\/(neshimot|breathing-exercises)[a-z0-9-]*\.vercel\.app|http:\/\/localhost(:\d+)?)$/;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

const listIds = {}; // cached per warm instance
const hits = new Map(); // best-effort per-instance rate limit

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}

async function hs(path, token, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(8000), // never hang on a slow HubSpot; the browser queues and retries
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  return { status: res.status, ok: res.ok, data };
}

async function contactId(token, email, firstname, lastname) {
  const properties = { email, firstname, lifecyclestage: 'lead' };
  if (lastname) properties.lastname = lastname;
  const created = await hs('/crm/v3/objects/contacts', token, { method: 'POST', body: JSON.stringify({ properties }) });
  if (created.ok && created.data && created.data.id) return created.data.id;
  if (created.status === 409) {
    // already a contact: keep their record as it is, just find the id
    const m = /Existing ID:\s*(\d+)/i.exec((created.data && created.data.message) || '');
    if (m) return m[1];
    const found = await hs('/crm/v3/objects/contacts/search', token, {
      method: 'POST',
      body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }], limit: 1 }),
    });
    const id = found.ok && found.data && found.data.results && found.data.results[0] && found.data.results[0].id;
    if (id) return id;
  }
  throw new Error(`contact ${created.status}`);
}

async function listId(token, key) {
  if (listIds[key]) return listIds[key];
  const name = LISTS[key];
  const get = () => hs(`/crm/v3/lists/object-type-id/0-1/name/${encodeURIComponent(name)}`, token);
  let r = await get();
  if (!(r.ok && r.data && r.data.list)) {
    const made = await hs('/crm/v3/lists', token, {
      method: 'POST',
      body: JSON.stringify({ name, objectTypeId: '0-1', processingType: 'MANUAL' }),
    });
    r = made.ok ? made : await get(); // another request may have created it first
  }
  const id = r.ok && r.data && r.data.list && r.data.list.listId;
  if (!id) throw new Error(`list ${r.status}`);
  listIds[key] = String(id);
  return listIds[key];
}

async function addToList(token, key, id) {
  const lid = await listId(token, key);
  const r = await hs(`/crm/v3/lists/${lid}/memberships/add`, token, { method: 'PUT', body: JSON.stringify([String(id)]) });
  if (!r.ok) throw new Error(`membership ${r.status}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // NESHIMOT_SIGNUP=off pauses the sign-up without removing the HubSpot token:
  // the website then runs fully open (every practice and the diary, no name or email asked)
  const paused = String(process.env.NESHIMOT_SIGNUP || '').toLowerCase() === 'off';
  const token = paused ? '' : process.env.HUBSPOT_TOKEN;

  if (req.method === 'GET') return res.status(200).json({ ready: !!token });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method' });
  }

  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGIN.test(origin)) return res.status(403).json({ error: 'origin' });
  if (!token) return res.status(503).json({ error: 'not_configured' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }
  body = body || {};

  // honeypot: bots fill the hidden "website" field; pretend success and drop it
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  if (!name) return res.status(400).json({ error: 'name' });
  if (email.length > 254 || !EMAIL.test(email)) return res.status(400).json({ error: 'email' });
  const [firstname, ...rest] = name.split(' ');
  const lastname = rest.join(' ');

  try {
    const id = await contactId(token, email, firstname, lastname);
    await addToList(token, 'signups', id);
    if (body.consent === true) await addToList(token, 'optin', id);
    // visitors who signed up on the Hebrew site — for Hebrew emails later; never blocks the sign-up
    if (body.lang === 'he') {
      try {
        await addToList(token, 'hebrew', id);
      } catch (err) {
        console.error('hebrew segment error:', err && err.message);
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead error:', err && err.message);
    return res.status(502).json({ error: 'crm' });
  }
};
