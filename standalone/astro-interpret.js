// Deterministic astrological interpretation engine.
// Turns the real sky (a computeSky() result) + data/astro-rules.json into a
// textbook-grounded interpretation WITH ZERO model tokens. renderEffect() then
// assembles the "what to expect" spoken prose. An LLM, if used, only polishes
// that prose — it invents nothing.

const path = require('path');
const RULES = require(path.join(__dirname, '..', 'data', 'astro-rules.json'));

// True slow / trans-personal planets — the generational layer. Jupiter & Saturn
// move too fast to carry generational weight, so they're excluded here.
const GENERATIONAL = ['Uranus', 'Neptune', 'Pluto'];
const PERSONAL = ['Mercury', 'Venus', 'Mars'];
const SOFT = new Set(['Trine', 'Sextile']);
const HARD = new Set(['Square', 'Opposition']);
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const lower1 = (s) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;

const AXIS_OF = {
  Aries: 'Aries-Libra', Libra: 'Aries-Libra',
  Taurus: 'Taurus-Scorpio', Scorpio: 'Taurus-Scorpio',
  Gemini: 'Gemini-Sagittarius', Sagittarius: 'Gemini-Sagittarius',
  Cancer: 'Cancer-Capricorn', Capricorn: 'Cancer-Capricorn',
  Leo: 'Leo-Aquarius', Aquarius: 'Leo-Aquarius',
  Virgo: 'Virgo-Pisces', Pisces: 'Virgo-Pisces'
};

function softTriangleAmong(keys, aspects) {
  const soft = aspects.filter((a) => SOFT.has(a.name) && keys.includes(a.a) && keys.includes(a.b));
  const adj = new Map(keys.map((k) => [k, new Set()]));
  for (const a of soft) { adj.get(a.a).add(a.b); adj.get(a.b).add(a.a); }
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++)
      for (let k = j + 1; k < keys.length; k++) {
        const [x, y, z] = [keys[i], keys[j], keys[k]];
        if (adj.get(x).has(y) && adj.get(y).has(z) && adj.get(x).has(z)) return [x, y, z];
      }
  return null;
}

// Structured interpretation of the sky — no prose, no tokens.
function interpret(sky) {
  const by = (k) => sky.bodies.find((b) => b.key === k);
  const moon = by('Moon'), sun = by('Sun');
  const lun = RULES.lunation[sky.moonPhase] || { tone: 'neutral', core: '' };
  const isFull = sky.moonPhase === 'Full Moon', isNew = sky.moonPhase === 'New Moon';

  const out = {
    lunation: { phase: sky.moonPhase, sign: moon.sign, tone: lun.tone, core: lun.core, isFull, isNew },
    axis: null, mercuryRetro: null, otherRetro: [], generational: null, polarity: null, bestMove: null
  };

  if (isFull || isNew) {
    const key = AXIS_OF[sun.sign];
    const a = RULES.axes[key];
    out.axis = { key, tension: a.tension, fullMoon: a.fullMoon || a.tension, poles: a.poles };
  }

  for (const p of PERSONAL) {
    const b = by(p);
    if (!b.retrograde) continue;
    const rc = RULES.retrogradeContext[p];
    if (p === 'Mercury' && rc) {
      out.mercuryRetro = {
        sign: b.sign,
        base: rc.base,
        signContext: rc.withSign?.[b.sign] || rc.withSign?.default || '',
        fullMoonCaution: isFull ? (rc.withFullMoon || '') : ''
      };
    } else {
      out.otherRetro.push({ planet: p, sign: b.sign, base: rc?.base || '' });
    }
  }

  out.generational = softTriangleAmong(GENERATIONAL, sky.aspects);

  const top = sky.aspects.slice(0, 6);
  const hard = top.filter((a) => HARD.has(a.name)).length;
  const soft = top.filter((a) => SOFT.has(a.name)).length;
  const waxing = /New|Waxing|First/.test(sky.moonPhase);
  let tone;
  if ((out.mercuryRetro && out.mercuryRetro.fullMoonCaution) || out.mercuryRetro || out.otherRetro.length) tone = 'cautionary';
  else if (soft > hard && waxing) tone = 'encouraging';
  else tone = 'mixed';
  out.polarity = tone;
  out.bestMove = RULES.polarity[tone].bestMove;
  return out;
}

// Assemble the "what to expect" half as flowing spoken prose — deterministic, 0 tokens.
function renderEffect(interp) {
  const parts = [];
  const { lunation: lun, axis } = interp;

  if (lun.isFull && axis) {
    parts.push(`This is a culmination, not a fresh start — the Full Moon lights both ends of the ${axis.key} axis: ${lower1(axis.fullMoon)}`);
  } else if (lun.isNew && axis) {
    parts.push(`This is a seed point on the ${axis.key} axis — ${lower1(axis.tension)}`);
  } else if (lun.core) {
    parts.push(cap(lun.core));
  }

  if (interp.mercuryRetro) {
    const m = interp.mercuryRetro;
    let s = `Mercury is retrograde in ${m.sign}, and ${lower1(m.signContext || m.base)}`;
    if (m.fullMoonCaution) s += ` ${m.fullMoonCaution}`;
    parts.push(s);
  }
  for (const r of interp.otherRetro) {
    parts.push(`With ${r.planet} retrograde, ${lower1(r.base)}`);
  }

  if (interp.generational) {
    parts.push(`Underneath the day, ${interp.generational.join(', ')} keep reworking the era's deeper structures — a long, collective transformation to hold as backdrop, not a task for today.`);
  }

  parts.push(`Best move: ${interp.bestMove}`);
  return parts.map((p) => p.trim()).filter(Boolean).map((p) => /[.!?—]$/.test(p) ? p : p + '.').join(' ');
}

module.exports = { interpret, renderEffect };

if (require.main === module) {
  const { computeSky, ymd } = require(path.join(__dirname, 'build-forecast-cache.js')); // lazy: avoid require cycle
  const arg = process.argv[2];
  const base = arg ? new Date(arg + 'T12:00:00') : new Date();
  const sky = computeSky(new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0));
  const interp = interpret(sky);
  console.log(`===== ${ymd(base)} — deterministic "what to expect" (0 model tokens) =====\n`);
  console.log(renderEffect(interp));
  console.log(`\n[polarity: ${interp.polarity} | axis: ${interp.axis?.key || '—'} | generational: ${interp.generational?.join('-') || '—'}]`);
}
