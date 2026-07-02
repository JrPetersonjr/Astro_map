const fs = require('fs/promises');
const path = require('path');
const A = require('../vendor/astronomy.browser.min.js');

const { interpret, renderEffect } = require('./astro-interpret.js');
const SOURCES = require('./interpretation-sources.json');
const SRC = {};
for (const cat of ['tarot', 'astrology', 'dream', 'repos']) for (const s of (SOURCES[cat] || [])) SRC[s.id] = s;
const resolveSources = (ids) => (ids || []).map((id) => SRC[id]).filter(Boolean).map((s) => ({ author: s.author, title: s.title, year: s.year }));

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'precomputedForecast.json');
const RUNTIME = process.env.LUMINA_RUNTIME_URL || 'http://127.0.0.1:8787';
const DAYS = Number(process.env.FORECAST_DAYS || 14);
// FORECAST_POLISH=1 sends the (already-correct) deterministic brief through the model
// for warmer spoken prose. Default 0 = pure deterministic, zero model tokens.
const POLISH = process.env.FORECAST_POLISH === '1';

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

// name = canonical aspect name, spoken = read-aloud form
const ASPECTS = [
  { name: 'Conjunction', spoken: 'conjunct', angle: 0, orb: 6 },
  { name: 'Sextile', spoken: 'sextile', angle: 60, orb: 4 },
  { name: 'Square', spoken: 'square', angle: 90, orb: 5 },
  { name: 'Trine', spoken: 'trine', angle: 120, orb: 5 },
  { name: 'Opposition', spoken: 'opposite', angle: 180, orb: 6 }
];

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

function buildSetup(sky) {
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

// ── Shared forecast assembly — used by the cache build AND the /api/forecast
//    endpoint, so the live site and the committed cache read identically. ──
function forecastParts(d, effectText) {
  const sky = computeSky(d);
  const setup = buildSetup(sky);
  const interp = interpret(sky);
  const effect = effectText != null ? effectText : renderEffect(interp);
  return {
    date: ymd(d),
    setup,
    effect,
    sources: resolveSources(interp.sources),
    sky: {
      moonPhase: sky.moonPhase,
      positions: sky.bodies.map((b) => ({ planet: b.key, sign: b.sign, retrograde: b.retrograde })),
      aspects: sky.aspects.slice(0, 6).map((a) => ({ a: a.a, b: a.b, aspect: a.name, orb: Number(a.orb.toFixed(1)) })),
      axis: interp.axis?.key || null,
      polarity: interp.polarity,
      generational: interp.generational
    }
  };
}

function assembleForecast(parts) {
  return [parts.setup.backdrop, parts.setup.today, parts.setup.aspectLine, '',
    parts.setup.handoff, parts.effect].filter(Boolean).join('\n');
}

function forecastEntry(d, effectText) {
  const p = forecastParts(d, effectText);
  return { date: p.date, forecast: assembleForecast(p), sources: p.sources, sky: p.sky };
}

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

// Optional warmth pass: the model rewords the already-correct brief for a spoken read.
// It is told to change NO facts or advice, and we fall back to the deterministic text on any failure.
async function polishEffect(rawEffect) {
  const prompt = [
    'You are polishing the "what to expect" half of a daily astrology forecast for a spoken YouTube read.',
    'Rewrite the interpretation below as warm, flowing, second-person spoken prose.',
    'Do NOT change, add, remove, or reverse any astrological fact, placement, mood, or piece of advice —',
    'keep the same meaning and the same closing "best move". No markdown. Keep it under about 130 words.',
    '',
    'INTERPRETATION:',
    rawEffect
  ].join('\n');
  try {
    const out = String(await localBridge(prompt, '')).trim();
    return out || rawEffect;
  } catch {
    return rawEffect; // deterministic text is authoritative; never fail the build on polish
  }
}

async function run() {
  const today = new Date();
  const entries = [];

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12, 0, 0);
    let effectText = null;
    if (POLISH) {
      effectText = await polishEffect(renderEffect(interpret(computeSky(d))));
    }
    const entry = forecastEntry(d, effectText);
    entries.push(entry);
    const moon = entry.sky.positions.find((p) => p.planet === 'Moon').sign;
    console.log(`Built ${entry.date}  ·  ${entry.sky.moonPhase} in ${moon}  ·  ${entry.sky.polarity}${POLISH ? ' (polished)' : ' (0-token)'}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: POLISH ? 'mage-local' : 'deterministic',
    style: 'cosmic-weather',
    days: entries
  };
  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved: ${OUTPUT}`);
}

if (require.main === module) {
  run().catch((err) => { console.error(err.message || err); process.exit(1); });
}

module.exports = { computeSky, buildSetup, forecastParts, assembleForecast, forecastEntry, ymd };
