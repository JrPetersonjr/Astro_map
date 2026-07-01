// Unit tests for the deterministic interpretation engines.
// These lock in interpretation ACCURACY: a dataset edit that breaks the
// textbook-correct read (e.g. flips a Full-Moon/Mercury-retrograde day from
// "sit tight" back to "step forward") will fail here. Run: `npm test`.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { computeSky } = require('../standalone/build-forecast-cache.js');
const { interpret, renderEffect } = require('../standalone/astro-interpret.js');
const dream = require('../standalone/dream-interpret.js');
const tarot = require('../standalone/tarot-interpret.js');

const skyFor = (y, m, d) => computeSky(new Date(y, m - 1, d, 12, 0, 0));

// ── Ephemeris / sky math ────────────────────────────────────────────────
test('sky math: known positions for 2026-07-01', () => {
  const sky = skyFor(2026, 7, 1);
  const by = (k) => sky.bodies.find((b) => b.key === k);
  assert.equal(by('Pluto').sign, 'Aquarius');
  assert.equal(by('Neptune').sign, 'Aries');
  assert.equal(by('Sun').sign, 'Cancer');
  assert.equal(by('Moon').sign, 'Capricorn');
  assert.equal(sky.moonPhase, 'Full Moon');
  assert.equal(by('Mercury').retrograde, true);
  assert.equal(sky.bodies.length, 10);
});

// ── Astrology interpretation (the textbook-accuracy guard) ──────────────
test('astro-interpret: 2026-07-01 reads as a cautionary Full-Moon reckoning', () => {
  const interp = interpret(skyFor(2026, 7, 1));
  assert.equal(interp.polarity, 'cautionary');
  assert.equal(interp.axis.key, 'Cancer-Capricorn');
  assert.deepEqual(interp.generational, ['Uranus', 'Neptune', 'Pluto']);
  assert.ok(interp.mercuryRetro, 'Mercury retrograde detected');
  assert.match(interp.bestMove, /sit tight/i);
  assert.ok(interp.sources.length >= 2, 'carries source citations');
});

test('astro-interpret: rendered effect names no planets and advises caution', () => {
  const prose = renderEffect(interpret(skyFor(2026, 7, 1)));
  assert.match(prose, /Best move:/);
  assert.match(prose, /do not launch|sit tight/i);
  assert.doesNotMatch(prose, /step forward with courage/i); // the old, wrong read
});

test('astro-interpret: moon mood gives each day distinct texture', () => {
  const a = renderEffect(interpret(skyFor(2026, 7, 1)));  // Moon Capricorn
  const b = renderEffect(interpret(skyFor(2026, 7, 4)));  // Moon Pisces
  assert.notEqual(a, b);
  assert.match(a, /Emotionally,/);
});

// ── Dream interpretation ────────────────────────────────────────────────
test('dream-interpret: matches symbols and cites real sources', () => {
  const r = dream.interpret('I was being chased and my teeth were falling out near deep water');
  const keys = r.matches.map((m) => m.key);
  assert.ok(keys.includes('chased'));
  assert.ok(keys.includes('teeth'));
  assert.ok(keys.includes('water'));
  assert.ok(r.matches[0].citations.length >= 1, 'each match carries citations');
  assert.match(r.reading, /Jung/);
});

test('dream-interpret: no false matches on unrelated text', () => {
  const r = dream.interpret('the quarterly budget spreadsheet was approved');
  assert.equal(r.matches.length, 0);
});

// ── Tarot interpretation ────────────────────────────────────────────────
test('tarot-interpret: lookup, orientation, and RWS citation', () => {
  const up = tarot.interpret('The Tower');
  assert.equal(up.name, 'The Tower');
  assert.equal(up.orientation, 'upright');
  assert.ok(up.citeInline.includes('Waite'));

  const rev = tarot.interpret('The Tower', { reversed: true });
  assert.equal(rev.orientation, 'reversed');
  assert.match(rev.meaning, /Reversed/);

  assert.equal(tarot.findCard('not a real card name'), null);
});

test('tarot-interpret: spreads draw the requested positions', () => {
  const spread = tarot.drawSpread(['Past', 'Present', 'Future']);
  assert.equal(spread.length, 3);
  assert.deepEqual(spread.map((c) => c.position ?? c.reading.split(':')[0]), ['Past', 'Present', 'Future']);
  for (const c of spread) assert.ok(c.citeInline.includes('Waite'));
});
