const fs = require('fs/promises');
const path = require('path');
const A = require('../vendor/astronomy.browser.min.js');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'precomputedForecast.json');
const RUNTIME = process.env.LUMINA_RUNTIME_URL || 'http://127.0.0.1:8787';
const DAYS = Number(process.env.FORECAST_DAYS || 14);

// ── Sky model (mirrors index.html so forecasts match the on-screen chart) ──
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const PLANETS = [
  { key: 'Sun', body: A.Body.Sun, tier: 'fast' },
  { key: 'Moon', body: A.Body.Moon, tier: 'fast' },
  { key: 'Mercury', body: A.Body.Mercury, tier: 'fast' },
  { key: 'Venus', body: A.Body.Venus, tier: 'fast' },
  { key: 'Mars', body: A.Body.Mars, tier: 'fast' },
  { key: 'Jupiter', body: A.Body.Jupiter, tier: 'slow' },
  { key: 'Saturn', body: A.Body.Saturn, tier: 'slow' },
  { key: 'Uranus', body: A.Body.Uranus, tier: 'slow' },
  { key: 'Neptune', body: A.Body.Neptune, tier: 'slow' },
  { key: 'Pluto', body: A.Body.Pluto, tier: 'slow' }
];

// name = canonical (matches themeLexicon), spoken = read-aloud form
const ASPECTS = [
  { name: 'Conjunction', spoken: 'conjunct', angle: 0, orb: 6 },
  { name: 'Sextile', spoken: 'sextile', angle: 60, orb: 4 },
  { name: 'Square', spoken: 'square', angle: 90, orb: 5 },
  { name: 'Trine', spoken: 'trine', angle: 120, orb: 5 },
  { name: 'Opposition', spoken: 'opposite', angle: 180, orb: 6 }
];

// Ported from index.html themeLexicon — the repo's own interpretation anchor.
const THEME_LEXICON = [
  { key: 'loss', label: 'loss, grief, or an ending', planets: ['Moon', 'Saturn', 'Pluto', 'Neptune'], aspects: ['Square', 'Opposition', 'Conjunction'] },
  { key: 'gain', label: 'gain, opportunity, and expansion', planets: ['Jupiter', 'Sun', 'Venus'], aspects: ['Conjunction', 'Trine', 'Sextile'] },
  { key: 'tension', label: 'tension, conflict, or pressure', planets: ['Mars', 'Pluto', 'Saturn'], aspects: ['Square', 'Opposition'] },
  { key: 'newLove', label: 'attraction, romance, and reconnection', planets: ['Venus', 'Moon', 'Mars', 'Jupiter'], aspects: ['Conjunction', 'Sextile', 'Trine', 'Opposition'] },
  { key: 'money', label: 'money, resources, and security', planets: ['Venus', 'Jupiter', 'Saturn', 'Mercury'], aspects: ['Conjunction', 'Trine', 'Sextile', 'Square'] },
  { key: 'career', label: 'work, ambition, and responsibility', planets: ['Saturn', 'Mercury', 'Sun', 'Mars'], aspects: ['Square', 'Trine', 'Opposition', 'Conjunction'] },
  { key: 'family', label: 'home, family, and belonging', planets: ['Moon', 'Jupiter', 'Venus', 'Saturn'], aspects: ['Conjunction', 'Trine', 'Opposition', 'Square'] },
  { key: 'health', label: 'the body, rest, and healing', planets: ['Moon', 'Saturn', 'Mars', 'Neptune'], aspects: ['Square', 'Opposition', 'Trine'] },
  { key: 'spiritual', label: 'dreams, intuition, and inner signs', planets: ['Neptune', 'Moon', 'Jupiter'], aspects: ['Conjunction', 'Square', 'Trine'] },
  { key: 'change', label: 'sudden change, freedom, and breakthrough', planets: ['Uranus', 'Pluto', 'Mercury', 'Mars'], aspects: ['Square', 'Opposition', 'Sextile', 'Conjunction'] }
];

const RETRO_THEME = {
  Mercury: 'reviewing words, plans, and unfinished conversations',
  Venus: 'reassessing relationships, worth, and what you truly value',
  Mars: 'redirecting drive inward and acting with patience',
  Jupiter: 'an inner review of belief and growth',
  Saturn: 'a slow reckoning with structure and commitment',
  Uranus: 'loosening old patterns from the inside',
  Neptune: 'a deep tide of dreams and dissolving illusions',
  Pluto: 'a quiet, underground work of power and transformation'
};

function moonPhaseTheme(phase) {
  if (phase === 'New Moon') return 'planting new intentions and beginning a fresh cycle';
  if (phase === 'Full Moon') return 'culmination and revelation — truth comes to light and what no longer serves is ready to be released';
  if (phase.startsWith('Waxing') || phase === 'First Quarter') return 'building momentum and taking committed action';
  return 'releasing, integrating, and clearing space';
}

// Repo's own cited interpretation pack (book-referenced theme meanings + tarot cards).
const INTERP = require('../data/interpretation-index.json');
const THEME_INDEX = new Map((INTERP.themeIndex || []).map((t) => [t.key, t]));
// Map sky themeLexicon keys -> interpretation-index themeIndex keys.
const THEME_KEY_MAP = {
  loss: 'loss', gain: 'new_beginnings', tension: 'tension', newLove: 'love_interest',
  money: 'career', career: 'career', family: 'family_home', health: 'health',
  spiritual: 'spiritual', change: 'sudden_change'
};

const normalize = (deg) => ((deg % 360) + 360) % 360;
const angleDelta = (a, b) => Math.abs((((a - b + 180) % 360) + 360) % 360 - 180);

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function longitudeFor(body, date) {
  return normalize(A.Ecliptic(A.GeoVector(body, date, true)).elon);
}
function signOf(longitude) {
  const lon = normalize(longitude);
  return SIGNS[Math.floor(lon / 30)];
}
function retrogradeFor(body, date) {
  if (body === A.Body.Sun || body === A.Body.Moon) return false;
  const before = longitudeFor(body, new Date(date.getTime() - 86400000));
  const after = longitudeFor(body, new Date(date.getTime() + 86400000));
  return ((((after - before + 540) % 360) - 180) < 0);
}
function moonPhaseName(date) {
  const a = A.MoonPhase(date);
  if (a < 22.5 || a >= 337.5) return 'New Moon';
  if (a < 67.5) return 'Waxing Crescent';
  if (a < 112.5) return 'First Quarter';
  if (a < 157.5) return 'Waxing Gibbous';
  if (a < 202.5) return 'Full Moon';
  if (a < 247.5) return 'Waning Gibbous';
  if (a < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

function computeSky(date) {
  const bodies = PLANETS.map((p) => {
    const longitude = longitudeFor(p.body, date);
    return {
      key: p.key, tier: p.tier, longitude,
      sign: signOf(longitude),
      retrograde: retrogradeFor(p.body, date)
    };
  });
  const aspects = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const delta = angleDelta(bodies[i].longitude, bodies[j].longitude);
      const match = ASPECTS.find((asp) => Math.abs(delta - asp.angle) <= asp.orb);
      if (match) aspects.push({ a: bodies[i].key, b: bodies[j].key, name: match.name, spoken: match.spoken, orb: Math.abs(delta - match.angle) });
    }
  }
  aspects.sort((x, y) => x.orb - y.orb);
  return { bodies, aspects, moonPhase: moonPhaseName(date) };
}

// ── Deterministic factual setup — ALWAYS correct, never model-generated ──
function andList(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
function place(b, withVerb) {
  return `${b.key} ${withVerb ? 'is ' : ''}${b.retrograde ? 'retrograde ' : ''}in ${b.sign}`;
}
function spokenPhase(phase) { return phase.replace(/ Moon$/, ''); } // "Full Moon" -> "Full"
function aspectPhrase(a) { return `${a.a} ${a.spoken} ${a.b}`; }

function buildSetup(sky, date) {
  const by = (k) => sky.bodies.find((b) => b.key === k);

  const slow = sky.bodies.filter((b) => b.tier === 'slow');
  const backdrop = `The long-range backdrop holds steady — ${andList(slow.map((b) => place(b, false)))} set the season's tone.`;

  const moon = by('Moon');
  const fast = ['Mercury', 'Venus', 'Mars'].map((k) => place(by(k), true));
  const today = `Today the Sun is in ${by('Sun').sign}, and the Moon is ${spokenPhase(sky.moonPhase)} in ${moon.sign}. ${andList(fast)}.`;

  const top = sky.aspects.slice(0, 2);
  const aspectLine = top.length === 0 ? ''
    : top.length === 1 ? `The tightest thread in the sky is ${aspectPhrase(top[0])}.`
      : `The tightest thread in the sky is ${aspectPhrase(top[0])}, with ${aspectPhrase(top[1])} close behind.`;

  // Headline drivers for the hand-off line: moon phase + a personal retrograde (or tightest aspect).
  const personalRetro = ['Mercury', 'Venus', 'Mars'].map(by).find((b) => b.retrograde);
  const driverBits = [`a ${sky.moonPhase} in ${moon.sign}`];
  if (personalRetro) driverBits.push(`${personalRetro.key} is retrograde in ${personalRetro.sign}`);
  else if (top[0]) driverBits.push(aspectPhrase(top[0]));
  const handoff = `So, with ${andList(driverBits).replace(' and ', ' while ')}, here's what to expect —`;

  return { backdrop, today, aspectLine, handoff };
}

// ── Deterministic theme extraction from the real sky (the repo's own lexicon) ──
function activatedThemes(sky) {
  const scores = new Map();
  for (const asp of sky.aspects.slice(0, 6)) {
    for (const theme of THEME_LEXICON) {
      const hitsPlanet = theme.planets.includes(asp.a) || theme.planets.includes(asp.b);
      const hitsAspect = theme.aspects.includes(asp.name);
      if (hitsPlanet && hitsAspect) scores.set(theme.key, (scores.get(theme.key) || 0) + 1);
    }
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key]) => key);
}

// Combine the real sky with the repo's cited interpretation pack. The model only synthesizes.
function buildEffectContext(sky, dayIndex) {
  const themeKeys = activatedThemes(sky);
  const retros = sky.bodies.filter((b) => b.retrograde);
  const lines = [`Moon phase energy: ${moonPhaseTheme(sky.moonPhase)}.`];
  if (retros.length) lines.push('Retrograde currents: ' + retros.map((r) => `${r.key} — ${RETRO_THEME[r.key] || 'inner review'}`).join('; ') + '.');

  const labels = [];
  const cards = [];
  const refs = [];
  const seen = new Set();
  for (const key of themeKeys) {
    const idxKey = THEME_KEY_MAP[key];
    const entry = THEME_INDEX.get(idxKey);
    if (!entry || seen.has(idxKey)) continue;
    seen.add(idxKey);
    labels.push(entry.label);
    const card = entry.cards && entry.cards.length ? entry.cards[dayIndex % entry.cards.length] : null;
    if (card) cards.push(card);
    refs.push(`  - ${entry.label}: ${entry.description}${card ? ` (resonant tarot image: ${card})` : ''}`);
  }
  if (refs.length) {
    lines.push("Today's activated themes with reference meaning (from the repo's cited interpretation pack — Forrest, Hand, Brady, Pollack, etc.):");
    lines.push(refs.join('\n'));
  }
  return { themeKeys, labels, cards, context: lines.join('\n') };
}

// ── Optional enrichment from the two API astro repos (dormant until credentials set) ──
function parseApiText(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.data || d.text || d.response || d.message
    || d?.choices?.[0]?.message?.content
    || d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
function factsLine(sky) {
  return sky.bodies.map((b) => `${b.key} in ${b.sign}${b.retrograde ? ' (R)' : ''}`).join(', ') + `. Moon phase: ${sky.moonPhase}.`;
}
async function callAstroApi(provider, url, token, skyContext) {
  const payload = provider === 'vedastro'
    ? { prompt: "Interpret today's transits in 2-3 grounded sentences.", skyContext, intent: 'interpret-current-sky' }
    : { prompt: "Interpret today's transits in 2-3 grounded sentences.", skyContext };
  const headers = { 'Content-Type': 'application/json' };
  if (token) { headers.Authorization = `Bearer ${token}`; headers['x-api-key'] = token; }
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const raw = await r.text();
  if (!r.ok) throw new Error(`${provider} HTTP ${r.status}`);
  let d; try { d = JSON.parse(raw); } catch { d = { text: raw }; }
  return parseApiText(d).trim();
}
async function fetchApiEnrichment(sky) {
  const skyContext = factsLine(sky);
  const out = [];
  const vedUrl = process.env.VEDASTRO_MCP_URL || 'https://mcp.vedastro.org/api/mcp';
  const vedToken = process.env.VEDASTRO_MCP_TOKEN || process.env.VEDASTRO_API_KEY;
  const kerUrl = process.env.KERYKEION_API_URL;
  const kerToken = process.env.KERYKEION_API_KEY;
  if (vedToken) {
    try { const t = await callAstroApi('vedastro', vedUrl, vedToken, skyContext); if (t) out.push(`VedAstro (Vedic): ${t}`); }
    catch (e) { console.warn('  VedAstro skipped:', e.message); }
  }
  if (kerUrl) {
    try { const t = await callAstroApi('kerykeion', kerUrl, kerToken, skyContext); if (t) out.push(`Kerykeion (Western): ${t}`); }
    catch (e) { console.warn('  Kerykeion skipped:', e.message); }
  }
  return out.join('\n');
}

const EFFECT_PROMPT = [
  'You are the host of "Cosmic Weather," a daily astrology forecast read aloud on a YouTube channel.',
  'The factual sky positions have ALREADY been spoken. Write ONLY the "what to expect" guidance that follows.',
  '',
  'Voice: warm, direct, second person ("you"), oracle-like. Speak to how today feels and what to do with it.',
  'Use ONLY the themes, currents, and reference meanings above as your material — they are drawn from the',
  'real chart and the repo\'s cited astrology sources. Weave them into flowing spoken guidance such as:',
  '  "...relationships are asked to grow up, and buried truth rises to the surface. Keep what serves you and',
  '   release what does not. Aim your intention at what you are ready to build, and stay alert for a sudden',
  '   opening. This is a season of quiet creative power."',
  '',
  'Rules:',
  '- Do NOT name any planet, sign, or aspect, and do NOT restate positions — that part is already done.',
  '- You MAY weave in at most ONE of the named tarot images as a symbol if it fits naturally; otherwise omit it.',
  '- "Weather" is a metaphor. Never mention literal weather (clouds, rain, sun, storms, temperature).',
  '- No markdown, no lists, no headings. 3 to 5 sentences, about 60-110 words. End on a short empowering note.'
].join('\n');

async function localBridge(prompt, skyContext) {
  const response = await fetch(`${RUNTIME}/local/bridge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'mage-local', prompt, skyContext, contextHints: [] })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Bridge failed (${response.status})`);
  return data?.data || '';
}

async function run() {
  const today = new Date();
  const entries = [];

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12, 0, 0);
    const date = ymd(d);
    const sky = computeSky(d);
    const setup = buildSetup(sky, d);
    const enrich = buildEffectContext(sky, i);

    let effectContext = enrich.context;
    const apiText = await fetchApiEnrichment(sky);
    if (apiText) effectContext += `\n\nExternal astrology references (weave in only if they agree with the themes above):\n${apiText}`;

    const effect = String(await localBridge(EFFECT_PROMPT, effectContext)).trim();

    const forecast = [
      setup.backdrop,
      setup.today,
      setup.aspectLine,
      '',
      setup.handoff,
      effect
    ].filter(Boolean).join('\n');

    entries.push({
      date,
      forecast,
      sky: {
        moonPhase: sky.moonPhase,
        positions: sky.bodies.map((b) => ({ planet: b.key, sign: b.sign, retrograde: b.retrograde })),
        aspects: sky.aspects.slice(0, 6).map((a) => ({ a: a.a, b: a.b, aspect: a.name, orb: Number(a.orb.toFixed(1)) })),
        themes: enrich.labels,
        cards: enrich.cards
      }
    });
    console.log(`Built ${date}  ·  ${sky.moonPhase} in ${sky.bodies.find((b) => b.key === 'Moon').sign}  ·  themes: ${enrich.labels.join(', ') || '—'}`);
  }

  const payload = { generatedAt: new Date().toISOString(), source: 'mage-local', style: 'cosmic-weather', days: entries };
  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved: ${OUTPUT}`);
}

if (require.main === module) {
  run().catch((err) => { console.error(err.message || err); process.exit(1); });
}

module.exports = { computeSky, buildSetup, buildEffectContext, EFFECT_PROMPT, ymd };
